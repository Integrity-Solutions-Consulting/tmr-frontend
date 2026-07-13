import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { CatalogoDetalle } from '../../models/configuracion.models';

export type CatalogoModalMode = 'create' | 'edit' | 'view';

export interface CatalogoModalData {
  detalle?: CatalogoDetalle;
  detallesExistentes: CatalogoDetalle[];
  idCatalogo: number;
  mode?: CatalogoModalMode;
}

@Component({
  selector: 'app-catalogos-form-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './catalogos-form-modal.html',
  styleUrl: './catalogos-form-modal.scss',
})
export class CatalogosFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CatalogosFormModal>);
  readonly data = inject<CatalogoModalData>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    codigoValor: [
      this.data.detalle?.codigoValor ?? '',
      [
        Validators.required,
        Validators.minLength(1),
        Validators.pattern('^[a-zA-Z0-9_-]+$'),
        this.duplicateCodigoValidator(),
      ],
    ],
    valor: [
      this.data.detalle?.valor ?? '',
      [
        Validators.required,
        Validators.minLength(2),
        this.duplicateValorValidator(),
      ],
    ],
    descripcion: [this.data.detalle?.descripcion ?? ''],
    orden: [this.data.detalle?.orden ?? null, [Validators.min(0)]],
    activo: [this.data.detalle?.activo ?? true, Validators.required],
  });

  constructor() {
    if (this.isEdit || this.isView) {
      this.form.controls.codigoValor.disable();
    }
  }

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  get isView(): boolean {
    return this.data.mode === 'view';
  }

  tieneValor(campo: keyof typeof this.form.controls): boolean {
    const value = this.form.controls[campo].value;
    return value !== null && value !== undefined && value !== '';
  }

  campoInvalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.invalid && (control.touched || control.dirty);
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

    const rawValue = this.form.getRawValue();

    this.dialogRef.close({
      id: this.data.detalle?.id ?? 0,
      idCatalogo: this.data.idCatalogo,
      codigoValor: rawValue.codigoValor.toUpperCase().trim(),
      valor: rawValue.valor.trim(),
      descripcion: rawValue.descripcion?.trim() || null,
      orden: (rawValue.orden !== null && rawValue.orden !== undefined) ? Number(rawValue.orden) : null,
      valorExtra: this.data.detalle?.valorExtra || null,
      activo: rawValue.activo,
    });
  }

  private duplicateCodigoValidator() {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      const val = control.value?.toUpperCase().trim();
      if (!val) return null;

      const dup = this.data.detallesExistentes.some(
        (d) => d.id !== this.data.detalle?.id && d.codigoValor.toUpperCase().trim() === val
      );
      return dup ? { duplicateCodigo: true } : null;
    };
  }

  private duplicateValorValidator() {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      const val = control.value?.trim().toLowerCase();
      if (!val) return null;

      const dup = this.data.detallesExistentes.some(
        (d) => d.id !== this.data.detalle?.id && d.valor.trim().toLowerCase() === val
      );
      return dup ? { duplicateValor: true } : null;
    };
  }
}
