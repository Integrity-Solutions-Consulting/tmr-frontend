import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProyectoResumen } from '../../../modelos/dashboard.model';

@Component({
  selector: 'app-proximamente-cerrar',
  standalone: true,
  imports: [CommonModule],
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

  /**
   * Convierte una fecha en formato dd-MM-yyyy (backend) a Date.
   * Devuelve null si la cadena es nula, vacía o tiene formato inválido,
   * evitando que DatePipe lance NG02100.
   */
  parseFecha(fecha?: string): Date | null {
    if (!fecha || typeof fecha !== 'string') return null;

    // Soporta dd-MM-yyyy y dd/MM/yyyy
    const partes = fecha.split(/[-\/]/);
    if (partes.length !== 3) return null;

    const [dia, mes, anio] = partes.map(Number);
    if (isNaN(dia) || isNaN(mes) || isNaN(anio)) return null;

    // Construimos la fecha en UTC para evitar desfases de timezone
    const d = new Date(Date.UTC(anio, mes - 1, dia));

    // Validación extra: la fecha reconstruida debe tener los mismos valores
    if (
      d.getUTCFullYear() !== anio ||
      d.getUTCMonth() + 1 !== mes ||
      d.getUTCDate() !== dia
    ) {
      return null;
    }

    return d;
  }
}
