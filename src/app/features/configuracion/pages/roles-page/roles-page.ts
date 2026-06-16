import { Component, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';
import { Boton } from '../../../../shared/components/boton/boton';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import { RolesFormModal, RolModalData } from '../../components/roles-form-modal/roles-form-modal';
import { Modulo, Rol } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

type FiltroEstadoRol = 'Activo' | 'Inactivo' | '';

@Component({
  selector: 'app-roles-page',
  imports: [CommonModule, Boton, MatIconModule, ActionMenuComponent, ConfirmDialogComponent, PaginacionComponent, SuccessModalComponent],
  templateUrl: './roles-page.html',
  styleUrl: './roles-page.scss',
})
export class RolesPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  @ViewChildren(ActionMenuComponent)
  private readonly actionMenus!: QueryList<ActionMenuComponent>;

  // ── Señales de datos ──────────────────────────────────────────────────────
  readonly query = signal('');
  readonly paginaActual = signal(1);
  readonly porPagina = 10;
  readonly estadoError = signal<string | null>(null);
  readonly rolEliminandoId = signal<number | null>(null);
  readonly roles = this.configuracionService.roles;
  readonly modulos = this.configuracionService.modulos;

  // ── Filtro por estado ─────────────────────────────────────────────────────
  readonly filtroEstado = signal<FiltroEstadoRol>('');

  // ── Estado dropdown ───────────────────────────────────────────────────────
  mostrarEstadoDropdown = false;

  // ── Confirmación y éxito ──────────────────────────────────────────────────
  readonly confirmVisible = signal(false);
  readonly confirmMensaje = signal('');
  private rolPendienteEliminar: Rol | null = null;

  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

  /** ID del rol cuya lista de módulos extra está desplegada */
  readonly rolExpandidoId = signal<number | null>(null);

  // ── Computeds de conteo ───────────────────────────────────────────────────
  readonly totalRoles = computed(() => this.roles().length);

  readonly rolesActivos = computed(() => this.roles().filter((rol) => rol.activo).length);

  readonly rolesInactivos = computed(() => this.roles().filter((rol) => !rol.activo).length);

  readonly modulosCubiertos = computed(() =>
    new Set(this.roles().flatMap((rol) => rol.modulos.map((m) => m.id))).size,
  );

  /** Label del botón de filtro estado */
  readonly labelEstado = computed(() => {
    const filtro = this.filtroEstado();
    if (filtro === 'Activo') return 'Activos';
    if (filtro === 'Inactivo') return 'Inactivos';
    return 'Estado';
  });

  /** Filtrado por texto Y por estado */
  readonly filteredRoles = computed(() => {
    const query = this.query().trim().toLowerCase();
    const estado = this.filtroEstado();

    return this.roles().filter((rol) => {
      // Filtro por estado
      const matchEstado =
        estado === '' ||
        (estado === 'Activo' && rol.activo) ||
        (estado === 'Inactivo' && !rol.activo);

      if (!matchEstado) return false;

      // Filtro por texto
      if (!query) return true;

      return [
        rol.nombre,
        rol.descripcion,
        rol.modulos.map((m) => m.nombre).join(' '),
        rol.activo ? 'activo' : 'inactivo',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  });

  readonly totalRegistros = computed(() => this.filteredRoles().length);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)),
  );

  readonly paginaActualNormalizada = computed(() =>
    Math.min(this.paginaActual(), this.totalPaginas()),
  );

  readonly rolesPaginados = computed(() => {
    const inicio = (this.paginaActualNormalizada() - 1) * this.porPagina;
    return this.filteredRoles().slice(inicio, inicio + this.porPagina);
  });

  // ── Control del dropdown Estado ────────────────────────────────────────────

  toggleEstadoDropdown(event?: Event): void {
    event?.stopPropagation();
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: FiltroEstadoRol): void {
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

  openModal(rol?: Rol, mode: 'create' | 'edit' | 'view' = 'create'): void {
    this.closeActionsMenu();

    const data: RolModalData = {
      rol,
      roles: this.roles(),
      nextId: this.configuracionService.nextId(this.roles()),
      modulos: this.modulos(),
      mode: rol ? mode : 'create',
    };

    const dialogRef = this.dialog.open<RolesFormModal, RolModalData, Rol>(
      RolesFormModal,
      {
        data,
        panelClass: 'tmr-dialog-panel',
        disableClose: true,
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      this.closeActionsMenu();

      if (result) {
        const esNuevo = !this.roles().some((r) => r.id === result.id);
        this.closeActionsMenu();
        this.configuracionService.upsertRol(result);
        this.closeActionsMenu();
        this.mostrarExito(
          esNuevo ? 'Rol creado correctamente' : 'Rol actualizado correctamente',
        );
      }
    });
  }

  viewRol(rol: Rol): void {
    this.closeActionsMenu();
    this.openModal(rol, 'view');
  }

  editRol(rol: Rol): void {
    this.closeActionsMenu();
    this.openModal(rol, 'edit');
  }

  obtenerAccionesRol(rol: Rol): ActionMenuItem[] {
    return [
      {
        id: 'ver-mas',
        label: 'Ver más',
        action: () => this.viewRol(rol),
      },
      {
        id: 'editar',
        label: 'Editar',
        action: () => this.editRol(rol),
      },
      {
        id: 'eliminar',
        label: 'Eliminar',
        danger: true,
        disabled: this.rolEliminandoId() === rol.id,
        action: () => this.solicitarEliminarRol(rol),
      },
    ];
  }

  // ── Módulos expandibles ────────────────────────────────────────────────────

  visibleModulos(rol: Rol): Modulo[] {
    return rol.modulos.slice(0, 3);
  }

  modulosOcultos(rol: Rol): number {
    return Math.max(rol.modulos.length - 3, 0);
  }

  modulosOcultosList(rol: Rol): Modulo[] {
    return rol.modulos.slice(3);
  }

  estaExpandido(rolId: number): boolean {
    return this.rolExpandidoId() === rolId;
  }

  toggleModulosExpandidos(event: Event, rolId: number): void {
    event.stopPropagation();
    this.rolExpandidoId.set(this.rolExpandidoId() === rolId ? null : rolId);
  }

  cerrarExpandido(): void {
    this.rolExpandidoId.set(null);
  }

  // ── Eliminar rol ──────────────────────────────────────────────────────────

  solicitarEliminarRol(rol: Rol): void {
    this.closeActionsMenu();
    this.estadoError.set(null);
    this.rolPendienteEliminar = rol;
    this.confirmMensaje.set(`Se va a eliminar el rol "${rol.nombre}". Esta accion no se puede deshacer.`);
    this.confirmVisible.set(true);
  }

  confirmarEliminarRol(): void {
    this.closeActionsMenu();
    this.confirmVisible.set(false);
    const rol = this.rolPendienteEliminar;
    this.rolPendienteEliminar = null;
    if (!rol) return;

    this.estadoError.set(null);
    this.rolEliminandoId.set(rol.id);

    this.configuracionService.deleteRol(rol.id).subscribe({
      next: () => {
        this.rolEliminandoId.set(null);
        this.closeActionsMenu();
        this.mostrarExito('Rol eliminado correctamente');
      },
      error: (err) => {
        this.rolEliminandoId.set(null);
        this.estadoError.set(this.extractDeleteError(err));
      },
    });
  }

  cancelarEliminarRol(): void {
    this.closeActionsMenu();
    this.confirmVisible.set(false);
    this.rolPendienteEliminar = null;
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  cerrarExito(): void {
    this.closeActionsMenu();
    this.exitoVisible.set(false);
  }

  closeActionsMenu(): void {
    this.actionMenus?.forEach((menu) => menu.closeMenu());
    this.cerrarExpandido();
  }

  private mostrarExito(mensaje: string): void {
    this.closeActionsMenu();
    this.exitoMensaje.set(mensaje);
    this.exitoVisible.set(true);
    setTimeout(() => this.exitoVisible.set(false), 3000);
  }

  private extractDeleteError(err: unknown): string {
    const error = (err as { error?: unknown })?.error;

    if (typeof error === 'string') {
      return error;
    }

    const body = error as {
      errors?: { message?: string }[];
      message?: string;
      mensaje?: string;
      error?: string;
      title?: string;
    } | undefined;

    return body?.errors?.[0]?.message
      ?? body?.message
      ?? body?.mensaje
      ?? body?.error
      ?? body?.title
      ?? 'No se pudo eliminar el rol. Verifica si es un rol de sistema o si tiene usuarios asignados.';
  }
}
