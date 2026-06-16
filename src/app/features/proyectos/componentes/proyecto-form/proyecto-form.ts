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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  Proyecto,
  LiderProyecto,
  LookupOption,
  ProyectoLookups,
  CargoLookup
} from '../../modelos/proyecto.model';
import { ProyectosService } from '../../servicios/proyectos.service';

@Component({
  selector: 'app-proyecto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './proyecto-form.html',
  styleUrl: './proyecto-form.scss'
})
export class ProyectoForm implements OnInit, OnChanges {
  @Input() proyecto: Proyecto | null = null;
  @Input() guardando = false;
  @Output() guardarProyecto = new EventEmitter<Proyecto>();

  private fb = inject(FormBuilder);
  private proyectosService = inject(ProyectosService);

  intentoGuardar = false;

  clientesOpciones: LookupOption[] = [];
  lideresOpciones: LookupOption[] = [];
  estados: LookupOption[] = [];
  tipos: LookupOption[] = [];
  empleadosDisponibles: LookupOption[] = [];
  departamentos: LookupOption[] = [];
  todosLosCargos: CargoLookup[] = [];
  estadoOptions: string[] = ['Activo', 'Inactivo'];

  get seguimientoOpciones(): LookupOption[] {
    return this.estados.filter(e => e.nombre !== 'Activo');
  }

  // cargosFiltrados[liderIndex][recursoIndex]
  cargosFiltrados: CargoLookup[][][] = [];

