import { describe, expect, it } from 'vitest';
import { assertWorkingSize, jpegOrientation, workingDimensions } from './image-preparation';
describe('Resource sizing and EXIF orientation', () => {
  it.each([[8000,4000,2048,1024],[4000,8000,1024,2048],[600,400,600,400],[1,1,1,1]])('fits %i × %i without cropping or upscaling', (w,h,ow,oh) => {
    expect(workingDimensions(w,h)).toEqual({width:ow,height:oh});
  });
  it('rejects a decoder ignoring requested size', () => { expect(()=>assertWorkingSize(4096,2048)).toThrow('memoria'); });
  it.each([false,true])('reads TIFF endian mode %s and all orientation values', little => {
    for(let orientation=1;orientation<=8;orientation++) {
      const bytes=new Uint8Array(40);const view=new DataView(bytes.buffer);
      bytes.set([255,216,255,225]);view.setUint16(4,34);bytes.set(new TextEncoder().encode('Exif\0\0'),6);
      view.setUint16(12,little?0x4949:0x4d4d);view.setUint16(14,42,little);view.setUint32(16,8,little);
      view.setUint16(20,1,little);view.setUint16(22,0x112,little);view.setUint16(24,3,little);view.setUint32(26,1,little);view.setUint16(30,orientation,little);
      expect(jpegOrientation(bytes)).toBe(orientation);
      expect(jpegOrientation(bytes.slice(0,25))).toBe(1);
    }
  });
  it('handles files without EXIF', () => expect(jpegOrientation(new Uint8Array([255,216,255,217]))).toBe(1));
});
