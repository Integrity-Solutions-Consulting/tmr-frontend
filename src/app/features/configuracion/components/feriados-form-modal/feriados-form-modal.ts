import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Feriado, TipoFeriado } from '../../models/configuracion.models';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { ONLY_LETTERS_REGEX } from '../../../../shared/validators/form-validators';

@Component({
  selector: 'app-feriados-form-modal',
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
  templateUrl: './feriados-form-modal.html',
  styleUrl: './feriados-form-modal.scss',
})
export class FeriadosFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<FeriadosFormModal>);
  readonly data = inject<{ feriado?: Feriado; nextId: number; fecha?: string }>(MAT_DIALOG_DATA);
  readonly tipos: TipoFeriado[] = ['Nacional', 'Local', 'Religioso', 'Institucional'];

  readonly form = this.fb.nonNullable.group({
    tipo: [this.data.feriado?.tipo ?? 'Local' as TipoFeriado, Validators.required],
    nombre: [this.data.feriado?.nombre ?? '', [Validators.required, Validators.minLength(3), Validators.pattern(ONLY_LETTERS_REGEX)]],
    fecha: [this.data.feriado?.fecha ?? this.data.fecha ?? '', Validators.required],
  });

  get isEdit(): boolean {
    return Boolean(this.data.feriado);
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
      id: this.data.feriado?.id ?? this.data.nextId,
      ...value,
    } satisfies Feriado);
  }
}
