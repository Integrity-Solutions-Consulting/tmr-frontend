import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Modulo, Rol } from '../../models/configuracion.models';
import { ONLY_LETTERS_REGEX } from '../../../../shared/validators/form-validators';

const MODULOS_DISPONIBLES = [
  'Dashboard',
  'Proyectos',
  'Actividades',
  'Seguimiento',
  'Colaboradores',
  'Clientes',
  'Lideres',
  'Roles',
  'Usuarios',
  'Dias Festivos',
  'Proyecto por horas',
  'Proyecto por fechas',
  'Solicitud de requerimiento',
  'Historial de requerimiento',
];

export type RolModalMode = 'create' | 'edit' | 'view';

export interface RolModalData {
  rol?: Rol;
  roles: Rol[];
  nextId: number;
  modulos?: Modulo[];
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

  /** Lista completa de módulos disponibles, tal como llegan desde el backend. */
  readonly modulos: Modulo[] = this.data.modulos ?? [];

  /**
   * El formulario guarda los IDs seleccionados (number[]) internamente.
   * Al editar, se pre-cargan los IDs de los módulos ya asignados al rol.
   */
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
    modulosIds: this.fb.nonNullable.control<number[]>(
      this.getRolModuloIds(),
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

  /**
   * Devuelve el ícono de Material para un módulo dado su nombre.
   * El nombre se normaliza (sin tildes, minúsculas) antes de buscar en el mapa.
   * Este mapper solo afecta al ícono; el texto visible siempre viene del backend.
   */
  getModuleIcon(nombre: string): string {
    const normalizedNombre = this.normalizeModuleName(nombre);
    const map: Record<string, string> = {
      'dashboard': 'dashboard',
      'proyectos': 'folder_open',
      'actividades': 'task_alt',
      'seguimiento': 'track_changes',
      'colaboradores': 'group',
      'clientes': 'business',
      // Variantes con y sin tilde — normalizeModuleName quita tildes antes de buscar
      'lideres': 'supervisor_account',
      'roles': 'admin_panel_settings',
      'usuarios': 'manage_accounts',
      // Feriados: nombre nuevo en BD puede ser "Feriados" o "Dias Festivos"
      'feriados': 'event',
      'dias festivos': 'event',
      'proyecto por horas': 'schedule',
      'proyecto por fechas': 'date_range',
      'solicitud de requerimiento': 'assignment',
      'historial de requerimiento': 'history',
      // Configuración con tilde se normaliza a "configuracion"
      'configuracion': 'settings',
      'reportes': 'bar_chart',
      'time report': 'timer',
      'requerimientos': 'assignment_turned_in',
    };
    return map[normalizedNombre] ?? 'extension';
  }

  /** Agrega o quita un ID de módulo del listado de IDs seleccionados en el form. */
  toggleModulo(id: number): void {
    if (this.isView) return;
    const current = this.form.controls.modulosIds.value;
    const next = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];
    this.form.controls.modulosIds.setValue(next);
    this.form.controls.modulosIds.markAsDirty();
    this.form.controls.modulosIds.markAsTouched();
    this.form.controls.modulosIds.updateValueAndValidity();
  }

  /** Comprueba si un módulo (por ID) está seleccionado en el form. */
  isChecked(id: number): boolean {
    return this.form.controls.modulosIds.value.includes(id);
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

    // Convertir los IDs seleccionados de vuelta a objetos Modulo completos
    // para que Rol.modulos sea Modulo[] y el servicio pueda leer m.id directamente.
    const selectedModuloIds = value.modulosIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const selectedModulos = this.modulos.filter((m) => selectedModuloIds.includes(m.id));

    this.dialogRef.close({
      id: this.data.rol?.id ?? this.data.nextId,
      nombre: value.nombre,
      descripcion: value.descripcion,
      modulos: selectedModulos,
      modulosids: selectedModuloIds,
      activo: value.activo,
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

  private requiredModulesValidator(control: AbstractControl<number[]>): ValidationErrors | null {
    return control.value.length > 0 ? null : { requiredModules: true };
  }

  private getRolModuloIds(): number[] {
    const ids = this.data.rol?.modulosids ?? this.data.rol?.modulos.map((m) => m.id) ?? [];
    return ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  private normalizeRoleName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeModuleName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }
}
