import { bootstrapApplication } from '@angular/platform-browser';
import { inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, alertCircleOutline, arrowForwardOutline, cameraOutline, checkmarkCircleOutline, checkmarkOutline, chevronDownOutline, closeOutline, cloudUploadOutline, flaskOutline, gridOutline, helpCircleOutline, homeOutline, imageOutline, informationCircleOutline, lockClosedOutline, saveOutline, scanOutline, settingsOutline, timeOutline } from 'ionicons/icons';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { PreferencesService } from './app/core/preferences.service';
addIcons({ addOutline, alertCircleOutline, arrowForwardOutline, cameraOutline, checkmarkCircleOutline, checkmarkOutline, chevronDownOutline, closeOutline, cloudUploadOutline, flaskOutline, gridOutline, helpCircleOutline, homeOutline, imageOutline, informationCircleOutline, lockClosedOutline, saveOutline, scanOutline, settingsOutline, timeOutline });
bootstrapApplication(AppComponent, {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideIonicAngular({ mode: 'md', rippleEffect: false }),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideAppInitializer(() => inject(PreferencesService).init()),
  ],
}).catch(error => { console.error('No se ha podido iniciar MicroFoodScan', error); document.body.textContent = 'No se ha podido iniciar MicroFoodScan. Recarga la aplicación.'; });
