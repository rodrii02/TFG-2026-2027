import { Component, ElementRef, HostListener, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { IonButton } from '@ionic/angular';
import { AnalysisStore } from '../../core/analysis.store';
import { PlatformService } from '../../core/platform.service';
import { IconComponent } from '../../shared/icon.component';
import { PhotoPreviewComponent } from '../../shared/photo-preview.component';
import { StepHeadingComponent } from '../../shared/step-heading.component';
import { ImageReviewComponent } from '../review/review.page';
import { AcquisitionService, CaptureCancelled } from './acquisition.service';
@Component({ selector: 'app-capture', imports: [IonButton, ImageReviewComponent, IconComponent, PhotoPreviewComponent, StepHeadingComponent], templateUrl: './capture.page.html' })
export class CapturePage implements OnDestroy {
  readonly store = inject(AnalysisStore); readonly platform = inject(PlatformService);
  private readonly acquisition = inject(AcquisitionService);
  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  readonly cameraDialog = viewChild.required<ElementRef<HTMLDialogElement>>('cameraDialog');
  readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  readonly pickerOpen = signal(false); readonly error = signal(''); readonly notice = signal(''); readonly cameraBusy = signal(false); readonly cameraReady = signal(false); readonly dragging = signal(false);
  readonly supportsCamera = this.platform.native || (!!navigator.mediaDevices?.getUserMedia && window.isSecureContext);
  private stream: MediaStream | null = null;
  private destroyed = false; private cameraOperation = 0; private acquisitionOperation = 0;
  upload(): void {
    if (this.cameraBusy() || this.store.state().phase === 'analyzing') return;
    this.error.set(''); this.notice.set(''); this.cameraBusy.set(true); this.pickerOpen.set(true);
    // Capacitor's WebView opens the system file/photo picker and returns a File without
    // the Camera plugin gallery conversion/thumbnail path. No broad storage permission.
    this.fileInput().nativeElement.click();
  }
  cancelled(): void { this.pickerOpen.set(false); this.cameraBusy.set(false); this.notice.set('Selección cancelada. Puedes elegir otra imagen cuando quieras.'); }
  async fileChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; this.pickerOpen.set(false);
    this.cameraBusy.set(false);
    if (file) await this.prepare(file, this.platform.native ? 'gallery' : 'file');
    else this.cancelled();
  }
  private async prepare(file: File, source: 'file' | 'gallery' | 'camera' | 'example'): Promise<void> {
    if (this.destroyed) return;
    this.error.set(''); this.notice.set('');
    await this.store.session.select(file, source);
  }
  drag(event: DragEvent): void { event.preventDefault(); this.dragging.set(true); }
  async drop(event: DragEvent): Promise<void> {
    event.preventDefault(); this.dragging.set(false);
    if (this.store.state().phase === 'analyzing' || this.cameraBusy()) return;
    const file = event.dataTransfer?.files[0]; if (file) { this.error.set(''); await this.prepare(file, 'file'); }
  }
  async example(): Promise<void> {
    const previous = this.store.state();
    this.error.set('');
    try {
      const response = await fetch('assets/example-matrix.png');
      if (!response.ok) throw new Error('No se ha podido abrir la imagen de ejemplo.');
      const blob = await response.blob();
      if (!this.destroyed && previous === this.store.state()) await this.prepare(new File([blob], 'ejemplo-sintetico.png', { type: 'image/png' }), 'example');
    } catch { this.error.set('No se ha podido abrir la imagen de ejemplo.'); }
  }
  private async getNative(): Promise<void> {
    if (this.cameraBusy()) return;
    this.cameraBusy.set(true);
    const operation = ++this.acquisitionOperation;
    try {
      const file = await this.acquisition.nativePhoto();
      if (!this.destroyed && operation === this.acquisitionOperation) await this.prepare(file, 'camera');
    } catch (error) {
      if (!this.destroyed && operation === this.acquisitionOperation) {
        if (error instanceof CaptureCancelled) this.cancelled();
        else this.error.set(error instanceof Error ? error.message : 'No se ha podido obtener la foto. Inténtalo de nuevo.');
      }
    } finally { if (operation === this.acquisitionOperation) this.cameraBusy.set(false); }
  }
  async camera(): Promise<void> {
    if (this.cameraBusy()) return;
    this.error.set(''); this.notice.set('');
    if (this.platform.native) { await this.getNative(); return; }
    this.cameraBusy.set(true); this.cameraDialog().nativeElement.showModal();
    const operation = ++this.cameraOperation;
    try {
      const stream = await this.acquisition.openWebCamera();
      if (this.destroyed || operation !== this.cameraOperation) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream; this.video().nativeElement.srcObject = stream;
      await this.video().nativeElement.play();
    } catch (error) { if (operation === this.cameraOperation) { this.closeCamera(); this.error.set(error instanceof Error ? error.message : 'No se ha podido abrir la cámara.'); } }
    finally { if (operation === this.cameraOperation) this.cameraBusy.set(false); }
  }
  async takePhoto(): Promise<void> {
    const operation = this.cameraOperation;
    this.cameraBusy.set(true);
    try {
      const file = await this.acquisition.captureFrame(this.video().nativeElement);
      if (this.destroyed || operation !== this.cameraOperation) return;
      this.closeCamera();
      if (!this.destroyed) await this.prepare(file, 'camera');
    } catch (error) { this.closeCamera(); this.error.set(error instanceof Error ? error.message : 'No se ha podido capturar la foto.'); }
  }
  closeCamera(): void {
    this.cameraOperation++; this.stream?.getTracks().forEach(t => t.stop()); this.stream = null;
    this.video().nativeElement.srcObject = null; this.cameraDialog().nativeElement.close();
    this.cameraReady.set(false); this.cameraBusy.set(false);
  }
  @HostListener('document:visibilitychange') visibilityChanged(): void { if (document.hidden && this.cameraDialog().nativeElement.open) this.closeCamera(); }
  ngOnDestroy(): void {
    this.destroyed = true; this.acquisitionOperation++; this.closeCamera();
    if (this.store.state().phase !== 'result') this.store.session.reset();
  }
}
