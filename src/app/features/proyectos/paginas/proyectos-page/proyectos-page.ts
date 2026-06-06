import { Component, inject, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';

import { Tabla } from '../../../../shared/components/tabla/tabla';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { BadgeEstado } from '../../../../shared/components/badge-estado/badge-estado';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import {
  DescargaMenuComponent,
  DescargaOpcion
} from '../../../../shared/components/descarga-menu/descarga-menu.component';
import { ProyectoForm } from '../../componentes/proyecto-form/proyecto-form';
import {
  FiltrosProyecto,
  ProyectosFiltros
} from '../../componentes/proyectos-filtros/proyectos-filtros';

import { Proyecto } from '../../modelos/proyecto.model';
import { ProyectosService } from '../../servicios/proyectos.service';

import {
  agregarProyecto,
  cargarProyectos,
  editarProyecto,
  eliminarProyecto
} from '../../store/proyectos.actions';

@Component({
  selector: 'app-proyectos-page',
  standalone: true,
  imports: [
    MatButtonModule,
    Tabla,
    ModalBase,
    BadgeEstado,
    ConfirmDialogComponent,
    SuccessModalComponent,
    DescargaMenuComponent,
    ProyectoForm,
    ProyectosFiltros
  ],
  templateUrl: './proyectos-page.html',
  styleUrl: './proyectos-page.scss'
})
export class ProyectosPage implements OnDestroy {
  private store = inject(Store);
  private proyectosService = inject(ProyectosService);

  modalCrearVisible = false;
  modalDetalleVisible = false;
  confirmEliminarVisible = false;
  successCrearVisible = false;
  proyectoSeleccionado: Proyecto | null = null;
  proyectoDetalle: Proyecto | null = null;
  codigoPendienteEliminar: string | null = null;

  private successModalTimeoutId: ReturnType<typeof setTimeout> | null = null;

  filtros: FiltrosProyecto = {
    busqueda: '',
    estado: '',
    tipo: ''
  };

  opcionesDescarga: DescargaOpcion[] = [
    {
      id: 'excel',
      label: 'Exportar Excel',
      icon: 'assets/iconos/download.svg',
      action: () => undefined
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      icon: 'assets/iconos/download.svg',
      action: () => undefined
    }
  ];

  constructor() {
    this.store.dispatch(cargarProyectos());
  }

  ngOnDestroy(): void {
    if (this.successModalTimeoutId) {
      clearTimeout(this.successModalTimeoutId);
    }
  }

  abrirModalCrear(): void {
    this.proyectoSeleccionado = null;
    this.modalCrearVisible = true;
  }

  cerrarModalCrear(): void {
    this.modalCrearVisible = false;
  }

  guardarProyecto(proyecto: Proyecto): void {
    if (this.proyectoSeleccionado) {
      const proyectoConId: Proyecto = {
        ...proyecto,
        id: this.proyectoSeleccionado.id
      };
      this.store.dispatch(editarProyecto({ proyecto: proyectoConId }));
    } else {
      this.cerrarModalCrear();
      this.store.dispatch(agregarProyecto({ proyecto }));
      this.mostrarSuccessCrear();
      return;
    }

    this.cerrarModalCrear();
  }

  private mostrarSuccessCrear(): void {
    if (this.successModalTimeoutId) {
      clearTimeout(this.successModalTimeoutId);
    }

    this.successCrearVisible = true;
    this.successModalTimeoutId = window.setTimeout(() => {
      this.cerrarSuccessCrear();
    }, 1000);
  }

  cerrarSuccessCrear(): void {
    if (this.successModalTimeoutId) {
      clearTimeout(this.successModalTimeoutId);
      this.successModalTimeoutId = null;
    }
    this.successCrearVisible = false;
  }

  abrirModalEditar(proyecto: Proyecto): void {
    this.proyectosService.obtenerProyecto(proyecto.id).subscribe({
      next: (proyectoCompleto) => {
        this.proyectoSeleccionado = proyectoCompleto;
        this.modalCrearVisible = true;
      },
      error: (error) => console.error('Error al obtener proyecto:', error)
    });
  }

  abrirModalDetalle(proyecto: Proyecto): void {
    this.proyectoDetalle = proyecto;
    this.modalDetalleVisible = true;
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible = false;
    this.proyectoDetalle = null;
  }

  solicitarEliminarProyecto(codigo: string): void {
    this.codigoPendienteEliminar = codigo;
    this.confirmEliminarVisible = true;
  }

  cancelarEliminarProyecto(): void {
    this.codigoPendienteEliminar = null;
    this.confirmEliminarVisible = false;
  }

  confirmarEliminarProyecto(): void {
    if (!this.codigoPendienteEliminar) {
      return;
    }

    this.store.dispatch(eliminarProyecto({ codigo: this.codigoPendienteEliminar }));
    this.cancelarEliminarProyecto();
  }

  aplicarFiltros(filtros: FiltrosProyecto): void {
    this.filtros = filtros;
  }

  formatearFecha(fecha?: string | null): string {
    if (!fecha) {
      return '-';
    }

    const partes = fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
}