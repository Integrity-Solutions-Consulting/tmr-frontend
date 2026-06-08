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

  /** Controla la visibilidad del modal de éxito. */
  readonly exitoVisible = signal(false);
  readonly exitoMensaje = signal('Operación realizada exitosamente');

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

  readonly activos = computed(() => this.usuarios().filter((usuario) => usuario.estado === 'Activo').length);

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
    return roleIds.map((roleId) => roles.find((rol) => rol.id.toString() === roleId)?.nombre ?? roleId);
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
        this.mostrarExito('Usuario creado correctamente');
        return;
      }

      // Resultado objeto Usuario → edición local
      if (result !== true && typeof result === 'object') {
        const usuarioEditado = result as Usuario;
        this.configuracionService
          .updateUsuario(usuarioEditado.id, this.configuracionService.toUpdateUsuarioPayload(usuarioEditado))
          .subscribe({
            next: () => {
              this.configuracionService.loadUsuarios();
              this.mostrarExito('Usuario actualizado correctamente');
            },
            error: (err) => console.error(err),
          });
      }
    });
  }

  viewUsuario(usuario: Usuario): void {
    const dialogRef = this.dialog.open(UsuarioDetalleModal, {
      panelClass: 'tmr-dialog-panel',
      data: { usuario },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'editar' && result.usuario) {
        this.editUsuario(result.usuario);
      }
      if (result?.action === 'toggleEstado' && result.usuario) {
        this.toggleEstadoUsuario(result.usuario);
      }
    });
  }

  toggleEstadoUsuario(usuario: Usuario): void {
    if (usuario.estado === 'Activo') {
      this.configuracionService.deleteUsuario(usuario.id);
      return;
    }

    this.configuracionService.setUsuarioEstado(usuario.id, true).subscribe({
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
}
