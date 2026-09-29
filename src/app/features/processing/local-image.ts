import { encodedDimensions } from './encoded-dimensions';
import { ImageError, MAX_FILE_BYTES, validateFile } from './image-quality';
import { assertWorkingSize, jpegOrientation, MAX_HEADER_BYTES, WORKING_IMAGE_PIXELS, workingDimensions } from './image-preparation';
import { LocalImage } from './models';

export async function loadLocalImage(file: File, source: LocalImage['source'], signal?: AbortSignal): Promise<LocalImage> {
  signal?.throwIfAborted();
  if (file.size > MAX_FILE_BYTES) throw new ImageError('La imagen supera los 20 MB. Exporta una copia más pequeña.');
  // Only a bounded compressed header is read into JS memory. Never materialize the full original as base64/ArrayBuffer.
  const header = new Uint8Array(await file.slice(0, MAX_HEADER_BYTES).arrayBuffer());
  const format = validateFile(file.size, header);
  const original = encodedDimensions(header, format);
  const orientation = format === 'image/jpeg' ? jpegOrientation(header) : 1;
  const rotated = orientation >= 5;
  const target = workingDimensions(rotated ? original.height : original.width, rotated ? original.width : original.height);
  signal?.throwIfAborted();
  const blob = new Blob([file], { type: format });
  let bitmap: ImageBitmap | undefined;
  let img: HTMLImageElement | undefined;
  let originalUrl: string | undefined;
  let outputUrl: string | undefined;
  const canvas = document.createElement('canvas');
  try {
    if (typeof createImageBitmap === 'function') {
      // A single dimension preserves aspect ratio, including EXIF orientation.
      bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image', resizeWidth: target.width, resizeQuality: 'high' });
      assertWorkingSize(bitmap.width, bitmap.height);
      canvas.width = bitmap.width; canvas.height = bitmap.height;
    } else {
      // Older WebViews must NOT decode a large original just to resize it afterwards.
      if (original.width * original.height > WORKING_IMAGE_PIXELS || Math.max(original.width, original.height) > 2048) {
        throw new ImageError('Este navegador no puede reducir esta foto con seguridad. Exporta una copia de hasta 2048 píxeles por lado.');
      }
      originalUrl = URL.createObjectURL(blob);
      img = new Image(); img.src = originalUrl;
      await img.decode();
      assertWorkingSize(img.naturalWidth, img.naturalHeight);
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    }
    signal?.throwIfAborted();
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No hay un contexto gráfico disponible.');
    context.drawImage(bitmap ?? img!, 0, 0);
    // Lossless output; no contrast, color or sharpening filters are applied.
    const prepared = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    signal?.throwIfAborted();
    if (!prepared) throw new Error('No se ha podido preparar la imagen.');
    outputUrl = URL.createObjectURL(prepared);
    return {
      url: outputUrl, name: file.name, width: canvas.width, height: canvas.height,
      bytes: file.size, format, source,
      preparation: { originalWidth: original.width, originalHeight: original.height, resized: target.width < (rotated ? original.height : original.width) },
    };
  } catch (error) {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    if (error instanceof DOMException && ['InvalidStateError', 'EncodingError'].includes(error.name)) {
      throw new ImageError('No se ha podido abrir la imagen. Puede estar dañada o incompleta. Prueba con otra foto.');
    }
    throw error;
  } finally {
    bitmap?.close(); img?.removeAttribute('src');
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    canvas.width = 0; canvas.height = 0;
  }
}
export function releaseImage(image: LocalImage): void { URL.revokeObjectURL(image.url); }
