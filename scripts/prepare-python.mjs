// Explicit development-time downloads only. Runtime has no CDN/package installation.
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const require=createRequire(import.meta.url);
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=dirname(require.resolve('pyodide/package.json'));
const destination=join(root,'src/assets/python/runtime');
const pkg=JSON.parse(await readFile(join(source,'package.json'),'utf8'));
const lock=JSON.parse(await readFile(join(source,'pyodide-lock.json'),'utf8'));
const download=process.argv.includes('--download');
const hash=data=>createHash('sha256').update(data).digest('hex');
await mkdir(destination,{recursive:true});
const core=['pyodide.mjs','pyodide.asm.mjs','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json'];
for(const file of core)await copyFile(join(source,file),join(destination,file));
const names=new Set();
function add(name){if(names.has(name))return;names.add(name);for(const child of lock.packages[name].depends)add(child);}
for(const name of ['pillow','numpy','opencv-python'])add(name);
for(const name of names){
  const entry=lock.packages[name], file=join(destination,entry.file_name);
  let bytes;
  try{bytes=await readFile(file);}catch{}
  if(!bytes || hash(bytes)!==entry.sha256){
    if(!download)throw new Error(`Missing or invalid ${name}. Run npm run setup:python once with network access.`);
    const response=await fetch(`https://cdn.jsdelivr.net/pyodide/v${pkg.version}/full/${entry.file_name}`,{signal:AbortSignal.timeout(120_000)});
    if(!response.ok)throw new Error(`Download ${name}: HTTP ${response.status}`);
    bytes=Buffer.from(await response.arrayBuffer());
    if(hash(bytes)!==entry.sha256)throw new Error(`Checksum mismatch for ${name}`);
    await writeFile(file,bytes);
  }
}
const licenses = {
  'LICENSE-PYODIDE.txt': `https://raw.githubusercontent.com/pyodide/pyodide/${pkg.version}/LICENSE`,
  'LICENSE-PYTHON.txt': `https://raw.githubusercontent.com/python/cpython/v${lock.info.python}/LICENSE`,
};
for (const [file, url] of Object.entries(licenses)) {
  let existing;
  try { existing = await readFile(join(destination, file), 'utf8'); } catch {}
  if (!existing) {
    if (!download) throw new Error(`Missing ${file}. Run npm run setup:python once with network access.`);
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`License download failed: HTTP ${response.status}`);
    await writeFile(join(destination, file), await response.text());
  }
}
const files=[...core,...[...names].map(n=>lock.packages[n].file_name),...Object.keys(licenses)];
const manifest={pyodide:pkg.version,python:lock.info.python,packages:Object.fromEntries([...names].map(n=>[n,lock.packages[n].version])),files:{}};
let total=0;
for(const file of files){const bytes=await readFile(join(destination,file));total+=bytes.byteLength;manifest.files[file]={sha256:hash(bytes),bytes:bytes.byteLength};}
await writeFile(join(destination,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(join(destination,'NOTICE.txt'),`Pyodide ${pkg.version} — MPL-2.0. Source: https://github.com/pyodide/pyodide/tree/${pkg.version}\nPyodide license: LICENSE-PYODIDE.txt. Python ${lock.info.python} license: LICENSE-PYTHON.txt.\nPython wheels are distributed unmodified with their original dist-info licenses.\nPillow, NumPy and OpenCV versions and SHA-256 hashes: manifest.json and pyodide-lock.json.\n`);
console.log(`Offline Python assets verified: ${files.length} files, ${(total/1024/1024).toFixed(1)} MiB.`);
