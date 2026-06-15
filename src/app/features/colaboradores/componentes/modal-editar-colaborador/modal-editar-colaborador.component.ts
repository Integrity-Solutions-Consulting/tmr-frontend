import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Colaborador } from '../../models/colaborador.model';
import {
  CatalogosService, CatalogoItem, CargoItem
} from '../../servicios/catalogos.service';

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

  form!: FormGroup;
  enviado = false;

  // ── Tipos de persona permitidos ─────────────────────
  tiposPersona = [
    { valor: 'NATURAL', texto: 'Natural' },
    { valor: 'JURIDICA', texto: 'Jurídica' },
  ];

  // ── Listas del backend ──────────────────────────────
  empresas: CatalogoItem[] = [];              // EMP
  tiposContrato: CatalogoItem[] = [];         // TCT
  tiposIdentificacion: CatalogoItem[] = [];   // TID
  generos: CatalogoItem[] = [];               // GEN
  nacionalidades: CatalogoItem[] = [];        // NAC
  modalidades: CatalogoItem[] = [];           // MDT
  categorias: CatalogoItem[] = [];            // CAT
  departamentos: CatalogoItem[] = [];         // DEP
  cargosDisponibles: CargoItem[] = [];

  readonly estados = ['Activo', 'Inactivo'];

  ngOnInit(): void {
    this.form = this.fb.group({
      // ── Contrato ──────────────────────────────────────
      idEmpresaCatalogo: [null],
      idTipoContrato: [null, Validators.required],
      estado: ['', Validators.required],

      // ── Datos personales ──────────────────────────────
      tipoPersona: ['NATURAL'],
      idTipoIdentificacion: [null],
      identificacion: [''],
      nombres: [''],
      apellidos: [''],
      fechaNacimiento: [''],
      idGenero: [null],
      idNacionalidad: [null],

      // ── Datos de contacto ─────────────────────────────
      correoElectronico: [''],
      telefono: [''],
      direccion: [''],

      // ── Datos laborales ───────────────────────────────
      idDepartamento: [null, Validators.required],
      fechaContratacion: ['', Validators.required],
      idCargo: [null, Validators.required],
      aniosExperiencia: [null, [Validators.required, Validators.min(0), Validators.max(50)]],
      idModoTrabajo: [null, Validators.required],
      idCategoriaEmpleado: [null, Validators.required],
    });

    this.habilitarCamposEditables();
    this.cargarCatalogosYPrecargar();

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

      // Primero cargamos TODOS los catálogos y luego precargamos el formulario.
      this.precargarValores();
    });
  }

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
      fechaNacimiento: c.fechaNacimiento ?? '',
      idGenero: idGenero ?? null,
      idNacionalidad: idNacionalidad ?? null,

      // ── Datos de contacto ─────────────────────────────
      correoElectronico: c.correoElectronico ?? c.email ?? '',
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',

      // ── Datos laborales ───────────────────────────────
      idDepartamento: dep?.id ?? null,
      fechaContratacion: c.fechaContratacion ?? c.fechaIngreso ?? '',
      aniosExperiencia: c.aniosExperiencia ?? null,
      idModoTrabajo: idModalidad ?? null,
      idCategoriaEmpleado: idCategoria ?? null,
    }, { emitEvent: false });

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

  private normalizarTexto(valor?: string | null): string {
    return (valor ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
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
      fechaNacimiento: v.fechaNacimiento || null,
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
      fechaIngreso: v.fechaContratacion || null,
      idCargo: Number(v.idCargo),
      aniosExperiencia: Number(v.aniosExperiencia),
      idModoTrabajo: Number(v.idModoTrabajo),
      idCategoriaEmpleado: Number(v.idCategoriaEmpleado),
    };

    this.guardar.emit(request);
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}