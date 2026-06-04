import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FiltroMetrica } from '../cards-metricas/cards-metricas.component';
import { ExportarService }                  from '../../servicios/exportar.service';
import { ColaboradoresService }             from '../../servicios/colaboradores.service';
import {
  Colaborador,
  FiltrosColaborador,
  CrearColaboradorDto,
  EditarColaboradorDto,
  Notificacion,
} from '../../models/colaborador.model';

import { CardsMetricasComponent }           from '../cards-metricas/cards-metricas.component';
import { FiltrosColaboradoresComponent }    from '../filtros-colaboradores/filtros-colaboradores.component';
import { DescargarMenuComponent }           from '../descargar-menu/descargar-menu.component';
import { TablaColaboradoresComponent }      from '../tabla-colaboradores/tabla-colaboradores.component';
import { PaginacionComponent }             from '../../../../shared/components/paginacion/paginacion.component';
import { ModalDetalleColaboradorComponent } from '../modal-detalle-colaborador/modal-detalle-colaborador.component';
import { ModalCrearColaboradorComponent }   from '../modal-crear-colaborador/modal-crear-colaborador.component';
import { ModalEditarColaboradorComponent }  from '../modal-editar-colaborador/modal-editar-colaborador.component';
import { NotificacionColaboradorComponent } from '../notificacion/notificacion.component';

@Component({
  selector: 'app-colaboradores-page',
  standalone: true,
  imports: [
    CommonModule,
    CardsMetricasComponent,
    FiltrosColaboradoresComponent,
    DescargarMenuComponent,
    TablaColaboradoresComponent,
    PaginacionComponent,
    ModalDetalleColaboradorComponent,
    ModalCrearColaboradorComponent,
    ModalEditarColaboradorComponent,
    NotificacionColaboradorComponent,
  ],
  templateUrl: './colaboradores-page.component.html',
  styleUrl:    './colaboradores-page.component.scss',
})
export class ColaboradoresPageComponent implements OnInit, OnDestroy {

  // ── Tabla ────────────────────────────────────────────────
  colaboradores: Colaborador[] = [];
  cargando      = false;
  total         = 0;
  totalPaginas  = 0;

  // ── Paginación ───────────────────────────────────────────
  paginaActual = 1;
  porPagina    = 15;

  // ── Filtros ──────────────────────────────────────────────
  filtros: FiltrosColaborador = { busqueda: '', estado: 'Todos' };

  // ── Métricas reactivas ───────────────────────────────────
  get noAsignados(): number { return this.svc.getMetricas().noAsignados(); }
  get asignados():   number { return this.svc.getMetricas().asignados();   }
  get inactivos():   number { return this.svc.getMetricas().inactivos();   }
  get activos():     number { return this.svc.getMetricas().activos();     }

  // ── Modales ──────────────────────────────────────────────
  modalDetalle: Colaborador | null = null;
  modalCrear   = false;
  modalEditar: Colaborador | null = null;

  // ── Notificación ─────────────────────────────────────────────────────
  notificacion: Notificacion | null = null;

