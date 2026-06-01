import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReporteFechas, FiltrosReporteFechas } from '../modelos/reporte-fechas.model';
import { ReporteHoras, FiltrosReporteHoras } from '../modelos/reporte-horas.model';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  anioMinimo?: number;
  anioMaximo?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private http = inject(HttpClient);
  // Usa el puerto 7281 (https) o 5071 (http) de acuerdo al launchSettings.json del backend. 
  // Usaremos https porque las APIs ASP.NET Core devuelven 200/OK a través del puerto seguro.
  private apiUrl = 'http://localhost:5071/api/reportes';

  getReporteFechas(filtros?: FiltrosReporteFechas, page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<ReporteFechas>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filtros) {
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
      if (filtros.cliente) params = params.set('cliente', filtros.cliente);
      if (filtros.lider) params = params.set('lider', filtros.lider);
    }

    return this.http.get<any>(`${this.apiUrl}/fechas`, { params }).pipe(
      map(res => {
        const items = (res.data || []).map((item: any) => ({
          ...item,
          fechaInicio: item.fechaInicio ? new Date(item.fechaInicio) : new Date(),
          fechaFin: item.fechaFin ? new Date(item.fechaFin) : new Date()
        }));
        return { data: items, total: res.total || 0 };
      })
    );
  }

  getReporteHoras(filtros?: FiltrosReporteHoras, page: number = 1, pageSize: number = 10): Observable<PaginatedResponse<ReporteHoras>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (filtros) {
      if (filtros.cliente) params = params.set('cliente', filtros.cliente);
      if (filtros.mes && filtros.mes !== 'ALL') {
        const meses = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const mesIndex = meses.indexOf(filtros.mes);
        if (mesIndex > 0) params = params.set('mes', mesIndex.toString());
      }
      if (filtros.anio && filtros.anio !== 'ALL') params = params.set('anio', filtros.anio);
    }
    return this.http.get<any>(`${this.apiUrl}/horas`, { params }).pipe(
      map(res => ({ 
        data: res.data || [], 
        total: res.total || 0,
        anioMinimo: res.anioMinimo,
        anioMaximo: res.anioMaximo
      }))
    );
  }
}
