import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonSpinner } from '@ionic/angular';
import { AnalysisStore } from '../../core/analysis.store';
import { IconComponent } from '../../shared/icon.component';

@Component({ selector: 'app-image-review', imports: [IonButton, IonSpinner, IconComponent], template: `
  <section class="image-review" aria-label="Comprobación de la imagen" [attr.aria-busy]="store.busy()">
    <div aria-live="polite" aria-atomic="true">
      @switch (store.state().phase) {
        @case ('checking') { <p class="busy-status"><ion-spinner name="crescent" />Comprobando si la imagen es válida…</p> }
        @case ('valid') { <div class="quality-summary"><app-icon name="checkmark-circle-outline" /><div><strong>Archivo válido para revisión técnica</strong><p>La imagen se puede leer y cumple el mínimo técnico de tamaño. Puedes continuar al informe. La matriz y las micotoxinas aún no se pueden interpretar.</p></div></div> }
        @case ('indeterminate') { <div class="quality-summary"><app-icon name="time-outline" /><div><strong>Pendiente de calibración</strong><p>No se ha obtenido una comprobación técnica concluyente. Analizar permanece deshabilitado.</p></div></div> }
        @case ('invalid') {
          <div class="error-notice"><app-icon name="alert-circle-outline" /><p>No hemos podido validar la imagen. Vuelve a hacer la foto o elige otra imagen</p></div>
          @if (store.state().error) { <p class="micro validation-detail">{{store.state().error}}</p> }
          <ul class="validation-tips"><li>Asegúrate de que la matriz esté completa dentro del encuadre</li><li>Evita imágenes desenfocadas</li><li>Utiliza una iluminación uniforme y evita reflejos</li></ul>
        }
        @case ('error') { <p class="error-notice"><app-icon name="alert-circle-outline" />No se ha podido comprobar la imagen. Inténtalo de nuevo</p>@if (store.state().error) { <p class="micro validation-detail">{{store.state().error}}</p> } }
        @case ('analyzing') { <p class="busy-status"><ion-spinner name="crescent" />Preparando el informe técnico…</p> }
        @case ('empty') { <p class="micro muted">Selecciona una imagen para iniciar la comprobación automática.</p> }
      }
    </div>
    @if (store.state().phase === 'error') { <ion-button class="secondary retry-button" [disabled]="acquiring()" (click)="store.session.retry()">Reintentar comprobación</ion-button> }
    @if (store.state().quality; as quality) {
      <details class="quality-details"><summary>Ver comprobaciones técnicas</summary><ul class="quality-list">
        @for (check of quality.checks; track check.id) { <li><app-icon [name]="check.status === 'checked' ? 'checkmark-outline' : check.status === 'failed' ? 'alert-circle-outline' : 'time-outline'" /><div><strong>{{check.label}}</strong><small>{{check.detail}}</small></div></li> }
      </ul></details>
    }
    <ion-button class="analyze-button" expand="block" [disabled]="!store.canAnalyze() || acquiring()" (click)="analyze()">Analizar<app-icon name="arrow-forward-outline" /></ion-button>
    @if (store.state().phase === 'valid' && store.state().error) { <p class="error-notice" role="alert">{{store.state().error}}</p> }
  </section>` })
export class ImageReviewComponent {
  readonly store = inject(AnalysisStore); readonly acquiring = input(false); private readonly router = inject(Router);
  async analyze(): Promise<void> {
    if (!this.acquiring() && await this.store.session.analyze()) await this.router.navigateByUrl('/resultados');
  }
}
