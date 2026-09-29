import { Injectable, computed, signal } from '@angular/core';
import { AnalysisSession, canAnalyze, initialState } from './analysis-session';
import { loadLocalImage, releaseImage } from '../features/processing/local-image';
import { validateWithPython } from '../features/processing/python-validator';
import { LfaReader } from '../features/processing/lfa-reader';
@Injectable({ providedIn: 'root' })
export class AnalysisStore {
  private readonly value = signal(initialState());
  readonly state = this.value.asReadonly();
  readonly canAnalyze = computed(() => canAnalyze(this.state()));
  readonly busy = computed(() => ['checking', 'analyzing'].includes(this.state().phase));
  readonly session = new AnalysisSession({
    load: loadLocalImage, release: releaseImage, validate: validateWithPython,
    analyze: image => new LfaReader().analyze(image), changed: state => this.value.set(state),
  });
}
