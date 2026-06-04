import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Boton } from '../../../../shared/components/boton/boton';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { UsuarioDetalleModal } from '../../components/usuario-detalle-modal/usuario-detalle-modal.component';
import { UsuariosFormModal } from '../../components/usuarios-form-modal/usuarios-form-modal';
import { Rol, Usuario } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';
import { UsuariosService } from '../../services/usuarios.service';

@Component({
  selector: 'app-usuarios-page',
  imports: [Boton, SearchInput],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss',
})
export class UsuariosPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(MatDialog);
  readonly query = signal('');
  readonly usuarios = this.configuracionService.usuarios;
  readonly roles = this.configuracionService.roles;

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

  resolveRoleNames(roleIds: string[]): string[] {
    const roles = this.roles();
    return roleIds.map((roleId) => roles.find((rol) => rol.id.toString() === roleId)?.nombre ?? roleId);
  }

  openModal(usuario?: Usuario): void {
    const dialogRef = this.dialog.open<
      UsuariosFormModal,
      { usuario?: Usuario; roles: Rol[]; nextId: number },
      Usuario
    >(UsuariosFormModal, {
      data: {
        usuario,
        roles: this.roles(),
        nextId: this.configuracionService.nextId(this.usuarios()),
      },
      panelClass: 'tmr-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result) => {
      console.log('[DEBUG] Dialog closed with result:', result);
      if (result) {
        if (usuario) {
          console.log('[DEBUG] Result received - calling upsertUsuario');
          this.configuracionService.upsertUsuario(result);
          console.log('[DEBUG] After upsertUsuario - usuarios signal:', this.usuarios());
          return;
        }

        this.recargarUsuariosDesdeBackend();
      } else {
        console.log('[DEBUG] Dialog closed with no result (cancelled)');
      }
    });
  }

  private recargarUsuariosDesdeBackend(): void {
    this.usuariosService.listarUsuarios().subscribe({
      next: (response) => {
        const usuarios = Array.isArray(response) ? response : response.data ?? [];
        this.configuracionService.setUsuarios(usuarios.map((u) => ({
          ...u,
          rolesids: (u.rolesids ?? []).map((roleId) => String(roleId)),
        })));
      },
      error: () => {
        console.error('Error al recargar usuarios desde backend');
      },
    });
  }

  viewUsuario(usuario: Usuario): void {
    const dialogRef = this.dialog.open(UsuarioDetalleModal, {
      panelClass: 'tmr-dialog-panel',
      data: { usuario },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'editar' && result.usuario) {
        this.openModal(result.usuario);
      }
      if (result?.action === 'toggleEstado' && result.usuario) {
        const newEstado = result.usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';
        this.configuracionService.setUsuarioEstado(result.usuario.id, newEstado);
      }
    });
  }

  deleteUsuario(usuario: Usuario): void {
    const newEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.configuracionService.setUsuarioEstado(usuario.id, newEstado);
  }
}
