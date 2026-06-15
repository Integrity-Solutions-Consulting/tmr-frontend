import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Colaborador,
  ColaboradoresPaginados,
  ColaboradorListaApi,
  FiltrosColaborador,
} from '../models/colaborador.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ColaboradoresService {

  // HttpClient para llamar al backend.
  private http = inject(HttpClient);

  // URL base del módulo colaboradores en el backend.
  private readonly apiUrl = `${environment.apiUrl}/colaboradores`;

  // Guardamos la última lista cargada para las métricas reactivas.
  private _colaboradores = signal<Colaborador[]>([]);

  // Configuración para enviar cookies al backend.
  private readonly httpOptions = {
    withCredentials: true
  };

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
      asignados: this.asignados,
      inactivos: this.inactivos,
      activos: this.activos,
    };
  }

  getMetricasGenerales(): Observable<void> {
    return this.http.get<ColaboradorListaApi[]>(
      this.apiUrl,
      this.httpOptions
    ).pipe(
      map(respuesta => {
        const todos = respuesta.map(api => this.mapApiAColaborador(api));
        this._colaboradores.set(this.ordenarActivosPrimero(todos));
      })
    );
  }

  // =========================================================================
  // LISTAR — llama al backend real
  // =========================================================================
  getColaboradores(
    filtros: FiltrosColaborador,
    pagina: number,
    porPagina: number
  ): Observable<ColaboradoresPaginados> {

    const params: string[] = [];

    if (filtros.busqueda?.trim()) {
      params.push(`busqueda=${encodeURIComponent(filtros.busqueda.trim())}`);
    }

    if (filtros.estado === 'Activo') {
      params.push('activo=true');
    } else if (filtros.estado === 'Inactivo') {
      params.push('activo=false');
    }

    if (filtros.asignacion === 'noAsignado') {
      params.push('asignacion=0');
    } else if (filtros.asignacion === 'asignado') {
      params.push('asignacion=1');
    }

    const queryString = params.length ? `?${params.join('&')}` : '';

    return this.http.get<ColaboradorListaApi[]>(
      `${this.apiUrl}${queryString}`,
      this.httpOptions
    ).pipe(
      map(respuesta => {
        const todos = this.ordenarActivosPrimero(
          respuesta.map(api => this.mapApiAColaborador(api))
        );

        const total = todos.length;
        const totalPaginas = Math.ceil(total / porPagina) || 1;
        const inicio = (pagina - 1) * porPagina;
        const paginaData = todos.slice(inicio, inicio + porPagina);

        return {
          data: paginaData,
          total,
          pagina,
          porPagina,
          totalPaginas
        };
      })
    );
  }

  // ── Convierte el item del backend al modelo del frontend ──
  private ordenarActivosPrimero(colaboradores: Colaborador[]): Colaborador[] {
    return [...colaboradores].sort((a, b) => {
      if (a.estado === b.estado) return 0;
      return a.estado === 'Activo' ? -1 : 1;
    });
  }

  private mapApiAColaborador(api: ColaboradorListaApi): Colaborador {
    return {
      id: api.id.toString(),
      identificacion: api.numeroIdentificacion,
      tipoIdentificacion: api.asociacion as any,
      nombreCompleto: api.nombreCompleto,
      departamento: '',
      fechaContratacion: '',
      cargo: api.cargo,
      aniosExperiencia: 0,
      modalidad: '' as any,
      categoria: '' as any,
      correoElectronico: api.email,
      fechaNacimiento: '',
      telefono: '',
      genero: '' as any,
      direccion: '',
      estado: api.activo ? 'Activo' : 'Inactivo',
      proyectosAsignados: [],
      numProyectos: api.numProyectos,
    };
  }

  // =========================================================================
  // OBTENER uno — detalle desde backend real
  // =========================================================================
  getColaboradorById(id: string): Observable<Colaborador> {
    return this.http.get<any>(
      `${this.apiUrl}/${id}`,
      this.httpOptions
    ).pipe(
      map(api => this.mapDetalleAColaborador(api))
    );
  }

  // ── Convierte el detalle del backend al modelo del frontend ──
  private mapDetalleAColaborador(api: any): Colaborador {
    const fechaNacimiento = this.normalizarFechaInput(
      this.obtenerValor(api, 'fechaNacimiento', 'FechaNacimiento', 'fechanacimiento')
    );

    const fechaContratacion = this.normalizarFechaInput(
      this.obtenerValor(
        api,
        'fechaIngreso',
        'FechaIngreso',
        'fechaingreso',
        'fechaContratacion',
        'FechaContratacion',
        'fechacontratacion'
      )
    );

    return {
      id: api.id?.toString() ?? api.Id?.toString() ?? '',
      codigoEmpleado: api.codigoEmpleado ?? api.CodigoEmpleado ?? '',

      // ── IDs necesarios para editar ─────────────────────
      idEmpresaCatalogo: api.idEmpresaCatalogo ?? api.IdEmpresaCatalogo ?? null,
      tipoPersona: api.tipoPersona ?? api.TipoPersona ?? 'NATURAL',
      idTipoIdentificacion: api.idTipoIdentificacion ?? api.IdTipoIdentificacion ?? null,
      idGenero: api.idGenero ?? api.IdGenero ?? null,
      idNacionalidad: api.idNacionalidad ?? api.IdNacionalidad ?? null,
      idTipoContrato: api.idTipoContrato ?? api.IdTipoContrato ?? null,
      idModoTrabajo: api.idModoTrabajo ?? api.IdModoTrabajo ?? null,
      idCategoriaEmpleado: api.idCategoriaEmpleado ?? api.IdCategoriaEmpleado ?? null,

      // ── Contrato / empresa ─────────────────────────────
      tipoContrato: api.tipoContrato ?? api.TipoContrato ?? '',
      tipoIdentificacion: (api.asociacion ?? api.Asociacion ?? '') as any,

      // ── Datos personales ───────────────────────────────
      identificacion: api.numeroIdentificacion ?? api.NumeroIdentificacion ?? '',
      numeroIdentificacion: api.numeroIdentificacion ?? api.NumeroIdentificacion ?? '',
      nombres: api.nombres ?? api.Nombres ?? '',
      apellidos: api.apellidos ?? api.Apellidos ?? '',
      nombreCompleto: `${api.nombres ?? api.Nombres ?? ''} ${api.apellidos ?? api.Apellidos ?? ''}`.trim(),
      fechaNacimiento,
      genero: (api.genero ?? api.Genero ?? '') as any,
      nacionalidad: api.nacionalidad ?? api.Nacionalidad ?? '',

      // ── Datos laborales ────────────────────────────────
      departamento: api.departamento ?? api.Departamento ?? '',
      fechaContratacion,
      cargo: api.cargo ?? api.Cargo ?? '',
      aniosExperiencia: api.aniosExperiencia ?? api.AniosExperiencia ?? 0,
      modalidad: (api.modalidad ?? api.Modalidad ?? '') as any,
      categoria: (api.categoria ?? api.Categoria ?? '') as any,

      // ── Contacto ───────────────────────────────────────
      correoElectronico: api.email ?? api.Email ?? '',
      telefono: api.telefono ?? api.Telefono ?? '',
      direccion: api.direccion ?? api.Direccion ?? '',

      // ── Estado / proyectos ─────────────────────────────
      estado: (api.activo ?? api.Activo) ? 'Activo' : 'Inactivo',
      proyectosAsignados: (api.proyectos ?? api.Proyectos ?? []).map((p: any) => ({
        id: p.id?.toString() ?? p.Id?.toString() ?? '',
        nombre: p.nombre ?? p.Nombre ?? '',
        cliente: p.cliente ?? p.Cliente ?? '',
        estado: (p.estado ?? p.Estado ?? '') as any,
      })),
      numProyectos: (api.proyectos ?? api.Proyectos ?? []).length,
    };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================
  private obtenerValor(obj: any, ...keys: string[]): any {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
        return obj[key];
      }
    }

    return '';
  }

  private normalizarFechaInput(fecha?: string | Date | null): string {
    if (!fecha) return '';

    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const valor = String(fecha).trim();

    // Si viene como 2026-06-14 o 2026-06-14T00:00:00
    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      return valor.substring(0, 10);
    }

    // Si viene como 14/06/2026
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      const [d, m, y] = valor.split('/');
      return `${y}-${m}-${d}`;
    }

    // Si viene como 14-06-2026
    if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
      const [d, m, y] = valor.split('-');
      return `${y}-${m}-${d}`;
    }

    return '';
  }

  // =========================================================================
  // CREAR — llama al backend con cookies
  // =========================================================================
  crearColaborador(request: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}`,
      request,
      this.httpOptions
    );
  }

  // =========================================================================
  // EDITAR — llama al backend con cookies
  // =========================================================================
  editarColaborador(id: string, request: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${id}`,
      request,
      this.httpOptions
    );
  }

  // =========================================================================
  // ELIMINAR — eliminación lógica en el backend con cookies
  // =========================================================================
  eliminarColaborador(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`,
      this.httpOptions
    );
  }
}
