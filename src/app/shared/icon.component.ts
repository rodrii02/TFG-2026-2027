import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular';
@Component({ selector: 'app-icon', imports: [IonIcon], template: '<ion-icon [name]="name()" aria-hidden="true" />', styles: [':host { display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; } ion-icon { width:1.25em; height:1.25em; }'] })
export class IconComponent { readonly name = input.required<string>(); }
