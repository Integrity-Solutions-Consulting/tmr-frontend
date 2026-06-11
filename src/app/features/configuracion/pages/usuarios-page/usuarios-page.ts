import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';
import { Boton } from '../../../../shared/components/boton/boton';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import { UsuarioDetalleModal } from '../../components/usuario-detalle-modal/usuario-detalle-modal.component';
import { UsuariosFormModal } from '../../components/usuarios-form-modal/usuarios-form-modal';
import { Rol, Usuario } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

type FiltroEstado = 'todos' | 'activos' | 'inactivos';

@Component({
  selector: 'app-usuarios-page',
  imports: [Boton, SearchInput, ActionMenuComponent, SuccessModalComponent],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss',
})
export class UsuariosPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);

  readonly query = signal('');
  readonly usuarios = this.configuracionService.usuarios;
  readonly roles = this.configuracionService.roles;

  /** Filtro activo por estado: 'todos' | 'activos' | 'inactivos' */
  readonly filtroActivo = signal<FiltroEstado>('todos');

  /** Controla la visibilidad del modal de éxito. */
  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

  /** Conteo de activos sobre la lista cargada del backend */
  readonly activos = computed(
    () => this.usuarios().filter((u) => u.estado === 'Activo').length,
  );

  /** Conteo de inactivos sobre la lista cargada del backend */
  readonly inactivos = computed(
    () => this.usuarios().filter((u) => u.estado !== 'Activo').length,
  );

  /** Filtrado local por texto (el filtro de estado ya viaja al backend) */
  readonly filteredUsuarios = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.usuarios();
    }

    return this.usuarios().filter((usuario) =>
      [
        usuario.numeroidentificacion,
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

  // ── Helpers de filtro ──────────────────────────────────────────────────

  /** Convierte el enum interno al valor boolean que espera el backend. */
  private filtroToParam(filtro: FiltroEstado): boolean | null {
    if (filtro === 'activos') return true;
    if (filtro === 'inactivos') return false;
    return null; // 'todos' → sin parámetro
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

  // ── Acciones sobre usuarios ────────────────────────────────────────────

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
      panelClass: 'tmr-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;


      // Resultado 'creado' → usuario nuevo creado en backend
      if (result === 'creado') {
        this.reloadUsuarios();
        this.mostrarExito('Usuario creado correctamente');
        return;
      }

      // Resultado 'actualizado' → edición guardada en backend desde el modal
      if (result === 'actualizado') {
        this.reloadUsuarios();
        this.mostrarExito('Usuario actualizado correctamente');
        return;
      }

      // Resultado objeto Usuario → edición local legacy (ya no se usa, pero se mantiene por compatibilidad)
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
    // Cargar detalle completo desde backend para que "Ver más" tenga todos los campos
    this.configuracionService.getUsuarioDetalle(usuario.id).subscribe({
      next: (detalle) => {
        const dialogRef = this.dialog.open(UsuarioDetalleModal, {
          panelClass: 'tmr-dialog-panel',
          data: { usuario: detalle },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result?.action === 'editar' && result.usuario) {
            this.editUsuario(result.usuario);
          }
          if (result?.action === 'toggleEstado' && result.usuario) {
            this.toggleEstadoUsuario(result.usuario);
          }
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
  }
}
