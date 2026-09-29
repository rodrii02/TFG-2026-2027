import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadPyodide } from '../src/assets/python/runtime/pyodide.mjs';
import { Worker } from 'node:worker_threads';
import assert from 'node:assert/strict';
// Any missing package must fail offline, not be silently retrieved from a CDN.
globalThis.fetch=()=>Promise.reject(new Error('Network disabled in Python tests'));
const base=fileURLToPath(new URL('../src/assets/python/runtime/',import.meta.url));
const python=await loadPyodide({indexURL:base,packageCacheDir:base,packageBaseUrl:base,enableRunUntilComplete:false,packages:['pillow','numpy','opencv-python']});
python.FS.writeFile('/tmp/validar_imagen.py',await readFile(new URL('../src/assets/python/validar_imagen.py',import.meta.url),'utf8'));
python.runPython('import sys; sys.path.insert(0,"/tmp")');
await python.runPythonAsync(await readFile(new URL('../tests/python/test_validar_imagen.py',import.meta.url),'utf8'));
console.log('Packaged Python/Pillow/OpenCV tests passed with network disabled.');

// Pass the supplied synthetic example through the production worker and .py file.
// Only the transport and local fetch are supplied by Node; there is no result stub.
const worker = new Worker(new URL('../tests/python/node-worker.mjs', import.meta.url));
try {
  const result = new Promise((resolve, reject) => {
    worker.once('message', resolve); worker.once('error', reject);
    worker.once('exit', code => { if (code) reject(new Error(`Worker exited: ${code}`)); });
  });
  const buffer = await readFile(new URL('../src/assets/example-matrix.png', import.meta.url));
  const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  worker.postMessage({ bytes }, [bytes]);
  let timeout;
  const message = await Promise.race([result, new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error('Production Python worker timed out')), 60_000);
  })]).finally(() => clearTimeout(timeout));
  assert.equal(message.error, undefined);
  assert.equal(message.result.estado, 'valid');
  assert.equal(message.result.alcance, 'archivo');
  assert.equal(message.result.matriz, 'pendiente-de-calibracion');
  console.log('Production Python worker passed the synthetic image: technical validity only; calibration still pending.');
} finally { await worker.terminate(); }
