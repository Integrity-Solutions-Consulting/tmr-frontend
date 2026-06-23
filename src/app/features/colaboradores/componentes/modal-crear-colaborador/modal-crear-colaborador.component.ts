import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import {
  CatalogosService, CatalogoItem, CargoItem
} from '../../servicios/catalogos.service';

@Component({
  selector: 'app-modal-crear-colaborador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-crear-colaborador.component.html',
  styleUrl: './modal-crear-colaborador.component.scss',
})
export class ModalCrearColaboradorComponent implements OnInit {
  @Output() cerrar = new EventEmitter<void>();
  // Emitimos el objeto que espera el backend para crear Persona + Empleado.
  @Output() guardar = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);

  form!: FormGroup;
  enviado = false;

  // ── Tipos de persona permitidos por la tabla persona ──
  tiposPersona = [
    { valor: 'NATURAL', texto: 'Natural' },
    { valor: 'JURIDICA', texto: 'Jurídica' },
  ];

  // ── Listas cargadas desde el backend (con id + valor) ──
  empresas: CatalogoItem[] = [];              // EMP
  tiposContrato: CatalogoItem[] = [];         // TCT
  tiposIdentificacion: CatalogoItem[] = [];   // TID
  generos: CatalogoItem[] = [];               // GEN
  nacionalidades: CatalogoItem[] = [];        // NAC
  departamentos: CatalogoItem[] = [];         // DEP
  modalidades: CatalogoItem[] = [];           // MDT
  categorias: CatalogoItem[] = [];            // CAT
  cargosDisponibles: CargoItem[] = [];        // cargos del departamento elegido

  ngOnInit(): void {
    // Construimos el formulario.
    this.form = this.fb.group({
      // ── Contrato ──────────────────────────────────────
      idEmpresaCatalogo: [null, Validators.required],
      idTipoContrato: [null, Validators.required],

      // ── Datos personales ──────────────────────────────
      tipoPersona: ['NATURAL', Validators.required],
      idTipoIdentificacion: [null, Validators.required],
      identificacion: ['', [
        Validators.required,
        Validators.maxLength(20),
        this.validatorIdentificacionPorTipo()
      ]],
      nombres: ['', [
        Validators.required,
        Validators.maxLength(100),
        this.validatorSoloLetras()
      ]],
      apellidos: ['', [
        Validators.required,
        Validators.maxLength(100),
        this.validatorSoloLetras()
      ]],
      fechaNacimiento: [''],
      idGenero: [null],
      idNacionalidad: [null],

      // ── Datos de contacto ─────────────────────────────
      correoElectronico: ['', [Validators.email, Validators.maxLength(100)]],
      telefono: ['', [Validators.maxLength(20), this.validatorTelefono()]],
      direccion: ['', [
        Validators.maxLength(255),
        this.validatorNoEmoji(),
        this.validatorNoSoloEspaciosOpcional()
      ]],

      // ── Datos laborales ───────────────────────────────
      idDepartamento: [null, Validators.required],
      fechaContratacion: ['', Validators.required],
      idCargo: [null, Validators.required],
      aniosExperiencia: [null, [
        Validators.required,
        Validators.min(0),
        Validators.max(50)
      ]],
      idModoTrabajo: [null],
      idCategoriaEmpleado: [null],
    });

    this.configurarValidacionesDinamicas();
    this.cargarCatalogos();

    // Al cambiar departamento → cargar sus cargos y limpiar el cargo elegido.
    this.form.get('idDepartamento')?.valueChanges.subscribe(idDep => {
      this.form.patchValue({ idCargo: null });
      this.cargosDisponibles = [];

      if (idDep) {
        this.catalogosService.getCargosPorDepartamento(Number(idDep)).subscribe(cargos => {
          this.cargosDisponibles = cargos;
        });
      }
    });
  }

  // Carga los catálogos desde el backend.
  private cargarCatalogos(): void {
    this.catalogosService.getCatalogo('EMP').subscribe(d => this.empresas = d);
    this.catalogosService.getCatalogo('TCT').subscribe(d => this.tiposContrato = d);
    this.catalogosService.getCatalogo('TID').subscribe(d => this.tiposIdentificacion = d);
    this.catalogosService.getCatalogo('GEN').subscribe(d => this.generos = d);
    this.catalogosService.getCatalogo('NAC').subscribe(d => this.nacionalidades = d);
    this.catalogosService.getCatalogo('DEP').subscribe(d => this.departamentos = d);
    this.catalogosService.getCatalogo('MDT').subscribe(d => this.modalidades = d);
    this.catalogosService.getCatalogo('CAT').subscribe(d => this.categorias = d);
  }

  // ─────────────────────────────────────────────────────────────
  // VALIDACIONES DINÁMICAS
  // ─────────────────────────────────────────────────────────────
  private configurarValidacionesDinamicas(): void {
    this.form.get('tipoPersona')?.valueChanges.subscribe(tipo => {
      this.aplicarReglasTipoPersona(tipo);
      this.form.get('identificacion')?.updateValueAndValidity();
    });

    this.form.get('idTipoIdentificacion')?.valueChanges.subscribe(() => {
      const ctrl = this.form.get('identificacion');
      const valorLimpio = this.limpiarIdentificacion(ctrl?.value ?? '');

      ctrl?.setValue(valorLimpio, { emitEvent: false });
      ctrl?.updateValueAndValidity();
    });

    this.aplicarReglasTipoPersona(this.form.get('tipoPersona')?.value);
  }

  private aplicarReglasTipoPersona(tipoPersona: string): void {
    const tipoIdentificacionCtrl = this.form.get('idTipoIdentificacion');

    if (!tipoIdentificacionCtrl) return;

    if (tipoPersona === 'JURIDICA') {
      tipoIdentificacionCtrl.clearValidators();
      tipoIdentificacionCtrl.setValue(null);
      tipoIdentificacionCtrl.disable();
    } else {
      tipoIdentificacionCtrl.enable();
      tipoIdentificacionCtrl.setValidators([Validators.required]);
    }

    tipoIdentificacionCtrl.updateValueAndValidity();
  }

  private validatorIdentificacionPorTipo(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '').trim();

      if (!valor) return null;

      const tipo = this.obtenerTipoIdentificacionActual();

      // Cédula: exactamente 10 números.
      if (tipo.includes('cedula')) {
        return /^\d{10}$/.test(valor) ? null : { cedulaInvalida: true };
      }

      // RUC: exactamente 13 números.
      if (tipo.includes('ruc')) {
        return /^\d{13}$/.test(valor) ? null : { rucInvalido: true };
      }

      // Pasaporte: alfanumérico entre 5 y 20.
      if (tipo.includes('pasaporte')) {
        return /^[A-Za-z0-9]{5,20}$/.test(valor) ? null : { pasaporteInvalido: true };
      }

      // Otro documento: letras y números, sin símbolos ni emojis.
      if (tipo.includes('otro')) {
        return /^[A-Za-z0-9]+$/.test(valor) ? null : { alfanumericoInvalido: true };
      }

      return this.tieneEmoji(valor) ? { emoji: true } : null;
    };
  }

  private validatorTelefono(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '').trim();

      if (!valor) return null;

      // Permite + solo al inicio y luego solo números.
      if (!/^\+?\d+$/.test(valor)) {
        return { telefonoInvalido: true };
      }

      const digitos = valor.replace(/\D/g, '');

      if (digitos.length < 7 || digitos.length > 15) {
        return { telefonoInvalido: true };
      }

      return null;
    };
  }

  private validatorNoEmoji(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '');

      if (!valor) return null;

      return this.tieneEmoji(valor) ? { emoji: true } : null;
    };
  }

  private validatorSoloLetras(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '');

      if (!valor) return null;

      if (!valor.trim()) {
        return { soloEspacios: true };
      }

      if (this.tieneEmoji(valor)) {
        return { emoji: true };
      }

      // Letras, espacios, tildes, ñ, guion y apóstrofe.
      const regex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/;

      return regex.test(valor) ? null : { soloLetras: true };
    };
  }

  private validatorNoSoloEspaciosOpcional(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '');

      if (!valor) return null;

      if (!valor.trim()) {
        return { soloEspacios: true };
      }

      return null;
    };
  }

  private obtenerTipoIdentificacionActual(): string {
    const idTipo = Number(this.form?.get('idTipoIdentificacion')?.value);

    const tipo = this.tiposIdentificacion.find(t => Number(t.id) === idTipo);

    return this.normalizarTexto(tipo?.valor ?? '');
  }

  private normalizarTexto(valor?: string | null): string {
    return (valor ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private tieneEmoji(valor: string): boolean {
    return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(valor);
  }

  private limpiarIdentificacion(valor: string): string {
    const tipo = this.obtenerTipoIdentificacionActual();

    if (tipo.includes('cedula')) {
      return valor.replace(/\D/g, '').slice(0, 10);
    }

    if (tipo.includes('ruc')) {
      return valor.replace(/\D/g, '').slice(0, 13);
    }

    if (tipo.includes('pasaporte') || tipo.includes('otro')) {
      return valor.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
    }

    return valor
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
      .slice(0, 20);
  }

  onIdentificacionInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valorLimpio = this.limpiarIdentificacion(input.value);

    input.value = valorLimpio;
    this.form.get('identificacion')?.setValue(valorLimpio, { emitEvent: false });
    this.form.get('identificacion')?.updateValueAndValidity();
  }

  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    let valor = input.value.replace(/[^\d+]/g, '');

    // Deja el + solo si está al inicio.
    valor = valor.startsWith('+')
      ? '+' + valor.slice(1).replace(/\+/g, '')
      : valor.replace(/\+/g, '');

    // Máximo 15 dígitos reales.
    const tieneMas = valor.startsWith('+');
    const digitos = valor.replace(/\D/g, '').slice(0, 15);

    valor = tieneMas ? `+${digitos}` : digitos;

    input.value = valor;
    this.form.get('telefono')?.setValue(valor, { emitEvent: false });
    this.form.get('telefono')?.updateValueAndValidity();
  }

  mensajeErrorIdentificacion(): string {
    const errors = this.form.get('identificacion')?.errors;

    if (!errors) return '';

    if (errors['required']) return 'Campo requerido';
    if (errors['cedulaInvalida']) return 'Ingrese una cédula válida de 10 dígitos';
    if (errors['rucInvalido']) return 'Ingrese un RUC válido de 13 dígitos';
    if (errors['pasaporteInvalido']) return 'Campo inválido';
    if (errors['alfanumericoInvalido']) return 'Campo inválido';
    if (errors['emoji']) return 'Campo inválido';

    return 'Campo inválido';
  }

  mensajeErrorTexto(campo: string): string {
    const errors = this.form.get(campo)?.errors;

    if (!errors) return '';

    if (errors['required']) return 'Campo requerido';
    if (errors['soloEspacios']) return 'Campo requerido';
    if (errors['emoji']) return 'Campo inválido';
    if (errors['soloLetras']) return 'Campo inválido';
    if (errors['maxlength']) return 'Supera el máximo de caracteres';
    if (errors['email']) return 'Ingrese un correo válido';
    if (errors['telefonoInvalido']) return 'Ingrese un teléfono válido';

    return 'Campo inválido';
  }

  tieneValor(campo: string): boolean {
    const val = this.form.get(campo)?.value;
    return val !== null && val !== undefined && val !== '';
  }

  campoInvalido(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl && ctrl.invalid && !ctrl.disabled && (ctrl.touched || this.enviado));
  }

  onGuardar(): void {
    this.enviado = true;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();

    // Objeto que espera el backend.
    // Ahora contiene datos de Persona + datos de Empleado.
    const request = {
      // ── Datos de persona ──────────────────────────────
      numeroIdentificacion: String(v.identificacion).trim(),
      idTipoIdentificacion: v.tipoPersona === 'NATURAL'
        ? Number(v.idTipoIdentificacion)
        : null,
      tipoPersona: v.tipoPersona,
      idGenero: v.idGenero ? Number(v.idGenero) : null,
      idNacionalidad: v.idNacionalidad ? Number(v.idNacionalidad) : null,
      nombres: String(v.nombres).trim(),
      apellidos: String(v.apellidos).trim(),
      fechaNacimiento: v.fechaNacimiento || null,

      // ── Datos de contacto ─────────────────────────────
      email: v.correoElectronico ? String(v.correoElectronico).trim() : null,
      telefono: v.telefono ? String(v.telefono).trim() : null,
      direccion: v.direccion ? String(v.direccion).trim() : null,

      // ── Contrato ──────────────────────────────────────
      idEmpresaCatalogo: Number(v.idEmpresaCatalogo),
      idTipoContrato: Number(v.idTipoContrato),

      // ── Datos laborales ───────────────────────────────
      idDepartamento: Number(v.idDepartamento),
      fechaIngreso: v.fechaContratacion || null,
      idCargo: Number(v.idCargo),
      aniosExperiencia: Number(v.aniosExperiencia),
      idModoTrabajo: v.idModoTrabajo ? Number(v.idModoTrabajo) : null,
      idCategoriaEmpleado: v.idCategoriaEmpleado ? Number(v.idCategoriaEmpleado) : null,
    };

    this.guardar.emit(request);
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}