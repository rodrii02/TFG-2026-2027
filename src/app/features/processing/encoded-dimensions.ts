import { ImageFormat } from './models';
import { ImageError, validateDimensions } from './image-quality';
// Inspect dimensions before decoding to avoid allocating unbounded pixel buffers.
// These are file-format metadata, not evidence of photographic quality.
export function encodedDimensions(bytes: Uint8Array, format: ImageFormat): { width: number; height: number } {
  const invalid = () => new ImageError('No se ha podido abrir la imagen. Su cabecera está dañada o incompleta.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (i: number) => String.fromCharCode(...bytes.slice(i, i + 4));
  let width = 0, height = 0;
  try {
    if (format === 'image/png') {
      if (ascii(12) !== 'IHDR') throw invalid();
      width = view.getUint32(16); height = view.getUint32(20);
    } else if (format === 'image/jpeg') {
      let offset = 2;
      const frames = [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf];
      while (offset < bytes.length) {
        if (bytes[offset++] !== 0xff) throw invalid();
        while (bytes[offset] === 0xff) offset++;
        const marker = bytes[offset++];
        if (marker === 0xd9 || marker === 0xda) break;
        if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
        const length = view.getUint16(offset);
        if (length < 2 || offset + length > bytes.length) throw invalid();
        if (frames.includes(marker)) {
          if (length < 8) throw invalid();
          height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
        }
        offset += length;
      }
    } else {
      const tag = ascii(12); const start = 20;
      const u24 = (i: number) => bytes[i] + (bytes[i + 1] << 8) + (bytes[i + 2] << 16);
      if (tag === 'VP8X' && bytes.length >= 30) {
        if (bytes[start] & 2) throw new ImageError('Utiliza una fotografía estática; las imágenes WebP animadas no son compatibles.');
        width = u24(start + 4) + 1; height = u24(start + 7) + 1;
      } else if (tag === 'VP8L' && bytes[start] === 0x2f && bytes.length >= 25) {
        const packed = view.getUint32(start + 1, true);
        width = (packed & 0x3fff) + 1; height = ((packed >>> 14) & 0x3fff) + 1;
      } else if (tag === 'VP8 ' && bytes[start + 3] === 0x9d && bytes[start + 4] === 1 && bytes[start + 5] === 0x2a) {
        width = view.getUint16(start + 6, true) & 0x3fff; height = view.getUint16(start + 8, true) & 0x3fff;
      }
    }
  } catch (error) { if (error instanceof ImageError) throw error; throw invalid(); }
  if (!width || !height) throw invalid();
  validateDimensions(width, height);
  return { width, height };
}
