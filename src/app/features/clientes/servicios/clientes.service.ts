import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Cliente, CrearClienteRequest, EditarClienteRequest,
  PaginacionResponse, FiltrosCliente,
  TipoIdentificacion, EstadoCliente, EstadoProyecto
} from '../modelos/cliente.model';

// ─────────────────────────────────────────────────────────────
//  Tipos que devuelve el BACKEND
// ─────────────────────────────────────────────────────────────
interface ClienteBackendLista {
  id: number; tipoIdentificacion: string; numeroIdentificacion: string;
  nombreComercial: string; email: string; telefono: string; activo: boolean;
}
interface ProyectoBackend { id: number; nombre: string; cliente: string; estado: string; }
interface ClienteBackendDetalle {
  id: number; tipoIdentificacion: string; numeroIdentificacion: string;
  nombreComercial: string; activo: boolean; nombres: string; apellidos: string;
  email: string; telefono: string; direccion: string; proyectos: ProyectoBackend[];
}
interface TipoIdentificacionBackend { id: number; valor: string; }

@Injectable({ providedIn: 'root' })
export class ClientesService {

  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/clientes`;

  // Cache de tipos (id ↔ valor) para traducir texto → Id.
  private tiposCache: TipoIdentificacionBackend[] = [];

  // ── Opciones de petición: cookies automáticas (token de Auth) ─
  private get options() {
    return {
      headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
      withCredentials: true, // manda las cookies automáticamente (token de Auth)
    };
  }

  private aEstado(activo: boolean): EstadoCliente {
    return activo ? 'Activo' : 'Inactivo';
  }

  private aTipoId(valor: string): TipoIdentificacion {
    const v = (valor ?? '').toLowerCase();
    if (v.includes('ruc')) return 'RUC';
    if (v.includes('céd') || v.includes('ced')) return 'Cédula';
    return 'Pasaporte';
  }

  // ── Obtener los tipos del backend (con cache) ─────────────
  private getTipos(): Observable<TipoIdentificacionBackend[]> {
    if (this.tiposCache.length) return of(this.tiposCache);
    return this.http.get<TipoIdentificacionBackend[]>(
      `${this.baseUrl}/tipos-identificacion`, this.options
    ).pipe(map(tipos => { this.tiposCache = tipos; return tipos; }));
  }

  // ── Traducir texto del front ('RUC') → Id del backend (26) ─
  private idDeTipo(tipo: TipoIdentificacion): Observable<number> {
    return this.getTipos().pipe(
      map(tipos => {
        const encontrado = tipos.find(t => this.aTipoId(t.valor) === tipo);
        return encontrado ? encontrado.id : 0;
      })
    );
  }

  // ─────────────────────────────────────────────────────────
  //  LISTAR
  // ─────────────────────────────────────────────────────────
  getClientes(
    pagina: number,
    tamanoPagina: number,
    filtros: FiltrosCliente
  ): Observable<PaginacionResponse<Cliente>> {
    let url = this.baseUrl;
    const params: string[] = [];
    if (filtros.busqueda?.trim()) params.push(`busqueda=${encodeURIComponent(filtros.busqueda.trim())}`);
    if (filtros.estado === 'Activo')   params.push('activo=true');
    if (filtros.estado === 'Inactivo') params.push('activo=false');
    if (params.length) url += '?' + params.join('&');

    return this.http.get<ClienteBackendLista[]>(url, this.options).pipe(
      map(lista => {
        const clientes: Cliente[] = lista.map(c => ({
          id: c.id,
          tipoId: this.aTipoId(c.tipoIdentificacion),
          identificador: c.numeroIdentificacion,
          nombreComercial: c.nombreComercial,
          correoElectronico: c.email,
          telefono: c.telefono,
          estado: this.aEstado(c.activo),
        }));
        const totalItems   = clientes.length;
        const totalPaginas = Math.ceil(totalItems / tamanoPagina) || 1;
        const inicio       = (pagina - 1) * tamanoPagina;
        const items        = clientes.slice(inicio, inicio + tamanoPagina);
        return { items, totalItems, paginaActual: pagina, tamanoPagina, totalPaginas };
      })
    );
  }

  // ─────────────────────────────────────────────────────────
  //  POR ID
  // ─────────────────────────────────────────────────────────
  getClientePorId(id: number): Observable<Cliente> {
    return this.http.get<ClienteBackendDetalle>(
      `${this.baseUrl}/${id}`, this.options
    ).pipe(
      map(c => ({
        id: c.id,
        tipoId: this.aTipoId(c.tipoIdentificacion),
        identificador: c.numeroIdentificacion,
        nombreComercial: c.nombreComercial,
        correoElectronico: c.email,
        telefono: c.telefono,
        estado: this.aEstado(c.activo),
        nombres: c.nombres,
        apellidos: c.apellidos,
        direccion: c.direccion,
        proyectosAsignados: (c.proyectos ?? []).map(p => ({
          id: p.id, nombre: p.nombre, cliente: p.cliente,
          estado: p.estado as EstadoProyecto,
        })),
      }))
    );
  }

  // ─────────────────────────────────────────────────────────
  //  CREAR
  // ─────────────────────────────────────────────────────────
  crearCliente(req: CrearClienteRequest): Observable<Cliente> {
    return this.idDeTipo(req.tipoId).pipe(
      switchMap(idTipo => {
        const body = {
          idTipoIdentificacion: idTipo,
          numeroIdentificacion: req.identificador,
          nombreComercial:      req.nombreComercial,
          nombres:              req.nombres,
          apellidos:            req.apellidos,
          email:                req.correoElectronico,
          telefono:             req.telefono,
          direccion:            req.direccion,
        };
        return this.http.post<{ id: number }>(this.baseUrl, body, this.options).pipe(
          map(resp => ({
            id:                resp.id,
            tipoId:            req.tipoId,
            identificador:     req.identificador,
            nombreComercial:   req.nombreComercial,
            correoElectronico: req.correoElectronico,
            telefono:          req.telefono,
            estado:            'Activo' as EstadoCliente,
            nombres:           req.nombres,
            apellidos:         req.apellidos,
            direccion:         req.direccion,
          }))
        );
      })
    );
  }

  // ─────────────────────────────────────────────────────────
  //  EDITAR
  // ─────────────────────────────────────────────────────────
  editarCliente(id: number, req: EditarClienteRequest): Observable<Cliente> {
    return this.idDeTipo(req.tipoId).pipe(
      switchMap(idTipo => {
        const body = {
          activo:               req.estado === 'Activo',
          idTipoIdentificacion: idTipo,
          numeroIdentificacion: req.identificador,
          nombreComercial:      req.nombreComercial,
          nombres:              req.nombres,
          apellidos:            req.apellidos,
          email:                req.correoElectronico,
          telefono:             req.telefono,
          direccion:            req.direccion,
        };
        return this.http.put(`${this.baseUrl}/${id}`, body, this.options).pipe(
          map(() => ({
            id,
            tipoId:            req.tipoId,
            identificador:     req.identificador,
            nombreComercial:   req.nombreComercial,
            correoElectronico: req.correoElectronico,
            telefono:          req.telefono,
            estado:            req.estado,
            nombres:           req.nombres,
            apellidos:         req.apellidos,
            direccion:         req.direccion,
          }))
        );
      })
    );
  }
}