export class CaptureCancelled extends Error {}
function details(error: unknown): { name: string; code: string; message: string } {
  if (!error || typeof error !== 'object') return { name:'', code:'', message:String(error) };
  const record = error as Record<string, unknown>;
  return { name:String(record['name'] ?? ''), code:String(record['code'] ?? ''), message:String(record['message'] ?? '') };
}
export function isCaptureCancelled(error: unknown): boolean {
  const { code, message } = details(error);
  return error instanceof CaptureCancelled || ['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0020'].includes(code) || /cancel/i.test(message);
}
export function cameraError(error: unknown): string {
  const { name, code, message } = details(error);
  if (name === 'NotAllowedError' || ['OS-PLUG-CAMR-0003', 'OS-PLUG-CAMR-0005'].includes(code) || /permission|denied/i.test(message)) return 'No se ha autorizado la cámara o la galería. Habilita el acceso en los ajustes del dispositivo o del navegador, o carga una imagen.';
  if (name === 'NotFoundError' || code === 'OS-PLUG-CAMR-0007') return 'No hay ninguna cámara disponible. Puedes cargar una imagen.';
  if (name === 'NotReadableError') return 'La cámara está ocupada. Cierra otras aplicaciones que la estén usando.';
  return 'No se ha podido obtener la foto. Puedes volver a intentarlo o cargar una imagen.';
}
