import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp } from '@ionic/angular';
import { WebLayoutComponent } from './layouts/web-layout.component';
import { MobileLayoutComponent } from './layouts/mobile-layout.component';
import { PlatformService } from './core/platform.service';
import { PreferencesService } from './core/preferences.service';
import { NativeLifecycleService } from './core/native-lifecycle.service';
@Component({ selector: 'app-root', imports: [IonApp, RouterOutlet, WebLayoutComponent, MobileLayoutComponent], template: `
  <ion-app [class.native-app]="platform.native" [class.browser-app]="!platform.native">
    <a class="skip-link" href="#main-content">Saltar al contenido</a>
    @if (platform.native) { <app-mobile-layout><router-outlet (activate)="activated()" /></app-mobile-layout> }
    @else { <app-web-layout><router-outlet (activate)="activated()" /></app-web-layout> }
    @if (preferences.warning() || nativeWarning() || lifecycle.recoveryNotice()) { <div class="storage-warning" role="status">{{preferences.warning() || nativeWarning() || lifecycle.recoveryNotice()}}</div> }
  </ion-app>` })
export class AppComponent {
  readonly platform = inject(PlatformService); readonly preferences = inject(PreferencesService);
  readonly nativeWarning = signal(''); readonly lifecycle = inject(NativeLifecycleService);
  constructor() { void this.lifecycle.init().catch(() => this.nativeWarning.set('No se ha podido activar la recuperación de cámara. Si la app se cierra, carga de nuevo la foto.')); }
  activated(): void {
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('#main-content h1')?.focus({ preventScroll: true });
      document.querySelector('ion-content')?.scrollToTop(0);
      window.scrollTo(0, 0);
    });
  }
}
