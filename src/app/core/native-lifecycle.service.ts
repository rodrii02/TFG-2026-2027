import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App, RestoredListenerEvent } from '@capacitor/app';
import { PlatformService } from './platform.service';
import { AnalysisStore } from './analysis.store';
import { AcquisitionService } from '../features/capture/acquisition.service';
import { isCaptureCancelled } from '../features/capture/capture-errors';

@Injectable({ providedIn: 'root' })
export class NativeLifecycleService {
  private readonly platform = inject(PlatformService); private readonly router = inject(Router);
  private readonly store = inject(AnalysisStore); private readonly acquisition = inject(AcquisitionService);
  readonly recoveryNotice = signal('');
  async init(): Promise<void> {
    if (!this.platform.native) return;
    await App.addListener('backButton', () => {
      const path = this.router.url;
      if (path === '/inicio' || path === '/bienvenida') { void App.minimizeApp().catch(() => undefined); return; }
      this.store.session.reset();
      void this.router.navigateByUrl(path === '/revision' || path === '/resultados' ? '/captura' : '/inicio');
    });
    await App.addListener('appRestoredResult', result => {
      void this.restore(result).catch(() => this.recoveryNotice.set('No se ha podido recuperar la foto. Vuelve a capturarla o elige una imagen.'));
    });
  }
  private async restore(result: RestoredListenerEvent): Promise<void> {
    if (result.pluginId !== 'Camera' || this.store.state().phase !== 'empty') return;
    if (!result.success) {
      this.recoveryNotice.set(isCaptureCancelled(result.error) ? 'Captura cancelada. Puedes volver a intentarlo.' : 'No se ha podido recuperar la foto. Elige una imagen o repite la captura.');
      return;
    }
    const data = result.data as { webPath?: string; uri?: string; results?: { webPath?: string; uri?: string }[] } | undefined;
    const photo = data?.results?.[0] ?? data;
    const path = photo?.webPath || photo?.uri;
    if (!path) { this.recoveryNotice.set('La captura recuperada no contiene una imagen. Vuelve a intentarlo.'); return; }
    await this.router.navigateByUrl('/captura');
    const state = this.store.state();
    const file = await this.acquisition.fromNativePath(path);
    // A restored activity must not overwrite a photo selected while its file was loading.
    if (state !== this.store.state()) return;
    this.recoveryNotice.set('');
    await this.store.session.select(file, result.methodName === 'chooseFromGallery' ? 'gallery' : 'camera');
  }
}
