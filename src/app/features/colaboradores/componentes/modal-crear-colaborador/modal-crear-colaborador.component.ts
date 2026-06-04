import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  CatalogosService, CatalogoItem, CargoItem, PersonaItem
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
  // Ahora emitimos el objeto que espera el backend (con IDs).
  @Output() guardar = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);

  form!: FormGroup;
  enviado = false;

  // ── Listas cargadas desde el backend (con id + valor) ──
  personas: PersonaItem[] = [];
  asociaciones: CatalogoItem[] = [];   // EMP
  tiposContrato: CatalogoItem[] = [];  // TCT
  generos: CatalogoItem[] = [];        // GEN
  departamentos: CatalogoItem[] = [];  // DEP
  modalidades: CatalogoItem[] = [];    // MDT
  categorias: CatalogoItem[] = [];     // CAT
  cargosDisponibles: CargoItem[] = []; // cargos del departamento elegido

  ngOnInit(): void {
    // Construimos el formulario con IDs (numéricos) en vez de textos.
    this.form = this.fb.group({
      idEmpresaCatalogo:   ['', Validators.required],  // Asociación
      idTipoContrato:      ['', Validators.required],
      idPersona:           ['', Validators.required],
      // Datos personales (autocompletados, solo lectura)
      nombres:             [{ value: '', disabled: true }],
      apellidos:           [{ value: '', disabled: true }],
      identificacion:      [{ value: '', disabled: true }],
      fechaNacimiento:     [{ value: '', disabled: true }],
      idGenero:            [{ value: '', disabled: true }],
      // Datos de contacto (autocompletados, solo lectura)
      correoElectronico:   [{ value: '', disabled: true }],
      telefono:            [{ value: '', disabled: true }],
      direccion:           [{ value: '', disabled: true }],
      // Datos laborales
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

    // Al elegir persona → autocompletar sus datos personales y de contacto.
    this.form.get('idPersona')?.valueChanges.subscribe(id => {
      this.aplicarPersona(id);
    });
  }

  // Carga los catálogos desde el backend.
  private cargarCatalogos(): void {
    this.catalogosService.getCatalogo('EMP').subscribe(d => this.asociaciones = d);
    this.catalogosService.getCatalogo('TCT').subscribe(d => this.tiposContrato = d);
    this.catalogosService.getCatalogo('GEN').subscribe(d => this.generos = d);
    this.catalogosService.getCatalogo('DEP').subscribe(d => this.departamentos = d);
    this.catalogosService.getCatalogo('MDT').subscribe(d => this.modalidades = d);
    this.catalogosService.getCatalogo('CAT').subscribe(d => this.categorias = d);
    this.catalogosService.getPersonas().subscribe(d => this.personas = d);
  }

  // Autocompleta los datos de la persona seleccionada.
  private aplicarPersona(idPersona: string): void {
    if (!idPersona) {
      this.form.patchValue({
        nombres: '', apellidos: '', identificacion: '',
        fechaNacimiento: '', idGenero: '',
        correoElectronico: '', telefono: '', direccion: '',
      });
      return;
    }

    const persona = this.personas.find(p => p.id === Number(idPersona));
    if (!persona) return;

    // Llenamos los campos personales (vienen de la persona).
    this.form.patchValue({
      nombres:         persona.nombres,
      apellidos:       persona.apellidos,
      identificacion:  persona.numeroIdentificacion,
      fechaNacimiento: persona.fechaNacimiento ?? '',
      idGenero:        persona.idGenero ?? '',
      correoElectronico: persona.email ?? '',
      telefono:          persona.telefono ?? '',
      direccion:         persona.direccion ?? '',
    });

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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();

    // Objeto que espera el backend (CrearColaboradorRequest).
    const request = {
      idEmpresaCatalogo:   Number(v.idEmpresaCatalogo),
      idTipoContrato:      Number(v.idTipoContrato),
      idPersona:           Number(v.idPersona),
      idDepartamento:      Number(v.idDepartamento),
      fechaIngreso:        v.fechaContratacion || null,
      idCargo:             Number(v.idCargo),
      aniosExperiencia:    v.aniosExperiencia,
      idModoTrabajo:       Number(v.idModoTrabajo),
      idCategoriaEmpleado: Number(v.idCategoriaEmpleado),
    };

    this.guardar.emit(request);
  }

  onCerrar(): void { this.cerrar.emit(); }
}
