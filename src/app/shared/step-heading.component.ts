import { Component, input } from '@angular/core';
@Component({ selector: 'app-step-heading', template: `
  <div class="step-heading"><p class="eyebrow">{{step() === 3 ? 'RESULTADOS' : 'NUEVO ANÁLISIS'}} <span aria-hidden="true">/</span> PASO {{step()}} DE 3</p>
    <div class="step-track" aria-hidden="true"><span [class.done]="step() >= 1"></span><span [class.done]="step() >= 2"></span><span [class.done]="step() >= 3"></span></div>
  </div><h1 tabindex="-1">{{title()}}</h1><p class="page-description">{{description()}}</p>` })
export class StepHeadingComponent { readonly step = input.required<number>(); readonly title = input.required<string>(); readonly description = input.required<string>(); }
