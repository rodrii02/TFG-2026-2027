// Node-only transport for exercising the actual packaged browser worker offline.
// This does not emulate a browser/WebView or validate native device compatibility.
import { parentPort } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
const root = new URL('../../src/assets/python/', import.meta.url);
globalThis.self = { postMessage: message => parentPort.postMessage(message) };
globalThis.fetch = async input => {
  const url = new URL(String(input));
  if (!url.href.startsWith(root.href)) throw new Error('Network disabled in worker tests');
  return new Response(await readFile(url));
};
await import('../../src/assets/python/validator.worker.mjs');
parentPort.on('message', data => self.onmessage({ data }));
