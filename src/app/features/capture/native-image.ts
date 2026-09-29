import { ImageError, MAX_FILE_BYTES } from '../processing/image-quality';

export function localNativeUrl(path: string, base: string, convert: (path: string) => string): URL {
  const converted = /^(file|content):\/\//.test(path) ? convert(path) : path;
  const url = new URL(converted, base), origin = new URL(base);
  // Custom iOS schemes have origin "null": comparing origin alone is insufficient.
  if (url.protocol !== origin.protocol || url.host !== origin.host || !/^\/_capacitor_(file|content)_\//.test(url.pathname)) {
    throw new Error('El dispositivo no ha devuelto una ruta local válida. Elige otra imagen.');
  }
  return url;
}

export async function boundedImageBlob(response: Response): Promise<Blob> {
  if (!response.ok) throw new Error('No se puede acceder a la foto seleccionada. Vuelve a intentarlo.');
  const tooLarge = () => new ImageError('La imagen supera los 20 MB. Exporta una copia más pequeña.');
  if (Number(response.headers.get('Content-Length')) > MAX_FILE_BYTES) {
    await response.body?.cancel(); throw tooLarge();
  }
  if (!response.body) {
    const blob = await response.blob(); if (blob.size > MAX_FILE_BYTES) throw tooLarge(); return blob;
  }
  const reader = response.body.getReader();
  const chunks: BlobPart[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FILE_BYTES) { await reader.cancel(); throw tooLarge(); }
      chunks.push(new Uint8Array(value));
    }
    return new Blob(chunks, { type: response.headers.get('Content-Type') ?? '' });
  } finally { reader.releaseLock(); }
}
