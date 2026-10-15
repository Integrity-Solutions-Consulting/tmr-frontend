import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ConsultaProveedores,
  DetalleProveedor,
  ProveedorPayload,
  ProveedoresPaginados,
  ResumenProveedores,
  TipoProveedor,
} from './proveedor.model';

/**
 * Único punto de acceso a la API de proveedores. El interceptor de sesión
 * añade credenciales y JWT solamente a URLs internas de la API.
 */
@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/proveedores`;
  private tiposCache$?: Observable<TipoProveedor[]>;

  listar(consulta: ConsultaProveedores): Observable<ProveedoresPaginados> {
    return this.http.get<ProveedoresPaginados>(this.apiUrl, {
      params: this.construirParametros(consulta),
    });
  }

  obtenerTipos(): Observable<TipoProveedor[]> {
    if (!this.tiposCache$) {
      this.tiposCache$ = this.http.get<TipoProveedor[]>(`${this.apiUrl}/tipos`).pipe(
        catchError((error: unknown) => {
          this.tiposCache$ = undefined;
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.tiposCache$;
  }

  obtenerResumen(): Observable<ResumenProveedores> {
    return this.http.get<ResumenProveedores>(`${this.apiUrl}/resumen`);
  }

  obtenerDetalle(id: number): Observable<DetalleProveedor> {
    return this.http.get<DetalleProveedor>(`${this.apiUrl}/${id}`);
  }

  crear(payload: ProveedorPayload): Observable<unknown> {
    return this.http.post(this.apiUrl, payload);
  }

  actualizar(id: number, payload: ProveedorPayload): Observable<unknown> {
    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  desactivar(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  private construirParametros(consulta: ConsultaProveedores): HttpParams {
    const orden =
      consulta.ordenarPor === 'tipoProveedor'
        ? 'tipo'
        : consulta.ordenarPor === 'activo'
          ? 'estado'
          : consulta.ordenarPor;
    let params = new HttpParams()
      .set('pagina', consulta.pagina)
      .set('tamanoPagina', consulta.tamanoPagina)
      .set('ordenarPor', orden)
      .set('ascendente', consulta.ascendente);

    const busqueda = consulta.busqueda.trim();
    if (busqueda) params = params.set('busqueda', busqueda);
    if (consulta.tipoProveedorId) {
      params = params.set('tipoProveedorId', consulta.tipoProveedorId);
    }
    if (consulta.estado.length === 1) params = params.set('activo', consulta.estado[0]);
    return params;
  }
}
