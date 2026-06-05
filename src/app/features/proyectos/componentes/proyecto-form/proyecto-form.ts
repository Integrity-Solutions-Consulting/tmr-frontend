import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';

import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

import { Proyecto } from '../../modelos/proyecto.model';

@Component({
  selector: 'app-proyecto-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './proyecto-form.html',
  styleUrl: './proyecto-form.scss'
})
export class ProyectoForm implements OnChanges, OnInit {
  @Input() proyecto: Proyecto | null = null;

  @Output() guardarProyecto = new EventEmitter<Proyecto>();

  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  intentoGuardar = false;

  lideres: any[] = [];
  clientes: any[] = [];
  colaboradores: any[] = [];
  cargos: string[] = [];

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/proyectos/lookups`).subscribe({
      next: (data) => {
        this.lideres = data.lideres ?? [];
        this.clientes = data.clientes ?? [];
      },
      error: (err) => console.error('Error fetching project lookups:', err)
    });

    this.http.get<any[]>(`${environment.apiUrl}/colaboradores`).subscribe({
      next: (data) => {
        this.colaboradores = data ?? [];
        const uniqueCargos = new Set<string>();
        this.colaboradores.forEach(c => {
          if (c.cargo) uniqueCargos.add(c.cargo);
        });
        this.cargos = Array.from(uniqueCargos).sort();
      },
      error: (err) => console.error('Error fetching colaboradores:', err)
    });
  }

  formulario = this.fb.group({
    id: [null as number | null],
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    cliente: ['', Validators.required],
    tipo: ['', Validators.required],
    fechaInicio: ['', [Validators.required, this.fechaValida()]],
    fechaFin: ['', [Validators.required, this.fechaValida()]],
    presupuesto: ['', [Validators.required, this.numeroValido(true)]],
    horas: ['', [Validators.required, this.numeroValido(false), Validators.min(0)]],
    lider: ['', Validators.required],
    costoHoraLider: ['', [Validators.required, this.numeroValido(true)]],
    horasLider: ['', [Validators.required, this.numeroValido(false), Validators.min(0)]],
    numeroRecursos: [0],
    estado: ['', Validators.required],
    recursos: this.fb.array([
      this.crearRecurso()
    ])
  }, { validators: this.rangoFechasValido('fechaInicio', 'fechaFin', 'fechaFinMenor') });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyecto']) {
      if (this.proyecto) {
        this.formulario.patchValue({
          ...this.proyecto,
          presupuesto: this.valorFormularioNumerico(this.proyecto.presupuesto),
          horas: this.valorFormularioNumerico(this.proyecto.horas),
          costoHoraLider: this.valorFormularioNumerico(this.proyecto.costoHoraLider),
          horasLider: this.valorFormularioNumerico(this.proyecto.horasLider)
        });
        this.reemplazarRecursos(this.proyecto.recursos ?? []);
      } else {
        this.formulario.reset();
        this.reemplazarRecursos([]);
      }

      this.intentoGuardar = false;
      this.formulario.markAsPristine();
      this.formulario.markAsUntouched();
      this.recursos.controls.forEach(recurso => {
        recurso.markAsPristine();
        recurso.markAsUntouched();
      });
    }
  }

  get recursos(): FormArray<FormGroup> {
    return this.formulario.controls.recursos as FormArray<FormGroup>;
  }

  crearRecurso(): FormGroup {
    return this.fb.group({
      tipo: ['Interno', Validators.required],
      idEmpleado: [null],
      nombre: ['', Validators.required],
      rol: ['', Validators.required],
      entrada: ['', [Validators.required, this.fechaValida()]],
      salida: ['', [Validators.required, this.fechaValida()]],
      costoHora: ['', [Validators.required, this.numeroValido(true)]],
      horas: ['', [Validators.required, this.numeroValido(false), Validators.min(0)]]
    }, { validators: this.rangoFechasValido('entrada', 'salida', 'salidaMenor') });
  }

  seleccionarColaborador(index: number, nombreCompleto: string): void {
    const colab = this.colaboradores.find(c => c.nombreCompleto === nombreCompleto);
    if (colab) {
      const recurso = this.recursos.at(index);
      recurso.patchValue({
        idEmpleado: colab.id,
        nombre: colab.nombreCompleto,
        rol: colab.cargo
      });
    }
  }

  agregarRecurso(): void {
    this.recursos.push(this.crearRecurso());
    this.actualizarNumeroRecursos();
  }

  eliminarRecurso(index: number): void {
    if (this.recursos.length === 1) {
      this.recursos.at(0).reset({
        tipo: 'Interno',
        nombre: '',
        rol: '',
        entrada: '',
        salida: '',
        costoHora: '',
        horas: ''
      });
    } else {
      this.recursos.removeAt(index);
    }

    this.actualizarNumeroRecursos();
  }

  private reemplazarRecursos(recursos: Proyecto['recursos']): void {
    this.recursos.clear();

    if (!recursos?.length) {
      this.recursos.push(this.crearRecurso());
      return;
    }

    recursos.forEach(recurso => {
      const grupo = this.crearRecurso();
      grupo.patchValue({
        ...recurso,
        idEmpleado: (recurso as any).idEmpleado ?? null,
        costoHora: this.valorFormularioNumerico(recurso.costoHora),
        horas: this.valorFormularioNumerico(recurso.horas)
      });
      this.recursos.push(grupo);
    });

    this.actualizarNumeroRecursos();
  }

  private actualizarNumeroRecursos(): void {
    this.formulario.controls.numeroRecursos.setValue(this.recursos.length);
  }

  guardar(): void {
    this.actualizarNumeroRecursos();
    this.intentoGuardar = true;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.recursos.controls.forEach(recurso => recurso.markAllAsTouched());
      return;
    }

    const valor = this.formulario.getRawValue() as unknown as Proyecto;
    const recursos = (valor.recursos ?? []).map(recurso => ({
      ...recurso,
      costoHora: this.normalizarNumero(recurso.costoHora),
      horas: this.normalizarNumero(recurso.horas)
    }));

    const proyecto = {
      ...valor,
      presupuesto: this.normalizarNumero(valor.presupuesto),
      horas: this.normalizarNumero(valor.horas),
      costoHoraLider: this.normalizarNumero(valor.costoHoraLider),
      horasLider: this.normalizarNumero(valor.horasLider),
      recursos,
      numeroRecursos: recursos.length
    } as Proyecto;

    this.guardarProyecto.emit(proyecto);

    this.formulario.reset();
    this.intentoGuardar = false;
  }

  campoInvalido(nombre: string): boolean {
    const control = this.formulario.get(nombre);

    return Boolean(control?.invalid && (control.touched || this.intentoGuardar));
  }

  recursoCampoInvalido(index: number, nombre: string): boolean {
    const control = this.recursos.at(index).get(nombre);

    return Boolean(control?.invalid && (control.touched || this.intentoGuardar));
  }

  recursoFechaSalidaInvalida(index: number): boolean {
    const recurso = this.recursos.at(index);

    return Boolean(recurso.hasError('salidaMenor') && (recurso.get('salida')?.touched || this.intentoGuardar));
  }

  fechaFinInvalida(): boolean {
    return Boolean(this.formulario.hasError('fechaFinMenor') && (this.formulario.controls.fechaFin.touched || this.intentoGuardar));
  }

  bloquearCaracteresNumericos(event: KeyboardEvent, permiteDecimal: boolean): void {
    const teclasPermitidas = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End'
    ];

    if (teclasPermitidas.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    const esNumero = /^[0-9]$/.test(event.key);
    const esDecimal = permiteDecimal && event.key === '.' &&
      !(event.target as HTMLInputElement).value.includes('.');

    if (!esNumero && !esDecimal) {
      event.preventDefault();
    }
  }

  bloquearPegadoNoNumerico(event: ClipboardEvent, permiteDecimal: boolean): void {
    const texto = event.clipboardData?.getData('text') ?? '';
    const patron = permiteDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/;

    if (!patron.test(texto)) {
      event.preventDefault();
    }
  }

  private fechaValida(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;

      if (!valor) {
        return null;
      }

      if (valor instanceof Date) {
        return isNaN(valor.getTime()) ? { fechaInvalida: true } : null;
      }

      if (typeof valor === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
          return null;
        }
        const d = new Date(valor);
        return !isNaN(d.getTime()) ? null : { fechaInvalida: true };
      }

      return { fechaInvalida: true };
    };
  }

  private numeroValido(permiteDecimal: boolean): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;

      if (valor === null || valor === undefined || valor === '') {
        return null;
      }

      const texto = String(valor);
      const patron = permiteDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/;

      if (!patron.test(texto)) {
        return { soloNumeros: true };
      }

      return Number(texto) >= 0 ? null : { min: true };
    };
  }

  private rangoFechasValido(
    inicioControl: string,
    finControl: string,
    errorKey: string
  ): ValidatorFn {
    return (grupo: AbstractControl): ValidationErrors | null => {
      const inicio = grupo.get(inicioControl)?.value;
      const fin = grupo.get(finControl)?.value;

      if (!inicio || !fin) {
        return null;
      }

      return new Date(fin) < new Date(inicio) ? { [errorKey]: true } : null;
    };
  }

  private normalizarNumero(valor: unknown): number {
    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : 0;
  }

  private valorFormularioNumerico(valor: number | undefined): string {
    return valor === undefined || valor === null ? '' : String(valor);
  }
}
