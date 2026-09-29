import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular';
import { IconComponent } from '../../shared/icon.component';
@Component({ selector: 'app-guide', imports: [RouterLink, IonButton, IconComponent], template: `
  <p class="eyebrow">GUÍA DE LECTURA</p><h1 tabindex="-1">Una buena foto.<br>Una revisión consciente.</h1><p class="page-description">Prepara tu ensayo y sigue sus instrucciones en cada paso.</p>
  <div class="guide-list">
    <article><span class="step-number">01</span><div><h2>Prepara la matriz</h2><p>Consulta el protocolo del fabricante para preparar la muestra, realizar el ensayo y respetar su ventana de lectura. La aplicación no conoce los tiempos de tu kit.</p></div></article>
    <article><span class="step-number">02</span><div><h2>Cuida la fotografía</h2><p>Sigue las condiciones de iluminación y, si corresponde, excitación y filtros del protocolo. Encuadra la matriz completa, coloca la cámara de frente y evita sombras, reflejos y movimiento. No retoques los puntos.</p></div></article>
    <article><span class="step-number">03</span><div><h2>Comprueba antes de continuar</h2><p>Al seleccionar una imagen comprobamos automáticamente el formato, la decodificación y las dimensiones. La validación del enfoque, la iluminación y el encuadre de la matriz está pendiente de calibración. Pillow y OpenCV comprueban además la lectura de la copia de trabajo y un mínimo técnico de 200 × 200 px. Si supera la comprobación se habilita Analizar para consultar el informe técnico.</p></div></article>
  </div>
  <aside class="notice"><app-icon name="information-circle-outline" /><div><h2>Qué significa «pendiente de calibración»</h2><p>Aún faltan el mapa definitivo de puntos y controles, las micotoxinas asociadas, imágenes de referencia y criterios validados. El análisis disponible informa sobre el archivo; todavía no hay un algoritmo que valide e interprete la matriz. No se calculan concentraciones ni se determina si un alimento es seguro.</p></div></aside>
  <p class="scope-note"><app-icon name="lock-closed-outline" />Las fotos se procesan en memoria en tu dispositivo. Se descartan al iniciar un análisis nuevo o al recargar la aplicación.</p>
  <ion-button routerLink="/inicio">Volver al inicio<app-icon name="arrow-forward-outline" /></ion-button>` })
export class GuidePage {}
