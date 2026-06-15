import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  CatalogosService, CatalogoItem, CargoItem
} from '../../servicios/catalogos.service';

@Component({
  selector: 'app-modal-crear-colaborador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-crear-colaborador.component.html',
  styleUrl:    './modal-crear-colaborador.component.scss',
})
export class ModalCrearColaboradorComponent implements OnInit {
  @Output() cerrar  = new EventEmitter<void>();
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
      idEmpresaCatalogo:   ['', Validators.required],  // Empresa
      idTipoContrato:      ['', Validators.required],

      // ── Datos personales ──────────────────────────────
      tipoPersona:         ['NATURAL', Validators.required],
      idTipoIdentificacion:['', Validators.required],
      identificacion:      ['', [Validators.required, Validators.maxLength(20)]],
      nombres:             ['', [Validators.required, Validators.maxLength(100)]],
      apellidos:           ['', [Validators.required, Validators.maxLength(100)]],
      fechaNacimiento:     [''],
      idGenero:            [''],
      idNacionalidad:      [''],

      // ── Datos de contacto ─────────────────────────────
      correoElectronico:   ['', [Validators.email, Validators.maxLength(100)]],
      telefono:            ['', [Validators.maxLength(20)]],
      direccion:           ['', [Validators.maxLength(255)]],

      // ── Datos laborales ───────────────────────────────
      idDepartamento:      ['', Validators.required],
      fechaContratacion:   ['', Validators.required],
      idCargo:             ['', Validators.required],
      aniosExperiencia:    [null, [Validators.required, Validators.min(0), Validators.max(50)]],
      idModoTrabajo:       ['', Validators.required],
      idCategoriaEmpleado: ['', Validators.required],
    });

    // Cargar todos los catálogos desde el backend.
    this.cargarCatalogos();

    // Al cambiar departamento → cargar sus cargos y limpiar el cargo elegido.
    this.form.get('idDepartamento')?.valueChanges.subscribe(idDep => {
      this.form.patchValue({ idCargo: '' });
      this.cargosDisponibles = [];

      if (idDep) {
        this.catalogosService.getCargosPorDepartamento(Number(idDep)).subscribe(cargos => {
          this.cargosDisponibles = cargos;
        });
      }
    });

    // Al cambiar el tipo de persona:
    // NATURAL  → habilita tipo de identificación.
    // JURIDICA → deshabilita tipo de identificación.
    this.form.get('tipoPersona')?.valueChanges.subscribe(tipo => {
      this.aplicarReglasTipoPersona(tipo);
    });

    // Aplicamos la regla inicial porque por defecto es NATURAL.
    this.aplicarReglasTipoPersona(this.form.get('tipoPersona')?.value);
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

 
  // si es NATURAL se habilita tipo de identificación;
  // si es JURIDICA se deshabilita.
  private aplicarReglasTipoPersona(tipoPersona: string): void {
    const tipoIdentificacionCtrl = this.form.get('idTipoIdentificacion');

    if (!tipoIdentificacionCtrl) return;

    if (tipoPersona === 'JURIDICA') {
      tipoIdentificacionCtrl.clearValidators();
      tipoIdentificacionCtrl.setValue('');
      tipoIdentificacionCtrl.disable();
    } else {
      tipoIdentificacionCtrl.enable();
      tipoIdentificacionCtrl.setValidators([Validators.required]);
    }

    tipoIdentificacionCtrl.updateValueAndValidity();
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
      idEmpresaCatalogo:   Number(v.idEmpresaCatalogo),
      idTipoContrato:      Number(v.idTipoContrato),

      // ── Datos laborales ───────────────────────────────
      idDepartamento:      Number(v.idDepartamento),
      fechaIngreso:        v.fechaContratacion || null,
      idCargo:             Number(v.idCargo),
      aniosExperiencia:    Number(v.aniosExperiencia),
      idModoTrabajo:       Number(v.idModoTrabajo),
      idCategoriaEmpleado: Number(v.idCategoriaEmpleado),
    };

    this.guardar.emit(request);
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}