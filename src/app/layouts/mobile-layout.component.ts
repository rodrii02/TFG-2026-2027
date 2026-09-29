import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToolbar } from '@ionic/angular';
import { BrandComponent } from '../shared/brand.component';
import { SettingsComponent } from '../shared/settings.component';
import { IconComponent } from '../shared/icon.component';
@Component({ selector: 'app-mobile-layout', imports: [IonContent, IonHeader, IonToolbar, BrandComponent, SettingsComponent, IconComponent, RouterLink], template: `
  <ion-header class="native-header ion-no-border"><ion-toolbar><div class="native-toolbar"><app-brand /><div class="header-end"><span class="prototype-badge">Prototipo</span><app-settings /></div></div></ion-toolbar></ion-header>
  <ion-content><div id="main-content" tabindex="-1" class="page-content native-page"><ng-content /></div>
    @if (!router.url.includes('bienvenida')) { <footer class="native-footer"><a routerLink="/inicio"><app-icon name="home-outline" />Inicio</a><a routerLink="/guia"><app-icon name="help-circle-outline" />Cómo funciona</a></footer> }
  </ion-content>` })
export class MobileLayoutComponent { readonly router = inject(Router); }
