import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// Importa los módulos de Angular Material que usas
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-proyecto-form', // selector para usar en HTML
  templateUrl: './proyecto-form.html', // apunta al archivo correcto
  styleUrls: ['./proyecto-form.scss'],
  standalone: true, // ⬅️ MUY IMPORTANTE: así se puede importar directamente en otros standalone
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    // Añade aquí cualquier otro módulo que uses en el template
  ]
})
export class ProyectoFormComponent implements OnInit, OnDestroy { // ⬅️ Exporta con este nombre

  // ============================================================
  // PROPIEDADES
  // ============================================================
  formulario!: FormGroup;
  tipos: any[] = [];
  seguimientoOpciones: any[] = [];
  departamentos: any[] = [];
  clientes: any[] = [];
  empleados: any[] = [];
  proyecto: any = null;
  guardando = false;
  intentoGuardar = false;
  mostrarCamposEspera = false;
  private destroy$ = new Subject<void>();

  // ============================================================
  // CONSTRUCTOR
  // ============================================================
  constructor(private fb: FormBuilder) { }

  // ============================================================
  // LIFECYCLE
  // ============================================================
  ngOnInit(): void {
    this.inicializarFormulario();
    this.cargarDatosIniciales();

    // Escucha cambios en el seguimiento
    this.formulario.get('idEstadoProyecto')
      ?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((idEstado: number | null) => {
        this.actualizarCamposEspera(idEstado);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // INICIALIZACIÓN
  // ============================================================
  private inicializarFormulario(): void {
    this.formulario = this.fb.group({
      tipo: ['', Validators.required],
      codigo: ['', Validators.required],
      cliente: ['', Validators.required],
      nombre: ['', Validators.required],
      fechaInicio: [null, Validators.required],
      fechaFin: [null, Validators.required],
      presupuesto: [null],
      horas: [null],
      estado: [{ value: 'Activo', disabled: true }],
      idEstadoProyecto: [null],
      observacion: [''],
      fechaFinReal: [null],
      fechaInicioEspera: [null],
      fechaFinEspera: [null],
      lideres: this.fb.array([])
    });
  }

  private cargarDatosIniciales(): void {
    // Aquí cargas tus datos reales desde un servicio.
    // Por ahora, datos de ejemplo para que funcione:
    this.seguimientoOpciones = [
      { id: 1, nombre: 'En Espera' },
      { id: 2, nombre: 'En Progreso' },
      { id: 3, nombre: 'Finalizado' }
    ];
    // ... otros datos
  }

  // ============================================================
  // LÓGICA DE VISIBILIDAD (LA CLAVE)
  // ============================================================
  actualizarCamposEspera(idEstado: number | null): void {
    const estadoEnEspera = this.seguimientoOpciones.find(e => e.nombre === 'En Espera');
    if (!estadoEnEspera) {
      this.mostrarCamposEspera = false;
      return;
    }
    this.mostrarCamposEspera = (idEstado === estadoEnEspera.id);
  }

  cargarProyecto(proyecto: any): void {
    this.proyecto = proyecto;
    this.formulario.patchValue(proyecto);
    const idActual = proyecto.idEstadoProyecto;
    this.actualizarCamposEspera(idActual);
    // Cargar líderes y recursos...
  }

  // ============================================================
  // GETTERS
  // ============================================================
  get lideres(): FormArray {
    return this.formulario.get('lideres') as FormArray;
  }

  getRecursosDelLider(indexLider: number): FormArray {
    return this.lideres.at(indexLider).get('recursos') as FormArray;
  }

  // ============================================================
  // VALIDACIONES (solo ejemplos)
  // ============================================================
  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!control && control.invalid && (control.touched || this.intentoGuardar);
  }

  fechaFinInvalida(): boolean { return false; }
  recursoFechaSalidaInvalida(li: number, ri: number): boolean { return false; }
  liderCampoInvalido(index: number, campo: string): boolean { return false; }
  recursoLiderCampoInvalido(li: number, ri: number, campo: string): boolean { return false; }

  // ============================================================
  // AUTCOMPLETE Y FILTROS (ejemplos)
  // ============================================================
  getClientesFiltrados(): any[] { return this.clientes; }
  getLideresFiltrados(index: number): any[] { return this.empleados; }
  getRecursosFiltrados(li: number, ri: number): any[] { return this.empleados; }
  getCargosParaRecurso(li: number, ri: number): any[] { return [{ nombre: 'Developer' }]; }
  getRecursoPanelTitle(li: number, ri: number): string { return 'Recurso'; }
  isRecursoPanelExpanded(li: number, ri: number): boolean { return false; }
  setRecursoPanelExpanded(li: number, ri: number, expanded: boolean): void { }

  // ============================================================
  // EVENTOS
  // ============================================================
  onClienteInput(): void { }
  onClienteFocus(event: any): void { }
  onClienteChange(value: any): void { }
  onLiderInput(index: number): void { }
  onLiderFocus(index: number, event: any): void { }
  onLiderChange(index: number, value: any): void { }
  onRecursoInput(li: number, ri: number): void { }
  onRecursoFocus(li: number, ri: number, event: any): void { }
  onEmpleadoChange(li: number, ri: number, value: any): void { }
  onDepartamentoChange(li: number, ri: number, value: any): void { }
  bloquearCaracteresNumericos(event: any, permitirDecimal: boolean): void { }
  bloquearPegadoNoNumerico(event: any, permitirDecimal: boolean): void { }

  // ============================================================
  // LÍDERES Y RECURSOS
  // ============================================================
  agregarLider(): void {
    const liderGroup = this.fb.group({
      lider: ['', Validators.required],
      costoHoraLider: [null],
      horasLider: [null],
      recursos: this.fb.array([])
    });
    this.lideres.push(liderGroup);
  }

  eliminarLider(index: number): void {
    this.lideres.removeAt(index);
  }

  agregarRecursoALider(indexLider: number): void {
    const recursos = this.getRecursosDelLider(indexLider);
    const recursoGroup = this.fb.group({
      nombre: ['', Validators.required],
      departamento: [null],
      rol: ['', Validators.required],
      entrada: [null],
      salida: [null],
      costoHora: [null],
      horas: [null]
    });
    recursos.push(recursoGroup);
  }

  eliminarRecursoDelLider(li: number, ri: number): void {
    this.getRecursosDelLider(li).removeAt(ri);
  }

  // ============================================================
  // GUARDAR
  // ============================================================
  guardar(): void {
    this.intentoGuardar = true;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.guardando = true;
    console.log('Datos a guardar:', this.formulario.value);
    setTimeout(() => {
      this.guardando = false;
    }, 1500);
  }
}