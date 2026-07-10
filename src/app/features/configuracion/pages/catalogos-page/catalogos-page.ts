import { Component, QueryList, ViewChildren, computed, inject, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActionMenuComponent, ActionMenuItem } from '../../../../shared/components/action-menu/action-menu.component';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CatalogosFormModal, CatalogoModalData } from '../../components/catalogos-form-modal/catalogos-form-modal';
import { CatalogoMaster, CatalogoDetalle } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

type FiltroEstadoCatalogo = 'Activo' | 'Inactivo' | '';

@Component({
  selector: 'app-catalogos-page',
  imports: [
    CommonModule,
    MatIconModule,
    ActionMenuComponent,
    PaginacionComponent,
    SuccessModalComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './catalogos-page.html',
  styleUrl: './catalogos-page.scss',
})
export class CatalogosPage implements OnInit {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  @ViewChildren(ActionMenuComponent)
  private readonly actionMenus!: QueryList<ActionMenuComponent>;

  // ── Maestros ─────────────────────────────────────────────────────────────
  readonly catalogosMaestros = this.configuracionService.catalogosMaestros;
  readonly selectedMaster = signal<CatalogoMaster | null>(null);

  // ── Detalles del Maestro Seleccionado ─────────────────────────────────────
  readonly detalles = signal<CatalogoDetalle[]>([]);

  // ── Señales de control y paginación ───────────────────────────────────────
  readonly query = signal('');
  readonly paginaActual = signal(1);
  readonly porPagina = 10;
  readonly estadoError = signal<string | null>(null);
  readonly detalleEliminandoId = signal<number | null>(null);

  // ── Filtro por estado ─────────────────────────────────────────────────────
  readonly filtroEstado = signal<FiltroEstadoCatalogo>('Activo');
  mostrarEstadoDropdown = false;

  // ── Confirmación de Eliminación Lógica ────────────────────────────────────
  readonly confirmVisible = signal(false);
  readonly confirmMensaje = signal('');
  private detalleParaEliminar: CatalogoDetalle | null = null;

  // ── Confirmación y éxito ──────────────────────────────────────────────────
  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

  // ── Computeds de conteo (para el Maestro Seleccionado) ────────────────────
  readonly totalDetalles = computed(() => this.detalles().length);
  readonly detallesActivos = computed(() => this.detalles().filter((d) => d.activo).length);
  readonly detallesInactivos = computed(() => this.detalles().filter((d) => !d.activo).length);

  /** Label del botón de filtro estado */
  readonly labelEstado = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'Activo') return 'Activos';
    if (filtro === 'Inactivo') return 'Inactivos';
    return 'Estado';
  });

  /** Filtrado por texto Y por estado */
  readonly filteredDetalles = computed(() => {
    const query = this.query().trim().toLowerCase();
    const estado = this.filtroEstado();

    const filtered = this.detalles().filter((d) => {
      // Filtro por estado
      const matchEstado =
        estado === '' ||
        (estado === 'Activo' && d.activo) ||
        (estado === 'Inactivo' && !d.activo);

      if (!matchEstado) return false;

      // Filtro por texto (código, valor, descripción, etc.)
      if (!query) return true;

      return [
        d.codigoValor,
        d.valor,
        d.descripcion || '',
        d.activo ? 'activo' : 'inactivo',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    // Ordenar por orden ascendente si está definido, si no, por ID descendente
    return filtered.sort((a, b) => {
      if (a.orden !== null && a.orden !== undefined && b.orden !== null && b.orden !== undefined) {
        return a.orden - b.orden;
      }
      return b.id - a.id;
    });
  });

  readonly totalRegistros = computed(() => this.filteredDetalles().length);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)),
  );

  readonly paginaActualNormalizada = computed(() =>
    Math.min(this.paginaActual(), this.totalPaginas()),
  );

  readonly detallesPaginados = computed(() => {
    const inicio = (this.paginaActualNormalizada() - 1) * this.porPagina;
    return this.filteredDetalles().slice(inicio, inicio + this.porPagina);
  });

  constructor() {
    // Autoseleccionar el primer maestro cuando se carguen las señales
    effect(() => {
      const maestros = this.catalogosMaestros();
      if (maestros.length > 0 && !this.selectedMaster()) {
        setTimeout(() => {
          this.seleccionarMaestro(maestros[0]);
        });
      }
    });
  }

  ngOnInit(): void {
    this.configuracionService.loadCatalogosMaestros();
  }

  seleccionarMaestro(master: CatalogoMaster): void {
    this.selectedMaster.set(master);
    this.paginaActual.set(1);
    this.query.set('');
    this.cargarDetalles(master.id);
  }

  cargarDetalles(idCatalogo: number): void {
    this.estadoError.set(null);
    this.configuracionService.getDetallesPorCatalogoId(idCatalogo).subscribe({
      next: (data) => {
        this.detalles.set(data ?? []);
      },
      error: (err) => {
        console.error(err);
        this.estadoError.set('Error al cargar los detalles del catálogo.');
      },
    });
  }

  // ── Control del dropdown Estado ────────────────────────────────────────────
  toggleEstadoDropdown(event?: Event): void {
    event?.stopPropagation();
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: FiltroEstadoCatalogo): void {
    this.paginaActual.set(1);
    this.filtroEstado.set(estado);
    this.mostrarEstadoDropdown = false;
  }

  cerrarDropdowns(): void {
    this.mostrarEstadoDropdown = false;
  }

  setQuery(value: string): void {
    this.query.set(value);
    this.paginaActual.set(1);
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas()) return;
    this.paginaActual.set(pagina);
  }

  // ── Modales ────────────────────────────────────────────────────────────────
  openModal(detalle?: CatalogoDetalle, mode: 'create' | 'edit' | 'view' = 'create'): void {
    this.closeActionsMenu();
    const currentMaster = this.selectedMaster();
    if (!currentMaster) return;

    const data: CatalogoModalData = {
      detalle,
      detallesExistentes: this.detalles(),
      idCatalogo: currentMaster.id,
      mode: detalle ? mode : 'create',
    };

    const dialogRef = this.dialog.open<CatalogosFormModal, CatalogoModalData, any>(
      CatalogosFormModal,
      {
        data,
        panelClass: [
          'tmr-dialog-panel',
          mode === 'view' ? 'catalogos-detail-dialog-panel' : 'catalogos-form-dialog-panel',
        ],
        width: mode === 'view' ? '620px' : '560px',
        maxWidth: mode === 'view' ? 'calc(100vw - 32px)' : 'calc(100vw - 48px)',
        maxHeight: mode === 'view' ? '90vh' : '92vh',
        disableClose: true,
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      this.closeActionsMenu();

      if (result) {
        this.closeActionsMenu();
        if (mode === 'create') {
          this.configuracionService.crearDetalle(result).subscribe({
            next: () => {
              this.cargarDetalles(currentMaster.id);
              this.mostrarExito('Ítem creado correctamente');
            },
            error: (err) => {
              console.error(err);
              this.mostrarError(err, 'No se pudo crear el ítem');
            },
          });
        } else if (mode === 'edit') {
          this.configuracionService.actualizarDetalle(result.id, {
            valor: result.valor,
            descripcion: result.descripcion,
            orden: result.orden,
            valorExtra: result.valorExtra,
            activo: result.activo,
            idCatalogo: currentMaster.id,
          }).subscribe({
            next: () => {
              this.cargarDetalles(currentMaster.id);
              this.mostrarExito('Ítem actualizado correctamente');
            },
            error: (err) => {
              console.error(err);
              this.mostrarError(err, 'No se pudo actualizar el ítem');
            },
          });
        }
      }
    });
  }

  viewDetalle(detalle: CatalogoDetalle): void {
    this.closeActionsMenu();
    this.openModal(detalle, 'view');
  }

  editDetalle(detalle: CatalogoDetalle): void {
    this.closeActionsMenu();
    this.openModal(detalle, 'edit');
  }

  toggleDetalleEstado(detalle: CatalogoDetalle): void {
    this.closeActionsMenu();
    this.estadoError.set(null);

    const currentMaster = this.selectedMaster();
    if (!currentMaster) return;

    this.configuracionService.actualizarDetalle(detalle.id, {
      valor: detalle.valor,
      descripcion: detalle.descripcion,
      orden: detalle.orden,
      valorExtra: detalle.valorExtra,
      activo: !detalle.activo,
      idCatalogo: currentMaster.id,
    }).subscribe({
      next: () => {
        this.cargarDetalles(currentMaster.id);
        this.mostrarExito(`Ítem ${detalle.activo ? 'inactivado' : 'activado'} correctamente`);
      },
      error: (err) => {
        console.error(err);
        this.mostrarError(err, 'No se pudo cambiar el estado del ítem');
      },
    });
  }

  eliminarDetalle(detalle: CatalogoDetalle): void {
    this.closeActionsMenu();
    this.detalleParaEliminar = detalle;
    this.confirmMensaje.set(`¿Estás seguro de que deseas eliminar permanentemente el ítem "${detalle.valor}"?`);
    this.confirmVisible.set(true);
  }

  onConfirmarEliminar(): void {
    const currentMaster = this.selectedMaster();
    if (!currentMaster || !this.detalleParaEliminar) return;

    const id = this.detalleParaEliminar.id;
    this.confirmVisible.set(false);
    this.detalleEliminandoId.set(id);

    this.configuracionService.eliminarDetalle(id, currentMaster.id).subscribe({
      next: () => {
        this.detalleEliminandoId.set(null);
        this.detalleParaEliminar = null;
        this.cargarDetalles(currentMaster.id);
        this.mostrarExito('Ítem eliminado correctamente');
      },
      error: (err) => {
        console.error(err);
        this.detalleEliminandoId.set(null);
        this.detalleParaEliminar = null;
        this.mostrarError(err, 'No se pudo eliminar el ítem');
      },
    });
  }

  onCancelarEliminar(): void {
    this.confirmVisible.set(false);
    this.detalleParaEliminar = null;
  }

  obtenerAccionesDetalle(detalle: CatalogoDetalle): ActionMenuItem[] {
    return [
      {
        id: 'editar',
        label: 'Editar',
        action: () => this.editDetalle(detalle),
      },
      {
        id: 'eliminar',
        label: 'Eliminar',
        danger: true,
        disabled: this.detalleEliminandoId() === detalle.id,
        action: () => this.eliminarDetalle(detalle),
      },
    ];
  }

  // ── Utilidades ────────────────────────────────────────────────────────────
  cerrarExito(): void {
    this.closeActionsMenu();
    this.exitoVisible.set(false);
  }

  closeActionsMenu(): void {
    this.actionMenus?.forEach((menu) => menu.closeMenu());
  }

  private mostrarExito(mensaje: string): void {
    this.closeActionsMenu();
    this.exitoMensaje.set(mensaje);
    this.exitoVisible.set(true);
    setTimeout(() => this.exitoVisible.set(false), 3000);
  }

  private mostrarError(err: unknown, defaultMsg: string): void {
    const errorMsg = (err as any)?.error?.message || (err as any)?.error?.mensaje || (err as any)?.message || defaultMsg;
    this.estadoError.set(errorMsg);
    setTimeout(() => this.estadoError.set(null), 5000);
  }
}
