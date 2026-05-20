import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  Colaborador, EditarColaboradorDto,
  EstadoColaborador, Modalidad, Genero,
} from '../../models/colaborador.model';

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
  @Output() guardar = new EventEmitter<EditarColaboradorDto>();

  form!: FormGroup;
  enviado = false;

  readonly tiposContrato: string[]      = ['Fijo', 'Por Proyecto'];
  readonly modalidades: Modalidad[]     = ['Presencial', 'Remoto', 'Híbrida'];
  readonly categorias: string[]         = ['Junior', 'Semi-Senior', 'Senior', 'Especialista', 'Especialista Plus'];
  readonly generos: Genero[]            = ['Masculino', 'Femenino', 'Otro'];
  readonly estados: EstadoColaborador[] = ['Activo', 'Inactivo'];

  readonly departamentos: string[] = [
    'Desarrollo',
    'Seguridad e Informática',
    'Procesos',
    'Proyectos',
    'Administración',
    'Comercial',
    'Recursos Humanos',
  ];

  readonly cargosPorDepartamento: Record<string, string[]> = {
    'Desarrollo': [
      'Desarrollador Fullstack', 'Analista QA', 'DevOps',
      'Desarrollador Backend', 'Desarrollador Frontend', 'Desarrollador Web',
      'Desarrollador Android', 'Desarrollador Cobol', 'Desarrollador iOS',
      'Desarrollador Java', 'Desarrollador PHP', 'Desarrollador Visual FoxPro',
    ],
    'Recursos Humanos': [
      'Analista de Talento Humano', 'Líder de Talento Humano',
    ],
    'Comercial': [
      'Gerente Comercial', 'Ejecutivo Comercial', 'Asistente Comercial',
    ],
    'Administración': [
      'Jefe Administrativo', 'Asistente de Marketing',
      'Asistente Administrativo', 'Asistente Contable',
    ],
    'Proyectos': [
      'Gerente de Proyectos y Producto', 'Coordinador de Proyectos',
      'Gestor de Proyectos', 'Líder de Proyectos y Productos', 'Líder Técnico',
    ],
    'Procesos': [
      'Analista de Procesos', 'Analista Funcional',
    ],
    'Seguridad e Informática': [
      'Analista Middleware', 'Soporte Técnico',
      'Líder de Seguridad e Informática', 'Help Desk',
    ],
  };

  get cargosDisponibles(): string[] {
    const dep = this.form?.get('departamento')?.value;
    return dep ? (this.cargosPorDepartamento[dep] ?? []) : [];
  }

  get nombres(): string  { return this.colaborador?.nombreCompleto?.split(' ')[0] ?? ''; }
  get apellidos(): string { return this.colaborador?.nombreCompleto?.split(' ').slice(1).join(' ') ?? ''; }

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      tipoContrato:      ['Fijo',                             Validators.required],
      nombres:           [this.nombres,                       [Validators.required, Validators.minLength(3)]],
      apellidos:         [this.apellidos,                     [Validators.required, Validators.minLength(3)]],
      identificacion:    [this.colaborador.identificacion,    [Validators.required, Validators.minLength(10)]],
      fechaNacimiento:   [this.colaborador.fechaNacimiento,   Validators.required],
      genero:            [this.colaborador.genero,            Validators.required],
      correoElectronico: [this.colaborador.correoElectronico, [Validators.required, Validators.email]],
      telefono:          [this.colaborador.telefono,          [Validators.required, Validators.minLength(10)]],
      direccion:         [this.colaborador.direccion,         Validators.required],
      departamento:      [this.colaborador.departamento,      Validators.required],
      fechaContratacion: [this.colaborador.fechaContratacion, Validators.required],
      cargo:             [this.colaborador.cargo,             Validators.required],
      aniosExperiencia:  [this.colaborador.aniosExperiencia,  [Validators.required, Validators.min(0), Validators.max(50)]],
      modalidad:         [this.colaborador.modalidad,         Validators.required],
      categoria:         [this.colaborador.categoria,         Validators.required],
      estado:            [this.colaborador.estado,            Validators.required],
    });

    // Reset cargo cuando cambia departamento
    this.form.get('departamento')?.valueChanges.subscribe(() => {
      this.form.patchValue({ cargo: '' });
    });
  }

  tieneValor(campo: string): boolean {
    const val = this.form.get(campo)?.value;
    return val !== null && val !== undefined && val !== '';
  }

  campoInvalido(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || this.enviado));
  }

  onGuardar(): void {
    this.enviado = true;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    const dto: EditarColaboradorDto = {
      nombreCompleto:    `${v.nombres} ${v.apellidos}`,
      identificacion:    v.identificacion,
      departamento:      v.departamento,
      fechaContratacion: v.fechaContratacion,
      cargo:             v.cargo,
      aniosExperiencia:  v.aniosExperiencia,
      modalidad:         v.modalidad,
      categoria:         v.categoria,
      correoElectronico: v.correoElectronico,
      fechaNacimiento:   v.fechaNacimiento,
      telefono:          v.telefono,
      genero:            v.genero,
      direccion:         v.direccion,
      estado:            v.estado,
    };
    this.guardar.emit(dto);
  }

  onCerrar(): void { this.cerrar.emit(); }
}