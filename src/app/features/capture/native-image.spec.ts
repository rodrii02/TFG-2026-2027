import { describe, expect, it, vi } from 'vitest';
import { boundedImageBlob, localNativeUrl } from './native-image';
import { MAX_FILE_BYTES } from '../processing/image-quality';
describe('Local Capacitor image access', () => {
  it.each(['https://localhost/inicio','capacitor://localhost/inicio'])('allows only local file/content routes: %s', base => {
    const convert=vi.fn((path:string)=>base.replace('/inicio','')+'/_capacitor_content_/'+path.slice('content://'.length));
    expect(localNativeUrl('content://media/1',base,convert).pathname).toBe('/_capacitor_content_/media/1');
    expect(localNativeUrl('/_capacitor_file_/tmp/a.jpg',base,convert).pathname).toBe('/_capacitor_file_/tmp/a.jpg');
    for(const path of ['https://remote.example/a.jpg','capacitor://evil/_capacitor_file_/a','/_capacitor_bad_/a','/assets/secret','data:image/png;base64,AA']) expect(()=>localNativeUrl(path,base,convert)).toThrow();
  });
  it('reports inaccessible photos instead of attempting to decode an error body', async () => {
    await expect(boundedImageBlob(new Response('denied',{status:403}))).rejects.toThrow('acceder');
  });
  it('does not read a response advertised as oversized', async () => {
    const response=new Response(new Uint8Array([1]),{headers:{'Content-Length':String(MAX_FILE_BYTES+1)}});
    const reader=vi.spyOn(response.body!,'getReader');
    await expect(boundedImageBlob(response)).rejects.toThrow('20 MB'); expect(reader).not.toHaveBeenCalled();
  });
  it('bounds actual streamed bytes even without a content length and cancels the stream', async () => {
    const cancel=vi.fn();
    const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(1024*1024));},cancel});
    await expect(boundedImageBlob(new Response(stream))).rejects.toThrow('20 MB'); expect(cancel).toHaveBeenCalled();
  });
  it('preserves the local compressed image bytes', async () => {
    const bytes=new Uint8Array([137,80,78,71]);
    const blob=await boundedImageBlob(new Response(bytes,{headers:{'Content-Type':'image/png'}}));
    expect(blob.type).toBe('image/png'); expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
  });
});
