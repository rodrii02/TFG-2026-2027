import { ImageFormat, LocalImage, QualityReport } from './models';
// Resource limits, not validated assay thresholds. No lower scientific resolution threshold is claimed.
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 32_000_000;
export const MAX_IMAGE_SIDE = 16_384;
export class ImageError extends Error {}
export function detectFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  const png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length >= 8 && png.every((b, i) => b === bytes[i])) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
export function validateFile(size: number, bytes: Uint8Array): ImageFormat {
  if (!Number.isFinite(size) || size <= 0) throw new ImageError('El archivo está vacío. Selecciona otra imagen.');
  if (size > MAX_FILE_BYTES) throw new ImageError('La imagen supera los 20 MB. Exporta una copia más pequeña.');
  const format = detectFormat(bytes);
  if (!format) throw new ImageError('Formato no compatible. Utiliza una imagen JPEG, PNG o WebP. Para HEIC, exporta una copia JPEG.');
  return format;
}
export function validateDimensions(width: number, height: number): void {
  if (![width, height].every(n => Number.isInteger(n) && n > 0)) throw new ImageError('No se pueden leer las dimensiones de la imagen.');
  if (width * height > MAX_IMAGE_PIXELS || Math.max(width, height) > MAX_IMAGE_SIDE) {
    throw new ImageError('La imagen supera el límite de memoria (32 megapíxeles o 16.384 píxeles por lado). Reduce su tamaño.');
  }
}
export function inspectQuality(image: LocalImage): QualityReport {
  validateDimensions(image.width, image.height);
  return { scope: 'technical-file', outcome: 'indeterminate', technicallyReadable: true, checks: [
    { id: 'format', label: 'Archivo legible', status: 'checked', detail: `${image.format.replace('image/', '').toUpperCase()} · firma y decodificación comprobadas` },
    { id: 'dimensions', label: 'Dimensiones comprobadas', status: 'checked', detail: `${image.width} × ${image.height} px · dentro del límite de memoria` },
    { id: 'focus', label: 'Enfoque', status: 'pending', detail: 'Pendiente de calibración. Revisa la nitidez de la foto.' },
    { id: 'lighting', label: 'Iluminación', status: 'pending', detail: 'Pendiente de calibración. Comprueba que no haya sombras ni reflejos.' },
    { id: 'framing', label: 'Encuadre de la matriz', status: 'pending', detail: 'Pendiente de calibración. Comprueba que la matriz esté completa.' },
  ] };
}
