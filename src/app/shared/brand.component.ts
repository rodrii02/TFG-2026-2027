import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ selector: 'app-brand', imports: [RouterLink], template: `
  <a class="brand" routerLink="/inicio" aria-label="MicroFoodScan, inicio">
    <img class="brand-logo" src="assets/mfs-manzana-camara.svg" width="40" height="40" alt="" />
    <span class="brand-full" aria-hidden="true">MicroFoodScan</span><span class="brand-short" aria-hidden="true">MFS</span>
  </a>` })
export class BrandComponent {}
