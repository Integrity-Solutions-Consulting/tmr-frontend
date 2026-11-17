import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ActualizacionDatosService } from './actualizacion-datos.service';
import { Boton } from '../../shared/components/boton/boton';
import { AppSelectComponent, AppSelectOption } from '../../shared/components/select/select.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificacionComponent } from '../clientes/componentes/notificacion/notificacion.component';
import { Notificacion } from '../clientes/modelos/cliente.model';
import { nombrePersonaValidator, normalizarNombrePersona } from '../../shared/validators/nombre-persona.validator';
import { telefonoValidator, TELEFONO_MENSAJE } from '../../shared/validators/telefono.validator';
import { MatIconModule } from '@angular/material/icon';

type ConditionKind = 'children' | 'ownDisability' | 'partner' | 'childDisability';
type ValidationSummaryItem = { path: string; label: string; message: string };

@Component({
  selector: 'app-mis-datos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, Boton, AppSelectComponent, ConfirmDialogComponent, NotificacionComponent],
  templateUrl: './mis-datos.page.html',
  styleUrl: './mis-datos.page.scss'
})
export class MisDatosPage {
  private fb = inject(FormBuilder);
  private api = inject(ActualizacionDatosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  data: any = null;
  loading = true; loadFailed = false; saving = false; message = ''; error = ''; saveAttempted = false; notificacion: Notificacion | null = null;
  private backendErrors: Record<string, string> = {};
  validationSummary: ValidationSummaryItem[] = [];
  tab = 'personal'; dirty = false; solicitudSaving = false; solicitudId?: number;
  private readonly validTabs = new Set(['personal', 'familia', 'formacion', 'certificaciones', 'solicitudes']);
  private lastTab = 'personal';
  deletingId?: number;
  deleteTarget?: { id: number; nombre: string; solicitudId?: number };
  conditionTarget?: { kind: ConditionKind; previous: string; next: string; row?: AbstractControl };
  private previousChildren = 'NoInformado';
  private previousOwnDisability = 'NoInformado';
  private previousCivil = '';
  private previousChildDisability = new Map<string, string>();
  private removedChildKeys: string[] = [];
  private removedPartnerKey?: string;
  private readonly uploadingDocuments = new Set<string>();

  readonly estadoCivilOptions: AppSelectOption[] = [
    { value: 'Soltero', label: 'Soltero' }, { value: 'Casado', label: 'Casado' },
    { value: 'UnionLibre', label: 'Unión libre' }, { value: 'Divorciado', label: 'Divorciado' },
    { value: 'Viudo', label: 'Viudo' }
  ];
  readonly triStateOptions: AppSelectOption[] = [
    { value: 'Si', label: 'Sí' }, { value: 'No', label: 'No' }, { value: 'NoInformado', label: 'No informado' }
  ];

  form = this.fb.group({
    persona: this.fb.group({
      nombres: ['', nombrePersonaValidator()], apellidos: ['', nombrePersonaValidator()],
      email: ['', Validators.email], telefono: ['', telefonoValidator()], direccion: [''],
      tieneDiscapacidad: ['NoInformado'], tipoDiscapacidad: [''], porcentajeDiscapacidad: [''],
      limpiarDiscapacidad: [false]
    }),
    familia: this.fb.group({
      estadoCivil: [''], tieneHijos: ['NoInformado'], limpiarHijos: [false], limpiarPareja: [false],
      pareja: this.fb.group({
        id: [null], clave: [crypto.randomUUID().replaceAll('-', '')], tipoRelacion: ['Conyuge'],
        nombres: ['', nombrePersonaValidator(false)], apellidos: ['', nombrePersonaValidator(false)], identificacion: ['', Validators.pattern(/^\d{0,10}$/)], fechaNacimiento: [''],
        tieneDiscapacidad: ['NoInformado'], tipoDiscapacidad: [''], porcentajeDiscapacidad: [''], archivos: [[] as any[]]
      }),
      familiares: this.fb.array([])
    }),
    formaciones: this.fb.array([]), certificaciones: this.fb.array([])
  });
  solicitudForm = this.fb.group({ asunto: ['', Validators.required], descripcion: ['', Validators.required], enviar: [true] });

  get formaciones() { return this.form.controls.formaciones as FormArray; }
  get certificaciones() { return this.form.controls.certificaciones as FormArray; }
  get familiares() { return this.form.controls.familia.controls.familiares as FormArray; }
  get pareja() { return this.form.controls.familia.controls.pareja; }
  isYes(value: unknown) { return value === 'Si' || value === 'Sí'; }
  requiresPartner(value: unknown) { return value === 'Casado' || value === 'UnionLibre'; }
  mostrarNotificacion(notificacion: Notificacion) { this.notificacion = null; queueMicrotask(() => this.notificacion = notificacion); }
  cerrarNotificacion() { this.notificacion = null; }
  abrirArchivo(input: HTMLInputElement) { input.click(); }

  ngOnInit() {
    this.form.valueChanges.subscribe(() => { this.dirty = true; this.clearBackendErrors(); if (this.saveAttempted) this.refreshValidationSummary(); });
    this.route.queryParamMap.subscribe(params => {
      const requested = params.get('tab');
      this.tab = requested && this.validTabs.has(requested) ? requested : 'personal';
      this.lastTab = this.tab;
    });
    this.load();
  }

  setTab(tab: string) {
    const next = this.validTabs.has(tab) ? tab : 'personal';
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: next }, queryParamsHandling: 'merge' });
  }

  control(path: string): AbstractControl | null { return this.form.get(path); }
  controlInvalido(path: string): boolean {
    const ctrl = this.control(path);
    return !!ctrl && ctrl.invalid && !ctrl.disabled && (ctrl.touched || this.saveAttempted);
  }
  mensajeError(path: string): string {
    const ctrl = this.control(path);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['backend']) return ctrl.errors['backend'];
    if (ctrl.errors['required']) return 'Este campo es obligatorio';
    if (ctrl.errors['email']) return path.endsWith('.email') ? 'Ingresa un correo electrónico válido' : 'Ingresa un valor válido';
    if (ctrl.errors['telefonoCaracteres'] || ctrl.errors['telefonoLongitud']) return TELEFONO_MENSAJE;
    if (ctrl.errors['maxlength']) return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres`;
    if (ctrl.errors['minlength']) return `Mínimo ${ctrl.errors['minlength'].requiredLength} caracteres`;
    if (ctrl.errors['min']) return `El valor mínimo es ${ctrl.errors['min'].min}`;
    if (ctrl.errors['max']) return `El valor máximo es ${ctrl.errors['max'].max}`;
    if (ctrl.errors['pattern'] || ctrl.errors['soloLetras']) return 'Ingresa un valor con el formato permitido';
    return 'Revisa este campo';
  }
  private clearBackendErrors() {
    if (!Object.keys(this.backendErrors).length) return;
    for (const path of Object.keys(this.backendErrors)) {
      const ctrl = this.control(path);
      if (!ctrl) continue;
      const errors = { ...(ctrl.errors || {}) };
      delete errors['backend'];
      ctrl.setErrors(Object.keys(errors).length ? errors : null, { emitEvent: false });
    }
    this.backendErrors = {};
  }
  private invalidPaths(control: AbstractControl = this.form, path = ''): string[] {
    const nested = (control as any).controls;
    if (!nested) return control.invalid && !control.disabled ? [path] : [];
    return Object.entries(nested as Record<string, AbstractControl>).flatMap(([key, child]) => this.invalidPaths(child, path ? `${path}.${key}` : key));
  }
  private fieldLabel(path: string): string {
    const labels: Record<string, string> = { nombres: 'Nombres', apellidos: 'Apellidos', email: 'Correo electrónico', telefono: 'Teléfono', identificacion: 'Identificación', fechaNacimiento: 'Fecha de nacimiento', porcentajeDiscapacidad: 'Porcentaje', nivel: 'Nivel', institucion: 'Institución', titulo: 'Título', nombre: 'Nombre', entidadEmisora: 'Entidad emisora', fechaEmision: 'Fecha de emisión', fechaVencimiento: 'Fecha de vencimiento', asunto: 'Asunto', descripcion: 'Descripción' };
    const child = path.match(/^familia\.familiares\.(\d+)\.(.+)$/);
    if (child) return `Hijo ${Number(child[1]) + 1} → ${labels[child[2]] || child[2]}`;
    const partner = path.match(/^familia\.pareja\.(.+)$/);
    if (partner) return `Cónyuge → ${labels[partner[1]] || partner[1]}`;
    const formation = path.match(/^formaciones\.(\d+)\.(.+)$/);
    if (formation) return `Formación ${Number(formation[1]) + 1} → ${labels[formation[2]] || formation[2]}`;
    const certification = path.match(/^certificaciones\.(\d+)\.(.+)$/);
    if (certification) return `Certificación ${Number(certification[1]) + 1} → ${labels[certification[2]] || certification[2]}`;
    const field = path.split('.').pop() || path;
    return labels[field] || field;
  }
  private refreshValidationSummary(paths = this.invalidPaths()) {
    this.validationSummary = [...new Set(paths)].map(path => ({ path, label: this.fieldLabel(path), message: this.mensajeError(path) })).filter(item => item.message);
  }
  focusError(path: string) { this.focusPath(path); }
  private focusPath(path: string) {
    const root = path.split('.')[0];
    const tabByRoot: Record<string, string> = { persona: 'personal', familia: 'familia', formaciones: 'formacion', certificaciones: 'certificaciones', solicitudes: 'solicitudes' };
    if (tabByRoot[root] && this.tab !== tabByRoot[root]) this.setTab(tabByRoot[root]);
    setTimeout(() => Array.from(document.querySelectorAll<HTMLElement>('[data-control-path]')).find(el => el.dataset['controlPath'] === path)?.focus());
  }
  private applyBackendErrors(error: any): string[] {
    const source = error?.error?.errors || error?.error?.data?.errors || error?.error?.validationErrors || error?.error?.fieldErrors;
    if (!source || typeof source !== 'object') return [];
    const entries = Array.isArray(source)
      ? source.map(item => [item.field || item.Field, item.message || item.Message] as [string, unknown])
      : Object.entries(source).flatMap(([field, value]) => (Array.isArray(value) ? value.map(message => [field, message] as [string, unknown]) : [[field, value] as [string, unknown]]));
    const applied: string[] = [];
    for (const [rawPath, rawMessage] of entries) {
      if (!rawPath) continue;
      const path = this.normalizeErrorPath(rawPath);
      const ctrl = this.control(path);
      if (!ctrl) continue;
      const message = Array.isArray(rawMessage) ? String(rawMessage[0] || 'Revisa este campo') : String(rawMessage || 'Revisa este campo');
      ctrl.setErrors({ ...(ctrl.errors || {}), backend: message });
      this.backendErrors[path] = message;
      applied.push(path);
    }
    if (applied.length) this.refreshValidationSummary(applied);
    return applied;
  }
  private normalizeErrorPath(path: string): string {
    const clean = path.replace(/^\$\./, '').replace(/\[(\d+)\]/g, '.$1');
    const parts = clean.split(/[./]/).filter(Boolean);
    const map: Record<string, string> = { Persona: 'persona', Familia: 'familia', Pareja: 'pareja', Familiares: 'familiares', Formaciones: 'formaciones', Certificaciones: 'certificaciones', Nombres: 'nombres', Apellidos: 'apellidos', Email: 'email', CorreoElectronico: 'email', Telefono: 'telefono', Asunto: 'asunto', Descripcion: 'descripcion' };
    const normalized = parts.map(part => map[part] || part.charAt(0).toLowerCase() + part.slice(1)).join('.');
    return normalized === 'telefono' ? 'persona.telefono' : normalized;
  }
  private focusFirstInvalid() {
    const path = this.firstInvalidPath(this.form);
    if (!path) return;
    this.focusPath(path);
  }
  private firstInvalidPath(control: AbstractControl, path = ''): string | null {
    const nested = (control as any).controls;
    if (!nested) return control.invalid && !control.disabled ? path : null;
    for (const [key, child] of Object.entries(nested as Record<string, AbstractControl>)) {
      const childPath = path ? `${path}.${key}` : key;
      const found = this.firstInvalidPath(child, childPath);
      if (found) return found;
    }
    return null;
  }

  ngDoCheck() {
    if (this.tab !== this.lastTab && this.validTabs.has(this.tab)) {
      this.lastTab = this.tab;
      this.router.navigate([], { relativeTo: this.route, queryParams: { tab: this.tab }, queryParamsHandling: 'merge' });
    }
  }

  load() {
    this.loading = true; this.loadFailed = false; this.error = '';
    this.api.getMine().subscribe({
      next: x => {
        this.data = x; this.formaciones.clear(); this.certificaciones.clear(); this.familiares.clear();
        this.removedChildKeys = []; this.removedPartnerKey = undefined; this.previousChildDisability.clear();
        this.form.patchValue({
          persona: { ...x.persona, limpiarDiscapacidad: false },
          familia: { ...(x.familia || {}), limpiarHijos: false, limpiarPareja: false }
        }, { emitEvent: false });
        if (x.familia?.pareja) this.pareja.patchValue(x.familia.pareja, { emitEvent: false });
        (x.formaciones || []).forEach((v: any) => this.addFormacion(v));
        (x.certificaciones || []).forEach((v: any) => this.addCertificacion(v));
        (x.familia?.familiares || []).forEach((v: any) => this.addFamiliar(v));
        this.previousChildren = x.familia?.tieneHijos || 'NoInformado';
        this.previousOwnDisability = (x.persona as any)?.tieneDiscapacidad || 'NoInformado';
        this.previousCivil = x.familia?.estadoCivil || '';
        this.dirty = false; this.loading = false;
      },
      error: e => {
        this.data = null; this.loadFailed = true;
        const code = e.error?.code || e.error?.extensions?.code;
        this.error = code === 'EMPLOYEE_INACTIVE'
          ? 'Tu usuario está vinculado a un colaborador inactivo. La edición está bloqueada; solicita a RRHH revisar tu estado laboral.'
          : 'No fue posible cargar tus datos. Revisa la conexión e inténtalo nuevamente.';
        this.loading = false;
      }
    });
  }

  addFormacion(v: any = {}) { this.formaciones.push(this.fb.group({ id: [v.id || null], clave: [v.clave || crypto.randomUUID().replaceAll('-', '')], nivel: [v.nivel || '', Validators.required], institucion: [v.institucion || '', Validators.required], titulo: [v.titulo || '', Validators.required], fechaInicio: [v.fechaInicio || ''], fechaFin: [v.fechaFin || ''], archivos: [v.archivos || []] })); }
  addCertificacion(v: any = {}) { this.certificaciones.push(this.fb.group({ id: [v.id || null], clave: [v.clave || crypto.randomUUID().replaceAll('-', '')], nombre: [v.nombre || '', Validators.required], entidadEmisora: [v.entidadEmisora || '', Validators.required], fechaEmision: [v.fechaEmision || '', Validators.required], fechaVencimiento: [v.fechaVencimiento || ''], archivos: [v.archivos || []] })); }
  addFamiliar(v: any = {}) {
    const key = v.clave || crypto.randomUUID().replaceAll('-', '');
    this.familiares.push(this.fb.group({
      id: [v.id || null], clave: [key], tipoRelacion: ['Hijo', Validators.required],
      nombres: [v.nombres || '', nombrePersonaValidator()], apellidos: [v.apellidos || '', nombrePersonaValidator()],
      identificacion: [v.identificacion || '', Validators.pattern(/^\d{0,10}$/)], fechaNacimiento: [v.fechaNacimiento || ''],
      tieneDiscapacidad: [v.tieneDiscapacidad || 'NoInformado'], tipoDiscapacidad: [v.tipoDiscapacidad || ''],
      porcentajeDiscapacidad: [v.porcentajeDiscapacidad ?? ''], limpiarDiscapacidad: [false], archivos: [v.archivos || []]
    }));
    this.previousChildDisability.set(key, v.tieneDiscapacidad || 'NoInformado');
  }

  canAddChild() { return this.isYes(this.form.controls.familia.controls.tieneHijos.value); }
  remove(a: FormArray, i: number) { a.removeAt(i); }
  private hasChildData() { return this.familiares.controls.some(c => { const v = c.value; return !!v.id || !!v.nombres || !!v.apellidos || !!v.fechaNacimiento || !!v.archivos?.length; }); }
  private hasOwnDisabilityData() { const v = this.form.controls.persona.value; return this.previousOwnDisability === 'Si' || !!v.tipoDiscapacidad || !!v.porcentajeDiscapacidad || !!this.data?.archivos?.length; }
  private hasPartnerData() { const v: any = this.pareja.getRawValue(); return !!v.id || !!v.nombres || !!v.apellidos || !!v.identificacion || !!v.fechaNacimiento || !!v.archivos?.length; }
  private hasChildDisabilityData(row: AbstractControl) { const v = row.value; return this.previousChildDisability.get(v.clave) === 'Si' || !!v.tipoDiscapacidad || !!v.porcentajeDiscapacidad || !!v.archivos?.length; }

  onFamilyChange() {
    const current = this.form.controls.familia.controls.tieneHijos.value || 'NoInformado';
    if (this.isYes(current)) { this.previousChildren = current; return; }
    if (this.previousChildren === 'Si' && this.hasChildData()) {
      this.form.controls.familia.controls.tieneHijos.setValue(this.previousChildren, { emitEvent: false });
      this.conditionTarget = { kind: 'children', previous: this.previousChildren, next: current }; return;
    }
    this.applyChildrenState(current);
  }
  private applyChildrenState(value: string) {
    if (!this.isYes(value)) {
      this.familiesToRemoveKeys();
      this.familiares.clear();
      this.form.controls.familia.controls.limpiarHijos.setValue(true, { emitEvent: false });
      if (this.data?.familia) this.data.familia.familiares = [];
    }
    this.form.controls.familia.controls.tieneHijos.setValue(value, { emitEvent: false });
    this.previousChildren = value;
  }
  private familiesToRemoveKeys() { this.removedChildKeys.push(...this.familiares.controls.map(c => c.value.clave).filter(Boolean)); this.removedChildKeys = [...new Set(this.removedChildKeys)]; }

  onDisabilityChange(value: unknown) {
    const current = String(value || 'NoInformado');
    if (this.isYes(current)) { this.previousOwnDisability = current; this.form.controls.persona.controls.limpiarDiscapacidad.setValue(false, { emitEvent: false }); return; }
    if (this.previousOwnDisability === 'Si' && this.hasOwnDisabilityData()) {
      this.form.controls.persona.controls.tieneDiscapacidad.setValue(this.previousOwnDisability, { emitEvent: false });
      this.conditionTarget = { kind: 'ownDisability', previous: this.previousOwnDisability, next: current }; return;
    }
    this.applyOwnDisability(current);
  }
  private applyOwnDisability(value: string) {
    const persona = this.form.controls.persona.controls;
    persona.tieneDiscapacidad.setValue(value, { emitEvent: false }); persona.tipoDiscapacidad.setValue('', { emitEvent: false }); persona.porcentajeDiscapacidad.setValue('', { emitEvent: false }); persona.limpiarDiscapacidad.setValue(true, { emitEvent: false });
    if (this.data) this.data.archivos = []; this.previousOwnDisability = value;
  }

  onCivilChange() {
    const current = this.form.controls.familia.controls.estadoCivil.value || '';
    if (this.requiresPartner(current)) { this.previousCivil = current; return; }
    if (this.requiresPartner(this.previousCivil) && this.hasPartnerData()) {
      this.form.controls.familia.controls.estadoCivil.setValue(this.previousCivil, { emitEvent: false });
      this.conditionTarget = { kind: 'partner', previous: this.previousCivil, next: current }; return;
    }
    this.applyCivilState(current);
  }
  private applyCivilState(value: string) {
    if (!this.requiresPartner(value)) {
      this.removedPartnerKey = this.pareja.value.clave || this.removedPartnerKey;
      this.pareja.patchValue({ id: null, nombres: '', apellidos: '', identificacion: '', fechaNacimiento: '', tieneDiscapacidad: 'NoInformado', tipoDiscapacidad: '', porcentajeDiscapacidad: '' }, { emitEvent: false });
      this.pareja.get('archivos')?.setValue([] as any, { emitEvent: false });
      this.form.controls.familia.controls.limpiarPareja.setValue(true, { emitEvent: false });
      if (this.data?.familia) this.data.familia.pareja = null;
    }
    this.form.controls.familia.controls.estadoCivil.setValue(value, { emitEvent: false }); this.previousCivil = value;
  }

  onChildDisabilityChange(row: AbstractControl, value: unknown) {
    const current = String(value || 'NoInformado'); const key = row.value.clave; const previous = this.previousChildDisability.get(key) || 'NoInformado';
    if (this.isYes(current)) { this.previousChildDisability.set(key, current); row.get('limpiarDiscapacidad')?.setValue(false, { emitEvent: false }); return; }
    if (previous === 'Si' && this.hasChildDisabilityData(row)) {
      row.get('tieneDiscapacidad')?.setValue(previous, { emitEvent: false });
      this.conditionTarget = { kind: 'childDisability', previous, next: current, row }; return;
    }
    this.applyChildDisability(row, current);
  }
  private applyChildDisability(row: AbstractControl, value: string) {
    row.patchValue({ tieneDiscapacidad: value, tipoDiscapacidad: '', porcentajeDiscapacidad: '', limpiarDiscapacidad: true }, { emitEvent: false });
    row.get('archivos')?.setValue([], { emitEvent: false });
    this.previousChildDisability.set(row.value.clave, value);
  }

  dialogTitle() { return this.deleteTarget ? 'Eliminar documento' : 'Limpiar información relacionada'; }
  dialogMessage() { return this.deleteTarget ? '¿Deseas eliminar ' + this.deleteTarget.nombre + '? Esta acción no eliminará el registro asociado.' : 'Este cambio eliminará los datos y documentos relacionados al guardar. ¿Deseas continuar?'; }
  confirmDialog() {
    if (this.deleteTarget) { this.confirmDelete(); return; }
    const target = this.conditionTarget; if (!target) return;
    if (target.kind === 'children') this.applyChildrenState(target.next);
    if (target.kind === 'ownDisability') this.applyOwnDisability(target.next);
    if (target.kind === 'partner') this.applyCivilState(target.next);
    if (target.kind === 'childDisability' && target.row) this.applyChildDisability(target.row, target.next);
    this.conditionTarget = undefined;
  }
  cancelDialog() {
    if (this.deleteTarget) { this.cancelDelete(); return; }
    if (this.conditionTarget) {
      const target = this.conditionTarget;
      if (target.kind === 'children') this.form.controls.familia.controls.tieneHijos.setValue(target.previous, { emitEvent: false });
      if (target.kind === 'ownDisability') this.form.controls.persona.controls.tieneDiscapacidad.setValue(target.previous, { emitEvent: false });
      if (target.kind === 'partner') this.form.controls.familia.controls.estadoCivil.setValue(target.previous, { emitEvent: false });
      if (target.kind === 'childDisability' && target.row) target.row.get('tieneDiscapacidad')?.setValue(target.previous, { emitEvent: false });
      this.conditionTarget = undefined;
    }
  }

  save() {
    if (this.loadFailed || !this.data) { this.error = 'Carga los datos oficiales antes de guardar.'; return; }
    this.saveAttempted = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); this.refreshValidationSummary(); this.error = 'Revisa los campos señalados'; this.focusFirstInvalid(); return; }
    const raw: any = this.form.getRawValue(); raw.persona.nombres = normalizarNombrePersona(raw.persona.nombres); raw.persona.apellidos = normalizarNombrePersona(raw.persona.apellidos); raw.persona.telefono = String(raw.persona.telefono ?? '').trim() || null; const ownYes = this.isYes(raw.persona.tieneDiscapacidad); const childrenYes = this.isYes(raw.familia.tieneHijos); const partnerYes = this.requiresPartner(raw.familia.estadoCivil);
    raw.persona.limpiarDiscapacidad = raw.persona.limpiarDiscapacidad || !ownYes;
    if (!ownYes) { raw.persona.tipoDiscapacidad = null; raw.persona.porcentajeDiscapacidad = null; }
    raw.controlVersion = this.data.controlVersion;
    raw.familia.limpiarHijos = raw.familia.limpiarHijos || !childrenYes; raw.familia.clavesHijosAEliminar = this.removedChildKeys;
    raw.familia.limpiarPareja = raw.familia.limpiarPareja || !partnerYes; raw.familia.claveParejaAEliminar = this.removedPartnerKey;
    raw.familia.familiares = childrenYes ? raw.familia.familiares.map((x: any) => ({ ...x, nombres: normalizarNombrePersona(x.nombres), apellidos: normalizarNombrePersona(x.apellidos), tipoRelacion: 'Hijo', tipoDiscapacidad: this.isYes(x.tieneDiscapacidad) ? x.tipoDiscapacidad : null, porcentajeDiscapacidad: this.isYes(x.tieneDiscapacidad) ? x.porcentajeDiscapacidad : null, limpiarDiscapacidad: x.limpiarDiscapacidad || !this.isYes(x.tieneDiscapacidad), archivos: undefined })) : [];
    raw.familia.pareja = partnerYes && (raw.familia.pareja?.nombres || raw.familia.pareja?.apellidos) ? { ...raw.familia.pareja, nombres: normalizarNombrePersona(raw.familia.pareja.nombres), apellidos: normalizarNombrePersona(raw.familia.pareja.apellidos), archivos: undefined } : null;
    this.saving = true; this.error = ''; this.message = '';
    this.api.save(raw).subscribe({ next: () => { this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Cambios guardados correctamente.' }); this.saving = false; this.dirty = false; this.validationSummary = []; this.load(); }, error: e => { const applied = this.applyBackendErrors(e); this.error = applied.length ? '' : this.mensajeErrorGuardado(e); this.saving = false; if (applied.length) this.focusFirstInvalid(); } });
  }
  private mensajeErrorGuardado(error: any): string {
    if (error?.status === 0) return 'No fue posible conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.';
    if (error?.status === 409) return error?.error?.detail || 'Los datos cambiaron desde que los cargaste. Recarga la página antes de guardar.';
    if (error?.status >= 500) return 'El servidor no pudo guardar los cambios. Inténtalo nuevamente más tarde.';
    if (error?.status === 400 || error?.status === 422) return error?.error?.message || error?.error?.title || 'Revisa los campos señalados';
    return 'No fue posible guardar los cambios. Inténtalo nuevamente.';
  }

  private uploadKey(section: string, row: any) {
    const value = row?.value ?? row;
    const identity = section === 'Discapacidad' ? 'own' : value?.clave || value?.id || 'unknown';
    return `${section}:${identity}`;
  }
  isUploading(section: string, row: any) { return this.uploadingDocuments.has(this.uploadKey(section, row)); }
  isSolicitudUploading(id: number) { return this.uploadingDocuments.has(this.uploadKey('Solicitud', { id })); }

  upload(event: any, section: string, row: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const key = this.uploadKey(section, row);
    if (this.uploadingDocuments.has(key)) return;
    const value = row.value;
    this.uploadingDocuments.add(key); this.error = '';
    this.api.uploadDirect(file, section, value.id || undefined, value.clave).pipe(finalize(() => this.uploadingDocuments.delete(key))).subscribe({
      next: (documento: any) => {
        if (section === 'Discapacidad') this.data.archivos = [...(this.data.archivos || []), documento];
        else row.get('archivos')?.setValue([...(row.get('archivos')?.value || []), documento], { emitEvent: false });
        this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Documento adjuntado correctamente.' });
      },
      error: e => { this.error = e.error?.message || e.error?.detail || 'No fue posible guardar el documento. Intenta nuevamente.'; }
    });
  }
  download(id: number) { this.api.downloadMine(id).subscribe(x => { const u = URL.createObjectURL(x); const a = document.createElement('a'); a.href = u; a.download = 'documento'; a.click(); URL.revokeObjectURL(u); }); }
  askDelete(file: any, solicitudId?: number) { if (this.deletingId) return; this.deleteTarget = { id: file.id, nombre: file.nombreOriginal, solicitudId }; }
  cancelDelete() { if (!this.deletingId) this.deleteTarget = undefined; }
  confirmDelete() {
    const target = this.deleteTarget;
    if (!target || this.deletingId) return;
    this.deletingId = target.id;
    this.error = '';
    const request$ = target.solicitudId ? this.api.deleteSolicitudDocument(target.solicitudId, target.id) : this.api.deleteMineDocument(target.id);
    request$.subscribe({
      next: () => {
        this.removeDocumentFromView(target.id, target.solicitudId);
        this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Documento eliminado correctamente.' });
        this.deletingId = undefined;
        this.deleteTarget = undefined;
      },
      error: e => {
        this.deletingId = undefined;
        this.deleteTarget = undefined;
        this.error = e.error?.detail || e.error?.message || 'No fue posible eliminar el documento. Intenta nuevamente.';
      }
    });
  }

  private removeDocumentFromView(id: number, solicitudId?: number) {
    if (solicitudId) {
      const request = this.data?.solicitudes?.find((item: any) => item.id === solicitudId);
      if (request) request.archivos = (request.archivos || []).filter((file: any) => file.id !== id);
      return;
    }
    if (this.data?.archivos) this.data.archivos = this.data.archivos.filter((file: any) => file.id !== id);
    const partnerFiles = (this.pareja.get('archivos')?.value as any[] | null) || [];
    (this.pareja.get('archivos') as any)?.setValue(partnerFiles.filter((file: any) => file.id !== id), { emitEvent: false });
    for (const row of [...this.familiares.controls, ...this.formaciones.controls, ...this.certificaciones.controls]) {
      const archivos = row.get('archivos')?.value || [];
      row.get('archivos')?.setValue(archivos.filter((file: any) => file.id !== id), { emitEvent: false });
    }
  }
  downloadSolicitud(id: number, fileId: number) { this.api.downloadSolicitud(id, fileId).subscribe(x => { const u = URL.createObjectURL(x); const a = document.createElement('a'); a.href = u; a.download = 'documento'; a.click(); URL.revokeObjectURL(u); }); }
  crearSolicitud() { if (this.solicitudForm.invalid) { this.solicitudForm.markAllAsTouched(); return; } this.solicitudSaving = true; this.api.crearSolicitud(this.solicitudForm.getRawValue()).subscribe({ next: x => { this.solicitudId = x.id; this.solicitudSaving = false; this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Solicitud creada correctamente.' }); this.solicitudForm.reset({ enviar: true }); this.load(); }, error: e => { this.solicitudSaving = false; this.error = e.error?.message || 'No fue posible crear la solicitud.'; } }); }
  uploadSolicitud(event: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const solicitudId = this.solicitudId;
    input.value = '';
    if (!file) return;
    if (!solicitudId) { this.error = 'Crea primero la solicitud para asociar el documento.'; return; }
    const key = this.uploadKey('Solicitud', { id: solicitudId });
    if (this.uploadingDocuments.has(key)) return;
    this.uploadingDocuments.add(key); this.error = '';
    this.api.uploadSolicitud(solicitudId, file).pipe(finalize(() => this.uploadingDocuments.delete(key))).subscribe({
      next: (documento: any) => {
        const solicitud = this.data?.solicitudes?.find((item: any) => item.id === solicitudId);
        if (solicitud) solicitud.archivos = [...(solicitud.archivos || []), documento];
        this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Documento de solicitud adjuntado.' });
      },
      error: e => { this.error = e.error?.message || e.error?.detail || 'No fue posible adjuntar el documento. Intenta nuevamente.'; }
    });
  }
}
