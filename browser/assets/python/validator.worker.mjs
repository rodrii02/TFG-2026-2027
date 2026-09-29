// One short-lived worker per check. The caller terminates it on completion/cancel,
// releasing the Python heap as well as the temporary image. No remote code or packages.
import { loadPyodide } from './runtime/pyodide.mjs';
let running = false;
self.onmessage = async ({ data }) => {
  if (running) return;
  running = true;
  let python;
  const path = '/tmp/mfs-image.png';
  try {
    const bytes = data?.bytes;
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > 20 * 1024 * 1024 || bytes.byteLength === 0) throw new Error('Invalid image payload');
    const runtime = new URL('./runtime/', import.meta.url);
    // Pyodide's Node loader expects a filesystem path in the offline test harness.
    // Browsers and Capacitor retain their local HTTP(S)/capacitor asset URL.
    const base = runtime.protocol === 'file:' ? decodeURIComponent(runtime.pathname) : runtime.href;
    python = await loadPyodide({ indexURL: base, packageBaseUrl: base,
      packages: ['pillow', 'numpy', 'opencv-python'], enableRunUntilComplete: false,
      stdout: () => {}, stderr: () => {} });
    const response = await fetch(new URL('./validar_imagen.py', import.meta.url));
    if (!response.ok) throw new Error('Python source unavailable');
    python.FS.writeFile("/tmp/validar_imagen.py", await response.text());
    python.runPython('import sys, json; sys.path.insert(0, "/tmp"); from validar_imagen import revisar_imagen');
    python.FS.writeFile(path, new Uint8Array(bytes));
    const result = JSON.parse(python.runPython('json.dumps(revisar_imagen("/tmp/mfs-image.png", min_ancho=200, min_alto=200))'));
    self.postMessage({ result });
  } catch (error) {
    // Diagnostic stays on the device; the interface receives a recoverable message.
    console.warn('No se ha podido ejecutar el motor Python local.', error);
    self.postMessage({ error: 'No se ha podido ejecutar la comprobación Python. Inténtalo de nuevo.' });
  } finally {
    if (python) { try { python.FS.unlink(path); } catch { /* A failed load may not have created the file. */ } }
  }
};
