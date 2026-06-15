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
    estados: [],
    tipos: []
  });

  columnas: string[] = [
    'codigo',
    'nombre',
    'cliente',
    'fechas',
    'lideres',
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

      // Si no hay estados seleccionados → pasa todos
      const coincideEstado =
        !filtros.estados.length ||
        filtros.estados.includes(proyecto.estado ?? '');

      // Si no hay tipos seleccionados → pasa todos
      const coincideTipo =
        !filtros.tipos.length ||
        filtros.tipos.includes(proyecto.tipo ?? '');

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
    if (!this.totalRegistros) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get registroHasta(): number {
    return Math.min((this.pageIndex + 1) * this.pageSize, this.totalRegistros);
  }

  formatearFecha(fecha?: string | Date | number): string {
    if (fecha == null || fecha === '') return '-';

    if (typeof fecha === 'string') {
      const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

      const dmy = fecha.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;

      const parsed = new Date(fecha);
      if (!isNaN(parsed.getTime())) {
        const dd = String(parsed.getDate()).padStart(2, '0');
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}/${parsed.getFullYear()}`;
      }
      return fecha;
    }

    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}`;
    }
    return String(fecha);
  }

  obtenerLideres(proyecto: Proyecto): { nombre: string; detalle: string }[] {
    if (proyecto.lideres?.length) {
      return proyecto.lideres.map((lider) => ({
        nombre: lider.lider || '-',
        detalle: `${lider.recursos?.length ?? 0} recurso${(lider.recursos?.length ?? 0) === 1 ? '' : 's'}`
      }));
    }

    return proyecto.lider
      ? [{
          nombre: proyecto.lider,
          detalle: `${proyecto.recursos?.length ?? 0} recurso${(proyecto.recursos?.length ?? 0) === 1 ? '' : 's'}`
        }]
      : [];
  }

  obtenerAcciones(proyecto: Proyecto): ActionMenuItem[] {
    return [
      { id: 'ver-mas', label: 'Ver más', action: () => this.verMas.emit(proyecto) },
      { id: 'editar', label: 'Editar', action: () => this.editar.emit(proyecto) },
      { id: 'eliminar', label: 'Eliminar', danger: true, action: () => this.eliminar.emit(proyecto.codigo) }
    ];
  }

  alternarMenu(payload: { id: string; event: Event }): void {
    this.menuAbierto = this.menuAbierto === payload.id ? null : payload.id;
  }

  cerrarMenu(): void {
    this.menuAbierto = null;
  }
}