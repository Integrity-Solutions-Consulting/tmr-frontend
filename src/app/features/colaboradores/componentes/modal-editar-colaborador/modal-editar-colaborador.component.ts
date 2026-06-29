import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
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
import { forkJoin } from 'rxjs';
import { Colaborador } from '../../models/colaborador.model';
import {
  CatalogosService, CatalogoItem, CargoItem
} from '../../servicios/catalogos.service';
import { ColaboradoresService } from '../../servicios/colaboradores.service';

@Component({
  selector: 'app-modal-editar-colaborador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-editar-colaborador.component.html',
  styleUrl: './modal-editar-colaborador.component.scss',
})
export class ModalEditarColaboradorComponent implements OnInit {
  @Input() colaborador!: Colaborador;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);
  private colaboradoresService = inject(ColaboradoresService);

  form!: FormGroup;
  enviado = false;

  // ── Tipos de persona permitidos ─────────────────────
  tiposPersona = [
    { valor: 'NATURAL', texto: 'Natural' },
    { valor: 'JURIDICA', texto: 'Jurídica' },
  ];

  // ── Listas del backend ──────────────────────────────
  empresas: CatalogoItem[] = [];
  tiposContrato: CatalogoItem[] = [];
  tiposIdentificacion: CatalogoItem[] = [];
  generos: CatalogoItem[] = [];
  nacionalidades: CatalogoItem[] = [];
  modalidades: CatalogoItem[] = [];
  categorias: CatalogoItem[] = [];
  departamentos: CatalogoItem[] = [];
  cargosDisponibles: CargoItem[] = [];

  // ================================================================
  // SECCIÓN REEMPLAZO (SOLO COLABORADORES INACTIVOS)
  // ================================================================
  seccionReemplazoAbierta = false;
  colaboradoresInactivos: Colaborador[] = [];
  colaboradoresFiltrados: Colaborador[] = [];
  mostrarLista = false;
  reemplazoSeleccionado: Colaborador | null = null;
  busquedaActual = '';

  ngOnInit(): void {
    this.form = this.fb.group({
      // ── Contrato ──────────────────────────────────────
      idEmpresaCatalogo: [null],
      idTipoContrato: [null, Validators.required],
      estado: ['', Validators.required],

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

      // ================================================================
      // CAMPO REEMPLAZO
      // ================================================================
      idEmpleadoReemplazo: [null],
    });

    this.configurarValidacionesDinamicas();
    this.cargarCatalogosYPrecargar();
    this.cargarColaboradoresInactivos();

    // Al cambiar departamento manualmente, cargar sus cargos y limpiar cargo anterior.
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

  private cargarCatalogosYPrecargar(): void {
    forkJoin({
      empresas: this.catalogosService.getCatalogo('EMP'),
      tiposContrato: this.catalogosService.getCatalogo('TCT'),
      tiposIdentificacion: this.catalogosService.getCatalogo('TID'),
      generos: this.catalogosService.getCatalogo('GEN'),
      nacionalidades: this.catalogosService.getCatalogo('NAC'),
      modalidades: this.catalogosService.getCatalogo('MDT'),
      categorias: this.catalogosService.getCatalogo('CAT'),
      departamentos: this.catalogosService.getCatalogo('DEP'),
    }).subscribe(data => {
      this.empresas = data.empresas;
      this.tiposContrato = data.tiposContrato;
      this.tiposIdentificacion = data.tiposIdentificacion;
      this.generos = data.generos;
      this.nacionalidades = data.nacionalidades;
      this.modalidades = data.modalidades;
      this.categorias = data.categorias;
      this.departamentos = data.departamentos;

      this.precargarValores();
    });
  }

  // ================================================================
  // PRECARGAR VALORES DEL COLABORADOR EN EL FORMULARIO
  // ================================================================
  private precargarValores(): void {
    const c: any = this.colaborador;

    const idEmpresa = c.idEmpresaCatalogo
      ?? this.buscarIdPorValor(this.empresas, c.asociacion)
      ?? this.buscarIdPorValor(this.empresas, c.tipoIdentificacion);

    const idGenero = c.idGenero
      ?? this.buscarIdPorValor(this.generos, c.genero);

    const idNacionalidad = c.idNacionalidad
      ?? this.buscarIdPorValor(this.nacionalidades, c.nacionalidad);

    const idModalidad = c.idModoTrabajo
      ?? this.buscarIdPorValor(this.modalidades, c.modalidad);

    const idCategoria = c.idCategoriaEmpleado
      ?? this.buscarIdPorValor(this.categorias, c.categoria);

    const idTipoContrato = c.idTipoContrato
      ?? this.buscarIdPorValor(this.tiposContrato, c.tipoContrato);

    const dep = this.departamentos.find(d =>
      this.normalizarTexto(d.valor) === this.normalizarTexto(c.departamento)
    );

    const estado = typeof c.estado === 'boolean'
      ? (c.estado ? 'Activo' : 'Inactivo')
      : c.estado ?? (c.activo ? 'Activo' : 'Inactivo');

    // ================================================================
    // PRECARGAR REEMPLAZO
    // ================================================================
    const idReemplazo = c.idEmpleadoReemplazo ?? null;

    this.form.patchValue({
      // ── Contrato ──────────────────────────────────────
      idEmpresaCatalogo: idEmpresa ?? null,
      idTipoContrato: idTipoContrato ?? null,
      estado,

      // ── Datos personales ──────────────────────────────
      tipoPersona: c.tipoPersona ?? 'NATURAL',
      idTipoIdentificacion: c.idTipoIdentificacion ?? null,
      identificacion: c.identificacion ?? c.numeroIdentificacion ?? '',
      nombres: c.nombres ?? this.obtenerNombres(c.nombreCompleto),
      apellidos: c.apellidos ?? this.obtenerApellidos(c.nombreCompleto),
      fechaNacimiento: this.normalizarFechaInput(c.fechaNacimiento),
      idGenero: idGenero ?? null,
      idNacionalidad: idNacionalidad ?? null,

      // ── Datos de contacto ─────────────────────────────
      correoElectronico: c.correoElectronico ?? c.email ?? '',
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',

      // ── Datos laborales ───────────────────────────────
      idDepartamento: dep?.id ?? null,
      fechaContratacion: this.normalizarFechaInput(c.fechaContratacion),
      aniosExperiencia: c.aniosExperiencia ?? null,
      idModoTrabajo: idModalidad ?? null,
      idCategoriaEmpleado: idCategoria ?? null,

      // ================================================================
      // REEMPLAZO
      // ================================================================
      idEmpleadoReemplazo: idReemplazo,
    }, { emitEvent: false });

    this.aplicarReglasTipoPersona(this.form.get('tipoPersona')?.value);
    this.form.get('identificacion')?.updateValueAndValidity({ emitEvent: false });

    if (dep) {
      this.catalogosService.getCargosPorDepartamento(dep.id).subscribe(cargos => {
        this.cargosDisponibles = cargos;

        const cargo = cargos.find(cargoItem =>
          this.normalizarTexto(cargoItem.nombreCargo) === this.normalizarTexto(c.cargo)
        );

        if (cargo) {
          this.form.patchValue({ idCargo: cargo.id }, { emitEvent: false });
        }
      });
    }
  }

  private buscarIdPorValor(lista: CatalogoItem[], valor?: string | null): number | null {
    if (!valor) return null;

    const valorNormalizado = this.normalizarTexto(valor);

    return lista.find(item =>
      this.normalizarTexto(item.valor) === valorNormalizado
    )?.id ?? null;
  }

  private obtenerNombres(nombreCompleto?: string | null): string {
    if (!nombreCompleto) return '';

    const partes = nombreCompleto.trim().split(' ');
    return partes.slice(0, Math.ceil(partes.length / 2)).join(' ');
  }

  private obtenerApellidos(nombreCompleto?: string | null): string {
    if (!nombreCompleto) return '';

    const partes = nombreCompleto.trim().split(' ');
    return partes.slice(Math.ceil(partes.length / 2)).join(' ');
  }

  // ================================================================
  // HABILITAR CAMPOS EDITABLES
  // ================================================================
  private habilitarCamposEditables(): void {
    [
      'idEmpresaCatalogo',
      'tipoPersona',
      'idTipoIdentificacion',
      'identificacion',
      'nombres',
      'apellidos',
      'fechaNacimiento',
      'idGenero',
      'idNacionalidad',
      'correoElectronico',
      'telefono',
      'direccion',
    ].forEach(campo => {
      this.form.get(campo)?.enable();
    });
  }

  // ================================================================
  // MÉTODOS PARA REEMPLAZO (SOLO COLABORADORES INACTIVOS)
  // ================================================================

  toggleReemplazo(): void {
    this.seccionReemplazoAbierta = !this.seccionReemplazoAbierta;
    if (this.seccionReemplazoAbierta) {
      this.mostrarLista = true;
      this.colaboradoresFiltrados = [...this.colaboradoresInactivos];
    } else {
      this.mostrarLista = false;
    }
  }

  private cargarColaboradoresInactivos(): void {
    this.colaboradoresService.getColaboradores({ estado: 'Inactivo', busqueda: '' }, 1, 1000)
      .subscribe((response: any) => {
        this.colaboradoresInactivos = response.data;
        this.colaboradoresFiltrados = [...this.colaboradoresInactivos];
        if (this.seccionReemplazoAbierta) {
          this.mostrarLista = true;
        }
      });
  }

  filtrarColaboradores(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busquedaActual = input.value.toLowerCase().trim();

    if (this.busquedaActual === '') {
      this.colaboradoresFiltrados = [...this.colaboradoresInactivos];
    } else {
      this.colaboradoresFiltrados = this.colaboradoresInactivos.filter(c =>
        c.nombreCompleto.toLowerCase().includes(this.busquedaActual) ||
        c.identificacion.includes(this.busquedaActual)
      );
    }

    this.mostrarLista = this.colaboradoresFiltrados.length > 0 && !this.reemplazoSeleccionado;
  }

  seleccionarReemplazo(colaborador: Colaborador): void {
    this.reemplazoSeleccionado = colaborador;
    this.form.patchValue({ idEmpleadoReemplazo: Number(colaborador.id) });
    this.mostrarLista = false;
  }

  limpiarReemplazo(): void {
    this.reemplazoSeleccionado = null;
    this.form.patchValue({ idEmpleadoReemplazo: null });
    this.colaboradoresFiltrados = [...this.colaboradoresInactivos];
    this.busquedaActual = '';
    this.mostrarLista = true;
  }

  abrirLista(): void {
    if (!this.busquedaActual || this.busquedaActual === '') {
      this.colaboradoresFiltrados = [...this.colaboradoresInactivos];
    }
    this.mostrarLista = true;
  }

  cerrarLista(): void {
    setTimeout(() => {
      this.mostrarLista = false;
    }, 200);
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

      if (tipo.includes('cedula')) {
        return /^\d{10}$/.test(valor) ? null : { cedulaInvalida: true };
      }

      if (tipo.includes('ruc')) {
        return /^\d{13}$/.test(valor) ? null : { rucInvalido: true };
      }

      if (tipo.includes('pasaporte')) {
        return /^[A-Za-z0-9]{5,20}$/.test(valor) ? null : { pasaporteInvalido: true };
      }

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

  private normalizarFechaInput(fecha?: string | Date | null): string {
    if (!fecha) return '';

    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const valor = String(fecha).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      return valor.substring(0, 10);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      const [d, m, y] = valor.split('/');
      return `${y}-${m}-${d}`;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
      const [d, m, y] = valor.split('-');
      return `${y}-${m}-${d}`;
    }

    return '';
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

    valor = valor.startsWith('+')
      ? '+' + valor.slice(1).replace(/\+/g, '')
      : valor.replace(/\+/g, '');

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

    const request = {
      // ── Datos personales ──────────────────────────────
      tipoPersona: v.tipoPersona,
      idTipoIdentificacion: v.idTipoIdentificacion ? Number(v.idTipoIdentificacion) : null,
      numeroIdentificacion: v.identificacion ? String(v.identificacion).trim() : null,
      nombres: v.nombres ? String(v.nombres).trim() : null,
      apellidos: v.apellidos ? String(v.apellidos).trim() : null,
      fechaNacimiento: this.normalizarFechaInput(v.fechaNacimiento) || null,
      idGenero: v.idGenero ? Number(v.idGenero) : null,
      idNacionalidad: v.idNacionalidad ? Number(v.idNacionalidad) : null,

      // ── Datos de contacto ─────────────────────────────
      email: v.correoElectronico ? String(v.correoElectronico).trim() : null,
      telefono: v.telefono ? String(v.telefono).trim() : null,
      direccion: v.direccion ? String(v.direccion).trim() : null,

      // ── Contrato ──────────────────────────────────────
      idEmpresaCatalogo: v.idEmpresaCatalogo ? Number(v.idEmpresaCatalogo) : null,
      idTipoContrato: Number(v.idTipoContrato),
      activo: v.estado === 'Activo',

      // ── Datos laborales ───────────────────────────────
      idDepartamento: Number(v.idDepartamento),
      fechaIngreso: this.normalizarFechaInput(v.fechaContratacion) || null,
      idCargo: Number(v.idCargo),
      aniosExperiencia: Number(v.aniosExperiencia),
      idModoTrabajo: v.idModoTrabajo ? Number(v.idModoTrabajo) : null,
      idCategoriaEmpleado: v.idCategoriaEmpleado ? Number(v.idCategoriaEmpleado) : null,

      // ================================================================
      // CAMPO REEMPLAZO
      // ================================================================
      idEmpleadoReemplazo: this.reemplazoSeleccionado ? Number(this.reemplazoSeleccionado.id) : null,
    };

    this.guardar.emit(request);
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}