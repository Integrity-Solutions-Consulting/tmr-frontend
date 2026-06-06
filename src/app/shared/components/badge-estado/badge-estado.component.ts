import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
 
@Component({
  selector: 'app-badge-estado',
  standalone: true,
  imports: [CommonModule],
  template: `
<span class="badge">
  <span class="badge-dot" [ngClass]="dotClass"></span>
  <span class="badge-text">{{ estado }}</span>
</span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 3px 10px 3px 8px;
      border-radius: 20px;
      border: 1px solid #e5e7eb;
      background: #ffffff;
      font-family: 'Inter', sans-serif;
      font-size: 11.5px;
      font-weight: 500;
      color: #374151;
      white-space: nowrap;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      display: inline-block;
    }
    .dot-activo {
      background-color: #16a34a;
    }
    .dot-en-progreso {
      background-color: #1677ff;
    }
    .dot-completado {
      background-color: #22c55e;
    }
    .dot-cancelado {
      background-color: #ef4444;
    }
    .dot-espera {
      background-color: #f97316;
    }
    .dot-inactivo {
      background-color: #9ca3af;
    }
    .badge-text {
      color: #737373;
    }
  `],
})
export class BadgeEstadoComponent {
  @Input() estado: string = 'Activo';

  get dotClass(): string {
    const estadoNormalizado = (this.estado || '').trim().toLowerCase();
    if (estadoNormalizado.includes('complet')) {
      return 'dot-completado';
    }
    if (estadoNormalizado.includes('cancel')) {
      return 'dot-cancelado';
    }
    if (estadoNormalizado.includes('espera') || estadoNormalizado.includes('waiting')) {
      return 'dot-espera';
    }
    if (estadoNormalizado.includes('progreso')) {
      return 'dot-en-progreso';
    }
    if (estadoNormalizado === 'activo') {
      return 'dot-activo';
    }
    return 'dot-inactivo';
  }
}
