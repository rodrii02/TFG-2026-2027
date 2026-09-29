import { Routes } from '@angular/router';
import { captureEntry, resultRequired, welcomeOnly, welcomeRequired } from './core/flow.guards';
export const routes: Routes = [
  { path: 'bienvenida', canActivate: [welcomeOnly], loadComponent: () => import('./features/welcome/welcome.page').then(m => m.WelcomePage), title: 'Bienvenida · MicroFoodScan' },
  { path: '', canActivateChild: [welcomeRequired], children: [
    { path: 'inicio', loadComponent: () => import('./features/home/home.page').then(m => m.HomePage), title: 'Inicio · MicroFoodScan' },
    { path: 'captura', canActivate: [captureEntry], loadComponent: () => import('./features/capture/capture.page').then(m => m.CapturePage), title: 'Fotografía la matriz · MicroFoodScan' },
    { path: 'revision', pathMatch: 'full', redirectTo: 'captura' },
    { path: 'resultados', canActivate: [resultRequired], loadComponent: () => import('./features/results/results.page').then(m => m.ResultsPage), title: 'Informe de la imagen · MicroFoodScan' },
    { path: 'guia', loadComponent: () => import('./features/home/guide.page').then(m => m.GuidePage), title: 'Cómo funciona · MicroFoodScan' },
    { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  ] },
  { path: '**', redirectTo: 'inicio' },
];
