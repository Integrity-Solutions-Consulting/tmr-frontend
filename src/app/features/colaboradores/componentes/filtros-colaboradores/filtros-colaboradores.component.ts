import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FiltrosColaborador, EstadoColaborador } from '../../models/colaborador.model';

@Component({
  selector: 'app-filtros-colaboradores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './filtros-colaboradores.component.html',
  styleUrl: './filtros-colaboradores.component.scss',
})
export class FiltrosColaboradoresComponent implements OnInit, OnDestroy {
  @Output() filtrosCambian = new EventEmitter<FiltrosColaborador>();

  form!: FormGroup;
  estadoAbierto = false;

  readonly opcionesEstado: { valor: EstadoColaborador | 'Todos'; label: string }[] = [
    { valor: 'Todos',    label: 'LimpiarFiltros'    },
    { valor: 'Activo',   label: 'Activo'   },
    { valor: 'Inactivo', label: 'Inactivo' },
  ];

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      busqueda: [''],
      estado: ['Todos'],
    });

    this.form.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(valores => {
      this.filtrosCambian.emit(valores as FiltrosColaborador);
    });
  }

  get estadoSeleccionado(): string {
    return this.form.get('estado')?.value ?? 'Todos';
  }

  toggleEstado(event?: MouseEvent): void {
    event?.stopPropagation();
    this.estadoAbierto = !this.estadoAbierto;
  }

  seleccionarEstado(valor: EstadoColaborador | 'Todos', event?: MouseEvent): void {
    event?.stopPropagation();
    const nuevoEstado = this.estadoSeleccionado === valor ? 'Todos' : valor;
    this.form.patchValue({ estado: nuevoEstado });
  }

  limpiarFiltroEstado(event?: MouseEvent): void {
    event?.stopPropagation();
    this.form.patchValue({ estado: 'Todos' });
  }

  limpiarBusqueda(valor: EstadoColaborador | 'Todos'): void {
    this.form.patchValue({ estado: valor });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
