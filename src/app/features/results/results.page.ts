import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular';
import { AnalysisStore } from '../../core/analysis.store';
import { StepHeadingComponent } from '../../shared/step-heading.component';
import { PhotoPreviewComponent } from '../../shared/photo-preview.component';
import { IconComponent } from '../../shared/icon.component';
@Component({ selector: 'app-results', imports: [IonButton, StepHeadingComponent, PhotoPreviewComponent, IconComponent], template: `
  <app-step-heading [step]="3" title="Informe de la imagen" description="Revisión técnica completada. La interpretación científica del ensayo se muestra por separado." />
  @if (store.state().result; as result) {
    <section class="quality-summary" aria-labelledby="technical-status"><app-icon name="checkmark-circle-outline" /><div><h2 id="technical-status">Revisión técnica completada</h2><p>La copia de trabajo se ha podido leer y cumple el mínimo técnico de 200 × 200 px. Esto no confirma que la matriz esté enfocada, bien iluminada o correctamente encuadrada.</p>
    @if (store.state().image; as image) { <p>{{image.width}} × {{image.height}} px · {{image.format.replace('image/', '').toUpperCase()}} original · copia PNG</p> }
    </div></section>
    <section class="result-banner" aria-labelledby="result-status"><div class="result-icon"><app-icon name="time-outline" /></div><div><p class="eyebrow">ESTADO DE LA INTERPRETACIÓN</p><h2 id="result-status">Pendiente de calibración</h2><p>No se detectan ni cuantifican micotoxinas ni se determina si el alimento es seguro.</p></div></section>
    <section class="signals-section" aria-labelledby="signals-title"><h2 id="signals-title">Matriz de señales</h2>
      <div class="signals-grid">
        <article class="signal-card"><h3>Localización de la matriz</h3><p>No evaluada. Geometría y posiciones pendientes de confirmar.</p><span class="pending-status"><app-icon name="time-outline" />Pendiente de calibración</span></article>
        <article class="signal-card"><h3>Puntos de control</h3><p>Sin localizar ni interpretar. Validez del ensayo sin evaluar.</p><span class="pending-status"><app-icon name="time-outline" />Pendiente de calibración</span></article>
        <article class="signal-card"><h3>Señales de prueba</h3><p>Sin asignación de micotoxinas ni medidas de intensidad.</p><span class="pending-status"><app-icon name="time-outline" />Pendiente de calibración</span></article>
      </div>
    </section>
    <aside class="notice"><app-icon name="information-circle-outline" /><p>La localización de puntos no se ha ejecutado. Se requieren el mapa definitivo de la matriz, el protocolo de captura y datos de laboratorio para interpretar sus señales.</p></aside>
    @if (store.state().image?.source === 'example') { <p class="example-result" role="status"><app-icon name="flask-outline" />Recorrido con una imagen sintética. No es una detección real.</p> }
    <details class="result-details"><summary>Ver imagen<app-icon name="chevron-down-outline" /></summary><app-photo-preview [image]="store.state().image" [compact]="true" /><p class="micro">La calidad fotográfica y la validez científica del ensayo son comprobaciones distintas.</p></details>
    <div class="button-row results-actions"><ion-button class="secondary" (click)="repeat()"><app-icon name="camera-outline" />Repetir foto</ion-button><ion-button (click)="newAnalysis()">Nuevo análisis<app-icon name="arrow-forward-outline" /></ion-button></div>
  }` })
export class ResultsPage {
  readonly store = inject(AnalysisStore); private readonly router = inject(Router);
  repeat(): void { this.store.session.reset(); void this.router.navigateByUrl('/captura', { replaceUrl: true }); }
  newAnalysis(): void { this.store.session.reset(); void this.router.navigateByUrl('/inicio', { replaceUrl: true }); }
}
