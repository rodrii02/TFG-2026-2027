import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { encodedDimensions } from './encoded-dimensions';
describe('Bounds before image decoding', () => {
  it('reads the PNG fixture without decoding it', () => expect(encodedDimensions(readFileSync('src/assets/example-matrix.png'),'image/png')).toEqual({width:1200,height:800}));
  it('rejects an oversized header before allocating pixels', () => {
    const bytes=Buffer.from(readFileSync('src/assets/example-matrix.png')); bytes.writeUInt32BE(16000,16); bytes.writeUInt32BE(16000,20);
    expect(()=>encodedDimensions(bytes,'image/png')).toThrow('memoria');
  });
  it('reads JPEG frame dimensions after an APP segment', () => {
    const bytes=new Uint8Array([255,216,255,224,0,4,0,0,255,192,0,11,8,3,32,4,176,1,1,17,0]);
    expect(encodedDimensions(bytes,'image/jpeg')).toEqual({width:1200,height:800});
  });
  it.each(['image/png','image/jpeg','image/webp'] as const)('rejects truncated %s headers', format => expect(()=>encodedDimensions(new Uint8Array([255,0]),format)).toThrow('No se ha podido abrir'));
  it('reads the lossless WebP format', () => {
    const bytes=new Uint8Array(25); bytes.set(new TextEncoder().encode('VP8L'),12); bytes[20]=0x2f;
    new DataView(bytes.buffer).setUint32(21,1199 | (799<<14),true);
    expect(encodedDimensions(bytes,'image/webp')).toEqual({width:1200,height:800});
  });
  it('rejects animated WebP instead of selecting an arbitrary frame', () => {
    const bytes=new Uint8Array(30);bytes.set(new TextEncoder().encode('VP8X'),12);bytes[20]=2;
    expect(()=>encodedDimensions(bytes,'image/webp')).toThrow('estática');
  });
});
