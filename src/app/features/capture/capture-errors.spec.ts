import { describe, expect, it } from 'vitest';
import { cameraError, isCaptureCancelled } from './capture-errors';
describe('Web and native camera errors', () => {
  it.each(['OS-PLUG-CAMR-0006', 'OS-PLUG-CAMR-0020'])('recognizes structured cancellation %s', code => expect(isCaptureCancelled({code})).toBe(true));
  it('does not confuse permission denial with user cancellation', () => {
    expect(isCaptureCancelled({code:'OS-PLUG-CAMR-0003'})).toBe(false);
    expect(cameraError({code:'OS-PLUG-CAMR-0003'})).toContain('No se ha autorizado');
    expect(cameraError({code:'OS-PLUG-CAMR-0005'})).toContain('galería');
  });
  it('gives useful recovery guidance for browser errors', () => {
    expect(cameraError(new DOMException('denied','NotAllowedError'))).toContain('ajustes');
    expect(cameraError(new DOMException('not found','NotFoundError'))).toContain('cargar una imagen');
    expect(cameraError(new DOMException('busy','NotReadableError'))).toContain('ocupada');
  });
});
