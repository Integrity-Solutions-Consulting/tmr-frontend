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

  // =========================================================================
  // LISTAR — llama al backend real
  // =========================================================================
  getColaboradores(
    filtros: FiltrosColaborador,
    pagina: number,
    porPagina: number
  ): Observable<ColaboradoresPaginados> {

    // Armamos los query params según los filtros.
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

    // Llamada GET al backend con cookies.
    return this.http.get<ColaboradorListaApi[]>(
      `${this.apiUrl}${queryString}`,
      this.httpOptions
    ).pipe(
      map(respuesta => {
        // Convertimos cada item al modelo que usa el frontend.
        const todos = respuesta.map(api => this.mapApiAColaborador(api));

        // Guardamos para las métricas.
        this._colaboradores.set(todos);

        // Paginamos en el frontend.
        const total = todos.length;
        const totalPaginas = Math.ceil(total / porPagina);
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
    return {
      id: api.id?.toString() ?? '',
      codigoEmpleado: api.codigoEmpleado ?? '',
      tipoContrato: api.tipoContrato ?? '',
      identificacion: api.numeroIdentificacion ?? '',
      tipoIdentificacion: api.asociacion as any,
      nombreCompleto: `${api.nombres ?? ''} ${api.apellidos ?? ''}`.trim(),
      departamento: api.departamento ?? '',
      fechaContratacion: api.fechaIngreso ?? '',
      cargo: api.cargo ?? '',
      aniosExperiencia: api.aniosExperiencia ?? 0,
      modalidad: api.modalidad as any,
      categoria: api.categoria as any,
      correoElectronico: api.email ?? '',
      fechaNacimiento: api.fechaNacimiento ?? '',
      telefono: api.telefono ?? '',
      genero: api.genero as any,
      direccion: api.direccion ?? '',
      estado: api.activo ? 'Activo' : 'Inactivo',
      proyectosAsignados: (api.proyectos ?? []).map((p: any) => ({
        id: p.id?.toString() ?? '',
        nombre: p.nombre ?? '',
        cliente: p.cliente ?? '',
        estado: p.estado as any,
      })),
      numProyectos: (api.proyectos ?? []).length,
    };
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
