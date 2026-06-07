import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { Boton } from '../../../../shared/components/boton/boton';
import { SearchInput } from '../../../../shared/components/search-input/search-input';
import { RolesFormModal, RolModalData } from '../../components/roles-form-modal/roles-form-modal';
import { Rol } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-roles-page',
  imports: [Boton, SearchInput, MatIconModule, MatMenuModule, MatButtonModule],
  templateUrl: './roles-page.html',
  styleUrl: './roles-page.scss',
})
export class RolesPage {
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly dialog = inject(MatDialog);
  readonly query = signal('');
  readonly estadoError = signal<string | null>(null);
  readonly estadoCambiandoId = signal<number | null>(null);
  readonly roles = this.configuracionService.roles;
  readonly modulos = this.configuracionService.modulos;

  readonly rolesActivos = computed(() => this.roles().filter((rol) => rol.activo).length);
  readonly modulosCubiertos = computed(() => new Set(this.roles().flatMap((rol) => rol.modulos)).size);

  readonly filteredRoles = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.roles();
    }

    return this.roles().filter((rol) =>
      [rol.nombre, rol.descripcion, rol.modulos.join(' '), rol.activo ? 'activo' : 'inactivo']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  });

  openModal(rol?: Rol, mode: 'create' | 'edit' | 'view' = 'create'): void {
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
      },
    );

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.configuracionService.upsertRol(result);
      }
    });
  }

  viewRol(rol: Rol): void {
    this.openModal(rol, 'view');
  }

  editRol(rol: Rol): void {
    this.openModal(rol, 'edit');
  }

  visibleModulos(rol: Rol): string[] {
    return rol.modulos.slice(0, 3);
  }

  modulosOcultos(rol: Rol): number {
    return Math.max(rol.modulos.length - 3, 0);
  }

  toggleEstado(rol: Rol): void {
    this.estadoError.set(null);
    this.estadoCambiandoId.set(rol.id);

    this.configuracionService.setRolEstado(rol.id, !rol.activo).subscribe({
      next: () => this.estadoCambiandoId.set(null),
      error: (err) => {
        this.estadoCambiandoId.set(null);
        this.estadoError.set(this.extractEstadoError(err));
      },
    });
  }

  private extractEstadoError(err: unknown): string {
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
      ?? 'No se pudo cambiar el estado del rol. Verifica si es un rol de sistema o si tiene usuarios asignados.';
  }
}
