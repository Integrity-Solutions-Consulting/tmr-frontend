import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MODULOS_DISPONIBLES } from '../../mocks/configuracion.mock';
import { Rol } from '../../models/configuracion.models';
import { ONLY_LETTERS_REGEX } from '../../../../shared/validators/form-validators';

export type RolModalMode = 'create' | 'edit' | 'view';

export interface RolModalData {
  rol?: Rol;
  roles: Rol[];
  nextId: number;
  mode?: RolModalMode;
}

@Component({
  selector: 'app-roles-form-modal',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './roles-form-modal.html',
  styleUrl: './roles-form-modal.scss',
})
export class RolesFormModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<RolesFormModal>);
  readonly data = inject<RolModalData>(MAT_DIALOG_DATA);
  readonly modulos = MODULOS_DISPONIBLES;

  readonly form = this.fb.nonNullable.group({
    nombre: [
      this.data.rol?.nombre ?? '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(ONLY_LETTERS_REGEX),
        this.duplicateNameValidator(),
      ],
    ],
    descripcion: [this.data.rol?.descripcion ?? '', [Validators.required, Validators.minLength(5)]],
    modulos: this.fb.nonNullable.control<string[]>(
      this.data.rol?.modulos ?? [],
      { validators: [this.requiredModulesValidator] },
    ),
    activo: [this.data.rol?.activo ?? true, Validators.required],
  });

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  get isView(): boolean {
    return this.data.mode === 'view';
  }

  getModuleIcon(modulo: string): string {
    const map: Record<string, string> = {
      'Dashboard': 'dashboard',
      'Proyectos': 'folder_open',
      'Actividades': 'task_alt',
      'Seguimiento': 'track_changes',
      'Colaboradores': 'group',
      'Clientes': 'business',
      'Lideres': 'supervisor_account',
      'Roles': 'admin_panel_settings',
      'Usuarios': 'manage_accounts',
      'Dias Festivos': 'event',
      'Proyecto por horas': 'schedule',
      'Proyecto por fechas': 'date_range',
      'Solicitud de requerimiento': 'assignment',
      'Historial de requerimiento': 'history',
    };
    return map[modulo] ?? 'extension';
  }

  toggleModulo(modulo: string, checked: boolean): void {
    if (this.isView) return;
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
      id: this.data.rol?.id ?? this.data.nextId,
      ...value,
    } satisfies Rol);
  }

  private duplicateNameValidator() {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      const value = this.normalizeRoleName(control.value);

      if (!value) {
        return null;
      }

      const duplicate = this.data.roles.some((rol) =>
        rol.id !== this.data.rol?.id && this.normalizeRoleName(rol.nombre) === value
      );

      return duplicate ? { duplicateRoleName: true } : null;
    };
  }

  private requiredModulesValidator(control: AbstractControl<string[]>): ValidationErrors | null {
    return control.value.length > 0 ? null : { requiredModules: true };
  }

  private normalizeRoleName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}
