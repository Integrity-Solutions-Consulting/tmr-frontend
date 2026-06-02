import { Component, computed, inject, signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Boton } from '../../../../shared/components/boton/boton';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { Tabla } from '../../../../shared/components/tabla/tabla';
import { DetailModal, DetailModalData } from '../../../../shared/components/detail-modal/detail-modal';
import { UsuariosFormModal } from '../../components/usuarios-form-modal/usuarios-form-modal';
import { Rol, TableColumn, Usuario } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-usuarios-page',
  imports: [Boton, SearchInput, Tabla],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './usuarios-page.html',
  styleUrl: './usuarios-page.scss',
})
export class UsuariosPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);
  readonly query = signal('');
  readonly usuarios = this.configuracionService.usuarios;
  readonly roles = this.configuracionService.roles;

  readonly columns: TableColumn<Record<string, unknown>>[] = [
    { key: 'nombres', label: 'Nombres', width: '22%' },
    { key: 'email', label: 'Correo', width: '24%' },
    { key: 'area', label: 'Area', width: '14%' },
    { key: 'estado', label: 'Estado', type: 'status', width: '120px' },
    { key: 'roles', label: 'Roles', type: 'chips' },
    { key: 'acciones', label: 'Acciones', type: 'actions', width: '110px' },
  ];

  readonly filteredUsuarios = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.usuarios();
    }

    return this.usuarios().filter((usuario) =>
      [
        usuario.nombres,
        usuario.email,
        usuario.usuario,
        usuario.area,
        usuario.estado,
        usuario.roles.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  readonly activos = computed(() => this.usuarios().filter((usuario) => usuario.estado === 'Activo').length);

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
      if (result) {
        this.configuracionService.upsertUsuario(result);
      }
    });
  }

  viewUsuario(usuario: Usuario): void {
    this.dialog.open<DetailModal, DetailModalData>(DetailModal, {
      panelClass: 'tmr-dialog-panel',
      data: {
        title: usuario.nombres,
        subtitle: 'Detalle de cuenta, area, roles y estado.',
        fields: [
          { label: 'Correo', value: usuario.email },
          { label: 'Usuario', value: usuario.usuario },
          { label: 'Area', value: usuario.area },
          { label: 'Estado', value: usuario.estado },
          { label: 'Roles', value: usuario.roles.join(', ') },
        ],
      },
    });
  }

  deleteUsuario(usuario: Usuario): void {
    this.configuracionService.deleteUsuario(usuario.id);
  }
}
