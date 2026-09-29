import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PlatformService } from './platform.service';
import { PreferencesService } from './preferences.service';
import { AnalysisStore } from './analysis.store';
export const welcomeRequired: CanActivateFn = () => {
  const platform = inject(PlatformService); const preferences = inject(PreferencesService);
  return !platform.native || preferences.welcomed() || inject(Router).createUrlTree(['/bienvenida']);
};
export const welcomeOnly: CanActivateFn = () => {
  return inject(PlatformService).native && !inject(PreferencesService).welcomed() || inject(Router).createUrlTree(['/inicio']);
};
export const captureEntry: CanActivateFn = () => {
  const store = inject(AnalysisStore);
  if (['result'].includes(store.state().phase)) store.session.reset();
  return true;
};
export const resultRequired: CanActivateFn = () => {
  return inject(AnalysisStore).state().phase === 'result' || inject(Router).createUrlTree(['/captura']);
};
