import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MODULOS_DISPONIBLES } from '../../mocks/configuracion.mock';
import { Rol } from '../../models/configuracion.models';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { ONLY_LETTERS_REGEX } from '../../../../shared/validators/form-validators';

@Component({
  selector: 'app-roles-form-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ModalBase,
  ],
  templateUrl: './roles-form-modal.html',
  styleUrl: './roles-form-modal.scss',
})
export class RolesFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RolesFormModal>);
  readonly data = inject<{ rol?: Rol; nextId: number }>(MAT_DIALOG_DATA);
  readonly modulos = MODULOS_DISPONIBLES;

  readonly form = this.fb.nonNullable.group({
    nombre: [this.data.rol?.nombre ?? '', [Validators.required, Validators.minLength(3), Validators.pattern(ONLY_LETTERS_REGEX)]],
    descripcion: [this.data.rol?.descripcion ?? '', [Validators.required, Validators.minLength(8)]],
    modulos: [this.data.rol?.modulos ?? [], Validators.required],
  });

  get isEdit(): boolean {
    return Boolean(this.data.rol);
  }

  toggleModulo(modulo: string, checked: boolean): void {
    const current = this.form.controls.modulos.value;
    const next = checked ? [...current, modulo] : current.filter((item) => item !== modulo);
    this.form.controls.modulos.setValue(next);
    this.form.controls.modulos.markAsDirty();
    this.form.controls.modulos.markAsTouched();
    this.form.controls.modulos.updateValueAndValidity();
  }

  isChecked(modulo: string): boolean {
    return this.form.controls.modulos.value.includes(modulo);
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
      id: this.data.rol?.id ?? this.data.nextId,
      ...value,
    } satisfies Rol);
  }
}
