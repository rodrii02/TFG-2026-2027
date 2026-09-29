import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadLocalImage } from './local-image';
const fixture=()=>new File([readFileSync('src/assets/example-matrix.png')],'matrix.png');
describe('Image resource ownership', () => {
  let close:ReturnType<typeof vi.fn>, bitmap:ReturnType<typeof vi.fn>, canvas:HTMLCanvasElement, revoke:ReturnType<typeof vi.spyOn>;
  beforeEach(()=>{
    close=vi.fn(); bitmap=vi.fn(async()=>({width:1200,height:800,close}));
    vi.stubGlobal('createImageBitmap',bitmap);
    canvas={width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toBlob:(cb:BlobCallback)=>cb(new Blob(['prepared'],{type:'image/png'}))} as unknown as HTMLCanvasElement;
    vi.stubGlobal('document',{createElement:()=>canvas});
    vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:prepared');revoke=vi.spyOn(URL,'revokeObjectURL');
  });
  afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
  it('closes the decoded bitmap and canvas after preparing one preview URL',async()=>{
    const image=await loadLocalImage(fixture(),'gallery');
    expect(image.url).toBe('blob:prepared');expect(close).toHaveBeenCalledOnce();expect(canvas.width).toBe(0);expect(revoke).not.toHaveBeenCalled();
  });
  it('frees the decoder on aborted selection and creates no preview',async()=>{
    const abort=new AbortController();bitmap.mockImplementationOnce(async()=>{abort.abort();return {width:1200,height:800,close};});
    await expect(loadLocalImage(fixture(),'gallery',abort.signal)).rejects.toMatchObject({name:'AbortError'});
    expect(close).toHaveBeenCalledOnce();expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
  it('distinguishes corrupt data from a graphics resource failure',async()=>{
    bitmap.mockRejectedValueOnce(new DOMException('bad data','InvalidStateError'));
    await expect(loadLocalImage(fixture(),'file')).rejects.toThrow('dañada');
    bitmap.mockRejectedValueOnce(new Error('GPU unavailable'));
    await expect(loadLocalImage(fixture(),'file')).rejects.toThrow('GPU unavailable');
  });
  it('does not decode oversized file headers',async()=>{
    const bytes=Buffer.from(readFileSync('src/assets/example-matrix.png'));bytes.writeUInt32BE(32000,16);
    await expect(loadLocalImage(new File([bytes],'too-wide.png'),'file')).rejects.toThrow('memoria');expect(bitmap).not.toHaveBeenCalled();
  });
  it('closes a bitmap that ignores the requested output size',async()=>{
    bitmap.mockResolvedValueOnce({width:8000,height:4000,close});
    await expect(loadLocalImage(fixture(),'file')).rejects.toThrow('reducir');expect(close).toHaveBeenCalledOnce();
  });
  it('refuses a large fallback decode when createImageBitmap is unavailable',async()=>{
    vi.stubGlobal('createImageBitmap',undefined);const image=vi.fn();vi.stubGlobal('Image',image);
    const bytes=Buffer.from(readFileSync('src/assets/example-matrix.png'));bytes.writeUInt32BE(6000,16);bytes.writeUInt32BE(3000,20);
    await expect(loadLocalImage(new File([bytes],'large.png'),'file')).rejects.toThrow('2048');expect(image).not.toHaveBeenCalled();
  });
});
