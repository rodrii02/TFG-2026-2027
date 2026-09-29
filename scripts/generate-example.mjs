// An explicitly synthetic illustration for UI/resource tests, never assay data.
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.MFS_SHARP_MODULE || 'sharp');
const dots=Array.from({length:16},(_,i)=>`<circle cx="${440+i%4*105}" cy="${230+Math.floor(i/4)*105}" r="22" fill="${i%3?'#778c43':'#31470b'}"/>`).join('');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#f7f8f0"/><rect x="320" y="130" width="560" height="540" rx="24" fill="white" stroke="#778c43" stroke-width="3"/>${dots}<text x="600" y="735" text-anchor="middle" font-size="27" font-family="sans-serif" fill="#203500">EJEMPLO SINTÉTICO · NO ES UN ENSAYO</text></svg>`;
await sharp(Buffer.from(svg)).png().toFile(new URL('../src/assets/example-matrix.png',import.meta.url).pathname);
