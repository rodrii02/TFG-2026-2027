import { inspectQuality, MAX_FILE_BYTES } from './image-quality';
import { LocalImage, QualityReport } from './models';

export interface PythonReport {
  readonly estado: 'valid' | 'invalid' | 'error';
  readonly mensaje: string;
  readonly ancho: number;
  readonly alto: number;
  readonly formato: string | null;
  readonly alcance: 'archivo';
  readonly matriz: 'pendiente-de-calibracion';
}
export function parsePythonReport(value: unknown): PythonReport {
  if (!value || typeof value !== 'object') throw new Error('Python no ha devuelto un informe válido.');
  const r = value as Record<string, unknown>;
  if (!['valid', 'invalid', 'error'].includes(String(r['estado'])) || typeof r['mensaje'] !== 'string' ||
      !Number.isInteger(r['ancho']) || !Number.isInteger(r['alto']) ||
      r['alcance'] !== 'archivo' || r['matriz'] !== 'pendiente-de-calibracion' ||
      !(typeof r['formato'] === 'string' || r['formato'] === null)) throw new Error('Python no ha devuelto un informe válido.');
  if (r['estado'] === 'valid' && ((r['ancho'] as number) < 200 || (r['alto'] as number) < 200 || r['formato'] !== 'PNG')) {
    throw new Error('La comprobación Python no coincide con la copia de trabajo.');
  }
  return r as unknown as PythonReport;
}
export function pythonQuality(image: LocalImage, report: PythonReport): QualityReport {
  if (report.estado === 'error') throw new Error(report.mensaje);
  if (report.estado === 'valid' && (report.ancho !== image.width || report.alto !== image.height)) throw new Error('Python ha devuelto dimensiones diferentes a la imagen seleccionada.');
  const base = inspectQuality(image);
  return { ...base, outcome: report.estado, scope: 'technical-file',
    technicallyReadable: report.estado === 'valid', message: report.mensaje,
    validator: 'python-pillow-opencv-v1',
    checks: [...base.checks, {
      id: 'python', label: 'Revisión técnica del archivo', status: report.estado === 'valid' ? 'checked' : 'failed',
      detail: report.estado === 'valid' ? 'Pillow y OpenCV leen la copia de trabajo. Mínimo técnico de 200 × 200 px comprobado; no valida la matriz.' : report.mensaje,
    }] };
}

export type WorkerFactory = () => Worker;
// Exposed as a pure adapter to test termination/error/cancellation without a browser.
export function runPythonCheck(bytes: ArrayBuffer, signal: AbortSignal, createWorker: WorkerFactory): Promise<PythonReport> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try { worker = createWorker(); } catch { reject(new Error('Este navegador no permite iniciar el lector Python local.')); return; }
    let settled = false;
    const finish = (error?: Error, result?: PythonReport) => {
      if (settled) return;
      settled = true; clearTimeout(timeout); signal.removeEventListener('abort', abort);
      worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate();
      if (error) reject(error); else resolve(result!);
    };
    const abort = () => finish(new DOMException('Comprobación cancelada.', 'AbortError'));
    const timeout = setTimeout(() => finish(new Error('La comprobación Python ha tardado demasiado. Inténtalo de nuevo.')), 60_000);
    signal.addEventListener('abort', abort, { once: true });
    worker.onerror = event => { event.preventDefault(); finish(new Error('No se ha podido iniciar el lector Python local.')); };
    worker.onmessageerror = () => finish(new Error('No se ha podido recibir el resultado de Python.'));
    worker.onmessage = event => {
      try {
        if (typeof event.data?.error === 'string') throw new Error(event.data.error);
        finish(undefined, parsePythonReport(event.data?.result));
      } catch (error) { finish(error instanceof Error ? error : new Error('Respuesta Python no válida.')); }
    };
    if (signal.aborted) { abort(); return; }
    try { worker.postMessage({ bytes }, [bytes]); } catch { finish(new Error('No se ha podido preparar la imagen para Python.')); }
  });
}
export async function validateWithPython(image: LocalImage, signal: AbortSignal): Promise<QualityReport> {
  if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') throw new Error('Este navegador no admite el lector Python local.');
  // Read only the bounded, prepared local PNG. Never send images or paths to an API.
  if (!image.url.startsWith('blob:')) throw new Error('La imagen de trabajo no es local.');
  const response = await fetch(image.url, { signal });
  if (!response.ok) throw new Error('No se puede abrir la copia de trabajo.');
  const blob = await response.blob();
  if (!blob.size || blob.size > MAX_FILE_BYTES) throw new Error('La copia de trabajo excede el límite de memoria.');
  const bytes = await blob.arrayBuffer();
  const report = await runPythonCheck(bytes, signal, () => new Worker(
    new URL('assets/python/validator.worker.mjs', document.baseURI), { type: 'module', name: 'mfs-python-validation' },
  ));
  return pythonQuality(image, report);
}
