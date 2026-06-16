import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Usuario, Rol } from '../../models/configuracion.models';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
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

  onCerrar(): void {
    this.dialogRef.close();
  }

  resolveRoleNames(): string {
    const roles = this.configuracionService.roles();
    return (this.usuario.rolesids ?? [])
      .map((id) => roles.find((r: Rol) => r.id.toString() === id.toString())?.nombre ?? id)
      .join(', ');
  }

  /** Convierte "YYYY-MM-DD" o "DD-MM-YYYY" → "DD/MM/YYYY" para mostrar en pantalla */
  formatFecha(value: string | null | undefined): string {
    if (!value) return '-';
    const datePart = value.includes('T') ? value.split('T')[0] : value;
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    return datePart;
  }
}
