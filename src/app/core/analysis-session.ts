import { AnalysisResult, LocalImage, QualityReport } from '../features/processing/models';
import { ImageError, inspectQuality } from '../features/processing/image-quality';
export type Phase = 'empty' | 'checking' | 'valid' | 'invalid' | 'indeterminate' | 'error' | 'analyzing' | 'result';
export interface SessionState {
  readonly phase: Phase;
  readonly image: LocalImage | null;
  readonly quality: QualityReport | null;
  readonly result: AnalysisResult | null;
  readonly error: string | null;
}
export const initialState = (): SessionState => ({ phase: 'empty', image: null, quality: null, result: null, error: null });
export function canAnalyze(state: SessionState): boolean {
  return state.phase === 'valid' && !!state.image && state.quality?.outcome === 'valid' && state.quality.technicallyReadable === true && state.quality.scope === 'technical-file';
}
interface SessionDependencies {
  load: (file: File, source: LocalImage['source'], signal: AbortSignal) => Promise<LocalImage>;
  validate?: (image: LocalImage, signal: AbortSignal) => Promise<QualityReport>;
  analyze: (image: LocalImage) => Promise<AnalysisResult>;
  release: (image: LocalImage) => void;
  changed: (state: SessionState) => void;
}
// One queue owns decoding/validation/analysis. Replacement aborts the previous operation,
// invalidates its result immediately, and waits for resources to be released before starting.
export class AnalysisSession {
  state = initialState();
  private operation = 0;
  private abort = new AbortController();
  private tail: Promise<unknown> = Promise.resolve();
  private inUse: LocalImage | null = null;
  private retired = new Set<LocalImage>();
  private retryFile: { file: File; source: LocalImage['source'] } | null = null;
  constructor(private readonly deps: SessionDependencies) {}
  private update(patch: Partial<SessionState>): void {
    this.state = { ...this.state, ...patch }; this.deps.changed(this.state);
  }
  private release(image: LocalImage): void {
    if (this.inUse === image) this.retired.add(image); else this.deps.release(image);
  }
  private unpin(image: LocalImage): void {
    this.inUse = null;
    if (this.retired.delete(image)) this.deps.release(image);
  }
  private enqueue<T>(run: () => Promise<T>): Promise<T> {
    const pending = this.tail.then(run); this.tail = pending.catch(() => undefined); return pending;
  }
  reset(): void {
    this.operation++; this.abort.abort(); this.abort = new AbortController(); this.retryFile = null;
    if (this.state.image) this.release(this.state.image);
    this.state = initialState(); this.deps.changed(this.state);
  }
  select(file: File, source: LocalImage['source']): Promise<boolean> {
    this.reset(); this.retryFile = { file, source };
    const token = this.operation, signal = this.abort.signal;
    this.update({ phase: 'checking' });
    return this.enqueue(async () => {
      if (token !== this.operation) return false;
      try {
        const image = await this.deps.load(file, source, signal);
        if (token !== this.operation) { this.deps.release(image); return false; }
        this.retryFile = null;
        this.update({ image });
        return await this.validate(image, token, signal);
      } catch (error) {
        if (token === this.operation) this.update({ phase: error instanceof ImageError ? 'invalid' : 'error', error: readableError(error) });
        return false;
      }
    });
  }
  private async validate(image: LocalImage, token: number, signal: AbortSignal): Promise<boolean> {
    this.inUse = image;
    try {
      const quality = this.deps.validate ? await this.deps.validate(image, signal) : inspectQuality(image);
      if (token !== this.operation) return false;
      // Fail closed for an absent or unknown result, even across future plugin boundaries.
      const outcome = quality?.outcome;
      const phase = outcome === 'valid' && quality.technicallyReadable && quality.scope === 'technical-file' ? 'valid' : outcome === 'invalid' ? 'invalid' : 'indeterminate';
      this.update({ quality: quality ?? null, phase, error: phase === 'invalid' ? quality?.message ?? null : null }); return true;
    } catch (error) {
      if (token === this.operation) this.update({ phase: error instanceof ImageError ? 'invalid' : 'error', quality: null, error: readableError(error) });
      return false;
    } finally { this.unpin(image); }
  }
  retry(): Promise<boolean> {
    if (this.state.phase !== 'error') return Promise.resolve(false);
    if (this.retryFile) return this.select(this.retryFile.file, this.retryFile.source);
    const image = this.state.image;
    if (!image) return Promise.resolve(false);
    const token = ++this.operation; this.abort.abort(); this.abort = new AbortController();
    const signal = this.abort.signal;
    this.update({ phase: 'checking', error: null, quality: null, result: null });
    return this.enqueue(() => token === this.operation ? this.validate(image, token, signal) : Promise.resolve(false));
  }
  async analyze(): Promise<boolean> {
    if (!canAnalyze(this.state) || !this.state.image) return false;
    const token = this.operation, image = this.state.image;
    this.update({ phase: 'analyzing', error: null });
    return this.enqueue(async () => {
      if (token !== this.operation) return false;
      this.inUse = image;
      try {
        const result = await this.deps.analyze(image);
        if (token !== this.operation) return false;
        this.update({ phase: 'result', result }); return true;
      } catch (error) {
        if (token === this.operation) this.update({ phase: 'valid', error: 'No se ha podido completar el análisis. Inténtalo de nuevo.' });
        return false;
      } finally { this.unpin(image); }
    });
  }
}
export function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'No se ha podido completar la operación. Inténtalo de nuevo.';
}
