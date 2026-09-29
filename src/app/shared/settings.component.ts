import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { IonButton } from '@ionic/angular';
import { PreferencesService, THEMES } from '../core/preferences.service';
import { IconComponent } from './icon.component';
@Component({ selector: 'app-settings', imports: [IconComponent, IonButton], template: `
  <button class="icon-button settings-trigger" aria-label="Ajustes" title="Ajustes de apariencia" (click)="open()"><app-icon name="settings-outline" /></button>
  <dialog #dialog class="settings-dialog" aria-labelledby="settings-title" (click)="backdrop($event)">
    <div class="dialog-heading"><div><p class="eyebrow">A TU MANERA</p><h2 id="settings-title">Ajustes</h2></div>
      <button class="icon-button" aria-label="Cerrar ajustes" (click)="dialog.close()"><app-icon name="close-outline" /></button>
    </div>
    <p>Elige el estilo que te acompaña.</p>
    <fieldset class="theme-options"><legend class="sr-only">Estilo de la aplicación</legend>
      @for (theme of themes; track theme.id) {
        <label class="theme-choice" [class.chosen]="preferences.theme() === theme.id">
          <input type="radio" name="theme" [value]="theme.id" [checked]="preferences.theme() === theme.id" (change)="preferences.selectTheme(theme.id)">
          <span class="theme-preview" [class]="'theme-preview preview-' + theme.id" aria-hidden="true"><i></i><b></b><b></b></span>
          <span><strong>{{theme.name}}</strong><small>{{theme.description}}</small></span>
        </label>
      }
    </fieldset>
    <p class="micro muted"><app-icon name="save-outline" /> Tu elección se guarda en este dispositivo.</p>
    @if (preferences.warning()) { <p role="status" class="notice">{{preferences.warning()}}</p> }
    <ion-button expand="block" (click)="dialog.close()">Listo<app-icon name="checkmark-outline" /></ion-button>
  </dialog>` })
export class SettingsComponent {
  readonly preferences = inject(PreferencesService);
  readonly themes = THEMES;
  readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  open(): void { this.dialog().nativeElement.showModal(); }
  backdrop(event: MouseEvent): void {
    if (event.target !== this.dialog().nativeElement) return;
    const r = this.dialog().nativeElement.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) this.dialog().nativeElement.close();
  }
}
