import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ActualizacionDatosService, MisDatos } from './actualizacion-datos.service';
import { normalizarFechaPerfil } from './edad-perfil.util';
import { FechaPerfilDirective } from './fecha-perfil.directive';
import { Boton } from '../../shared/components/boton/boton';
import { AppSelectComponent, AppSelectOption } from '../../shared/components/select/select.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificacionComponent } from '../clientes/componentes/notificacion/notificacion.component';
import { Notificacion } from '../clientes/modelos/cliente.model';
import { capitalizarInicialNombre, NOMBRE_PERSONA_MENSAJE, nombrePersonaValidator, normalizarNombrePersona } from '../../shared/validators/nombre-persona.validator';
import { CountryCode, getCountries, getCountryCallingCode, parsePhoneNumberFromString, validatePhoneNumberLength } from 'libphonenumber-js/max';
import { TIPOS_DISCAPACIDAD, tiposDiscapacidadRegistrados } from '../../shared/validators/tipo-discapacidad';

type ConditionKind = 'children' | 'ownDisability' | 'partner' | 'childDisability';
const controlPorSeccion = { personal: 'persona', familia: 'familia', formacion: 'formaciones', certificaciones: 'certificaciones', conocimientos: 'conocimientos' } as const;
type SeccionPerfil = keyof typeof controlPorSeccion;
type PersonalInput = 'email' | 'telefono' | 'direccion' | 'porcentajeDiscapacidad';
type FormatoEntrada = 'email' | 'direccion' | 'porcentaje' | 'nombrePersona' | 'nombreCertificado' | 'entidadEmisora';

