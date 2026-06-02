import { Component, computed, inject, signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Boton } from '../../../../shared/components/boton/boton';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { Tabla } from '../../../../shared/components/tabla/tabla';
import { DetailModal, DetailModalData } from '../../../../shared/components/detail-modal/detail-modal';
import { RolesFormModal } from '../../components/roles-form-modal/roles-form-modal';
import { Rol, TableColumn } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-roles-page',
  imports: [Boton, SearchInput, Tabla],
  schemas: [NO_ERRORS_SCHEMA],
  templateUrl: './roles-page.html',
  styleUrl: './roles-page.scss',
})
export class RolesPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);
  readonly query = signal('');
  readonly roles = this.configuracionService.roles;

  readonly columns: TableColumn<Record<string, unknown>>[] = [
    { key: 'nombre', label: 'Rol', width: '18%' },
    { key: 'descripcion', label: 'Descripcion', width: '28%' },
    { key: 'modulos', label: 'Modulos', type: 'chips' },
    { key: 'acciones', label: 'Acciones', type: 'actions', width: '110px' },
  ];

  readonly filteredRoles = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.roles();
    }

    return this.roles().filter((rol) =>
      [rol.nombre, rol.descripcion, rol.modulos.join(' ')].join(' ').toLowerCase().includes(query),
    );
  });

  openModal(rol?: Rol): void {
    const dialogRef = this.dialog.open<RolesFormModal, { rol?: Rol; nextId: number }, Rol>(
      RolesFormModal,
      {
        data: { rol, nextId: this.configuracionService.nextId(this.roles()) },
        panelClass: 'tmr-dialog-panel',
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.configuracionService.upsertRol(result);
      }
    });
  }

  viewRol(rol: Rol): void {
    this.dialog.open<DetailModal, DetailModalData>(DetailModal, {
      panelClass: 'tmr-dialog-panel',
      data: {
        title: rol.nombre,
        subtitle: 'Detalle del rol y modulos habilitados.',
        fields: [
          { label: 'Descripcion', value: rol.descripcion },
          { label: 'Modulos', value: rol.modulos.join(', ') },
        ],
      },
    });
  }

  deleteRol(rol: Rol): void {
    this.configuracionService.deleteRol(rol.id);
  }
}
