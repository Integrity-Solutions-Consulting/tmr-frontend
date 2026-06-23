import { Component, Input, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge-estado',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge-estado.html',
  styleUrl: './badge-estado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class BadgeEstadoComponent {
  @Input() estado: string = 'Activo';

  get statusClass(): string {
    const norm = (this.estado || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (norm.includes('complet')) {
      return 'completed';
    }
    if (norm.includes('cancel')) {
      return 'cancelled';
    }
    if (norm.includes('espera') || norm.includes('waiting') || norm.includes('pausa')) {
      return 'waiting';
    }
    if (norm.includes('progreso')) {
      return 'progress';
    }
    if (norm.includes('aprob')) {
      return 'approved';
    }
    if (norm.includes('plan')) {
      return 'planning';
    }
    if (norm.includes('aplaz') || norm.includes('delay')) {
      return 'delayed';
    }
    if (norm.includes('desarrollo')) {
      return 'development';
    }
    if (norm === 'activo' || norm === 'active') {
      return 'active';
    }
    if (norm === 'inactivo' || norm === 'inactive') {
      return 'inactive';
    }
    return 'sin-seguimiento';
  }
}
