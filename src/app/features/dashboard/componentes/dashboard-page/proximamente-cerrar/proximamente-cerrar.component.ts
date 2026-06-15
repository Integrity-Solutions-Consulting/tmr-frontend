import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectoResumen } from '../../../modelos/dashboard.model';
import { BadgeEstadoComponent } from '../../../../../shared/components/badge-estado/badge-estado.component';

@Component({
  selector: 'app-proximamente-cerrar',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent],
  templateUrl: './proximamente-cerrar.component.html',
  styleUrls: ['./proximamente-cerrar.component.scss']
})
export class ProximosACerrarComponent {
  @Input() proyectos: ProyectoResumen[] = [];

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'En progreso':
        return 'en-progreso';
      case 'Completado':
        return 'completado';
      case 'En espera':
        return 'en-espera';
      default:
        return 'default';
    }
  }
}
