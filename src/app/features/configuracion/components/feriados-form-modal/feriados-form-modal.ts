import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Feriado, TipoFeriado } from '../../models/configuracion.models';

export type FeriadoModalMode = 'create' | 'edit' | 'view';

export interface FeriadoModalData {
  feriado?: Feriado;
  feriados: Feriado[];
  nextId: number;
  fecha?: string;
  mode?: FeriadoModalMode;
}

@Component({
  selector: 'app-feriados-form-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './feriados-form-modal.html',
  styleUrl: './feriados-form-modal.scss',
})
export class FeriadosFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<FeriadosFormModal>);
  readonly data = inject<FeriadoModalData>(MAT_DIALOG_DATA);

  readonly tipos = ['Nacional', 'Local', 'Religioso'] as TipoFeriado[];

  readonly form = this.fb.nonNullable.group({
    tipo: [this.data.feriado?.tipo ?? 'Nacional' as TipoFeriado, Validators.required],
    nombre: [
      this.data.feriado?.nombre ?? '',
      [Validators.required, Validators.minLength(3)],
    ],
    fecha: [this.data.feriado?.fecha ?? this.data.fecha ?? '', Validators.required],
    descripcion: [this.data.feriado?.descripcion ?? ''],
    recurrente: [this.data.feriado?.recurrente ?? false],
    activo: [this.data.feriado?.activo ?? true, Validators.required],
  }, { validators: [this.duplicateDateNameValidator()] });

  constructor() {
    if (this.isEdit) {
      this.form.controls.activo.disable({ emitEvent: false });
    }
  }

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  get isView(): boolean {
    return this.data.mode === 'view';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return new Intl.DateTimeFormat('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })
      .format(new Date(`${fecha}T00:00:00`));
  }

  save(): void {
    if (this.isView) {
      this.dialogRef.close();
      return;
    }

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

  private duplicateDateNameValidator() {
    return (group: AbstractControl): ValidationErrors | null => {
      const nombre = (group.get('nombre')?.value ?? '').trim().toLowerCase();
      const fecha = (group.get('fecha')?.value ?? '').trim();

      if (!nombre || !fecha) return null;

      const duplicate = this.data.feriados.some(
        (f) =>
          f.id !== this.data.feriado?.id &&
          f.nombre.trim().toLowerCase() === nombre &&
          f.fecha === fecha
      );

      return duplicate ? { duplicateFeriado: true } : null;
    };
  }
}
