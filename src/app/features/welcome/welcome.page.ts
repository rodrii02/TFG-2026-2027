import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular';
import { PreferencesService } from '../../core/preferences.service';
import { IconComponent } from '../../shared/icon.component';
@Component({ selector: 'app-welcome', imports: [IonButton, IconComponent], template: `
  <section class="welcome-page" aria-label="Bienvenida a MicroFoodScan">
    <p class="eyebrow" aria-live="polite">BIENVENIDA · {{current() + 1}} DE 3</p>
    <div #carousel class="welcome-carousel" role="region" aria-roledescription="carrusel" aria-label="Introducción" tabindex="0" (scroll)="onScroll()" (keydown.arrowRight)="move(1, $event)" (keydown.arrowLeft)="move(-1, $event)">
      @for (slide of slides; track slide.label; let index = $index) {
        <article class="welcome-slide" role="group" aria-roledescription="diapositiva" [attr.aria-label]="(index + 1) + ' de 3'" [attr.aria-hidden]="index !== current()">
          <img src="assets/mfs-manzana-camara.svg" alt="Logotipo de MicroFoodScan: una manzana con una cámara" />
          <p class="eyebrow">{{slide.label}}</p><h1>{{slide.title}}</h1><p>{{slide.text}}</p>
        </article>
      }
    </div>
    <div class="welcome-bottom"><div class="carousel-dots" aria-label="Elegir pantalla de bienvenida">
      @for (slide of slides; track slide.label; let i = $index) { <button [class.selected]="current() === i" [attr.aria-label]="'Ir a la pantalla ' + (i + 1)" [attr.aria-current]="current() === i ? 'step' : null" (click)="go(i)"><span></span></button> }
    </div><div class="welcome-actions"><ion-button (click)="next()">{{current() === 2 ? 'Continuar' : 'Siguiente'}}<app-icon name="arrow-forward-outline" /></ion-button><button class="text-button" (click)="finish()">Saltar</button></div></div>
  </section>` })
export class WelcomePage {
  private readonly preferences = inject(PreferencesService); private readonly router = inject(Router);
  readonly carousel = viewChild.required<ElementRef<HTMLDivElement>>('carousel');
  readonly current = signal(0);
  readonly slides = [
    { label: '01 / EL PROBLEMA', title: 'Los alimentos pueden contener micotoxinas.', text: 'Los ensayos con matrices de puntos permiten estudiar varias señales en una misma prueba.' },
    { label: '02 / LA PRUEBA', title: 'Una matriz. Varias señales que estudiar.', text: 'Fotografía la matriz después de realizar el ensayo siguiendo su protocolo de captura y lectura.' },
    { label: '03 / LA APP', title: 'Captura y revisa con MicroFoodScan.', text: 'La comprobación del archivo comienza automáticamente y permite consultar un informe técnico. La validación e interpretación de la matriz están pendientes de calibración.' },
  ];
  onScroll(): void { const c = this.carousel().nativeElement; this.current.set(Math.max(0, Math.min(2, Math.round(c.scrollLeft / c.clientWidth)))); }
  go(index: number): void { const c = this.carousel().nativeElement; this.current.set(index); c.scrollTo({ left: index * c.clientWidth, behavior: 'instant' }); }
  move(delta: number, event: Event): void { event.preventDefault(); this.go(Math.max(0, Math.min(2, this.current() + delta))); }
  next(): void { if (this.current() < 2) this.go(this.current() + 1); else this.finish(); }
  finish(): void { this.preferences.completeWelcome(); void this.router.navigateByUrl('/inicio', { replaceUrl: true }); }
}
