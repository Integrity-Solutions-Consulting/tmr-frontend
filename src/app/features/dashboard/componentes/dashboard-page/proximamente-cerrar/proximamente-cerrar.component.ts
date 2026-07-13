import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProyectoResumen } from '../../../modelos/dashboard.model';
import { BadgeEstadoComponent } from '../../../../../shared/components/badge-estado/badge-estado.component';

@Component({
  selector: 'app-proximamente-cerrar',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent, MatIconModule],
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
   * Convierte una fecha en formato yyyy-MM-dd o dd-MM-yyyy a Date.
   * Devuelve null si la cadena es nula, vacía o tiene formato inválido,
   * evitando que DatePipe lance NG02100 y previniendo desfases de zona horaria.
   */
  parseFecha(fecha?: string): Date | null {
    if (!fecha || typeof fecha !== 'string') return null;

    // Soporta dd-MM-yyyy, dd/MM/yyyy y yyyy-MM-dd
    const partes = fecha.split(/[-\/]/);
    if (partes.length !== 3) return null;

    let dia: number;
    let mes: number;
    let anio: number;

    // Si la primera parte tiene 4 dígitos, asumimos formato ISO (yyyy-MM-dd)
    if (partes[0].length === 4) {
      anio = Number(partes[0]);
      mes = Number(partes[1]);
      dia = Number(partes[2]);
    } else {
      // De lo contrario, asumimos formato tradicional (dd-MM-yyyy)
      dia = Number(partes[0]);
      mes = Number(partes[1]);
      anio = Number(partes[2]);
    }

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
