import { describe, expect, it, vi } from 'vitest';
import { AnalysisSession, canAnalyze } from './analysis-session';
import { LfaReader } from '../features/processing/lfa-reader';
import { AnalysisResult, LocalImage, QualityReport } from '../features/processing/models';
import { ImageError, inspectQuality } from '../features/processing/image-quality';
const img: LocalImage = { url:'blob:sample', name:'sample.png', width:1200, height:800, bytes:3000, format:'image/png', source:'example' };
const file = new File(['test'], 'example.png');
const report = (outcome: QualityReport['outcome']): QualityReport => ({ ...inspectQuality(img), outcome });
const deferred = <T>() => { let resolve!: (value:T) => void; let reject!: (error:unknown) => void; const promise = new Promise<T>((yes,no) => {resolve=yes; reject=no;}); return {promise,resolve,reject}; };
function setup(outcome: QualityReport['outcome'] = 'indeterminate') {
  // Explicit test double for state transitions. Production uses the Python file validator.
  const deps = {load:vi.fn(async () => img), validate:vi.fn(async () => report(outcome)), analyze:vi.fn((image:LocalImage) => new LfaReader().analyze(image)), release:vi.fn(), changed:vi.fn()};
  return {session:new AnalysisSession(deps), deps};
}
describe('Automatic validation and analysis transitions', () => {
  it('cannot analyze or retry an empty session', async () => {
    const {session,deps}=setup(); expect(await session.analyze()).toBe(false); expect(await session.retry()).toBe(false); expect(deps.analyze).not.toHaveBeenCalled();
  });
  it.each(['valid','invalid','indeterminate'] as const)('automatically validates selection: %s', async outcome => {
    const {session,deps}=setup(outcome); const selection=session.select(file,'gallery');
    expect(session.state.phase).toBe('checking'); expect(canAnalyze(session.state)).toBe(false);
    await selection; expect(session.state.phase).toBe(outcome); expect(deps.validate).toHaveBeenCalledTimes(1);
    expect(canAnalyze(session.state)).toBe(outcome==='valid');
    expect(await session.analyze()).toBe(outcome==='valid');
    expect(deps.analyze).toHaveBeenCalledTimes(outcome==='valid'?1:0);
  });
  it('uses the real pending validator by default and cannot bypass it', async () => {
    const {deps}=setup('valid'); const session=new AnalysisSession({...deps,validate:undefined});
    await session.select(file,'camera'); expect(session.state.phase).toBe('indeterminate'); expect(await session.analyze()).toBe(false);
  });
  it('does not trust an unknown or missing validation result', async () => {
    const {session,deps}=setup(); deps.validate.mockResolvedValueOnce(undefined as unknown as QualityReport);
    await session.select(file,'file'); expect(session.state.phase).toBe('indeterminate'); expect(canAnalyze(session.state)).toBe(false);
  });
  it('shows preview while checking but blocks analysis until a positive result', async () => {
    const {session,deps}=setup(); const check=deferred<QualityReport>(); deps.validate.mockReturnValueOnce(check.promise);
    const selecting=session.select(file,'camera'); await vi.waitFor(()=>expect(deps.validate).toHaveBeenCalled());
    expect(session.state.image).toBe(img); expect(session.state.phase).toBe('checking'); expect(await session.analyze()).toBe(false);
    check.resolve(report('valid')); await selecting; expect(canAnalyze(session.state)).toBe(true);
  });
  it('distinguishes invalid file from technical failure, clearing previous success', async () => {
    const {session,deps}=setup('valid'); await session.select(file,'file');
    deps.load.mockRejectedValueOnce(new ImageError('Formato no compatible'));
    await session.select(file,'file'); expect(session.state.phase).toBe('invalid'); expect(session.state.image).toBeNull(); expect(session.state.result).toBeNull(); expect(canAnalyze(session.state)).toBe(false);
    deps.load.mockRejectedValueOnce(new Error('Canvas unavailable'));
    await session.select(file,'file'); expect(session.state.phase).toBe('error'); expect(await session.analyze()).toBe(false);
    await session.retry(); expect(session.state.phase).toBe('valid');
  });
  it('a validation exception preserves preview and offers retry without decoding again', async () => {
    const {session,deps}=setup('valid'); deps.validate.mockRejectedValueOnce(new Error('temporary failure'));
    await session.select(file,'file'); expect(session.state.phase).toBe('error'); expect(session.state.image).toBe(img); expect(canAnalyze(session.state)).toBe(false);
    await session.retry(); expect(session.state.phase).toBe('valid'); expect(deps.load).toHaveBeenCalledTimes(1);
  });
  it('serializes decoders and keeps only the latest rapidly selected file', async () => {
    const {session,deps}=setup(); const first=deferred<LocalImage>(); deps.load.mockReturnValueOnce(first.promise);
    const a=session.select(file,'gallery'); await vi.waitFor(()=>expect(deps.load).toHaveBeenCalledTimes(1));
    const b=session.select(file,'file'); const second={...img,url:'blob:new'}; deps.load.mockResolvedValueOnce(second);
    expect(deps.load).toHaveBeenCalledTimes(1); first.resolve(img); await Promise.all([a,b]);
    expect(session.state.image).toBe(second); expect(deps.release).toHaveBeenCalledWith(img); expect(deps.validate).toHaveBeenCalledTimes(1);
  });
  it.each(['resolve','reject'])('ignores an obsolete validation %s without releasing an image still in use', async mode => {
    const {session,deps}=setup('valid'); const check=deferred<QualityReport>(); deps.validate.mockReturnValueOnce(check.promise);
    const a=session.select(file,'gallery'); await vi.waitFor(()=>expect(deps.validate).toHaveBeenCalledTimes(1));
    const replacement={...img,url:'blob:replacement'}; deps.load.mockResolvedValueOnce(replacement); deps.validate.mockResolvedValueOnce(report('invalid'));
    const b=session.select(file,'file'); expect(session.state.image).toBeNull(); expect(canAnalyze(session.state)).toBe(false); expect(deps.release).not.toHaveBeenCalled();
    if(mode==='resolve') check.resolve(report('valid')); else check.reject(new Error('obsolete'));
    await Promise.all([a,b]); expect(session.state.phase).toBe('invalid'); expect(session.state.error).toBeNull(); expect(session.state.image).toBe(replacement); expect(deps.release).toHaveBeenCalledWith(img);
  });
  it('reset during decoding releases the eventual image and does not validate', async () => {
    const {session,deps}=setup(); const loaded=deferred<LocalImage>(); deps.load.mockReturnValueOnce(loaded.promise);
    const pending=session.select(file,'file'); await vi.waitFor(()=>expect(deps.load).toHaveBeenCalled()); session.reset(); loaded.resolve(img); await pending;
    expect(session.state.phase).toBe('empty'); expect(deps.release).toHaveBeenCalledWith(img); expect(deps.validate).not.toHaveBeenCalled();
  });
  it('does not finish analysis early, start two analyses or revive a discarded result', async () => {
    const {session,deps}=setup('valid'); await session.select(file,'file'); const analysis=deferred<AnalysisResult>(); deps.analyze.mockReturnValueOnce(analysis.promise);
    const pending=session.analyze(); await vi.waitFor(()=>expect(deps.analyze).toHaveBeenCalled()); expect(session.state.phase).toBe('analyzing'); expect(session.state.result).toBeNull(); expect(await session.analyze()).toBe(false);
    session.reset(); analysis.resolve(await new LfaReader().analyze(img)); expect(await pending).toBe(false); expect(session.state.phase).toBe('empty'); expect(deps.release).toHaveBeenCalledWith(img);
  });
  it('can retry analysis and clears completed results on replacement', async () => {
    const {session,deps}=setup('valid'); await session.select(file,'camera'); deps.analyze.mockRejectedValueOnce(new Error('failure'));
    expect(await session.analyze()).toBe(false); expect(session.state.phase).toBe('valid'); expect(session.state.error).toContain('análisis');
    expect(await session.analyze()).toBe(true); expect(session.state.phase).toBe('result');
    await session.select(file,'gallery'); expect(session.state.result).toBeNull(); expect(session.state.error).toBeNull();
  });
});
