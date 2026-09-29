import { describe, expect, it } from 'vitest';
import { detectFormat, inspectQuality, MAX_FILE_BYTES, MAX_IMAGE_PIXELS, validateDimensions, validateFile } from './image-quality';
import { LocalImage } from './models';
const png = new Uint8Array([137,80,78,71,13,10,26,10]);
const image: LocalImage = { url:'blob:local', name:'sample.png', width:1200, height:800, bytes:2000, format:'image/png', source:'example' };
describe('Technical checks without scientific claims', () => {
  it('recognizes binary signatures, independent of the extension or supplied MIME type', () => {
    expect(validateFile(100, png)).toBe('image/png');
    expect(detectFormat(new Uint8Array([255,216,255,224]))).toBe('image/jpeg');
    expect(detectFormat(new TextEncoder().encode('RIFF0000WEBP'))).toBe('image/webp');
  });
  it.each(['<svg onload="alert(1)">', 'fake-image.jpg', 'GIF89a', '', '%PDF'])('rejects unsupported or spoofed data %s', data => {
    expect(() => validateFile(100, new TextEncoder().encode(data))).toThrow('Formato no compatible');
  });
  it('rejects truncated signatures', () => expect(detectFormat(png.slice(0,5))).toBeNull());
  it('bounds resource consumption by file size', () => {
    expect(() => validateFile(0, png)).toThrow('vacío');
    expect(() => validateFile(MAX_FILE_BYTES + 1, png)).toThrow('20 MB');
    expect(validateFile(MAX_FILE_BYTES, png)).toBe('image/png');
  });
  it.each([[0,400],[-1,500],[NaN,30],[Infinity,100],[0.4,10]])('rejects invalid dimensions %s × %s', (w,h) => expect(() => validateDimensions(w,h)).toThrow());
  it('enforces memory limits on both pixels and longest edge', () => {
    expect(() => validateDimensions(8000,4000)).not.toThrow();
    expect(() => validateDimensions(8000,4001)).toThrow('memoria');
    expect(() => validateDimensions(17000,1)).toThrow('memoria');
    expect(8000 * 4000).toBe(MAX_IMAGE_PIXELS);
  });
  it('does not treat small images as scientifically adequate or invent a resolution threshold', () => {
    expect(() => validateDimensions(1,1)).not.toThrow();
    const report = inspectQuality({ ...image, width:1, height:1 });
    expect(report.outcome).toBe('indeterminate');
    expect(report.checks.filter(c => c.status === 'checked').map(c => c.id)).toEqual(['format','dimensions']);
    expect(report.checks.filter(c => c.status === 'pending').map(c => c.id)).toEqual(['focus','lighting','framing']);
  });
});
