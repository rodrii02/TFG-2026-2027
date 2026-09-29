import { ImageError, validateDimensions } from './image-quality';

// Resource budget for the prototype, NOT an assay resolution or quality threshold.
// A validated acquisition protocol must establish the required pixels per matrix point.
export const WORKING_IMAGE_SIDE = 2048;
export const WORKING_IMAGE_PIXELS = WORKING_IMAGE_SIDE ** 2;
export const MAX_HEADER_BYTES = 1024 * 1024;

export function workingDimensions(width: number, height: number): { width: number; height: number } {
  validateDimensions(width, height);
  const scale = Math.min(1, WORKING_IMAGE_SIDE / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// JPEG EXIF orientation is needed before calculating the decoder's output size.
// Pixel rotation itself is delegated to the browser's EXIF-aware decoder.
export function jpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let offset = 2;
  try {
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (marker === 0xe1 && String.fromCharCode(...bytes.slice(offset + 2, offset + 8)) === 'Exif\0\0') {
        const tiff = offset + 8;
        const endian = view.getUint16(tiff);
        if (endian !== 0x4949 && endian !== 0x4d4d) return 1;
        const little = endian === 0x4949;
        if (view.getUint16(tiff + 2, little) !== 42) return 1;
        const ifd = tiff + view.getUint32(tiff + 4, little);
        const count = view.getUint16(ifd, little);
        for (let i = 0; i < count; i++) {
          const pos = ifd + 2 + i * 12;
          if (pos + 12 > offset + length) break;
          if (view.getUint16(pos, little) === 0x112 && view.getUint16(pos + 2, little) === 3 && view.getUint32(pos + 4, little) === 1) {
            const value = view.getUint16(pos + 8, little);
            return value >= 1 && value <= 8 ? value : 1;
          }
        }
      }
      offset += length;
    }
  } catch { /* Incomplete optional EXIF does not replace the file decoder's validation. */ }
  return 1;
}

export function assertWorkingSize(width: number, height: number): void {
  if (width <= 0 || height <= 0 || width * height > WORKING_IMAGE_PIXELS || Math.max(width, height) > WORKING_IMAGE_SIDE) {
    throw new ImageError('No se ha podido reducir la imagen dentro del límite de memoria. Exporta una copia de hasta 2048 píxeles por lado.');
  }
}
