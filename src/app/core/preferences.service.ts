import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
export type Theme = 'laboratory' | 'botanical' | 'editorial';
export const THEMES: readonly { id: Theme; name: string; description: string }[] = [
  { id: 'laboratory', name: 'Laboratorio claro', description: 'Precisión, espacio y superficies claras.' },
  { id: 'botanical', name: 'Botánico contemporáneo', description: 'Calidez, curvas y verdes suaves.' },
  { id: 'editorial', name: 'Editorial técnico', description: 'Contraste, geometría y carácter.' },
];
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<Theme>('laboratory');
  readonly welcomed = signal(false);
  readonly warning = signal('');
  private writes: Promise<void> = Promise.resolve();
  async init(): Promise<void> {
    try {
      const [theme, welcome] = await Promise.all([Preferences.get({ key: 'clarifica.theme' }), Preferences.get({ key: 'clarifica.welcome.v1' })]);
      if (THEMES.some(t => t.id === theme.value)) this.theme.set(theme.value as Theme);
      this.welcomed.set(welcome.value === 'done');
    } catch { this.warning.set('No se puede acceder al almacenamiento. Los ajustes se conservarán solo durante esta sesión.'); }
    this.apply();
  }
  selectTheme(theme: Theme): void {
    this.theme.set(theme); this.apply();
    this.persist('clarifica.theme', theme);
  }
  completeWelcome(): void { this.welcomed.set(true); this.persist('clarifica.welcome.v1', 'done'); }
  private apply(): void { this.document.documentElement.dataset['theme'] = this.theme(); }
  private persist(key: string, value: string): void {
    this.writes = this.writes.then(() => Preferences.set({ key, value })).catch(() => {
      this.warning.set('No se han podido guardar los ajustes. Se mantendrán durante esta sesión.');
    });
  }
}
