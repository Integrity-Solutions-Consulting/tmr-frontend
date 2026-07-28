import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { CatalogoDetalle } from '../../models/configuracion.models';
import { ConfiguracionService } from '../../services/configuracion.service';
import { OnInit, signal } from '@angular/core';

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
export class CatalogosFormModal implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CatalogosFormModal>);
  private readonly configuracionService = inject(ConfiguracionService);
  readonly data = inject<CatalogoModalData>(MAT_DIALOG_DATA);

  readonly isCargo = this.data.idCatalogo === -103;
  readonly departamentos = signal<CatalogoDetalle[]>([]);

  readonly form = this.fb.nonNullable.group({
    codigoValor: [
      this.data.detalle?.valorExtra ?? (this.data.detalle?.codigoValor ?? ''),
      this.data.idCatalogo === -103 
        ? [Validators.required]
        : [
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
    activo: [this.data.detalle?.activo ?? true, Validators.required],
  });

  constructor() {
    if (this.isEdit || this.isView) {
      if (!this.isCargo) {
        this.form.controls.codigoValor.disable();
      }
    }
  }

  ngOnInit(): void {
    if (this.isCargo) {
      this.configuracionService.getDetallesPorCatalogoCodigo('DEP').subscribe({
        next: (deps) => this.departamentos.set(deps),
        error: (err) => console.error(err)
      });
      // Patch with the actual ID from valorExtra, or fallback
      if (this.data.detalle?.valorExtra) {
        this.form.controls.codigoValor.setValue(this.data.detalle.valorExtra);
      }
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
      codigoValor: this.isCargo ? rawValue.codigoValor : rawValue.codigoValor.toUpperCase().trim(),
      valor: rawValue.valor.trim(),
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
