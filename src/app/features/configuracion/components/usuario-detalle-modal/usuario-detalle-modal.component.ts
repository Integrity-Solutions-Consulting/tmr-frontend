import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Usuario, Rol } from '../../models/configuracion.models';
import { BadgeEstadoComponent } from '../../../../shared/componentes/badge-estado/badge-estado.component';
import { ConfiguracionService } from '../../services/configuracion.service';

@Component({
  selector: 'app-usuario-detalle-modal',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent],
  templateUrl: './usuario-detalle-modal.component.html',
  styleUrl: './usuario-detalle-modal.component.scss',
})
export class UsuarioDetalleModal {
  readonly dialogRef = inject(MatDialogRef<UsuarioDetalleModal>);
  readonly data = inject<{ usuario: Usuario }>(MAT_DIALOG_DATA);
  usuario = this.data.usuario;
  private readonly configuracionService = inject(ConfiguracionService);

  onEditar(): void {
    this.dialogRef.close({ action: 'editar', usuario: this.usuario });
  }

  onToggleEstado(): void {
    this.dialogRef.close({ action: 'toggleEstado', usuario: this.usuario });
  }

  onCerrar(): void {
    this.dialogRef.close();
  }

  resolveRoleNames(): string {
    const roles = this.configuracionService.roles();
    return (this.usuario.rolesids ?? [])
      .map((id) => roles.find((r: Rol) => r.id.toString() === id.toString())?.nombre ?? id)
      .join(', ');
  }
}