  formulario = this.fb.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    cliente: ['', [Validators.required, this.valorDebeCoincidirConLookup(() => this.clientesOpciones)]],
    idCliente: [null as number | null],
    tipo: ['', Validators.required],
    fechaInicio: this.fb.control<string | null>('', [Validators.required, this.fechaValida()]),
    fechaFin: this.fb.control<string | null>('', [Validators.required, this.fechaValida()]),
    presupuesto: ['', [this.numeroValido(true)]],
    horas: ['', [this.numeroValido(false), Validators.min(0)]],
    numeroRecursos: [0],
    estado: ['Activo'],
    idEstadoProyecto: this.fb.control<number | null>(null),
    lideres: this.fb.array([this.crearLider()])
  }, { validators: this.rangoFechasValido('fechaInicio', 'fechaFin', 'fechaFinMenor') });

  // ── Getters ──────────────────────────────────────────────────────────────

  get lideres(): FormArray<FormGroup> {
    return this.formulario.get('lideres') as FormArray<FormGroup>;
  }

  getRecursosDelLider(li: number): FormArray<FormGroup> {
    return this.lideres.at(li).get('recursos') as FormArray<FormGroup>;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.cargarLookups();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proyecto']) {
      if (this.proyecto) {
        if (this.lideresOpciones.length > 0) {
          this.aplicarProyectoAlFormulario(this.proyecto);
        }
      } else {
        this.resetFormulario();
      }
    }
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  private cargarLookups(): void {
    this.proyectosService.obtenerLookups().subscribe({
      next: (lookups: ProyectoLookups) => {
        this.clientesOpciones = lookups.clientes;
        this.lideresOpciones = lookups.lideres;
        this.empleadosDisponibles = lookups.empleados;
        this.todosLosCargos = lookups.cargos;
        this.departamentos = lookups.departamentos;
        this.estados = lookups.estados;
        this.tipos = lookups.tipos;

        if (this.proyecto) {
          this.aplicarProyectoAlFormulario(this.proyecto);
        }

        this.revalidarSeleccionables();
      },
      error: (err) => console.error('Error al cargar lookups:', err)
    });
  }

  // ── Cargar proyecto al editar ─────────────────────────────────────────────

  private aplicarProyectoAlFormulario(proyecto: Proyecto): void {
    this.formulario.patchValue({
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      cliente: proyecto.cliente ?? '',
      idCliente: proyecto.idCliente ?? null,
      tipo: proyecto.tipo ?? '',
      fechaInicio: this.normalizarFecha(proyecto.fechaInicio),
      fechaFin: this.normalizarFecha(proyecto.fechaFin),
      presupuesto: this.valorFormularioNumerico(proyecto.presupuesto),
      horas: this.valorFormularioNumerico(proyecto.horas),
      estado: proyecto.estado || 'Activo',
      idEstadoProyecto: proyecto.idEstadoProyecto ?? null
    });

    const lideresData: LiderProyecto[] = proyecto.lideres?.length
      ? proyecto.lideres
      : proyecto.lider
        ? [{
            idLider: proyecto.idLider ?? null,
            lider: proyecto.lider,
            costoHoraLider: proyecto.costoHoraLider,
            horasLider: proyecto.horasLider,
            recursos: proyecto.recursos ?? []
          }]
        : [];

    this.lideres.clear();
    this.cargosFiltrados = [];

    if (!lideresData.length) {
      this.lideres.push(this.crearLider());
      this.cargosFiltrados.push([]);
    } else {
      lideresData.forEach((l) => {
        const liderGroup = this.crearLider();
        const idLider = l.idLider ?? this.obtenerIdLiderPorNombre(l.lider);
        liderGroup.patchValue({
          idLider,
          lider: this.obtenerNombreLiderPorId(idLider) ?? l.lider ?? '',
          costoHoraLider: this.valorFormularioNumerico(l.costoHoraLider),
          horasLider: this.valorFormularioNumerico(l.horasLider)
        });

        const recursosArr = liderGroup.get('recursos') as FormArray;
        recursosArr.clear();
        const cargosLider: CargoLookup[][] = [];

        const recursosData = l.recursos ?? [];
        if (!recursosData.length) {
          recursosArr.push(this.crearRecurso());
          cargosLider.push([]);
        } else {
          recursosData.forEach(r => {
            const rg = this.crearRecurso();
            const cargoEncontrado = this.todosLosCargos.find(c => c.nombre === r.rol);
            const idDep = cargoEncontrado?.idDepartamento ?? null;
            rg.patchValue({
              idEmpleado: r.idEmpleado ?? null,
              tipo: r.tipo,
              nombre: r.nombre,
              departamento: idDep,
              rol: r.rol,
              entrada: this.normalizarFecha(r.entrada),
              salida: this.normalizarFecha(r.salida),
              costoHora: this.valorFormularioNumerico(r.costoHora),
              horas: this.valorFormularioNumerico(r.horas)
            });
            recursosArr.push(rg);
            cargosLider.push(idDep
              ? this.todosLosCargos.filter(c => c.idDepartamento === idDep)
              : this.todosLosCargos
            );
          });
        }

        this.lideres.push(liderGroup);
        this.cargosFiltrados.push(cargosLider);
      });
    }

    this.actualizarNumeroRecursos();
    this.intentoGuardar = false;
    this.formulario.markAsPristine();
    this.formulario.markAsUntouched();
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  private resetFormulario(): void {
    this.formulario.reset({
      codigo: '', nombre: '', cliente: '', tipo: '',
      idCliente: null, fechaInicio: '', fechaFin: '', presupuesto: '', horas: '',
      numeroRecursos: 0, estado: 'Activo', idEstadoProyecto: null
    });
    this.lideres.clear();
    this.lideres.push(this.crearLider());
    this.cargosFiltrados = [[]];
    this.intentoGuardar = false;
    this.formulario.markAsPristine();
    this.formulario.markAsUntouched();
  }

  // ── Crear grupos ──────────────────────────────────────────────────────────

  crearLider(): FormGroup {
    return this.fb.group({
      idLider: [null as number | null],
      lider: ['', [Validators.required, this.valorDebeCoincidirConLookup(() => this.lideresOpciones)]],
      costoHoraLider: ['', [this.numeroValido(true)]],
      horasLider: ['', [this.numeroValido(false), Validators.min(0)]],
      recursos: this.fb.array([this.crearRecurso()])
    });
  }

  crearRecurso(): FormGroup {
    return this.fb.group({
      idEmpleado: [null],
      tipo: ['Interno', Validators.required],
      nombre: ['', [Validators.required, this.valorDebeCoincidirConLookup(() => this.empleadosDisponibles)]],
      departamento: [null],
      rol: ['', Validators.required],
      entrada: this.fb.control<string | null>('', [this.fechaValida()]),
      salida: this.fb.control<string | null>('', [this.fechaValida()]),
      costoHora: ['', [this.numeroValido(true)]],
      horas: ['', [this.numeroValido(false), Validators.min(0)]]
    }, { validators: this.rangoFechasValido('entrada', 'salida', 'salidaMenor') });
  }

  // ── Líderes: agregar / eliminar ───────────────────────────────────────────

  agregarLider(): void {
    this.lideres.push(this.crearLider());
    this.cargosFiltrados.push([]);
  }

  eliminarLider(li: number): void {
    if (this.lideres.length === 1) return;
    this.lideres.removeAt(li);
    this.cargosFiltrados.splice(li, 1);
  }

  // ── Recursos: agregar / eliminar ──────────────────────────────────────────

  agregarRecursoALider(li: number): void {
    this.getRecursosDelLider(li).push(this.crearRecurso());
    if (!this.cargosFiltrados[li]) this.cargosFiltrados[li] = [];
    this.cargosFiltrados[li].push([]);
    this.actualizarNumeroRecursos();
  }

  eliminarRecursoDelLider(li: number, ri: number): void {
    const arr = this.getRecursosDelLider(li);
    if (arr.length === 1) {
      arr.at(0).reset({
        idEmpleado: null, tipo: 'Interno', nombre: '',
        departamento: null, rol: '', entrada: '', salida: '', costoHora: '', horas: ''
      });
    } else {
      arr.removeAt(ri);
      this.cargosFiltrados[li]?.splice(ri, 1);
    }
    this.actualizarNumeroRecursos();
  }

  // ── Eventos de autocomplete ───────────────────────────────────────────────

  onClienteInput(): void {
    this.formulario.controls.idCliente.setValue(null);
  }

  onClienteFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement | null)?.select();
  }

  onClienteChange(nombreCliente: string): void {
    const encontrado = this.clientesOpciones.find(c => c.nombre === nombreCliente);
    this.formulario.controls.idCliente.setValue(encontrado?.id ?? null);
  }

  onLiderInput(li: number): void {
    this.lideres.at(li).get('idLider')?.setValue(null);
  }

  onLiderFocus(_li: number, event: FocusEvent): void {
    (event.target as HTMLInputElement | null)?.select();
  }

  onLiderChange(li: number, nombreLider: string): void {
    const found = this.lideresOpciones.find(l => l.nombre === nombreLider);
    this.lideres.at(li).get('idLider')?.setValue(found?.id ?? null);
  }

  onRecursoInput(li: number, ri: number): void {
    this.getRecursosDelLider(li).at(ri).get('idEmpleado')?.setValue(null);
  }

  onRecursoFocus(li: number, ri: number, event: FocusEvent): void {
    (event.target as HTMLInputElement | null)?.select();
  }

  onEmpleadoChange(li: number, ri: number, nombreEmpleado: string): void {
    const emp = this.empleadosDisponibles.find(e => e.nombre === nombreEmpleado);
    this.getRecursosDelLider(li).at(ri).get('idEmpleado')?.setValue(emp?.id ?? null);
  }

  onDepartamentoChange(li: number, ri: number, idDep: number): void {
    if (!this.cargosFiltrados[li]) this.cargosFiltrados[li] = [];
    this.cargosFiltrados[li][ri] = idDep
      ? this.todosLosCargos.filter(c => c.idDepartamento === idDep)
      : [];
    this.getRecursosDelLider(li).at(ri).get('rol')?.setValue('');
  }

  // ── Filtros de autocomplete ───────────────────────────────────────────────

  getClientesFiltrados(): LookupOption[] {
    const filtro = String(this.formulario.controls.cliente.value ?? '').trim().toLowerCase();
    if (!filtro) return this.clientesOpciones;
    return this.clientesOpciones.filter(c => c.nombre.toLowerCase().includes(filtro));
  }

  getLideresFiltrados(li: number): LookupOption[] {
    const filtro = String(this.lideres.at(li).get('lider')?.value ?? '').trim().toLowerCase();
    if (!filtro) return this.lideresOpciones;
    return this.lideresOpciones.filter(l => l.nombre.toLowerCase().includes(filtro));
  }

  getRecursosFiltrados(li: number, ri: number): LookupOption[] {
    const filtro = String(this.getRecursosDelLider(li).at(ri).get('nombre')?.value ?? '').trim().toLowerCase();
    if (!filtro) return this.empleadosDisponibles;
    return this.empleadosDisponibles.filter(e => e.nombre.toLowerCase().includes(filtro));
  }

  // ── Cargos ────────────────────────────────────────────────────────────────

  tieneDepartamentoSeleccionado(li: number, ri: number): boolean {
    return Boolean(this.getRecursosDelLider(li).at(ri).get('departamento')?.value);
  }

  getCargosParaRecurso(li: number, ri: number): CargoLookup[] {
    const departamento = this.getRecursosDelLider(li).at(ri).get('departamento')?.value;
    if (!departamento) {
      const rolActual = this.getRecursosDelLider(li).at(ri).get('rol')?.value;
      const cargos = [...this.todosLosCargos];
      if (rolActual && !cargos.some(c => c.nombre === rolActual)) {
        cargos.push({ id: 0, nombre: rolActual, idDepartamento: null });
      }
      return cargos;
    }
    return this.cargosFiltrados[li]?.[ri] ?? this.todosLosCargos.filter(c => c.idDepartamento === departamento);
  }

  // ── Validaciones de template ──────────────────────────────────────────────

  campoInvalido(nombre: string): boolean {
    const c = this.formulario.get(nombre);
    return Boolean(c?.invalid && (c.touched || this.intentoGuardar));
  }

  liderCampoInvalido(li: number, campo: string): boolean {
    const c = this.lideres.at(li).get(campo);
    return Boolean(c?.invalid && (c.touched || this.intentoGuardar));
  }

  recursoLiderCampoInvalido(li: number, ri: number, campo: string): boolean {
    const c = this.getRecursosDelLider(li).at(ri).get(campo);
    return Boolean(c?.invalid && (c.touched || this.intentoGuardar));
  }

  recursoFechaSalidaInvalida(li: number, ri: number): boolean {
    const g = this.getRecursosDelLider(li).at(ri);
    return Boolean(g.hasError('salidaMenor') && (g.get('salida')?.touched || this.intentoGuardar));
  }

  fechaFinInvalida(): boolean {
    return Boolean(
      this.formulario.hasError('fechaFinMenor') &&
      (this.formulario.controls.fechaFin.touched || this.intentoGuardar)
    );
  }

  // ── Guardar ───────────────────────────────────────────────────────────────

  guardar(): void {
    this.actualizarNumeroRecursos();
    this.intentoGuardar = true;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valor = this.formulario.getRawValue() as any;

    const lideresPayload: LiderProyecto[] = (valor.lideres ?? []).map((l: any) => {
      const idLider = l.idLider ?? this.obtenerIdLiderPorNombre(l.lider);

      return {
        idLider,
        lider: this.obtenerNombreLiderPorId(idLider) ?? l.lider,
        costoHoraLider: this.normalizarNumero(l.costoHoraLider),
        horasLider: this.normalizarNumero(l.horasLider),
        recursos: (l.recursos ?? []).map((r: any) => ({
          idEmpleado: r.idEmpleado ?? this.obtenerIdEmpleadoPorNombre(r.nombre),
          tipo: r.tipo,
          nombre: r.nombre,
          rol: r.rol,
          entrada: this.normalizarFecha(r.entrada),
          salida: this.normalizarFecha(r.salida),
          costoHora: this.normalizarNumero(r.costoHora),
          horas: this.normalizarNumero(r.horas)
        } as any))
      };
    });

    const primerLider = lideresPayload[0];
    const todosRecursos = lideresPayload.flatMap(l => l.recursos ?? []);

    const proyecto: Proyecto = {
      id: this.proyecto?.id ?? 0,
      codigo: this.proyecto?.codigo ?? valor.codigo,
      nombre: this.proyecto?.nombre ?? valor.nombre,
      cliente: this.proyecto?.cliente ?? valor.cliente,
      idCliente: valor.idCliente ?? this.obtenerIdClientePorNombre(valor.cliente) ?? this.proyecto?.idCliente ?? null,
      tipo: valor.tipo,
      fechaInicio: this.normalizarFecha(valor.fechaInicio),
      fechaFin: this.normalizarFecha(valor.fechaFin),
      presupuesto: this.normalizarNumeroOpcional(valor.presupuesto),
      horas: this.normalizarNumeroOpcional(valor.horas),
      estado: this.proyecto ? (valor.estado || 'Activo') : 'Activo',
      idEstadoProyecto: valor.idEstadoProyecto ?? undefined,
      idLider: primerLider?.idLider ?? null,
      lider: primerLider?.lider ?? '',
      costoHoraLider: primerLider?.costoHoraLider ?? 0,
      horasLider: primerLider?.horasLider ?? 0,
      lideres: lideresPayload,
      recursos: todosRecursos as any,
      numeroRecursos: todosRecursos.length
    };

    this.guardarProyecto.emit(proyecto);
  }

  // ── Helpers de teclado ────────────────────────────────────────────────────

  bloquearCaracteresNumericos(event: KeyboardEvent, permiteDecimal: boolean): void {
    const permitidas = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','Home','End'];
    if (permitidas.includes(event.key) || event.ctrlKey || event.metaKey) return;
    const esNum = /^[0-9]$/.test(event.key);
    const esDec = permiteDecimal && event.key === '.' && !(event.target as HTMLInputElement).value.includes('.');
    if (!esNum && !esDec) event.preventDefault();
  }

  bloquearPegadoNoNumerico(event: ClipboardEvent, permiteDecimal: boolean): void {
    const texto = event.clipboardData?.getData('text') ?? '';
    const patron = permiteDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/;
    if (!patron.test(texto)) event.preventDefault();
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private actualizarNumeroRecursos(): void {
    const total = this.lideres.controls.reduce(
      (acc, l) => acc + (l.get('recursos') as FormArray).length, 0
    );
    this.formulario.controls.numeroRecursos.setValue(total);
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

  private valorDebeCoincidirConLookup(obtenerOpciones: () => LookupOption[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = String(control.value ?? '').trim();
      if (!valor) return null;
      const opciones = obtenerOpciones();
      if (!opciones.length) return null;
      return opciones.some(opcion => opcion.nombre === valor) ? null : { opcionInvalida: true };
    };
  }

  private obtenerIdClientePorNombre(nombre?: string | null): number | null {
    return this.clientesOpciones.find(c => c.nombre === nombre)?.id ?? null;
  }

  private obtenerIdLiderPorNombre(nombre?: string | null): number | null {
    return this.lideresOpciones.find(l => l.nombre === nombre)?.id ?? null;
  }

  private obtenerNombreLiderPorId(id?: number | null): string | null {
    return this.lideresOpciones.find(l => l.id === id)?.nombre ?? null;
  }

  private obtenerIdEmpleadoPorNombre(nombre?: string | null): number | null {
    return this.empleadosDisponibles.find(e => e.nombre === nombre)?.id ?? null;
  }

  private parseFechaString(valor: string): Date | null {
    const n = valor.trim();
    if (!n) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(n)) {
      const [a, m, d] = n.split('-').map(Number);
      return this.crearFechaEstricta(a, m, d);
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(n)) {
      const [d, m, a] = n.split('/').map(Number);
      return this.crearFechaEstricta(a, m, d);
    }
    const f = new Date(n);
    return isNaN(f.getTime()) ? null : f;
  }

  private crearFechaEstricta(a: number, m: number, d: number): Date | null {
    const f = new Date(a, m - 1, d);
    return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d ? f : null;
  }

  private numeroValido(permiteDecimal: boolean): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const v = control.value;
      if (v === null || v === undefined || v === '') return null;
      const patron = permiteDecimal ? /^\d+(\.\d+)?$/ : /^\d+$/;
      if (!patron.test(String(v))) return { soloNumeros: true };
      return Number(v) >= 0 ? null : { min: true };
    };
  }

  private rangoFechasValido(ini: string, fin: string, key: string): ValidatorFn {
    return (g: AbstractControl): ValidationErrors | null => {
      const iv = g.get(ini)?.value;
      const fv = g.get(fin)?.value;
      if (!iv || !fv) return null;
      const i = this.parseFechaString(String(iv));
      const f = this.parseFechaString(String(fv));
      if (!i || !f) return null;
      return f < i ? { [key]: true } : null;
    };
  }

  private normalizarNumero(valor: unknown): number {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
  }

  private normalizarNumeroOpcional(valor: unknown): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }

  private valorFormularioNumerico(valor: number | null | undefined): string {
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
    const s = String(valor);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [dia, mes, anio] = s.split('-').map(Number);
      return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
      const [d, m, a] = s.split('/').map(Number);
      return `${a}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    if (s.includes('T')) return s.split('T')[0];
    const f = this.parseFechaString(s);
    return f ? this.normalizarFecha(f) : s;
  }

  private revalidarSeleccionables(): void {
    this.formulario.controls.cliente.updateValueAndValidity({ emitEvent: false });
    this.lideres.controls.forEach((liderGroup) => {
      liderGroup.get('lider')?.updateValueAndValidity({ emitEvent: false });
      (liderGroup.get('recursos') as FormArray<FormGroup>).controls.forEach((recursoGroup) => {
        recursoGroup.get('nombre')?.updateValueAndValidity({ emitEvent: false });
      });
    });
  }
}