const caracteresNoPermitidos: Record<FormatoEntrada, RegExp> = {
  email: /[^a-zA-Z0-9._%+@-]/g,
  direccion: /[^\p{L}0-9 /".;]/gu,
  porcentaje: /[^0-9]/g,
  nombrePersona: /[^\p{L}\p{M} ]/gu,
  nombreCertificado: /[^\p{L}\p{M}0-9 .,:/+#&()'–—-]/gu,
  entidadEmisora: /[^\p{L}\p{M}0-9 .&()'–—-]/gu
};
const validadoresPorcentaje = [Validators.pattern(/^\d+$/), Validators.min(0), Validators.max(100)];
const MAX_DIGITOS_E164 = 15;

function discapacidadObligatoria(grupo: AbstractControl) {
  const tiene = grupo.get('tieneDiscapacidad')?.value;
  if (tiene !== 'Si' && tiene !== 'Sí') return null;

  const porcentaje = grupo.get('porcentajeDiscapacidad')?.value;
  const faltaPorcentaje = porcentaje == null || porcentaje === '';
  const faltaTipo = !tiposDiscapacidadRegistrados(grupo.get('tipoDiscapacidad')?.value).length;
  return faltaPorcentaje || faltaTipo ? { discapacidadObligatoria: { porcentajeDiscapacidad: faltaPorcentaje, tipoDiscapacidad: faltaTipo } } : null;
}

function porcentajeNumerico(value: string | number | null | undefined): number | null {
  return value === '' || value == null ? null : Number(value);
}

@Component({
  selector: 'app-mis-datos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Boton, AppSelectComponent, ConfirmDialogComponent, NotificacionComponent, FechaPerfilDirective],
  templateUrl: './mis-datos.page.html',
  styleUrl: './mis-datos.page.scss'
})
export class MisDatosPage {
  private fb = inject(FormBuilder);
  private api = inject(ActualizacionDatosService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  data: any = null;
  loading = true; loadFailed = false; saving = false; message = ''; error = ''; notificacion: Notificacion | null = null;
  tab = 'personal';
  private readonly validTabs = new Set(['personal', 'familia', 'formacion', 'certificaciones', 'conocimientos']);
  private lastTab = 'personal';
  deletingId?: number;
  deleteTarget?: { id: number; nombre: string };
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
  readonly nivelesEducativos = [
    'Educación Básica (Primaria)',
    'Bachillerato (Secundaria)',
    'Técnico / Tecnológico Superior',
    'Universitario / Tercer Nivel (Grado)',
    'Especialización / Maestría',
    'Doctorado (PhD)'
  ];
  readonly triStateOptions: AppSelectOption[] = [
    { value: 'Si', label: 'Sí' }, { value: 'No', label: 'No' }, { value: 'NoInformado', label: 'No informado' }
  ];
  readonly tiposDiscapacidad = TIPOS_DISCAPACIDAD;
  paisTelefono: CountryCode = 'EC';
  readonly paisesTelefono = getCountries().map(codigo => {
    const nombre = new Intl.DisplayNames(['es'], { type: 'region' }).of(codigo) ?? codigo;
    return { codigo, nombre, prefijo: getCountryCallingCode(codigo) };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  form = this.fb.group({
    persona: this.fb.group({
      fechaNacimiento: [''],
      nombres: [{ value: '', disabled: true }], apellidos: [{ value: '', disabled: true }],
      email: ['', [Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]+$/)]],
      telefono: ['', (control: AbstractControl<string | null>) =>
        !control.value || this.numeroInternacional(control.value)?.isValid() ? null : { telefono: true }],
      direccion: ['', Validators.pattern(/^[\p{L}0-9 /".;]*$/u)],
      tieneDiscapacidad: ['NoInformado'], tipoDiscapacidad: [''],
      porcentajeDiscapacidad: this.fb.control<string | number | null>('', validadoresPorcentaje),
      limpiarDiscapacidad: [false]
    }, { validators: discapacidadObligatoria }),
    familia: this.fb.group({
      estadoCivil: [''], tieneHijos: ['NoInformado'], limpiarHijos: [false], limpiarPareja: [false],
      pareja: this.fb.group({
        id: [null], clave: [crypto.randomUUID().replaceAll('-', '')], tipoRelacion: ['Conyuge'],
        nombres: ['', nombrePersonaValidator(false)], apellidos: ['', nombrePersonaValidator(false)], identificacion: ['', Validators.pattern(/^\d{10}$/)], fechaNacimiento: [''],
        tieneDiscapacidad: ['NoInformado'], tipoDiscapacidad: [''], porcentajeDiscapacidad: [''], archivos: [[] as any[]]
      }, { validators: discapacidadObligatoria }),
      familiares: this.fb.array([])
    }),
    formaciones: this.fb.array([]), certificaciones: this.fb.array([]), conocimientos: this.fb.array([])
  });

  get formaciones() { return this.form.controls.formaciones as FormArray; }
  get certificaciones() { return this.form.controls.certificaciones as FormArray; }
  get familiares() { return this.form.controls.familia.controls.familiares as FormArray; }
  get conocimientos() { return this.form.controls.conocimientos as FormArray; }
  private readonly fichasEnEdicion = new Map<FormArray, AbstractControl>();
  private readonly respaldosRevisados = new WeakSet<AbstractControl>();
  conocimientoEnEdicion: number | null = null;
  private conocimientoOriginal?: { area: string; porcentaje: string };
  get pareja() { return this.form.controls.familia.controls.pareja; }
  tiposRegistrados = tiposDiscapacidadRegistrados;

  cambiarTipoDiscapacidad(control: AbstractControl, tipo: string, marcado: boolean) {
    const registrados = this.tiposRegistrados(control.value);
    const seleccion = this.tiposDiscapacidad.filter(opcion =>
      opcion === tipo ? marcado : registrados.includes(opcion)
    );
    control.markAsDirty();
    control.setValue(seleccion.join(', '));
  }

  filtrarCedula(control: AbstractControl | null, event: Event) {
    const input = event.target as HTMLInputElement;
    const cedula = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    if (cedula !== input.value) control?.setValue(cedula);
  }

  documentosHijo(row: AbstractControl, partida: boolean) {
    return (row.value.archivos ?? []).filter((file: { seccion?: string }) =>
      (file.seccion === 'PartidaNacimiento') === partida
    );
  }

  private cargarConocimiento(value?: { area: string; porcentaje: number }) {
    this.conocimientos.push(this.fb.group({
      area: [value?.area ?? '', [Validators.required, Validators.maxLength(120), Validators.pattern(/^(?=.*[\p{L}0-9])[\p{L}0-9 .\/+#()-]+$/u)]],
      porcentaje: [value?.porcentaje?.toString() ?? '', [Validators.required, ...validadoresPorcentaje]]
    }));
  }

  addConocimiento() {
    if (this.conocimientoEnEdicion !== null || this.saving) return;
    this.conocimientoEnEdicion = this.conocimientos.length;
    this.cargarConocimiento();
  }

  editarConocimiento(index: number) {
    if (this.conocimientoEnEdicion !== null || this.saving) return;
    this.conocimientoOriginal = this.conocimientos.at(index).getRawValue();
    this.conocimientoEnEdicion = index;
  }

  quitarConocimiento(index: number) {
    if (this.saving) return;
    if (index === this.conocimientoEnEdicion) {
      if (this.conocimientoOriginal) {
        this.conocimientos.at(index).reset(this.conocimientoOriginal);
      } else {
        this.conocimientos.removeAt(index);
      }
      this.conocimientoOriginal = undefined;
      this.conocimientoEnEdicion = null;
      return;
    }
    if (this.conocimientoEnEdicion === null) {
      this.conocimientos.removeAt(index);
    }
  }

  guardarConocimiento(index: number) {
    if (this.saving || this.conocimientoEnEdicion !== index) return;
    const ficha = this.conocimientos.at(index);
    ficha.markAllAsTouched();
    if (ficha.invalid) return;
    this.conocimientoOriginal = undefined;
    this.conocimientoEnEdicion = null;
  }

  filtrarAreaConocimiento(row: AbstractControl, event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = input.value.replace(/[^\p{L}0-9 .\/+#()-]/gu, '').slice(0, 120);
    if (valor !== input.value) row.get('area')?.setValue(valor);
  }
  isYes(value: unknown) { return value === 'Si' || value === 'Sí'; }
  requiresPartner(value: unknown) { return value === 'Casado' || value === 'UnionLibre'; }
  mostrarNotificacion(notificacion: Notificacion) { this.notificacion = null; queueMicrotask(() => this.notificacion = notificacion); }
  cerrarNotificacion() { this.notificacion = null; }
  abrirArchivo(input: HTMLInputElement) { input.click(); }

  filtrarEntradaPersonal(campo: PersonalInput, event: Event) {
    if (campo === 'telefono') { this.filtrarTelefono(event); return; }
    this.filtrarEntrada(this.form.controls.persona.controls[campo], campo === 'porcentajeDiscapacidad' ? 'porcentaje' : campo, event);
  }

  private filtrarTelefono(event: Event) {
    const input = event.target as HTMLInputElement;
    const original = input.value;
    const prefijo = '+' + getCountryCallingCode(this.paisTelefono);
    const sinPrefijo = original.startsWith(prefijo) ? original.slice(prefijo.length) : original;
    let numero = sinPrefijo.replace(/[^0-9]/g, '');
    const cerosIniciales = this.paisTelefono === 'EC' ? numero.match(/^0+/)?.[0].length ?? 0 : 0;
    const maxDigitos = this.paisTelefono === 'EC' ? 9 : MAX_DIGITOS_E164 - (prefijo.length - 1);
    numero = numero.slice(cerosIniciales, cerosIniciales + maxDigitos);
    while (validatePhoneNumberLength(prefijo + numero) === 'TOO_LONG') numero = numero.slice(0, -1);
    if (this.paisTelefono === 'EC' && /^[2-7]/.test(numero)) numero = numero.slice(0, 8);
    if (numero === original) return;

    const cursor = input.selectionStart ?? original.length;
    const inicio = original.length - sinPrefijo.length;
    const digitosAntes = original.slice(inicio, cursor).replace(/[^0-9]/g, '').length;
    const posicion = Math.max(0, Math.min(numero.length, digitosAntes - cerosIniciales));
    this.form.controls.persona.controls.telefono.setValue(numero);
    input.setSelectionRange(posicion, posicion);
  }

  filtrarEntrada(control: AbstractControl | null, formato: FormatoEntrada, event: Event) {
    if (!control) return;
    const input = event.target as HTMLInputElement;
    const original = input.value;
    const filtro = caracteresNoPermitidos[formato];
    let valor = original.replace(filtro, '');
    if (formato === 'nombrePersona') valor = capitalizarInicialNombre(valor);
    if (formato === 'porcentaje' && Number(valor) > 100) valor = '100';
    if (valor === original) return;

    const cursor = input.selectionStart;
    const posicion = cursor === null ? null : original.slice(0, cursor).replace(filtro, '').length;
    control.setValue(valor);
    if (posicion !== null) input.setSelectionRange(posicion, posicion);
  }

  private numeroInternacional(telefono: string) {
    if (!/^[0-9]+$/.test(telefono)) return undefined;
    const numero = '+' + getCountryCallingCode(this.paisTelefono) + telefono;
    const resultado = parsePhoneNumberFromString(numero, { extract: false });
    return resultado?.number === numero ? resultado : undefined;
  }

  cambiarPaisTelefono(pais: CountryCode) {
    this.paisTelefono = pais;
    const ctrl = this.form.controls.persona.controls.telefono;
    ctrl.setValue('');
    ctrl.markAsDirty();
    ctrl.updateValueAndValidity();
  }

  revisiones: any[] = [];

  readonly avisoVisible = signal(false);
  private temporizadorAviso?: ReturnType<typeof setTimeout>;

  ocultarAviso() {
    clearTimeout(this.temporizadorAviso);
    this.avisoVisible.set(false);
  }

  private mostrarAvisoRevision() {
    this.ocultarAviso();
    const estado = this.revisionActual?.estado;
    if (estado !== 'EnRevision' && estado !== 'RequiereCorreccion') return;
    this.avisoVisible.set(true);
    this.temporizadorAviso = setTimeout(() => this.ocultarAviso(), 8000);
  }

  ngOnDestroy() {
    clearTimeout(this.temporizadorAviso);
  }
  get revisionActual() { return this.revisiones.find(x => x.seccion === this.tab); }
  private cargarPropuesta(seccion: SeccionPerfil) {
    const revision = this.revisiones.find(x => x.seccion === seccion);
    if (!revision?.propuesta) return;
    const propuesta = revision.propuesta;
    const vista = { ...this.data };
    const documentos = revision.documentos ?? [];
    const conArchivos = (fila: any) => !fila ? null : ({ ...fila, archivos: documentos.filter((doc: any) =>
      (fila.clave && doc.referenciaClave === fila.clave) || (fila.id && doc.referenciaId === fila.id)) });
    if (seccion === 'personal') { vista.persona = { ...vista.persona, ...propuesta.persona, nombres: vista.persona.nombres, apellidos: vista.persona.apellidos }; vista.archivos = documentos; }
    if (seccion === 'familia') vista.familia = { ...propuesta.familia, pareja: conArchivos(propuesta.familia?.pareja), familiares: propuesta.familia?.familiares.map(conArchivos) };
    if (seccion === 'formacion') vista.formaciones = propuesta.formaciones.map(conArchivos);
    if (seccion === 'certificaciones') vista.certificaciones = propuesta.certificaciones.map(conArchivos);
    if (seccion === 'conocimientos') vista.conocimientos = propuesta.conocimientos;
    if (seccion === 'personal') this.data.archivos = documentos;
    this.cargarSeccion(seccion, vista);
  }

  private cargarRevisiones(recuperarPropuestas = false) {
    this.api.misRevisiones().pipe(finalize(() => {
      if (recuperarPropuestas) this.loading = false;
    })).subscribe({ next: rows => {
      const estadoAnterior = this.revisionActual?.estado;
      this.revisiones = rows.filter(x => x.seccion !== 'conocimientos');
      if (estadoAnterior !== this.revisionActual?.estado) this.mostrarAvisoRevision();
      if (recuperarPropuestas) for (const seccion of Object.keys(controlPorSeccion) as SeccionPerfil[]) this.cargarPropuesta(seccion);
    }, error: () => {
      this.error = 'No fue posible consultar el estado de revisión.';
    } });
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const requested = params.get('tab');
      const tab = requested && this.validTabs.has(requested) ? requested : 'personal';
      if (this.tab !== tab) {
        this.tab = tab;
        this.mostrarAvisoRevision();
      }
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
    const rangoInvalido = this.rangoFechasInvalido(path, ctrl);
    return !!ctrl && !ctrl.disabled && (
      !!ctrl.errors?.['backend'] ||
      (ctrl.touched && (ctrl.invalid || this.faltaDatoDiscapacidad(path))) ||
      (rangoInvalido && !!ctrl.parent?.touched)
    );
  }

  private rangoFechasInvalido(path: string, ctrl: AbstractControl | null): boolean {
    return /^(?:formaciones\.\d+\.fecha(?:Inicio|Fin)|certificaciones\.\d+\.fecha(?:Emision|Vencimiento))$/.test(path)
      && !!ctrl?.parent?.hasError('ordenFechas');
  }
  private faltaDatoDiscapacidad(path: string): boolean {
    const campo = path.split('.').at(-1);
    return (campo === 'tipoDiscapacidad' || campo === 'porcentajeDiscapacidad')
      && !!this.control(path)?.parent?.getError('discapacidadObligatoria')?.[campo];
  }

  mensajeError(path: string): string {
    if (this.faltaDatoDiscapacidad(path)) return path.endsWith('.tipoDiscapacidad')
      ? 'Selecciona al menos un tipo de discapacidad.'
      : 'Ingresa el porcentaje de discapacidad.';
    const ctrl = this.control(path);
    if (this.rangoFechasInvalido(path, ctrl)) {
      if (path.startsWith('certificaciones.')) return path.endsWith('.fechaEmision')
        ? 'La fecha de emisión debe ser anterior al vencimiento.'
        : 'El vencimiento debe ser posterior a la fecha de emisión.';
      return path.endsWith('.fechaInicio')
        ? 'La fecha de inicio debe ser anterior o igual a la fecha de fin.'
        : 'La fecha de fin debe ser posterior o igual a la fecha de inicio.';
    }
    if (!ctrl?.errors) return '';
    if (ctrl.errors['backend']) return ctrl.errors['backend'];
    if (ctrl.errors['required']) return 'Este campo es obligatorio';
    if (ctrl.errors['nivelEducativo']) return 'Selecciona uno de los niveles educativos de la lista.';
    if (path.startsWith('formaciones.') && path.endsWith('.titulo') && ctrl.errors['pattern']) return 'Ingresa solo letras y espacios en el t\u00edtulo.';
    if (path.endsWith('.entidadEmisora') && ctrl.errors['pattern']) return 'Usa letras, números, espacios o signos como punto, guion, apóstrofo, & y paréntesis.';
    if (path.startsWith('certificaciones.') && path.endsWith('.nombre') && ctrl.errors['pattern']) return 'Usa letras, números, espacios y puntuación habitual en el nombre del certificado.';
    if (path === 'persona.email' && (ctrl.errors['email'] || ctrl.errors['pattern'])) return 'Ingresa un correo electrónico válido';
    if (path === 'persona.telefono' && ctrl.errors['telefono']) return 'Ingresa un teléfono válido para el país o incluye su prefijo internacional';
    if (path === 'persona.direccion' && ctrl.errors['pattern']) return 'Usa letras, números, espacios, barra, comillas dobles, punto o punto y coma';
    if (/\.porcentaje(?:Discapacidad)?$/.test(path) && (ctrl.errors['pattern'] || ctrl.errors['min'] || ctrl.errors['max'])) return 'Ingresa un número entero entre 0 y 100';
    if (ctrl.errors['soloLetras'] || ctrl.errors['soloEspacios']) return NOMBRE_PERSONA_MENSAJE;
    if (path.endsWith('.identificacion') && ctrl.errors['pattern']) return 'Ingresa una cédula de 10 dígitos';
    if (ctrl.errors['maxlength']) return `Máximo ${ctrl.errors['maxlength'].requiredLength} caracteres`;
    if (ctrl.errors['minlength']) return `Mínimo ${ctrl.errors['minlength'].requiredLength} caracteres`;
    if (ctrl.errors['min']) return `El valor mínimo es ${ctrl.errors['min'].min}`;
    if (ctrl.errors['max']) return `El valor máximo es ${ctrl.errors['max'].max}`;
    if (ctrl.errors['fechaPerfil']) return 'Ingresa una fecha válida en formato dd/MM/yyyy.';
    if (ctrl.errors['pattern'] || ctrl.errors['soloLetras']) return 'Ingresa un valor con el formato permitido';
    return 'Revisa este campo';
  }
  private focusPath(path: string) {
    const ficha = path.match(/^(familia\.familiares|formaciones|certificaciones)\.(\d+)\./);
    if (ficha) {
      const registros = this.control(ficha[1]) as FormArray;
      this.editarFicha(registros, registros.at(Number(ficha[2])));
    }
    const root = path.split('.')[0];
    const tabByRoot: Record<string, string> = { persona: 'personal', familia: 'familia', formaciones: 'formacion', certificaciones: 'certificaciones', conocimientos: 'conocimientos' };
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
      applied.push(path);
    }
    return applied;
  }
  private normalizeErrorPath(path: string): string {
    const clean = path.replace(/^\$\./, '').replace(/\[(\d+)\]/g, '.$1');
    const parts = clean.split(/[./]/).filter(Boolean);
    const map: Record<string, string> = { Persona: 'persona', Familia: 'familia', Pareja: 'pareja', Familiares: 'familiares', Formaciones: 'formaciones', Certificaciones: 'certificaciones', Nombres: 'nombres', Apellidos: 'apellidos', Email: 'email', CorreoElectronico: 'email', Telefono: 'telefono', Asunto: 'asunto', Descripcion: 'descripcion' };
    const normalized = parts.map(part => map[part] || part.charAt(0).toLowerCase() + part.slice(1)).join('.');
    return normalized === 'telefono' ? 'persona.telefono' : normalized;
  }
  private firstInvalidPath(control: AbstractControl, path = ''): string | null {
    if (this.faltaDatoDiscapacidad(path)) return path;
    const nested = (control as any).controls;
    if (!nested) return !control.disabled && (control.invalid || this.rangoFechasInvalido(path, control)) ? path : null;
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
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.api.getMine().subscribe({
      next: datos => {
        this.data = datos;
        for (const seccion of Object.keys(controlPorSeccion) as SeccionPerfil[]) this.cargarSeccion(seccion, datos);
        this.cargarRevisiones(true);
      },
      error: e => {
        this.data = null;
        this.loadFailed = true;
        const code = e.error?.code || e.error?.extensions?.code;
        this.error = code === 'EMPLOYEE_INACTIVE'
          ? 'Tu usuario está vinculado a un colaborador inactivo. La edición está bloqueada; solicita a RRHH revisar tu estado laboral.'
          : 'No fue posible cargar tus datos. Revisa la conexión e inténtalo nuevamente.';
        this.loading = false;
      }
    });
  }

  private cargarSeccion(seccion: SeccionPerfil, datos: MisDatos) {
    switch (seccion) {
      case 'personal': {
        const telefonoGuardado = datos.persona.telefono ?? '';
        const telefono = parsePhoneNumberFromString(telefonoGuardado, 'EC');
        this.paisTelefono = telefono?.country ?? 'EC';
        this.form.controls.persona.patchValue({
          ...datos.persona,
          fechaNacimiento: normalizarFechaPerfil(datos.persona.fechaNacimiento)
            ?? normalizarFechaPerfil(datos.fechaNacimiento)
            ?? '',
          telefono: telefono?.nationalNumber ?? telefonoGuardado,
          limpiarDiscapacidad: false
        }, { emitEvent: false });
        this.previousOwnDisability = datos.persona.tieneDiscapacidad ?? 'NoInformado';
        break;
      }
      case 'familia':
        this.fichasEnEdicion.delete(this.familiares);
        this.familiares.clear();
        this.removedChildKeys = [];
        this.removedPartnerKey = undefined;
        this.previousChildDisability.clear();
        this.form.controls.familia.patchValue({ ...(datos.familia || {}), limpiarHijos: false, limpiarPareja: false }, { emitEvent: false });
        if (datos.familia?.pareja) {
          const pareja = datos.familia.pareja;
          this.pareja.patchValue({
            ...pareja,
            fechaNacimiento: normalizarFechaPerfil(pareja.fechaNacimiento) ?? '',
          }, { emitEvent: false });
        }
        (datos.familia?.familiares ?? []).forEach((value: any) => this.addFamiliar(value));
        this.previousChildren = datos.familia?.tieneHijos || 'NoInformado';
        this.previousCivil = datos.familia?.estadoCivil || '';
        break;
      case 'formacion':
        this.fichasEnEdicion.delete(this.formaciones);
        this.formaciones.clear();
        (datos.formaciones ?? []).forEach(value => this.addFormacion(value));
        break;
      case 'certificaciones':
        this.fichasEnEdicion.delete(this.certificaciones);
        this.certificaciones.clear();
        (datos.certificaciones ?? []).forEach(value => this.addCertificacion(value));
        break;
      case 'conocimientos':
        this.conocimientos.clear();
        (datos.conocimientos ?? []).forEach(value => this.cargarConocimiento(value));
        this.conocimientoEnEdicion = null;
        this.conocimientoOriginal = undefined;
        break;
    }
    const root = this.form.controls[controlPorSeccion[seccion]];
    root.markAsPristine();
    root.markAsUntouched();
  }

  addFormacion(valor?: any) {
    const v = valor ?? {};
    this.agregarFicha(this.formaciones, this.fb.group({
      id: [v.id || null],
      clave: [v.clave || crypto.randomUUID().replaceAll('-', '')],
      nivel: [v.nivel || '', [Validators.required, (control: AbstractControl<string>) =>
        !control.value || this.nivelesEducativos.includes(control.value) ? null : { nivelEducativo: true }]],
      institucion: [v.institucion || '', Validators.required],
      titulo: [v.titulo || '', [Validators.required, Validators.pattern(/^(?=.*\p{L})[\p{L}\p{M} ]+$/u)]],
      fechaInicio: [normalizarFechaPerfil(v.fechaInicio) ?? ''],
      fechaFin: [normalizarFechaPerfil(v.fechaFin) ?? ''],
      archivos: [v.archivos || []]
    }, {
      validators: row => {
        const inicio = row.get('fechaInicio')?.value;
        const fin = row.get('fechaFin')?.value;
        return inicio && fin && inicio > fin ? { ordenFechas: true } : null;
      }
    }), !valor);
  }
  addCertificacion(valor?: any) {
    const v = valor ?? {};
    this.agregarFicha(this.certificaciones, this.fb.group({
      id: [v.id || null],
      clave: [v.clave || crypto.randomUUID().replaceAll('-', '')],
      nombre: [v.nombre || '', [Validators.required, Validators.pattern(/^(?=.*[\p{L}0-9])[\p{L}\p{M}0-9 .,:/+#&()'–—-]+$/u)]],
      entidadEmisora: [v.entidadEmisora || '', [Validators.required, Validators.pattern(/^(?=.*\p{L})[\p{L}\p{M}0-9 .&()'–—-]+$/u)]],
      fechaEmision: [normalizarFechaPerfil(v.fechaEmision) ?? '', Validators.required],
      fechaVencimiento: [normalizarFechaPerfil(v.fechaVencimiento) ?? ''],
      archivos: [v.archivos || []]
    }, {
      validators: row => {
        const emision = row.get('fechaEmision')?.value;
        const vencimiento = row.get('fechaVencimiento')?.value;
        return emision && vencimiento && emision >= vencimiento ? { ordenFechas: true } : null;
      }
    }), !valor);
  }
  addFamiliar(valor?: any) {
    const v = valor ?? {};
    this.form.controls.familia.controls.tieneHijos.updateValueAndValidity({ emitEvent: false });
    const key = v.clave || crypto.randomUUID().replaceAll('-', '');
    this.agregarFicha(this.familiares, this.fb.group({
      id: [v.id || null], clave: [key], tipoRelacion: ['Hijo', Validators.required],
      nombres: [v.nombres || '', nombrePersonaValidator()], apellidos: [v.apellidos || '', nombrePersonaValidator()],
      identificacion: [v.identificacion || '', Validators.pattern(/^\d{10}$/)], fechaNacimiento: [normalizarFechaPerfil(v.fechaNacimiento) ?? ''],
      tieneDiscapacidad: [v.tieneDiscapacidad || 'NoInformado'], tipoDiscapacidad: [v.tipoDiscapacidad || ''],
      porcentajeDiscapacidad: [v.porcentajeDiscapacidad ?? '', validadoresPorcentaje], limpiarDiscapacidad: [false], archivos: [v.archivos || []]
    }, { validators: discapacidadObligatoria }), !valor);
    this.previousChildDisability.set(key, v.tieneDiscapacidad || 'NoInformado');
  }

  hayFichaEnEdicion(registros: FormArray) { return this.fichasEnEdicion.has(registros); }

  fichaEnEdicion(registros: FormArray, row: AbstractControl) {
    return this.fichasEnEdicion.get(registros) === row;
  }

  seccionTieneFichaAbierta(): boolean {
    const registros = this.tab === 'familia' ? this.familiares
      : this.tab === 'formacion' ? this.formaciones
      : this.tab === 'certificaciones' ? this.certificaciones
      : null;
    return !!registros && this.hayFichaEnEdicion(registros);
  }

  editarFicha(registros: FormArray, row: AbstractControl) {
    if (!this.hayFichaEnEdicion(registros)) this.fichasEnEdicion.set(registros, row);
  }

  private agregarFicha(registros: FormArray, row: AbstractControl, nueva: boolean) {
    if (nueva && this.hayFichaEnEdicion(registros)) return;
    registros.push(row);
    if (nueva) this.editarFicha(registros, row);
  }

  guardarFicha(registros: FormArray, row: AbstractControl) {
    row.markAllAsTouched();
    const tipo = registros === this.familiares ? 'PartidaNacimiento' : registros === this.formaciones ? 'Formacion' : 'Certificacion';
    const tieneDocumento = this.validarRespaldo(row, tipo);
    const requiereCarnet = registros === this.familiares && this.isYes(row.value.tieneDiscapacidad);
    const tieneCarnet = !requiereCarnet || this.validarRespaldo(row, 'Familiar');
    if (tieneDocumento && tieneCarnet && row.valid && !this.uploadingDocuments.size) this.fichasEnEdicion.delete(registros);
  }

  private tieneRespaldo(row: AbstractControl, tipo: string): boolean {
    if (tipo === 'Discapacidad') return !!this.data?.archivos?.length;
    return (row.get('archivos')?.value ?? []).some((archivo: { seccion?: string }) =>
      tipo === 'PartidaNacimiento' || tipo === 'Familiar' ? archivo.seccion === tipo : !archivo.seccion || archivo.seccion === tipo
    );
  }

  private validarRespaldo(row: AbstractControl, tipo: string): boolean {
    this.respaldosRevisados.add(row);
    return this.tieneRespaldo(row, tipo);
  }

  faltaRespaldo(row: AbstractControl, tipo: string): boolean {
    return !!row.get('archivos')?.hasError('backend') || (this.respaldosRevisados.has(row) && !this.tieneRespaldo(row, tipo));
  }

  private revisarRespaldos(seccion: SeccionPerfil): string | null {
    const persona = this.form.controls.persona;
    if (seccion === 'personal' && this.isYes(persona.controls.tieneDiscapacidad.value)
      && !this.validarRespaldo(persona, 'Discapacidad')) return 'persona.archivos';
    if (seccion === 'familia' && this.canAddChild() && !this.familiares.length) {
      this.form.controls.familia.controls.tieneHijos.setErrors({ backend: 'Agrega al menos un hijo y sube los archivos solicitados.' });
      return 'familia.tieneHijos';
    }
    if (seccion === 'familia' && this.requiresPartner(this.form.controls.familia.controls.estadoCivil.value)
      && !this.validarRespaldo(this.pareja, 'Pareja')) return 'familia.pareja.archivos';

    const datos = seccion === 'familia' && this.canAddChild()
      ? { filas: this.familiares, tipo: 'PartidaNacimiento', ruta: 'familia.familiares' }
      : seccion === 'formacion' ? { filas: this.formaciones, tipo: 'Formacion', ruta: 'formaciones' }
      : seccion === 'certificaciones' ? { filas: this.certificaciones, tipo: 'Certificacion', ruta: 'certificaciones' }
      : null;
    if (!datos) return null;
    const indice = datos.filas.controls.findIndex(row => !this.validarRespaldo(row, datos.tipo));
    if (indice >= 0) return `${datos.ruta}.${indice}.archivos`;
    if (seccion === 'familia') {
      const sinCarnet = this.familiares.controls.findIndex(row => this.isYes(row.value.tieneDiscapacidad)
        && !this.validarRespaldo(row, 'Familiar'));
      if (sinCarnet >= 0) return `familia.familiares.${sinCarnet}.carnetDiscapacidad`;
    }
    return null;
  }

  canAddChild() { return this.isYes(this.form.controls.familia.controls.tieneHijos.value); }
  remove(a: FormArray, i: number) {
    if (this.fichaEnEdicion(a, a.at(i))) this.fichasEnEdicion.delete(a);
    a.removeAt(i);
  }
  private hasChildData() { return this.familiares.controls.some(c => { const v = c.value; return !!v.id || !!v.nombres || !!v.apellidos || !!v.fechaNacimiento || !!v.archivos?.length; }); }
  private hasOwnDisabilityData() { const v = this.form.controls.persona.value; return this.previousOwnDisability === 'Si' || !!v.tipoDiscapacidad || !!v.porcentajeDiscapacidad || !!this.data?.archivos?.length; }
  private hasPartnerData() { const v: any = this.pareja.getRawValue(); return !!v.id || !!v.nombres || !!v.apellidos || !!v.identificacion || !!v.fechaNacimiento || !!v.archivos?.length; }
  private hasChildDisabilityData(row: AbstractControl) { const v = row.value; return this.previousChildDisability.get(v.clave) === 'Si' || !!v.tipoDiscapacidad || !!v.porcentajeDiscapacidad || this.documentosHijo(row, false).length > 0; }

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
      this.fichasEnEdicion.delete(this.familiares);
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
    row.get('archivos')?.setValue(this.documentosHijo(row, true), { emitEvent: false });
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

  save(seccion = this.tab as SeccionPerfil, alFallar?: () => void) {
    if (this.loadFailed || !this.data) { this.error = 'Carga los datos oficiales antes de guardar.'; return; }
    if (this.saving || this.revisiones.some(x => x.seccion === seccion && x.estado === 'EnRevision')) return;
    this.error = '';
    const root = controlPorSeccion[seccion];
    const sectionControl = this.form.controls[root];
    const respaldoPendiente = this.revisarRespaldos(seccion);
    if (respaldoPendiente) {
      this.focusPath(respaldoPendiente);
      return;
    }
    if (sectionControl.invalid) {
      alFallar?.();
      sectionControl.markAllAsTouched();
      const path = this.firstInvalidPath(sectionControl, root);
      if (path) this.focusPath(path);
      return;
    }
    const raw: any = this.form.getRawValue();
    raw.conocimientos = raw.conocimientos.map(({ area, porcentaje }: { area: string; porcentaje: string }) => ({ area: area.trim(), porcentaje: Number(porcentaje) }));
    raw.persona.fechaNacimiento = raw.persona.fechaNacimiento || null;
    raw.persona.telefono = this.numeroInternacional(raw.persona.telefono ?? '')?.number ?? null;
    const ownYes = this.isYes(raw.persona.tieneDiscapacidad);
    const childrenYes = this.isYes(raw.familia.tieneHijos);
    const partnerYes = this.requiresPartner(raw.familia.estadoCivil);
    raw.persona.porcentajeDiscapacidad = ownYes ? porcentajeNumerico(raw.persona.porcentajeDiscapacidad) : null;
    raw.persona.limpiarDiscapacidad = raw.persona.limpiarDiscapacidad || !ownYes;
    if (!ownYes) raw.persona.tipoDiscapacidad = null;
    raw.controlVersion = this.data.controlVersion;
    raw.familia.limpiarHijos = raw.familia.limpiarHijos || !childrenYes; raw.familia.clavesHijosAEliminar = this.removedChildKeys;
    raw.familia.limpiarPareja = raw.familia.limpiarPareja || !partnerYes; raw.familia.claveParejaAEliminar = this.removedPartnerKey;
    raw.familia.familiares = childrenYes ? raw.familia.familiares.map((x: any) => {
      const tieneDiscapacidad = this.isYes(x.tieneDiscapacidad);
      return {
        ...x,
        nombres: normalizarNombrePersona(x.nombres),
        apellidos: normalizarNombrePersona(x.apellidos),
        tipoRelacion: 'Hijo',
        fechaNacimiento: x.fechaNacimiento || null,
        tipoDiscapacidad: tieneDiscapacidad ? x.tipoDiscapacidad : null,
        porcentajeDiscapacidad: tieneDiscapacidad ? porcentajeNumerico(x.porcentajeDiscapacidad) : null,
        limpiarDiscapacidad: x.limpiarDiscapacidad || !tieneDiscapacidad,
        archivos: undefined
      };
    }) : [];
    raw.familia.pareja = partnerYes ? {
      ...raw.familia.pareja,
      nombres: normalizarNombrePersona(raw.familia.pareja.nombres),
      apellidos: normalizarNombrePersona(raw.familia.pareja.apellidos),
      fechaNacimiento: raw.familia.pareja.fechaNacimiento || null,
      porcentajeDiscapacidad: porcentajeNumerico(raw.familia.pareja.porcentajeDiscapacidad),
      archivos: undefined
    } : null;
    this.saving = true; this.error = ''; this.message = '';
    const payload = {
      seccion,
      controlVersion: raw.controlVersion,
      persona: seccion === 'personal' ? raw.persona : { nombres: '', apellidos: '' },
      familia: seccion === 'familia' ? raw.familia : null,
      formaciones: seccion === 'formacion' ? raw.formaciones.map((estudio: { fechaInicio: string; fechaFin: string }) => ({
        ...estudio, fechaInicio: estudio.fechaInicio || null, fechaFin: estudio.fechaFin || null
      })) : [],
      certificaciones: seccion === 'certificaciones' ? raw.certificaciones.map((certificado: { fechaVencimiento: string }) => ({
        ...certificado, fechaVencimiento: certificado.fechaVencimiento || null
      })) : [],
      conocimientos: seccion === 'conocimientos' ? raw.conocimientos : null,
      limpiarDiscapacidad: seccion === 'personal' && raw.persona.limpiarDiscapacidad
    };
    this.api.save(payload).subscribe({
      next: result => {
        this.data.controlVersion = result.version;
        if (seccion === 'conocimientos') {
          this.conocimientoEnEdicion = null;
          this.conocimientoOriginal = undefined;
        }
        if (result.validacionEnviada) {
          this.revisiones = [...this.revisiones.filter(x => x.seccion !== seccion), { seccion, estado: 'EnRevision' }];
          if (this.tab === seccion) this.mostrarAvisoRevision();
          this.cargarRevisiones();
        } else {
          this.mostrarNotificacion({ tipo: 'exito', mensaje: 'Cambios guardados correctamente.' });
        }
        this.api.getMine().subscribe({
          next: datos => {
            this.data = datos;
            if (!result.validacionEnviada) this.cargarSeccion(seccion, datos);
            this.saving = false;
          },
          error: () => {
            this.saving = false;
            this.error = 'Los cambios se guardaron. Recarga la página para actualizar los datos.';
          }
        });
      },
      error: e => {
        alFallar?.();
        const applied = this.applyBackendErrors(e);
        this.error = applied.length ? '' : this.mensajeErrorGuardado(e);
        this.saving = false;
        if (applied.length) this.focusPath(applied[0]);
      }
    });
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
  askDelete(file: any) { if (this.deletingId) return; this.deleteTarget = { id: file.id, nombre: file.nombreOriginal }; }
  cancelDelete() { if (!this.deletingId) this.deleteTarget = undefined; }
  confirmDelete() {
    const target = this.deleteTarget;
    if (!target || this.deletingId) return;
    this.deletingId = target.id;
    this.error = '';
    const request$ = this.api.deleteMineDocument(target.id);
    request$.subscribe({
      next: () => {
        this.removeDocumentFromView(target.id);
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

  private removeDocumentFromView(id: number) {
    if (this.data?.archivos) this.data.archivos = this.data.archivos.filter((file: any) => file.id !== id);
    const partnerFiles = (this.pareja.get('archivos')?.value as any[] | null) || [];
    (this.pareja.get('archivos') as any)?.setValue(partnerFiles.filter((file: any) => file.id !== id), { emitEvent: false });
    for (const row of [...this.familiares.controls, ...this.formaciones.controls, ...this.certificaciones.controls]) {
      const archivos = row.get('archivos')?.value || [];
      row.get('archivos')?.setValue(archivos.filter((file: any) => file.id !== id), { emitEvent: false });
    }
  }
}
