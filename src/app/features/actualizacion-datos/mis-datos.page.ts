import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActualizacionDatosService } from './actualizacion-datos.service';
import { Boton } from '../../shared/components/boton/boton';
import { AppSelectComponent, AppSelectOption } from '../../shared/components/select/select.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificacionComponent } from '../clientes/componentes/notificacion/notificacion.component';
import { Notificacion } from '../clientes/modelos/cliente.model';

type ConditionKind = 'children' | 'ownDisability' | 'partner' | 'childDisability';

@Component({
  selector: 'app-mis-datos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Boton, AppSelectComponent, ConfirmDialogComponent, NotificacionComponent],
  templateUrl: './mis-datos.page.html',
  styleUrl: './mis-datos.page.scss'
})
export class MisDatosPage {
  private fb = inject(FormBuilder);
  private api = inject(ActualizacionDatosService);
  data: any = null;
  loading = true; loadFailed = false; saving = false; uploading = false; message = ''; error = ''; notificacion: Notificacion | null = null;
  tab = 'personal'; dirty = false; solicitudSaving = false; solicitudId?: number;
  deletingId?: number;
  deleteTarget?: { id: number; nombre: string; solicitudId?: number };
  conditionTarget?: { kind: ConditionKind; previous: string; next: string; row?: AbstractControl };
  private previousChildren = 'NoInformado';
  private previousOwnDisability = 'NoInformado';
  private previousCivil = '';
  private previousChildDisability = new Map<string, string>();
  private removedChildKeys: string[] = [];
  private removedPartnerKey?: string;

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
      nombres: ['', Validators.required], apellidos: ['', Validators.required],
      email: ['', Validators.email], telefono: [''], direccion: [''],
      tieneDiscapacidad: ['NoInformado'], tipoDiscapacidad: [''], porcentajeDiscapacidad: [''],
      limpiarDiscapacidad: [false]
    }),
    familia: this.fb.group({
      estadoCivil: [''], tieneHijos: ['NoInformado'], limpiarHijos: [false], limpiarPareja: [false],
      pareja: this.fb.group({
        id: [null], clave: [crypto.randomUUID().replaceAll('-', '')], tipoRelacion: ['Conyuge'],
        nombres: [''], apellidos: [''], identificacion: [''], fechaNacimiento: [''],
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

  ngOnInit() { this.form.valueChanges.subscribe(() => this.dirty = true); this.load(); }

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
      nombres: [v.nombres || '', Validators.required], apellidos: [v.apellidos || '', Validators.required],
      identificacion: [v.identificacion || ''], fechaNacimiento: [v.fechaNacimiento || ''],
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
    if (this.form.invalid) { this.form.markAllAsTouched(); this.error = 'Completa los campos obligatorios.'; return; }
    const raw: any = this.form.getRawValue(); const ownYes = this.isYes(raw.persona.tieneDiscapacidad); const childrenYes = this.isYes(raw.familia.tieneHijos); const partnerYes = this.requiresPartner(raw.familia.estadoCivil);
    raw.persona.limpiarDiscapacidad = raw.persona.limpiarDiscapacidad || !ownYes;
    if (!ownYes) { raw.persona.tipoDiscapacidad = null; raw.persona.porcentajeDiscapacidad = null; }
    raw.controlVersion = this.data.controlVersion;
    raw.familia.limpiarHijos = raw.familia.limpiarHijos || !childrenYes; raw.familia.clavesHijosAEliminar = this.removedChildKeys;
    raw.familia.limpiarPareja = raw.familia.limpiarPareja || !partnerYes; raw.familia.claveParejaAEliminar = this.removedPartnerKey;
    raw.familia.familiares = childrenYes ? raw.familia.familiares.map((x: any) => ({ ...x, tipoRelacion: 'Hijo', tipoDiscapacidad: this.isYes(x.tieneDiscapacidad) ? x.tipoDiscapacidad : null, porcentajeDiscapacidad: this.isYes(x.tieneDiscapacidad) ? x.porcentajeDiscapacidad : null, limpiarDiscapacidad: x.limpiarDiscapacidad || !this.isYes(x.tieneDiscapacidad), archivos: undefined })) : [];
    raw.familia.pareja = partnerYes && (raw.familia.pareja?.nombres || raw.familia.pareja?.apellidos) ? { ...raw.familia.pareja, archivos: undefined } : null;
    this.saving = true; this.error = ''; this.message = '';
    this.api.save(raw).subscribe({ next: () => { this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Cambios guardados correctamente.' }); this.saving = false; this.dirty = false; this.load(); }, error: e => { this.error = e.status === 409 ? (e.error?.detail || 'Los datos cambiaron. Recarga antes de guardar.') : (e.error?.detail || 'No fue posible guardar los cambios.'); this.saving = false; } });
  }

  upload(event: any, section: string, row: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading) return;
    const value = row.value;
    this.uploading = true; this.error = '';
    this.api.uploadDirect(file, section, value.id || undefined, value.clave).subscribe({
      next: (documento: any) => {
        if (section === 'Discapacidad') this.data.archivos = [...(this.data.archivos || []), documento];
        else row.get('archivos')?.setValue([...(row.get('archivos')?.value || []), documento], { emitEvent: false });
        this.uploading = false;
        this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Documento adjuntado correctamente.' });
      },
      error: e => { this.uploading = false; this.error = e.error?.message || e.error?.detail || 'No fue posible guardar el documento. Intenta nuevamente.'; }
    });
  }
  download(id: number) { this.api.downloadMine(id).subscribe(x => { const u = URL.createObjectURL(x); const a = document.createElement('a'); a.href = u; a.download = 'documento'; a.click(); URL.revokeObjectURL(u); }); }
  askDelete(file: any, solicitudId?: number) { if (this.deletingId) return; this.deleteTarget = { id: file.id, nombre: file.nombreOriginal, solicitudId }; }
  cancelDelete() { if (!this.deletingId) this.deleteTarget = undefined; }
  confirmDelete() { const target = this.deleteTarget; if (!target || this.deletingId) return; this.deletingId = target.id; this.error = ''; const request$ = target.solicitudId ? this.api.deleteSolicitudDocument(target.solicitudId, target.id) : this.api.deleteMineDocument(target.id); request$.subscribe({ next: () => { this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Documento eliminado correctamente.' }); this.deletingId = undefined; this.deleteTarget = undefined; this.load(); }, error: e => { this.deletingId = undefined; this.error = e.error?.detail || e.error?.message || 'No fue posible eliminar el documento. Intenta nuevamente.'; } }); }
  downloadSolicitud(id: number, fileId: number) { this.api.downloadSolicitud(id, fileId).subscribe(x => { const u = URL.createObjectURL(x); const a = document.createElement('a'); a.href = u; a.download = 'documento'; a.click(); URL.revokeObjectURL(u); }); }
  crearSolicitud() { if (this.solicitudForm.invalid) { this.solicitudForm.markAllAsTouched(); return; } this.solicitudSaving = true; this.api.crearSolicitud(this.solicitudForm.getRawValue()).subscribe({ next: x => { this.solicitudId = x.id; this.solicitudSaving = false; this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Solicitud creada correctamente.' }); this.solicitudForm.reset({ enviar: true }); this.load(); }, error: e => { this.solicitudSaving = false; this.error = e.error?.message || 'No fue posible crear la solicitud.'; } }); }
  uploadSolicitud(event: any) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const solicitudId = this.solicitudId;
    input.value = '';
    if (!file || !solicitudId) { this.error = 'Crea primero la solicitud para asociar el documento.'; return; }
    if (this.uploading) return;
    this.uploading = true; this.error = '';
    this.api.uploadSolicitud(solicitudId, file).subscribe({
      next: (documento: any) => {
        const solicitud = this.data?.solicitudes?.find((item: any) => item.id === solicitudId);
        if (solicitud) solicitud.archivos = [...(solicitud.archivos || []), documento];
        this.uploading = false;
        this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Documento de solicitud adjuntado.' });
      },
      error: e => { this.uploading = false; this.error = e.error?.message || e.error?.detail || 'No fue posible adjuntar el documento. Intenta nuevamente.'; }
    });
  }
}
