import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { exportarReporteExcel, exportarReportePdf } from '../../../../shared/utils/reporte-export.utils';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';

import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import {
  DescargaMenuComponent,
  DescargaOpcion,
} from '../../../../shared/components/descarga-menu/descarga-menu.component';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import { UsuarioDetalleModal } from '../../components/usuario-detalle-modal/usuario-detalle-modal.component';
import { UsuariosFormModal } from '../../components/usuarios-form-modal/usuarios-form-modal';
import { Rol, Usuario } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-usuarios-page',
  imports: [CommonModule, ActionMenuComponent, DescargaMenuComponent, PaginacionComponent, SuccessModalComponent, BadgeEstadoComponent],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss',
})
export class UsuariosPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  // ── Señales de datos ──────────────────────────────────────────────────────
  readonly query = signal('');
  readonly paginaActual = signal(1);
  readonly porPagina = 10;
  readonly usuarios = this.configuracionService.usuarios;
  readonly usuariosTotales = this.configuracionService.usuariosTotales;
  readonly roles = this.configuracionService.roles;

  // ── Filtro activo por estado ──────────────────────────────────────────────
  readonly filtroActivo = signal<FiltroEstado>('activos');

  // ── Estado del dropdown Estado ────────────────────────────────────────────
  mostrarEstadoDropdown = false;

  // ── Modal de éxito ────────────────────────────────────────────────────────
  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

  readonly opcionesDescarga: DescargaOpcion[] = [
    {
      id: 'excel',
      label: 'Exportar Excel',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarUsuariosExcel(),
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarUsuariosPdf(),
    },
  ];

  // ── Computeds de conteo (basados en usuariosTotales para reflejar el total real) ──
  readonly totalUsuarios = computed(() => this.usuariosTotales().length);

  readonly activos = computed(
    () => this.usuariosTotales().filter((u) => u.estado === 'Activo').length,
  );

  readonly inactivos = computed(
    () => this.usuariosTotales().filter((u) => u.estado !== 'Activo').length,
  );

  /** Texto del label del filtro estado según el filtro activo */
  readonly labelEstado = computed(() => {
    const filtro = this.filtroActivo();
    if (filtro === 'activos') return 'Activos';
    if (filtro === 'inactivos') return 'Inactivos';
    return 'Estado';
  });

  // ── Filtrado local por texto y estado ──────────────────────────────────────
  readonly filteredUsuarios = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filtro = this.filtroActivo();

    const filtered = this.usuarios().filter((usuario) => {
      // Filtro por estado
      const esActivo = usuario.estado === 'Activo';
      if (filtro === 'activos' && !esActivo) return false;
      if (filtro === 'inactivos' && esActivo) return false;

      // Filtro por texto
      if (!query) return true;

      return [
        usuario.nombres,
        usuario.apellidos,
        usuario.usuario,
        usuario.email,
        usuario.estado,
        this.resolveRoleNames(usuario.rolesids).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    return filtered.sort((a, b) => b.id - a.id);
  });

  readonly totalRegistros = computed(() => this.filteredUsuarios().length);

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.totalRegistros() / this.porPagina)),
  );

  readonly paginaActualNormalizada = computed(() =>
    Math.min(this.paginaActual(), this.totalPaginas()),
  );

  readonly usuariosPaginados = computed(() => {
    const inicio = (this.paginaActualNormalizada() - 1) * this.porPagina;
    return this.filteredUsuarios().slice(inicio, inicio + this.porPagina);
  });

  // ── Helpers de filtro ──────────────────────────────────────────────────────

  /** Convierte el enum interno al valor boolean que espera el backend. */
  private filtroToParam(filtro: FiltroEstado): boolean | null {
    if (filtro === 'activos') return true;
    if (filtro === 'inactivos') return false;
    return null;
  }

  /**
   * Cambia el filtro activo y recarga desde el backend.
   * Si se hace clic en el filtro ya activo, regresa a 'todos'.
   */
  filtrarPorEstado(tipo: FiltroEstado): void {
    const nuevo: FiltroEstado = this.filtroActivo() === tipo ? 'todos' : tipo;
    this.filtroActivo.set(nuevo);
    this.configuracionService.loadUsuarios(
      this.filtroToParam(nuevo),
      this.query() || undefined,
    );
  }

  // ── Control del dropdown Estado ────────────────────────────────────────────

  toggleEstadoDropdown(event?: Event): void {
    event?.stopPropagation();
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: FiltroEstado): void {
    this.paginaActual.set(1);
    this.mostrarEstadoDropdown = false;
    this.filtrarPorEstado(estado);
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

  // ── Acciones sobre usuarios ────────────────────────────────────────────────

  obtenerAccionesUsuario(usuario: Usuario): ActionMenuItem[] {
    const activo = usuario.estado === 'Activo';

    return [
      {
        id: 'ver-mas',
        label: 'Ver más',
        action: () => this.viewUsuario(usuario),
      },
      {
        id: 'editar',
        label: 'Editar',
        action: () => this.editUsuario(usuario),
      },
      {
        id: activo ? 'inactivar' : 'activar',
        label: activo ? 'Inactivar' : 'Activar',
        danger: activo,
        action: () => this.toggleEstadoUsuario(usuario),
      },
    ];
  }

  resolveRoleNames(roleIds: string[]): string[] {
    const roles = this.roles();
    return roleIds.map(
      (roleId) =>
        roles.find((rol) => rol.id.toString() === roleId)?.nombre ?? roleId,
    );
  }

  displayRoleName(roleName: string): string {
    const normalized = roleName.trim().toUpperCase();

    if (normalized === 'COLABORADOR') {
      return 'Colaborador';
    }

    return roleName;
  }

  displayUsuarioNombre(usuario: Usuario): string {
    const nombreCompleto = [usuario.nombres, usuario.apellidos]
      .filter(Boolean)
      .join(' ')
      .trim();

    return nombreCompleto || 'Usuario externo';
  }

  descargarUsuariosExcel(): void {
    void exportarReporteExcel({
      titulo: 'Reporte de Usuarios',
      nombreArchivo: 'Usuarios',
      nombreHoja: 'Usuarios',
      columnas: [
        { encabezado: 'Usuario', anchoExcel: 20 },
        { encabezado: 'Nombre', anchoExcel: 30 },
        { encabezado: 'Correo electrónico', anchoExcel: 36 },
        { encabezado: 'Roles', anchoExcel: 30 },
        { encabezado: 'Externo', anchoExcel: 14, alineacion: 'left' },
        { encabezado: 'Estado', anchoExcel: 14, alineacion: 'left' },
      ],
      filas: this.obtenerFilasExportacion(this.obtenerUsuariosExportables()),
      columnaEstado: 5,
    });
  }

  descargarUsuariosPdf(): void {
    void exportarReportePdf({
      titulo: 'Reporte de Usuarios',
      nombreArchivo: 'Usuarios',
      nombreHoja: 'Usuarios',
      columnas: [
        { encabezado: 'Usuario', anchoPdf: 25 },
        { encabezado: 'Nombre', anchoPdf: 35 },
        { encabezado: 'Correo electrónico', anchoPdf: 40 },
        { encabezado: 'Roles', anchoPdf: 50 },
        { encabezado: 'Externo', anchoPdf: 20, alineacion: 'left' },
        { encabezado: 'Estado', anchoPdf: 20, alineacion: 'left' },
      ],
      filas: this.obtenerFilasExportacion(this.obtenerUsuariosExportables()),
      columnaEstado: 5,
    });
  }

  private obtenerUsuariosExportables(): Usuario[] {
    return this.filteredUsuarios();
  }

  private displayRolesUsuario(usuario: Usuario): string {
    const roles = this.resolveRoleNames(usuario.rolesids)
      .map((role) => this.displayRoleName(role))
      .filter(Boolean);

    return roles.length ? roles.join(', ') : '-';
  }

  private obtenerFilasExportacion(usuarios: Usuario[]): string[][] {
    return usuarios.map((usuario) => [
      usuario.usuario || '-',
      this.displayUsuarioNombre(usuario),
      usuario.email || '-',
      this.displayRolesUsuario(usuario),
      usuario.usuarioInterno ? 'No' : 'Sí',
      usuario.estado === 'Activo' ? 'Activo' : 'Inactivo',
    ]);
  }

  openModal(usuario?: Usuario): void {
    if (usuario) {
      this.editUsuario(usuario);
      return;
    }

    this.openUsuarioModal();
  }

  editUsuario(usuario: Usuario): void {
    this.configuracionService.getUsuarioDetalle(usuario.id).subscribe({
      next: (detalle) => this.openUsuarioModal(detalle),
      error: (err) => console.error(err),
    });
  }

  private openUsuarioModal(usuario?: Usuario): void {
    const dialogRef = this.dialog.open<
      UsuariosFormModal,
      { usuario?: Usuario; roles: Rol[]; nextId: number },
      Usuario | string | boolean
    >(UsuariosFormModal, {
      data: {
        usuario,
        roles: this.roles(),
        nextId: this.configuracionService.nextId(this.usuarios()),
      },
      panelClass: ['tmr-dialog-panel', 'usuarios-dialog-panel'],
      width: '860px',
      maxWidth: 'calc(100vw - 48px)',
      maxHeight: '92vh',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      if (result === 'creado') {
        this.reloadUsuarios();
        this.mostrarExito('Usuario creado correctamente');
        return;
      }

      if (result === 'actualizado') {
        this.reloadUsuarios();
        this.mostrarExito('Usuario actualizado correctamente');
        return;
      }

      if (result !== true && typeof result === 'object') {
        const usuarioEditado = result as Usuario;
        this.configuracionService
          .updateUsuario(
            usuarioEditado.id,
            this.configuracionService.toUpdateUsuarioPayload(usuarioEditado),
          )
          .subscribe({
            next: () => {
              this.reloadUsuarios();
              this.mostrarExito('Usuario actualizado correctamente');
            },
            error: (err) => console.error(err),
          });
      }
    });
  }

  viewUsuario(usuario: Usuario): void {
    this.configuracionService.getUsuarioDetalle(usuario.id).subscribe({
      next: (detalle) => {
        this.dialog.open(UsuarioDetalleModal, {
          panelClass: ['tmr-dialog-panel', 'usuario-detalle-dialog-panel'],
          disableClose: true,
          data: { usuario: detalle },
        });
      },
      error: (err) => console.error('Error al cargar detalle de usuario:', err),
    });
  }

  toggleEstadoUsuario(usuario: Usuario): void {
    const filtroParam = this.filtroToParam(this.filtroActivo());

    if (usuario.estado === 'Activo') {
      this.configuracionService.deleteUsuario(usuario.id, filtroParam);
      return;
    }

    this.configuracionService.setUsuarioEstado(usuario.id, true, filtroParam).subscribe({
      next: () => this.mostrarExito('Estado del usuario actualizado correctamente'),
      error: (err) => console.error(err),
    });
  }

  cerrarExito(): void {
    this.exitoVisible.set(false);
  }

  private mostrarExito(mensaje: string): void {
    this.exitoMensaje.set(mensaje);
    this.exitoVisible.set(true);
    setTimeout(() => this.exitoVisible.set(false), 3000);
  }

  private reloadUsuarios(): void {
    this.configuracionService.loadUsuarios(
      this.filtroToParam(this.filtroActivo()),
      this.query() || undefined,
    );
    this.configuracionService.loadUsuariosTotales();
  }
}
