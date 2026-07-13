import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Colaborador } from '../../models/colaborador.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';

@Component({
  selector: 'app-modal-detalle-colaborador',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent],
  templateUrl: './modal-detalle-colaborador.component.html',
  styleUrl: './modal-detalle-colaborador.component.scss',
})
export class ModalDetalleColaboradorComponent {
  @Input() colaborador!: Colaborador;
  @Output() cerrar = new EventEmitter<void>();
  @Output() editar = new EventEmitter<Colaborador>();

  seccionesExpandido = {
    laborales: true,
    personales: true,
    contacto: true,
    proyectos: false,
    salida: true,
    reemplazo: true,
  };

  get codigoColaborador(): string {
    const c: any = this.colaborador;
    return c?.codigoEmpleado ?? c?.codigoColaborador ?? c?.id ?? '—';
  }

  get contratoTipo(): string {
    const c: any = this.colaborador;
    return c?.tipoContrato ?? '—';
  }

  get totalProyectos(): number {
    return this.colaborador?.proyectosAsignados?.length ?? this.colaborador?.numProyectos ?? 0;
  }

  toggleSeccion(seccion: 'laborales' | 'personales' | 'contacto' | 'proyectos' | 'salida' | 'reemplazo'): void {
    this.seccionesExpandido[seccion] = !this.seccionesExpandido[seccion];
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  onEditar(): void {
    this.editar.emit(this.colaborador);
  }

  formatFecha(fecha?: string | Date | null): string {
    if (!fecha) return '—';

    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      const d = String(fecha.getDate()).padStart(2, '0');
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const y = fecha.getFullYear();
      return `${d}/${m}/${y}`;
    }

    const valor = String(fecha).trim();

    // Si viene como 2026-06-14 o 2026-06-14T00:00:00
    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      const [y, m, d] = valor.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }

    // Si viene como 14-06-2026
    if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
      const [d, m, y] = valor.split('-');
      return `${d}/${m}/${y}`;
    }

    // Si ya viene como 14/06/2026
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      return valor;
    }

    return '—';
  }
}