  // ── Toasts (Removidos) ───────────────────────────────────────────────
  toasts: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private svc:         ColaboradoresService,
    private exportarSvc: ExportarService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  // ── Carga ────────────────────────────────────────────────
  cargarDatos(): void {
    this.cargando = true;
    this.svc
      .getColaboradores(this.filtros, this.paginaActual, this.porPagina)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.colaboradores = res.data;
          this.total         = res.total;
          this.totalPaginas  = res.totalPaginas;
          this.cargando      = false;
        },
        error: () => {
          this.cargando = false;
          console.error('Error al cargar los colaboradores');
        },
      });
  }

  // ── Filtros ──────────────────────────────────────────────
  onFiltrosCambian(filtros: FiltrosColaborador): void {
    this.filtros      = filtros;
    this.paginaActual = 1;
    this.cargarDatos();
  }

  onFiltrarDesdeMetrica(filtro: FiltroMetrica): void {
  if (filtro.tipo === 'estado') {
    // Filtra por Activo o Inactivo
    this.filtros = {
      ...this.filtros,
      estado: filtro.valor as 'Activo' | 'Inactivo',
    };
  } else if (filtro.tipo === 'asignacion') {
    // No toca el filtro de estado — filtra internamente por numProyectos
    // Se maneja en el servicio
    this.filtros = {
      ...this.filtros,
      estado: 'Todos',
      asignacion: filtro.valor as 'asignado' | 'noAsignado',
    };
  }
  this.paginaActual = 1;
  this.cargarDatos();
}

  // ── Paginación ───────────────────────────────────────────
  onPaginaCambia(pagina: number): void {
    this.paginaActual = pagina;
    this.cargarDatos();
  }

  // ── Modales abrir ────────────────────────────────────────
  abrirDetalle(col: Colaborador): void {
    this.svc.getColaboradorById(col.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detalle => this.modalDetalle = detalle,
        error: () => console.error('Error al cargar el detalle'),
      });
  }
  abrirCrear():                   void { this.modalCrear   = true; }
  abrirEditar(col: Colaborador): void {
      this.modalDetalle = null;
      this.svc.getColaboradorById(col.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: detalle => this.modalEditar = detalle,
          error: () => console.error('Error al cargar el colaborador para editar'),
        });
    }

  // ── Modales cerrar ───────────────────────────────────────
  cerrarDetalle(): void { this.modalDetalle = null;  }
  cerrarCrear():   void { this.modalCrear   = false; }
  cerrarEditar():  void { this.modalEditar  = null;  }

  // ── CRUD ─────────────────────────────────────────────────
  onCrear(request: any): void {
    this.svc.crearColaborador(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarCrear();
          this.paginaActual = 1;
          this.cargarDatos();
          this.notificacion = { tipo: 'exito', mensaje: 'El nuevo colaborador ha sido agregado exitosamente' };
        },
        error: (err) => {
          console.error('Error al crear el colaborador', err);
          // Mostramos el mensaje de error del backend si existe
          const mensaje = err?.error?.detail || 'Error al crear el colaborador';
          this.notificacion = { tipo: 'error', mensaje };
        },
      });
  }

  onEditar(request: any): void {
      if (!this.modalEditar) return;
      this.svc.editarColaborador(this.modalEditar.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cerrarEditar();
            this.cargarDatos();
            this.notificacion = { tipo: 'exito', mensaje: 'El colaborador ha sido actualizado exitosamente' };
          },
          error: (err) => {
            const mensaje = err?.error?.detail || 'Error al actualizar el colaborador';
            this.notificacion = { tipo: 'error', mensaje };
          },
        });
    }

  cerrarNotificacion(): void { this.notificacion = null; }

  colaboradorAEliminar: Colaborador | null = null;

onEliminar(col: Colaborador): void {
  this.colaboradorAEliminar = col;
}

confirmarEliminar(): void {
  if (!this.colaboradorAEliminar) return;
  this.svc.eliminarColaborador(this.colaboradorAEliminar.id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.colaboradorAEliminar = null;
        this.cargarDatos();
        console.log('Colaborador eliminado correctamente');
      },
      error: () => console.error('Error al eliminar el colaborador'),
    });
}

cancelarEliminar(): void {
  this.colaboradorAEliminar = null;
}

  // ── Descargar ────────────────────────────────────────────
  onDescargarPDF(): void {
  this.svc.getColaboradores(this.filtros, 1, 9999)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: res => {
        this.exportarSvc.exportarPDF(res.data);
        console.log('PDF generado correctamente');
      },
      error: () => console.error('Error al generar el PDF'),
    });
}

onDescargarExcel(): void {
  this.svc.getColaboradores(this.filtros, 1, 9999)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: res => {
        this.exportarSvc.exportarExcel(res.data);
        console.log('Excel generado correctamente');
      },
      error: () => console.error('Error al generar el Excel'),
    });
}
  // ── Toast ────────────────────────────────────────────────
  onToastCerrado(id: number): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
