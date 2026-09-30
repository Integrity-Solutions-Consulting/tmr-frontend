import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DashboardEjecutivo,
  DashboardFiltros,
  DashboardFiltrosOpciones,
  DashboardHistorico,
} from '../modelos/dashboard-ejecutivo.model';

// sm - Servicio del Dashboard ejecutivo (endpoints /api/dashboard/ejecutivo).
@Injectable({
  providedIn: 'root',
})
export class DashboardEjecutivoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getFiltros(): Observable<DashboardFiltrosOpciones> {
    return this.http.get<DashboardFiltrosOpciones>(`${this.apiUrl}/ejecutivo/filtros`);
  }

  getDashboard(filtros: DashboardFiltros): Observable<DashboardEjecutivo> {
    const params = this.paramsFiltros(filtros).set('horizonte', filtros.horizonte);
    return this.http.get<DashboardEjecutivo>(`${this.apiUrl}/ejecutivo`, { params });
  }

  getHistorico(filtros: DashboardFiltros, meses: number, umbralRecurrencia: number): Observable<DashboardHistorico> {
    const params = this.paramsFiltros(filtros).set('meses', meses).set('umbralRecurrencia', umbralRecurrencia);
    return this.http.get<DashboardHistorico>(`${this.apiUrl}/ejecutivo/historico`, { params });
  }

  private paramsFiltros(filtros: DashboardFiltros): HttpParams {
    let params = new HttpParams().set('anio', filtros.anio).set('mes', filtros.mes);
    if (filtros.idCliente) params = params.set('idCliente', filtros.idCliente);
    if (filtros.idProyecto) params = params.set('idProyecto', filtros.idProyecto);
    if (filtros.idEstado) params = params.set('idEstado', filtros.idEstado);
    if (filtros.idEmpleado) params = params.set('idEmpleado', filtros.idEmpleado);
    return params;
  }
}
