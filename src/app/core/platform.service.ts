import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
@Injectable({ providedIn: 'root' })
export class PlatformService {
  readonly native = Capacitor.isNativePlatform();
  readonly name = Capacitor.getPlatform();
}
