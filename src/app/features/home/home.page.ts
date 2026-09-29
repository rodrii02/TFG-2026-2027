import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular';
import { IconComponent } from '../../shared/icon.component';
import { AnalysisStore } from '../../core/analysis.store';
@Component({ selector: 'app-home', imports: [IonButton, IconComponent], template: `
  <section class="home-page">
    <p class="eyebrow">ENSAYO DE FLUJO LATERAL <span aria-hidden="true">·</span> ALIMENTOS</p>
    <div class="hero"><p class="eyebrow">TU PRÓXIMA LECTURA</p><h1 tabindex="-1">Una matriz de señales,<br class="desktop-break"> una lectura guiada.</h1><p>Captura o carga una imagen de la matriz.<br class="desktop-break"> La comprobación de la foto comienza automáticamente.</p></div>
    <section class="how-section" aria-labelledby="how-title"><div class="section-title"><h2 id="how-title">¿Cómo funciona?</h2><span class="micro muted">TRES PASOS, UN MISMO RECORRIDO</span></div>
      <div class="how-grid">
        @for (item of steps; track item.number) { <article class="how-card"><span class="step-number">{{item.number}}</span><app-icon [name]="item.icon" /><h3>{{item.title}}</h3><p>{{item.text}}</p></article> }
      </div>
    </section>
    <div class="home-action"><ion-button (click)="start()">Comenzar análisis<app-icon name="arrow-forward-outline" /></ion-button><span class="micro muted">Sin registros. Sin subir tus fotos.</span></div>
    <p class="scope-note"><app-icon name="information-circle-outline" />Prototipo de investigación · interpretación pendiente de calibración.</p>
  </section>` })
export class HomePage {
  private readonly store = inject(AnalysisStore); private readonly router = inject(Router);
  readonly steps = [
    { number: '01', title: 'Prepara', icon: 'flask-outline', text: 'Realiza el ensayo siguiendo sus instrucciones.' },
    { number: '02', title: 'Fotografía', icon: 'camera-outline', text: 'Incluye toda la matriz dentro del encuadre.' },
    { number: '03', title: 'Consulta', icon: 'scan-outline', text: 'Consulta el estado de la comprobación de la matriz.' },
  ];
  start(): void { this.store.session.reset(); void this.router.navigateByUrl('/captura'); }
}
