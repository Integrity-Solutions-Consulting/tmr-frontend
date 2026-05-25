import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Colaborador } from '../../models/colaborador.model';
import {
  CatalogosService, CatalogoItem, CargoItem
} from '../../servicios/catalogos.service';

@Component({
  selector: 'app-modal-editar-colaborador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-editar-colaborador.component.html',
  styleUrl:    './modal-editar-colaborador.component.scss',
})
export class ModalEditarColaboradorComponent implements OnInit {
  @Input() colaborador!: Colaborador;
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>();

  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);

  form!: FormGroup;
  enviado = false;

  // Listas del backend (datos laborales)
  tiposContrato: CatalogoItem[] = [];
  modalidades: CatalogoItem[] = [];
  categorias: CatalogoItem[] = [];
  departamentos: CatalogoItem[] = [];
  cargosDisponibles: CargoItem[] = [];

  // Para los dropdowns personales (solo lectura, pero el select necesita opciones)
  generos: CatalogoItem[] = [];

  // Estados como lista para el dropdown
  readonly estados = ['Activo', 'Inactivo'];

  ngOnInit(): void {
    this.form = this.fb.group({
      // ── Contrato (editable) ──
      idTipoContrato:      ['', Validators.required],
      estado:              ['', Validators.required],

      // ── Datos personales (DESHABILITADOS, solo lectura) ──
      nombres:             [{ value: '', disabled: true }],
      apellidos:           [{ value: '', disabled: true }],
      identificacion:      [{ value: '', disabled: true }],
      fechaNacimiento:     [{ value: '', disabled: true }],
      genero:              [{ value: '', disabled: true }],

      // ── Datos de contacto (DESHABILITADOS, solo lectura) ──
      correoElectronico:   [{ value: '', disabled: true }],
      telefono:            [{ value: '', disabled: true }],
      direccion:           [{ value: '', disabled: true }],

      // ── Datos laborales (editables) ──
      idDepartamento:      ['', Validators.required],
      fechaContratacion:   ['', Validators.required],
      idCargo:             ['', Validators.required],
      aniosExperiencia:    [null, [Validators.required, Validators.min(0), Validators.max(50)]],
      idModoTrabajo:       ['', Validators.required],
      idCategoriaEmpleado: ['', Validators.required],
    });

    this.cargarCatalogosYPrecargar();

    // Al cambiar departamento, cargar sus cargos.
    this.form.get('idDepartamento')?.valueChanges.subscribe(idDep => {
      if (idDep) {
        this.catalogosService.getCargosPorDepartamento(Number(idDep)).subscribe(cargos => {
          this.cargosDisponibles = cargos;
        });
      }
    });
  }

  private cargarCatalogosYPrecargar(): void {
    this.catalogosService.getCatalogo('TCT').subscribe(d => this.tiposContrato = d);
    this.catalogosService.getCatalogo('MDT').subscribe(d => this.modalidades = d);
    this.catalogosService.getCatalogo('CAT').subscribe(d => this.categorias = d);
    this.catalogosService.getCatalogo('GEN').subscribe(d => this.generos = d);
    this.catalogosService.getCatalogo('DEP').subscribe(d => {
      this.departamentos = d;
      this.precargarValores();
    });
  }

  // Precarga los datos del colaborador en el formulario.
  private precargarValores(): void {
    // Datos personales y contacto (se muestran, vienen del colaborador).
    const partes = this.colaborador.nombreCompleto.split(' ');
    this.form.patchValue({
      nombres: partes[0] ?? '',
      apellidos: partes.slice(1).join(' ') ?? '',
      identificacion: this.colaborador.identificacion,
      fechaNacimiento: this.colaborador.fechaNacimiento,
      genero: this.colaborador.genero,
      correoElectronico: this.colaborador.correoElectronico,
      telefono: this.colaborador.telefono,
      direccion: this.colaborador.direccion,
      estado: this.colaborador.estado,
      fechaContratacion: this.colaborador.fechaContratacion,
      aniosExperiencia: this.colaborador.aniosExperiencia,
    });

    // Departamento: buscar su id por el nombre.
    const dep = this.departamentos.find(d => d.valor === this.colaborador.departamento);
    if (dep) {
      this.form.patchValue({ idDepartamento: dep.id });
      // Cargar cargos y precargar el cargo actual.
      this.catalogosService.getCargosPorDepartamento(dep.id).subscribe(cargos => {
        this.cargosDisponibles = cargos;
        const cargo = cargos.find(c => c.nombreCargo === this.colaborador.cargo);
        if (cargo) this.form.patchValue({ idCargo: cargo.id });
      });
    }

    // Modalidad, categoría y tipo de contrato: buscar id por texto.
    setTimeout(() => {
      const mod = this.modalidades.find(m => m.valor === this.colaborador.modalidad);
      const cat = this.categorias.find(c => c.valor === this.colaborador.categoria);
      const tc  = this.tiposContrato.find(t => t.valor === this.colaborador.tipoContrato);
      if (mod) this.form.patchValue({ idModoTrabajo: mod.id });
      if (cat) this.form.patchValue({ idCategoriaEmpleado: cat.id });
      if (tc)  this.form.patchValue({ idTipoContrato: tc.id });
    }, 400);
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
    const request = {
      idTipoContrato:      Number(v.idTipoContrato),
      activo:              v.estado === 'Activo',
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