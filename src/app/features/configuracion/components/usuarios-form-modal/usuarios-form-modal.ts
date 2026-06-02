import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Rol, Usuario } from '../../models/configuracion.models';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { ONLY_LETTERS_REGEX, USERNAME_REGEX } from '../../../../shared/validators/form-validators';

@Component({
  selector: 'app-usuarios-form-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ModalBase,
  ],
  templateUrl: './usuarios-form-modal.html',
  styleUrl: './usuarios-form-modal.scss',
})
export class UsuariosFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UsuariosFormModal>);
  readonly data = inject<{ usuario?: Usuario; roles: Rol[]; nextId: number }>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    nombres: [this.data.usuario?.nombres ?? '', [Validators.required, Validators.minLength(4), Validators.pattern(ONLY_LETTERS_REGEX)]],
    email: [this.data.usuario?.email ?? '', [Validators.required, Validators.email]],
    usuario: [this.data.usuario?.usuario ?? '', [Validators.required, Validators.minLength(3), Validators.pattern(USERNAME_REGEX)]],
    area: [this.data.usuario?.area ?? '', [Validators.required, Validators.minLength(2), Validators.pattern(ONLY_LETTERS_REGEX)]],
    roles: [this.data.usuario?.roles ?? [], Validators.required],
  });

  get isEdit(): boolean {
    return Boolean(this.data.usuario);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      id: this.data.usuario?.id ?? this.data.nextId,
      estado: this.data.usuario?.estado ?? 'Activo',
      ...value,
    } satisfies Usuario);
  }
}
