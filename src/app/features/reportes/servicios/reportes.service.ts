import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReporteFechas, FiltrosReporteFechas } from '../modelos/reporte-fechas.model';
import { ReporteHoras, FiltrosReporteHoras } from '../modelos/reporte-horas.model';
import { environment } from '../../../../environments/environment';

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
  private apiUrl = `${environment.apiUrl}/reportes`;

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
          fechaFin: item.fechaFin ? new Date(item.fechaFin) : new Date(),
          fechaFinReal: item.fechaFinReal ? new Date(item.fechaFinReal) : undefined,
          fechaInicioEspera: item.fechaInicioEspera ? new Date(item.fechaInicioEspera) : undefined,
          fechaFinEspera: item.fechaFinEspera ? new Date(item.fechaFinEspera) : undefined
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

  // ==========================================================
  // MÉTODOS PARA EL MOTOR DE PLANTILLAS
  // ==========================================================

  generarDocumento(payload: { templateName: string, format: string, data: any }): Observable<{ jobId: string }> {
    return this.http.post<{ jobId: string }>(`${this.apiUrl}/documentos/generar`, payload);
  }

  consultarEstadoDocumento(jobId: string): Observable<{ status: string, resultUrl?: string, error?: string }> {
    return this.http.get<{ status: string, resultUrl?: string, error?: string }>(`${this.apiUrl}/documentos/estado/${jobId}`);
  }

  descargarDocumento(filename: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documentos/descargar/${filename}`, {
      responseType: 'blob'
    });
  }
}
