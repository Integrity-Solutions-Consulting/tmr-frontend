import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Colaborador } from '../../models/colaborador.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';
import { MatIconModule } from '@angular/material/icon';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';

type CampoOrdenableColaborador = 'identificacion' | 'tipoIdentificacion' | 'nombreCompleto' | 'numProyectos' | 'correoElectronico' | 'cargo' | 'estado';

@Component({
  selector: 'app-tabla-colaboradores',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent, TruncatePipe, ActionMenuComponent, MatIconModule],
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

  sortField: CampoOrdenableColaborador | null = null;
  sortAsc = true;

  ordenar(campo: CampoOrdenableColaborador): void {
    if (this.sortField === campo) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = campo;
      this.sortAsc = true;
    }
  }

  direccionOrden(campo: CampoOrdenableColaborador): 'ascending' | 'descending' | 'none' {
    if (this.sortField !== campo) return 'none';
    return this.sortAsc ? 'ascending' : 'descending';
  }

  get colaboradoresOrdenados(): Colaborador[] {
    if (!this.sortField) return this.colaboradores;
    const campo = this.sortField;
    const factor = this.sortAsc ? 1 : -1;

    return [...this.colaboradores].sort((a, b) => {
      const valorA = (a as any)[campo];
      const valorB = (b as any)[campo];

      if (typeof valorA === 'number' && typeof valorB === 'number') {
        return (valorA - valorB) * factor;
      }

      return String(valorA ?? '').toLowerCase().localeCompare(String(valorB ?? '').toLowerCase(), 'es', { numeric: true }) * factor;
    });
  }

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

