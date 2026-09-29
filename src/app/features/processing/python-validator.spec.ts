import { afterEach, describe, expect, it, vi } from 'vitest';
import { parsePythonReport, pythonQuality, runPythonCheck, PythonReport } from './python-validator';
import { LocalImage } from './models';
import { AnalysisSession, canAnalyze } from '../../core/analysis-session';
import { LfaReader } from './lfa-reader';

const image: LocalImage = { url: 'blob:sample', name: 'sample.png', width: 400, height: 300, bytes: 1200, format: 'image/png', source: 'example' };
const valid: PythonReport = { estado: 'valid', mensaje: 'Archivo válido para revisión técnica.', ancho: 400, alto: 300, formato: 'PNG', alcance: 'archivo', matriz: 'pendiente-de-calibracion' };

function workerDouble() {
  const worker = { onmessage: null, onerror: null, onmessageerror: null, postMessage: vi.fn(), terminate: vi.fn() } as unknown as Worker;
  const controller = new AbortController();
  const bytes = new ArrayBuffer(16);
  const pending = runPythonCheck(bytes, controller.signal, () => worker);
  return { worker, controller, bytes, pending, reply: (data: unknown) => worker.onmessage?.call(worker, { data } as MessageEvent) };
}
afterEach(() => vi.useRealTimers());

describe('Python report boundary', () => {
  it.each([undefined, {}, { ...valid, estado: 'unknown' }, { ...valid, alcance: 'scientific' }, { ...valid, matriz: 'valid' }, { ...valid, ancho: 199 }, { ...valid, formato: 'JPEG' }])('rejects an incomplete or inconsistent positive report: %j', value => {
    expect(() => parsePythonReport(value)).toThrow();
  });
  it('keeps photographic quality and matrix interpretation pending after a technical pass', () => {
    const quality = pythonQuality(image, parsePythonReport(valid));
    expect(quality.outcome).toBe('valid');
    expect(quality.checks.filter(c => ['focus', 'lighting', 'framing'].includes(c.id)).every(c => c.status === 'pending')).toBe(true);
    expect(quality.scope).toBe('technical-file');
  });
  it('rejects mismatched dimensions and propagates technical errors rather than accepting the file', () => {
    expect(() => pythonQuality(image, { ...valid, ancho: 500 })).toThrow('dimensiones');
    expect(() => pythonQuality(image, { ...valid, estado: 'error', mensaje: 'Fallo temporal' })).toThrow('Fallo temporal');
    const invalid = pythonQuality(image, { ...valid, estado: 'invalid', mensaje: 'Demasiado pequeña' });
    expect(invalid.technicallyReadable).toBe(false);
    expect(invalid.checks.find(c => c.id === 'python')?.status).toBe('failed');
  });
  it('allows the technical report flow without inventing assay results', async () => {
    const session = new AnalysisSession({ load: async () => image, validate: async () => pythonQuality(image, valid), analyze: img => new LfaReader().analyze(img), release: vi.fn(), changed: vi.fn() });
    await session.select(new File(['fixture'], 'sample.png'), 'example');
    expect(canAnalyze(session.state)).toBe(true);
    expect(await session.analyze()).toBe(true);
    expect(session.state.result).toMatchObject({ status: 'pending-calibration', concentration: null, controls: [], signals: [], foodSafety: 'not-assessed' });
    session.reset();
    expect(canAnalyze(session.state)).toBe(false);
    expect(session.state.result).toBeNull();
  });
});

describe('Python worker lifecycle', () => {
  it('transfers ownership of the buffer and terminates after a result', async () => {
    const { worker, bytes, pending, reply } = workerDouble();
    expect(worker.postMessage).toHaveBeenCalledWith({ bytes }, [bytes]);
    reply({ result: valid });
    expect(await pending).toEqual(valid);
    expect(worker.terminate).toHaveBeenCalledOnce();
    expect(worker.onmessage).toBeNull();
  });
  it.each([{ error: 'Python no disponible' }, { result: { ...valid, alcance: 'unknown' } }])('terminates and rejects a failed response', async response => {
    const { worker, pending, reply } = workerDouble();
    reply(response);
    await expect(pending).rejects.toThrow();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('cancellation terminates immediately and ignores a late result', async () => {
    const { worker, controller, pending } = workerDouble();
    const late = worker.onmessage!;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    late.call(worker, { data: { result: valid } } as MessageEvent);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('never creates a worker for an already cancelled operation', () => {
    const controller = new AbortController(); controller.abort();
    const factory = vi.fn();
    expect(() => runPythonCheck(new ArrayBuffer(0), controller.signal, factory)).toThrow();
    expect(factory).not.toHaveBeenCalled();
  });
  it('terminates on timeout and permits an independent retry', async () => {
    vi.useFakeTimers();
    const { worker, pending } = workerDouble();
    const rejected = expect(pending).rejects.toThrow('demasiado');
    await vi.advanceTimersByTimeAsync(60_000); await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce();
    const retry = workerDouble(); retry.reply({ result: valid });
    expect((await retry.pending).estado).toBe('valid');
  });
  it.each(['onerror', 'onmessageerror'] as const)('handles %s without leaving the operation pending', async event => {
    const { worker, pending } = workerDouble();
    const error = { preventDefault: vi.fn() };
    if (event === 'onerror') worker.onerror?.call(worker, error as unknown as ErrorEvent);
    else worker.onmessageerror?.call(worker, error as unknown as MessageEvent);
    await expect(pending).rejects.toThrow();
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('reports construction or transfer errors', async () => {
    await expect(runPythonCheck(new ArrayBuffer(1), new AbortController().signal, () => { throw new Error('Worker blocked'); })).rejects.toThrow('iniciar');
    const worker = { postMessage: () => { throw new Error('Transfer failed'); }, terminate: vi.fn() } as unknown as Worker;
    await expect(runPythonCheck(new ArrayBuffer(1), new AbortController().signal, () => worker)).rejects.toThrow('preparar');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
