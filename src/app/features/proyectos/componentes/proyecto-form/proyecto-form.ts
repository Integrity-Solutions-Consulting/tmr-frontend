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

import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { Proyecto, LookupOption, ProyectoLookups, CargoLookup } from '../../modelos/proyecto.model';
import { ProyectosService } from '../../servicios/proyectos.service';

@Component({
  selector: 'app-proyecto-form',
  standalone: true,
  imports: [
    CommonModule,
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
export class ProyectoForm implements OnInit, OnChanges {
  @Input() proyecto: Proyecto | null = null;
  @Output() guardarProyecto = new EventEmitter<Proyecto>();

  private fb = inject(FormBuilder);
  private proyectosService = inject(ProyectosService);

  intentoGuardar = false;

  clientes: LookupOption[] = [];
  lideres: LookupOption[] = [];
  estados: LookupOption[] = [];
  tipos: LookupOption[] = [];
  empleadosDisponibles: LookupOption[] = [];
  cargosDisponibles: LookupOption[] = [];
  departamentos: LookupOption[] = [];
  todosLosCargos: CargoLookup[] = [];
  cargosFiltrados: CargoLookup[][] = [];

  formulario = this.fb.group({
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

  ngOnInit(): void {
    this.cargarLookups();
  }

  private cargarLookups(): void {
    this.proyectosService.obtenerLookups().subscribe({
      next: (lookups: ProyectoLookups) => {
        this.clientes = lookups.clientes;
        this.lideres = lookups.lideres;
        this.empleadosDisponibles = lookups.empleados;
        this.todosLosCargos = lookups.cargos;
        this.cargosDisponibles = lookups.cargos;
        this.departamentos = lookups.departamentos;
        this.estados = lookups.estados;
        this.tipos = lookups.tipos;

        if (this.proyecto) {
          this.aplicarProyectoAlFormulario(this.proyecto);
        }
      },
      error: (error) => {
        console.error('Error al cargar los lookups:', error);
      }
    });
  }

  private aplicarProyectoAlFormulario(proyecto: Proyecto): void {
    this.formulario.patchValue({
      ...proyecto,
      presupuesto: this.valorFormularioNumerico(proyecto.presupuesto),
      horas: this.valorFormularioNumerico(proyecto.horas),
      costoHoraLider: this.valorFormularioNumerico(proyecto.costoHoraLider),
      horasLider: this.valorFormularioNumerico(proyecto.horasLider)
    });
    this.reemplazarRecursos(proyecto.recursos ?? []);

    this.intentoGuardar = false;
    this.formulario.markAsPristine();
    this.formulario.markAsUntouched();
    this.recursos.controls.forEach(recurso => {
      recurso.markAsPristine();
      recurso.markAsUntouched();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyecto']) {
      if (this.proyecto) {
        if (this.lideres.length > 0) {
          this.aplicarProyectoAlFormulario(this.proyecto);
        }
      } else {
        this.formulario.reset();
        this.reemplazarRecursos([]);
        this.intentoGuardar = false;
        this.formulario.markAsPristine();
        this.formulario.markAsUntouched();
      }
    }
  }

  onDepartamentoChange(index: number, idDepartamento: number): void {
    this.cargosFiltrados[index] = this.todosLosCargos
      .filter(c => c.idDepartamento === idDepartamento);
    this.recursos.at(index).get('rol')?.setValue('');
  }

  onEmpleadoChange(index: number, nombreEmpleado: string): void {
    const empleado = this.empleadosDisponibles.find(e => e.nombre === nombreEmpleado);
    this.recursos.at(index).get('idEmpleado')?.setValue(empleado?.id ?? null);
  }

  getCargosParaRecurso(index: number): CargoLookup[] {
    return this.cargosFiltrados[index] ?? this.todosLosCargos;
  }

  get recursos(): FormArray<FormGroup> {
    return this.formulario.controls.recursos as FormArray<FormGroup>;
  }

  crearRecurso(): FormGroup {
    return this.fb.group({
      idEmpleado: [null],
      tipo: ['Interno', Validators.required],
      nombre: ['', Validators.required],
      departamento: [''],
      rol: ['', Validators.required],
      entrada: ['', [Validators.required, this.fechaValida()]],
      salida: ['', [Validators.required, this.fechaValida()]],
      costoHora: ['', [Validators.required, this.numeroValido(true)]],
      horas: ['', [Validators.required, this.numeroValido(false), Validators.min(0)]]
    }, { validators: this.rangoFechasValido('entrada', 'salida', 'salidaMenor') });
  }

  agregarRecurso(): void {
    this.recursos.push(this.crearRecurso());
    this.cargosFiltrados.push([...this.todosLosCargos]);
    this.actualizarNumeroRecursos();
  }

  eliminarRecurso(index: number): void {
    if (this.recursos.length === 1) {
      this.recursos.at(0).reset({
        idEmpleado: null,
        tipo: 'Interno',
        nombre: '',
        departamento: '',
        rol: '',
        entrada: '',
        salida: '',
        costoHora: '',
        horas: ''
      });
    } else {
      this.recursos.removeAt(index);
      this.cargosFiltrados.splice(index, 1);
    }

    this.actualizarNumeroRecursos();
  }

  private reemplazarRecursos(recursos: Proyecto['recursos']): void {
    this.recursos.clear();
    this.cargosFiltrados = [];

    if (!recursos?.length) {
      this.recursos.push(this.crearRecurso());
      this.cargosFiltrados.push([...this.todosLosCargos]);
      return;
    }

    recursos.forEach(recurso => {
      const grupo = this.crearRecurso();

      // Inferir departamento desde el cargo guardado
      const cargoEncontrado = this.todosLosCargos.find(c => c.nombre === recurso.rol);
      const idDepartamento = cargoEncontrado?.idDepartamento ?? null;

      grupo.patchValue({
        ...recurso,
        idEmpleado: recurso.idEmpleado ?? null,
        departamento: idDepartamento,
        costoHora: this.valorFormularioNumerico(recurso.costoHora),
        horas: this.valorFormularioNumerico(recurso.horas)
      });
      this.recursos.push(grupo);

      if (idDepartamento) {
        this.cargosFiltrados.push(
          this.todosLosCargos.filter(c => c.idDepartamento === idDepartamento)
        );
      } else {
        this.cargosFiltrados.push([...this.todosLosCargos]);
      }
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
      idEmpleado: recurso.idEmpleado ?? null,
      entrada: this.normalizarFecha(recurso.entrada),
      salida: this.normalizarFecha(recurso.salida),
      costoHora: this.normalizarNumero(recurso.costoHora),
      horas: this.normalizarNumero(recurso.horas)
    }));

    const proyecto = {
      ...valor,
      id: this.proyecto?.id ?? 0,
      fechaInicio: this.normalizarFecha(valor.fechaInicio),
      fechaFin: this.normalizarFecha(valor.fechaFin),
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
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'Home', 'End'
    ];

    if (teclasPermitidas.includes(event.key) || event.ctrlKey || event.metaKey) return;

    const esNumero = /^[0-9]$/.test(event.key);
    const esDecimal = permiteDecimal && event.key === '.' &&
      !(event.target as HTMLInputElement).value.includes('.');

    if (!esNumero && !esDecimal) event.preventDefault();
  }

  bloquearPegadoNoNumerico(event: ClipboardEvent, permiteDecimal: boolean): void {
    const texto = event.clipboardData?.getData('text') ?? '';
    const patron = permiteDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/;
    if (!patron.test(texto)) event.preventDefault();
  }

  // Formatea entrada de fecha en tiempo real como dd/mm/yyyy
  private formatFechaInputRaw(valor: string): string {
    const digitos = String(valor || '').replace(/\D/g, '').slice(0, 8);
    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
    return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
  }

  onFechaInput(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    const cursorPos = input.selectionStart ?? input.value.length;
    const beforeValue = input.value;
    const formatted = this.formatFechaInputRaw(beforeValue);

    if (formatted !== beforeValue) {
      input.value = formatted;
    }

    const control = this.formulario.get(controlName);
    if (control) {
      control.setValue(formatted, { emitEvent: false, onlySelf: true });
    }

    requestAnimationFrame(() => {
      try {
        const nextPosition = Math.min(formatted.length, cursorPos);
        input.setSelectionRange(nextPosition, nextPosition);
      } catch {}
    });
  }

  onFechaInputRecurso(event: Event, index: number, field: string): void {
    const input = event.target as HTMLInputElement;
    const cursorPos = input.selectionStart ?? input.value.length;
    const beforeValue = input.value;
    const formatted = this.formatFechaInputRaw(beforeValue);

    if (formatted !== beforeValue) {
      input.value = formatted;
    }

    const control = this.recursos.at(index).get(field);
    if (control) {
      control.setValue(formatted, { emitEvent: false, onlySelf: true });
    }

    requestAnimationFrame(() => {
      try {
        const nextPosition = Math.min(formatted.length, cursorPos);
        input.setSelectionRange(nextPosition, nextPosition);
      } catch {}
    });
  }

  private fechaValida(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!valor) return null;
      if (valor instanceof Date && !isNaN(valor.getTime())) return null;
      const fecha = this.parseFechaString(String(valor));
      return fecha && !isNaN(fecha.getTime()) ? null : { fechaInvalida: true };
    };
  }

  private parseFechaString(valor: string): Date | null {
    const normalizado = valor.trim();
    if (!normalizado) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizado)) {
      return new Date(normalizado);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalizado)) {
      const [dia, mes, anio] = normalizado.split('/').map(Number);
      return new Date(anio, mes - 1, dia);
    }

    const fecha = new Date(normalizado);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  private numeroValido(permiteDecimal: boolean): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (valor === null || valor === undefined || valor === '') return null;

      const texto = String(valor);
      const patron = permiteDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/;

      if (!patron.test(texto)) return { soloNumeros: true };
      return Number(texto) >= 0 ? null : { min: true };
    };
  }

  private rangoFechasValido(
    inicioControl: string,
    finControl: string,
    errorKey: string
  ): ValidatorFn {
    return (grupo: AbstractControl): ValidationErrors | null => {
      const inicioValor = grupo.get(inicioControl)?.value;
      const finValor = grupo.get(finControl)?.value;
      if (!inicioValor || !finValor) return null;

      const inicio = this.parseFechaString(String(inicioValor));
      const fin = this.parseFechaString(String(finValor));
      if (!inicio || !fin) return null;

      return fin < inicio ? { [errorKey]: true } : null;
    };
  }

  private normalizarNumero(valor: unknown): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  private valorFormularioNumerico(valor: number | undefined): string {
    return valor === undefined || valor === null ? '' : String(valor);
  }

  private normalizarFecha(valor: unknown): string | null {
    if (!valor) return null;

    if (valor instanceof Date) {
      const y = valor.getFullYear();
      const m = String(valor.getMonth() + 1).padStart(2, '0');
      const d = String(valor.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const str = String(valor);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [dia, mes, anio] = str.split('/').map(Number);
      return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    if (str.includes('T')) return str.split('T')[0];
    const fecha = this.parseFechaString(str);
    return fecha ? this.normalizarFecha(fecha) : str;
  }
}