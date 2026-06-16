import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';
import { Boton } from '../../../../shared/components/boton/boton';
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
  imports: [CommonModule, Boton, ActionMenuComponent, DescargaMenuComponent, PaginacionComponent, SuccessModalComponent],
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
  readonly filtroActivo = signal<FiltroEstado>('todos');

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

  // ── Filtrado local por texto (el filtro de estado viaja al backend) ────────
  readonly filteredUsuarios = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.usuarios();
    }

    return this.usuarios().filter((usuario) =>
      [
        usuario.nombres,
        usuario.apellidos,
        usuario.usuario,
        usuario.email,
        usuario.estado,
        this.resolveRoleNames(usuario.rolesids).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
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
    this.descargarCSV(this.obtenerUsuariosExportables(), 'Usuarios', 'csv');
  }

  descargarUsuariosPdf(): void {
    this.descargarPDF(this.obtenerUsuariosExportables(), 'Usuarios');
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
      usuario.estado === 'Activo' ? 'Activo' : 'Inactivo',
    ]);
  }

  private descargarCSV(usuarios: Usuario[], nombreBase: string, extension: string): void {
    const encabezados = ['Usuario', 'Nombre', 'Correo electrónico', 'Roles', 'Estado'];
    const filas = this.obtenerFilasExportacion(usuarios);
    const contenido = [encabezados, ...filas]
      .map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    this.crearDescarga(blob, `${nombreBase}_${new Date().toISOString().slice(0, 10)}.${extension}`);
  }

  private descargarPDF(usuarios: Usuario[], nombreBase: string): void {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.setTextColor(22, 53, 114);
    doc.text('Listado de Usuarios', 14, 16);

    autoTable(doc, {
      startY: 24,
      head: [['Usuario', 'Nombre', 'Correo electrónico', 'Roles', 'Estado']],
      body: this.obtenerFilasExportacion(usuarios),
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [22, 53, 114], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    doc.save(`${nombreBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private crearDescarga(blob: Blob, nombreArchivo: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
      width: '560px',
      height: '640px',
      maxWidth: 'calc(100vw - 32px)',
      maxHeight: 'calc(100dvh - 32px)',
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
          panelClass: 'tmr-dialog-panel',
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
