// Rasterize the supplied SVG without modifying or redrawing it.
// npm package `sharp` is only needed to regenerate native artwork, not to run/build the app.
// MFS_SHARP_MODULE may point to an existing local Sharp installation.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharp = require(process.env.MFS_SHARP_MODULE || 'sharp');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'src/assets/mfs-manzana-camara.svg'));
async function raster(path, fraction, background) {
  const {width,height} = await sharp(path).metadata();
  const size = Math.round(Math.min(width,height) * fraction);
  const mark = await sharp(svg, {density:300}).resize(size,size).png().toBuffer();
  const output = await sharp({create:{width,height,channels:4,background}}).composite([{input:mark,gravity:'centre'}]).png().toBuffer();
  writeFileSync(path,output);
}
async function visit(directory) {
  for (const item of readdirSync(directory,{withFileTypes:true})) {
    const path=join(directory,item.name);
    if(item.isDirectory()) await visit(path);
    else if (/ic_launcher.*\.png$/.test(item.name)) await raster(path,item.name.includes('foreground')?.6:.84,'#d9ef9f');
    else if (/splash.*\.png$/.test(item.name)) await raster(path,.18,'#f7f8f0');
  }
}
await visit(join(root,'android/app/src/main/res'));
await visit(join(root,'ios/App/App/Assets.xcassets/Splash.imageset'));
await raster(join(root,'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'),.84,'#d9ef9f');
console.log('MicroFoodScan native artwork rasterized from the unchanged SVG.');
