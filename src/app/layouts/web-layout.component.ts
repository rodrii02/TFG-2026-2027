import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { BrandComponent } from '../shared/brand.component';
import { SettingsComponent } from '../shared/settings.component';
import { IconComponent } from '../shared/icon.component';
import { AnalysisStore } from '../core/analysis.store';
@Component({ selector: 'app-web-layout', imports: [BrandComponent, SettingsComponent, IconComponent, RouterLink, RouterLinkActive], template: `
  <div class="web-shell">
    <aside class="sidebar" aria-label="Navegación principal">
      <app-brand /><p class="sidebar-caption">LECTURA LFA</p>
      <nav><button aria-label="Nuevo análisis" class="nav-link" [class.active]="!router.url.includes('/guia')" (click)="start()"><app-icon name="grid-outline" />Nuevo análisis<app-icon name="arrow-forward-outline" /></button>
        <a aria-label="Cómo funciona" class="nav-link" routerLink="/guia" routerLinkActive="active"><app-icon name="help-circle-outline" />Cómo funciona</a></nav>
      <div class="sidebar-bottom"><span class="sidebar-rule"></span><p>Lectura de ensayos<br>en alimentos.</p><span class="micro">PROYECTO DE INVESTIGACIÓN</span></div>
    </aside>
    <div class="web-main"><header class="web-header"><app-brand /><span class="header-title">Lectura de matrices de señales</span>
      <div class="header-end"><span class="prototype-badge"><span aria-hidden="true"></span>Prototipo web</span><app-settings /></div></header>
      <nav class="web-mobile-nav" aria-label="Navegación web"><button (click)="start()"><app-icon name="add-outline" />Nuevo análisis</button><a routerLink="/guia"><app-icon name="help-circle-outline" />Cómo funciona</a></nav>
      <main id="main-content" tabindex="-1" class="page-content"><ng-content /></main>
      <footer class="web-footer"><span><app-icon name="lock-closed-outline" />Procesamiento local. Tus imágenes se quedan contigo.</span><span>MICROFOODSCAN / TFG</span></footer>
    </div>
  </div>` })
export class WebLayoutComponent {
  readonly router = inject(Router); private readonly store = inject(AnalysisStore);
  start(): void { this.store.session.reset(); void this.router.navigateByUrl('/captura'); }
}
