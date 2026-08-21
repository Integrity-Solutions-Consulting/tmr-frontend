import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface MiPerfilData {
  nombre?: string;
  correo?: string;
  telefono?: string;
  cargo?: string;
  idEmpleado?: string | number;
  fechaCreacion?: string;
}

@Component({
  selector: 'app-mi-perfil-modal',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './mi-perfil-modal.component.html',
  styleUrl: './mi-perfil-modal.component.scss'
})
export class MiPerfilModalComponent {
  constructor(
    public dialogRef: MatDialogRef<MiPerfilModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MiPerfilData
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
