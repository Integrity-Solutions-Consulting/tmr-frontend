import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import {
  Colaborador,
  ColaboradoresPaginados,
  CrearColaboradorDto,
  EditarColaboradorDto,
  FiltrosColaborador,
} from '../models/colaborador.model';
import { COLABORADORES_MOCK } from '../mock/colaboradores.mock';

@Injectable({ providedIn: 'root' })
export class ColaboradoresService {

  private _colaboradores = signal<Colaborador[]>([...COLABORADORES_MOCK]);

  // ── Métricas reactivas ───────────────────────────────────
  readonly noAsignados = computed(() =>
    this._colaboradores().filter(c => c.estado === 'Activo' && c.numProyectos === 0).length
  );

  readonly asignados = computed(() =>
    this._colaboradores().filter(c => c.estado === 'Activo' && c.numProyectos >= 1).length
  );

  readonly inactivos = computed(() =>
    this._colaboradores().filter(c => c.estado === 'Inactivo').length
  );

  readonly activos = computed(() =>
    this._colaboradores().filter(c => c.estado === 'Activo').length
  );

  getMetricas() {
    return {
      noAsignados: this.noAsignados,
      asignados:   this.asignados,
      inactivos:   this.inactivos,
      activos:     this.activos,
    };
  }

  // ── LISTAR ──────────────────────────────────────────────
  getColaboradores(
    filtros: FiltrosColaborador,
    pagina: number,
    porPagina: number
  ): Observable<ColaboradoresPaginados> {
    let data = [...this._colaboradores()];

    // Filtro búsqueda
    if (filtros.busqueda.trim()) {
      const term = filtros.busqueda.trim().toLowerCase();
      data = data.filter(c =>
        c.nombreCompleto.toLowerCase().includes(term) ||
        c.identificacion.toLowerCase().includes(term) ||
        c.correoElectronico.toLowerCase().includes(term) ||
        c.cargo.toLowerCase().includes(term)
      );
    }

    // Filtro estado
    if (filtros.estado !== 'Todos') {
      data = data.filter(c => c.estado === filtros.estado);
    }

    // Filtro asignación — solo activos
    if (filtros.asignacion === 'noAsignado') {
      data = data.filter(c => c.estado === 'Activo' && c.numProyectos === 0);
    } else if (filtros.asignacion === 'asignado') {
      data = data.filter(c => c.estado === 'Activo' && c.numProyectos >= 1);
    }

    const total        = data.length;
    const totalPaginas = Math.ceil(total / porPagina);
    const inicio       = (pagina - 1) * porPagina;
    const paginaData   = data.slice(inicio, inicio + porPagina);

    return of({ data: paginaData, total, pagina, porPagina, totalPaginas }).pipe(delay(150));
  }

  // ── OBTENER uno ─────────────────────────────────────────
  getColaboradorById(id: string): Observable<Colaborador> {
    const colaborador = this._colaboradores().find(c => c.id === id);
    if (!colaborador) return throwError(() => new Error(`ID ${id} no encontrado`));
    return of({ ...colaborador }).pipe(delay(100));
  }

  // ── CREAR ───────────────────────────────────────────────
  crearColaborador(dto: CrearColaboradorDto): Observable<Colaborador> {
    const nuevo: Colaborador = {
      ...dto,
      id: `COL-${(this._colaboradores().length + 1).toString().padStart(4, '0')}`,
      numProyectos: 0,
      proyectosAsignados: [],
    };
    this._colaboradores.update(lista => [nuevo, ...lista]);
    return of({ ...nuevo }).pipe(delay(200));
  }

  // ── EDITAR ──────────────────────────────────────────────
  editarColaborador(id: string, dto: EditarColaboradorDto): Observable<Colaborador> {
    const index = this._colaboradores().findIndex(c => c.id === id);
    if (index === -1) return throwError(() => new Error(`ID ${id} no encontrado`));

    const actualizado: Colaborador = {
      ...this._colaboradores()[index],
      ...dto,
    };

    this._colaboradores.update(lista => {
      const nueva = [...lista];
      nueva[index] = actualizado;
      return nueva;
    });

    return of({ ...actualizado }).pipe(delay(200));
  }

  // ── ELIMINAR ────────────────────────────────────────────
  eliminarColaborador(id: string): Observable<void> {
    this._colaboradores.update(lista => lista.filter(c => c.id !== id));
    return of(void 0).pipe(delay(150));
  }
}