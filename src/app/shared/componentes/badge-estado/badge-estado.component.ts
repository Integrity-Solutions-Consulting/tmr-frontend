import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
 
@Component({
  selector: 'app-badge-estado',
  standalone: true,
  imports: [CommonModule],
  template: `
<span class="badge">
<span class="badge-dot" [ngClass]="estado === 'Activo' ? 'dot-activo' : 'dot-inactivo'"></span>
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
}