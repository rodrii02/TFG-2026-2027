import { Injectable } from '@angular/core';
import { Camera, CameraDirection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { cameraError, CaptureCancelled, isCaptureCancelled } from './capture-errors';
import { boundedImageBlob, localNativeUrl } from './native-image';
import { WORKING_IMAGE_SIDE } from '../processing/image-preparation';
export { CaptureCancelled } from './capture-errors';
@Injectable({ providedIn: 'root' })
export class AcquisitionService {
  async nativePhoto(): Promise<File> {
    let result;
    try {
      result = await Camera.takePhoto({ quality: 95, cameraDirection: CameraDirection.Rear,
        saveToGallery: false, targetWidth: WORKING_IMAGE_SIDE, targetHeight: WORKING_IMAGE_SIDE,
        correctOrientation: true, includeMetadata: false, editable: 'no' });
    } catch (error) {
      if (isCaptureCancelled(error)) throw new CaptureCancelled();
      // Diagnostic category only. Never log a private URI, thumbnail or EXIF metadata.
      console.warn('[MicroFoodScan] native-camera acquisition failed');
      throw new Error(cameraError(error));
    }
    const path = result.webPath || result.uri;
    if (!path) throw new Error('La cámara no ha devuelto una imagen. Inténtalo de nuevo.');
    return this.fromNativePath(path);
  }
  async fromNativePath(path: string): Promise<File> {
    if (!Capacitor.isNativePlatform()) throw new Error('La ruta de cámara solo puede abrirse en la aplicación instalada.');
    const url = localNativeUrl(path, location.href, Capacitor.convertFileSrc);
    const response = await fetch(url, { redirect: 'error' });
    const blob = await boundedImageBlob(response);
    return new File([blob], 'foto-matriz.' + (blob.type === 'image/png' ? 'png' : 'jpg'), { type: blob.type });
  }
  async openWebCamera(): Promise<MediaStream> {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('La cámara necesita HTTPS o localhost y un navegador compatible. Puedes cargar una imagen.');
    try { return await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); }
    catch (error) { throw new Error(cameraError(error)); }
  }
  async captureFrame(video: HTMLVideoElement): Promise<File> {
    if (video.readyState < 2 || video.videoWidth <= 0) throw new Error('La cámara todavía no está lista. Espera un momento.');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Este navegador no permite capturar la imagen.');
    context.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    canvas.width = 0; canvas.height = 0;
    if (!blob) throw new Error('No se ha podido crear la fotografía.');
    return new File([blob], 'foto-matriz.jpg', { type: 'image/jpeg' });
  }
}
