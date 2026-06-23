import {
  Component,
  EventEmitter,
  Input,
  Output,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';

import { BadgeEstado } from '../badge-estado/badge-estado';
import { PaginacionComponent } from '../paginacion/paginacion.component';
import {
  ActionMenuComponent,
  ActionMenuItem
} from '../action-menu/action-menu.component';
import { Proyecto, LookupOption } from '../../../features/proyectos/modelos/proyecto.model';
import { ProyectosService } from '../../../features/proyectos/servicios/proyectos.service';
import { FiltrosProyecto } from '../../../features/proyectos/componentes/proyectos-filtros/proyectos-filtros';
import { selectProyectos } from '../../../features/proyectos/store/proyectos.selectors';

@Component({
  selector: 'app-tabla',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    PaginacionComponent,
    ActionMenuComponent
  ],
  templateUrl: './tabla.html',
  styleUrl: './tabla.scss'
})
export class Tabla {
  @Input()
  set filtros(value: FiltrosProyecto) {
    this._filtros.set(value);
  }

  @Output() editar = new EventEmitter<Proyecto>();
  @Output() inactivar = new EventEmitter<Proyecto>();
  @Output() verMas = new EventEmitter<Proyecto>();

  private store = inject(Store);
  private proyectosService = inject(ProyectosService);
  seguimientoOpciones: LookupOption[] = [];

  private proyectosSignal = toSignal(
    this.store.select(selectProyectos),
    { initialValue: [] }
  );

  private _filtros = signal<FiltrosProyecto>({
    busqueda: '',
    estados: [],
    seguimiento: [],
    tipos: []
  });

  columnas: string[] = [
    'codigo',
    'nombre',
    'cliente',
    'seguimiento',
    'fechas',
    'lideres',
    'numeroRecursos',
    'acciones'
  ];

  paginaActual = signal(1);
  porPagina = 10;
  dataSource = new MatTableDataSource<Proyecto>([]);
  menuAbierto: string | null = null;

  proyectosFiltrados = computed(() => {
    const proyectos = this.proyectosSignal();
    const filtros = this._filtros();

    return proyectos
      .filter(proyecto => {
        const busqueda = filtros.busqueda.toLowerCase();

        const coincideBusqueda =
          proyecto.codigo.toLowerCase().includes(busqueda) ||
          proyecto.nombre.toLowerCase().includes(busqueda) ||
          (proyecto.cliente ?? '').toLowerCase().includes(busqueda);

        const coincideEstado =
          !filtros.estados.length ||
          filtros.estados.includes(this.normalizarEstadoProyecto(proyecto));

        const coincideTipo =
          !filtros.tipos.length ||
          filtros.tipos.includes(proyecto.tipo ?? '');

        const coincideSeguimiento =
          !(filtros.seguimiento && filtros.seguimiento.length) ||
          (filtros.seguimiento ?? []).includes(proyecto.idEstadoProyecto ?? -1);

        return coincideBusqueda && coincideEstado && coincideTipo && coincideSeguimiento;
      })
      .sort((a, b) => {
        const aActivo = this.normalizarEstadoProyecto(a) === 'Activo';
        const bActivo = this.normalizarEstadoProyecto(b) === 'Activo';
        if (aActivo === bActivo) return 0;
        return aActivo ? -1 : 1;
      });
  });

  filtrosAplicados = signal<string>('');

  totalPaginas = computed(() => {
    const total = this.proyectosFiltrados().length;
    return Math.ceil(total / this.porPagina) || 1;
  });

  proyectosEnPagina = computed(() => {
    const proyectos = this.proyectosFiltrados();
    const inicio = (this.paginaActual() - 1) * this.porPagina;
    return proyectos.slice(inicio, inicio + this.porPagina);
  });

  constructor() {
    this.cargarSeguimientoOpciones();

    effect(() => {
      const filtros = this._filtros();
      const filtroKey = JSON.stringify(filtros);
      const filtroAntKey = this.filtrosAplicados();
      
      if (filtroAntKey && filtroKey !== filtroAntKey) {
        this.paginaActual.set(1);
      }
      this.filtrosAplicados.set(filtroKey);
    });

    effect(() => {
      this.dataSource.data = this.proyectosEnPagina();
    });
  }

