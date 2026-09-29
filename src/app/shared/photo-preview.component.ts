import { Component, input } from '@angular/core';
import { LocalImage } from '../features/processing/models';
import { IconComponent } from './icon.component';
@Component({ selector: 'app-photo-preview', imports: [IconComponent], template: `
  <figure class="photo-preview" [class.compact]="compact()" [class.has-image]="image()">
    @if (image(); as photo) {
      <div class="photo-stage"><img [src]="photo.url" alt="Imagen seleccionada para revisar la matriz de señales" /></div>
      <figcaption><app-icon name="image-outline" /><span>{{photo.name}}<small>{{photo.width}} × {{photo.height}} px · {{photo.source === 'example' ? 'Imagen sintética · no es un ensayo real' : 'Copia de trabajo local'}}</small>@if (photo.preparation?.resized) { <small>Imagen reducida para limitar la memoria. Resolución del ensayo pendiente de validar.</small> }</span></figcaption>
    } @else {
      <div class="empty-photo"><span class="empty-icon"><app-icon name="image-outline" /></span><h2>Aquí verás tu imagen</h2><p>Matriz completa, sin reflejos y enfocada.</p><span class="micro">JPEG, PNG o WebP · hasta 20 MB</span></div>
    }
  </figure>` })
export class PhotoPreviewComponent {
  readonly image = input<LocalImage | null>(null);
  readonly compact = input(false);
}
