import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Colaborador } from '../../models/colaborador.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';

@Component({
  selector: 'app-tabla-colaboradores',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent, TruncatePipe, ActionMenuComponent],
  templateUrl: './tabla-colaboradores.component.html',
  styleUrl: './tabla-colaboradores.component.scss',
})
export class TablaColaboradoresComponent {
  @Input() colaboradores: Colaborador[] = [];
  @Input() cargando = false;

  @Output() verDetalle = new EventEmitter<Colaborador>();
  @Output() editar = new EventEmitter<Colaborador>();
  @Output() cambiarEstado = new EventEmitter<Colaborador>();
  @Output() registrarSalida = new EventEmitter<Colaborador>();

  menuAbierto: string | null = null;

  toggleMenu(payload: { id: string; event: Event }): void {
    payload.event.stopPropagation();
    this.menuAbierto = this.menuAbierto === payload.id ? null : payload.id;
  }


  accionesColaborador(colaborador: Colaborador): ActionMenuItem[] {
    const activo = colaborador.estado === 'Activo';

    if (activo) {
      return [
        { id: 'ver-mas', label: 'Ver más' },
        { id: 'editar', label: 'Editar' },
        {
          id: 'registrar-salida',
          label: 'Registrar salida',
          danger: true,
        },
      ];
    } else {
      return [
        { id: 'ver-mas', label: 'Ver más' },
        { id: 'editar', label: 'Editar' },
        {
          id: 'activar',
          label: 'Activar',
        },
      ];
    }
  }


  onAccionSeleccionada(accion: ActionMenuItem, colaborador: Colaborador): void {
    this.menuAbierto = null;

    if (accion.id === 'ver-mas') {
      this.verDetalle.emit(colaborador);
      return;
    }

    if (accion.id === 'editar') {
      this.editar.emit(colaborador);
      return;
    }

    if (accion.id === 'registrar-salida') {
      this.registrarSalida.emit(colaborador);
      return;
    }

    if (accion.id === 'activar') {
      this.cambiarEstado.emit(colaborador);
      return;
    }
  }
}