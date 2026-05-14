import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';

import { BadgeEstado } from '../badge-estado/badge-estado';
import {
  ActionMenuComponent,
  ActionMenuItem
} from '../action-menu/action-menu.component';
import { Proyecto } from '../../../features/proyectos/modelos/proyecto.model';
import { FiltrosProyecto } from '../../../features/proyectos/componentes/proyectos-filtros/proyectos-filtros';
import { selectProyectos } from '../../../features/proyectos/store/proyectos.selectors';

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatPaginatorModule,
    BadgeEstado,
    ActionMenuComponent
  ],
  templateUrl: './tabla.html',
  styleUrl: './tabla.scss'
})
export class Tabla implements AfterViewInit {
  @Input()
  set filtros(value: FiltrosProyecto) {
    this._filtros.set(value);
  }

  @Output() editar = new EventEmitter<Proyecto>();
  @Output() eliminar = new EventEmitter<string>();
  @Output() verMas = new EventEmitter<Proyecto>();

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;

  private store = inject(Store);

  private proyectosSignal = toSignal(
    this.store.select(selectProyectos),
    { initialValue: [] }
  );

  private _filtros = signal<FiltrosProyecto>({
    busqueda: '',
    estado: '',
    tipo: ''
  });

  columnas: string[] = [
    'codigo',
    'nombre',
    'fechas',
    'lider',
    'numeroRecursos',
    'estado',
    'acciones'
  ];

  dataSource = new MatTableDataSource<Proyecto>([]);
  pageIndex = 0;
  pageSize = 5;
  menuAbierto: string | null = null;

  proyectosFiltrados = computed(() => {
    const proyectos = this.proyectosSignal();
    const filtros = this._filtros();

    return proyectos.filter(proyecto => {
      const busqueda = filtros.busqueda.toLowerCase();

      const coincideBusqueda =
        proyecto.codigo.toLowerCase().includes(busqueda) ||
        proyecto.nombre.toLowerCase().includes(busqueda) ||
        (proyecto.cliente ?? '').toLowerCase().includes(busqueda);

      const coincideEstado =
        !filtros.estado ||
        proyecto.estado === filtros.estado;

      const coincideTipo =
        !filtros.tipo ||
        proyecto.tipo === filtros.tipo;

      return coincideBusqueda && coincideEstado && coincideTipo;
    });
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.proyectosFiltrados();

      if (this.dataSource.paginator) {
        this.pageIndex = 0;
        this.dataSource.paginator.firstPage();
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  get totalRegistros(): number {
    return this.dataSource.filteredData.length || this.dataSource.data.length;
  }

  get registroDesde(): number {
    if (!this.totalRegistros) {
      return 0;
    }

    return this.pageIndex * this.pageSize + 1;
  }

  get registroHasta(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalRegistros);
  }

  formatearFecha(fecha?: string): string {
    if (!fecha) {
      return '-';
    }

    const partes = fecha.split('-');

    if (partes.length !== 3) {
      return fecha;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  obtenerAcciones(proyecto: Proyecto): ActionMenuItem[] {
    return [
      {
        id: 'ver-mas',
        label: 'Ver más',
        action: () => this.verMas.emit(proyecto)
      },
      {
        id: 'editar',
        label: 'Editar',
        action: () => this.editar.emit(proyecto)
      },
      {
        id: 'eliminar',
        label: 'Eliminar',
        danger: true,
        action: () => this.eliminar.emit(proyecto.codigo)
      }
    ];
  }

  alternarMenu(payload: { id: string; event: Event }): void {
    this.menuAbierto = this.menuAbierto === payload.id ? null : payload.id;
  }

  cerrarMenu(): void {
    this.menuAbierto = null;
  }
}