  private cargarSeguimientoOpciones(): void {
    this.proyectosService.obtenerLookups().subscribe({
      next: (lookups) => {
        this.seguimientoOpciones = lookups.estados;
      },
      error: (error) => console.error('Error al cargar seguimiento:', error)
    });
  }

  private normalizarEstadoProyecto(proyecto: Proyecto): string {
    if (typeof proyecto.activo === 'boolean') {
      return proyecto.activo ? 'Activo' : 'Inactivo';
    }

    const estado = (proyecto.estado ?? '').trim().toLowerCase();

    if (estado === 'activo') {
      return 'Activo';
    }

    if (estado === 'inactivo') {
      return 'Inactivo';
    }

    return proyecto.estado ?? '';
  }

  obtenerSeguimiento(proyecto: Proyecto): string {
    const estadoProyecto = this.normalizarEstadoProyecto(proyecto);
    if (estadoProyecto === 'Inactivo') {
      return 'Inhabilitado';
    }

    if (!proyecto.idEstadoProyecto) {
      return 'Sin seguimiento';
    }
    return this.seguimientoOpciones.find(o => o.id === proyecto.idEstadoProyecto)?.nombre ?? 'Sin seguimiento';
  }

  obtenerSeguimientoClase(proyecto: Proyecto): string {
    if (this.normalizarEstadoProyecto(proyecto) === 'Inactivo') {
      return 'seguimiento-inactivo';
    }

    const seguimiento = this.obtenerSeguimiento(proyecto).toLowerCase();
    if (seguimiento.includes('complet')) return 'seguimiento-completado';
    if (seguimiento.includes('cancel')) return 'seguimiento-cancelado';
    if (seguimiento.includes('espera')) return 'seguimiento-espera';
    if (seguimiento.includes('progreso')) return 'seguimiento-progreso';
    if (seguimiento.includes('activo')) return 'seguimiento-activo';
    if (seguimiento.includes('aprob')) return 'seguimiento-aprobado';
    if (seguimiento.includes('plan') || seguimiento.includes('planificación')) return 'seguimiento-planificacion';
    if (seguimiento.includes('desarrollo')) return 'seguimiento-desarrollo';
    if (seguimiento.includes('aplaz') || seguimiento.includes('delay')) return 'seguimiento-aplazado';
    if (seguimiento.includes('sin seguimiento')) return 'seguimiento-inactivo';
    return 'seguimiento-inactivo';
  }

  ngAfterViewInit(): void {
  }

  onPaginaCambia(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.dataSource.data = this.proyectosEnPagina();
  }

  get totalRegistros(): number {
    return this.proyectosFiltrados().length;
  }

  get registroDesde(): number {
    if (!this.totalRegistros) return 0;
    return (this.paginaActual() - 1) * this.porPagina + 1;
  }

  get registroHasta(): number {
    return Math.min(this.paginaActual() * this.porPagina, this.totalRegistros);
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

  obtenerLideresVisibles(proyecto: Proyecto, maxVisible = 2): { nombre: string; detalle: string }[] {
    return this.obtenerLideres(proyecto).slice(0, maxVisible);
  }

  obtenerLideresOcultos(proyecto: Proyecto, maxVisible = 2): number {
    return Math.max(0, this.obtenerLideres(proyecto).length - maxVisible);
  }

  obtenerAcciones(proyecto: Proyecto): ActionMenuItem[] {
    const estado = this.normalizarEstadoProyecto(proyecto);
    const estaActivo = estado === 'Activo';

    return [
      { id: 'ver-mas', label: 'Ver más', action: () => this.verMas.emit(proyecto) },
      { id: 'editar', label: 'Editar', action: () => this.editar.emit(proyecto) },
      {
        id: 'inactivar',
        label: estaActivo ? 'Inactivar' : 'Activar',
        danger: estaActivo,
        action: () => this.inactivar.emit(proyecto)
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