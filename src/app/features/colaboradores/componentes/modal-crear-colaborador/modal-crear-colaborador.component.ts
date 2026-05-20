import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  CrearColaboradorDto, TipoIdentificacion,
  Modalidad, Categoria, Genero,
} from '../../models/colaborador.model';

@Component({
  selector: 'app-modal-crear-colaborador',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-crear-colaborador.component.html',
  styleUrl:    './modal-crear-colaborador.component.scss',
})
export class ModalCrearColaboradorComponent implements OnInit {
  @Output() cerrar  = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<CrearColaboradorDto>();

  form!: FormGroup;
  enviado = false;

  readonly asociaciones: string[]  = ['RPS', 'ISC', 'RPS & ISC'];
  readonly tiposContrato: string[] = ['Fijo', 'Por Proyecto'];
  readonly modalidades: Modalidad[] = ['Presencial', 'Remoto', 'Híbrida'];
  readonly categorias: string[]    = ['Junior', 'Semi-Senior', 'Senior', 'Especialista', 'Especialista Plus'];
  readonly generos: Genero[]       = ['Masculino', 'Femenino', 'Otro'];

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

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      tipoIdentificacion: ['',  Validators.required],
      tipoContrato:       ['', Validators.required],
      nombres:            ['', [Validators.required, Validators.minLength(3)]],
      apellidos:          ['', [Validators.required, Validators.minLength(3)]],
      identificacion:     ['', [Validators.required, Validators.minLength(10)]],
      fechaNacimiento:    ['', Validators.required],
      genero:             ['', Validators.required],
      correoElectronico:  ['', [Validators.required, Validators.email]],
      telefono:           ['', [Validators.required, Validators.minLength(10)]],
      direccion:          ['', Validators.required],
      departamento:       ['', Validators.required],
      fechaContratacion:  ['', Validators.required],
      cargo:              ['', Validators.required],
      aniosExperiencia:   [null, [Validators.required, Validators.min(0), Validators.max(50)]],
      modalidad:          ['', Validators.required],
      categoria:          ['', Validators.required],
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
    const dto: CrearColaboradorDto = {
      tipoIdentificacion: v.tipoIdentificacion,
      identificacion:     v.identificacion,
      nombreCompleto:     `${v.nombres} ${v.apellidos}`,
      departamento:       v.departamento,
      fechaContratacion:  v.fechaContratacion,
      cargo:              v.cargo,
      aniosExperiencia:   v.aniosExperiencia,
      modalidad:          v.modalidad,
      categoria:          v.categoria,
      correoElectronico:  v.correoElectronico,
      fechaNacimiento:    v.fechaNacimiento,
      telefono:           v.telefono,
      genero:             v.genero,
      direccion:          v.direccion,
      estado:             'Activo',
    };
    this.guardar.emit(dto);
  }

  onCerrar(): void { this.cerrar.emit(); }
}