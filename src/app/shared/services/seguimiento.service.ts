import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Colaborador } from '../models/colaborador.model';
import { SeguimientoFiltros, MetricasSeguimiento } from '../models/seguimiento.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {
  private http = inject(HttpClient);
  private _colaboradores = signal<Colaborador[]>([]);
  public colaboradores = this._colaboradores.asReadonly();

  constructor() {
    this.cargarSeguimiento();
  }

  cargarSeguimiento(filtros?: SeguimientoFiltros) {
    let params = new HttpParams();
    
    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (filtros) {
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.fechaDesde) params = params.set('FechaDesde', formatDate(filtros.fechaDesde));
      if (filtros.fechaHasta) params = params.set('FechaHasta', formatDate(filtros.fechaHasta));
      if (filtros.periodo) params = params.set('Periodo', filtros.periodo);
    } else {
      // Default dates if needed by backend
      const hoy = new Date();
      const firstDay = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const lastDay = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      params = params.set('FechaDesde', formatDate(firstDay));
      params = params.set('FechaHasta', formatDate(lastDay));
      params = params.set('Periodo', 'mes-completo');
    }

    this.http.get<Colaborador[]>(`${environment.apiUrl}/time-report/seguimiento`, { params }).subscribe({
      next: (data) => {
        this._colaboradores.set(data.map(d => ({
          id: d.id,
          nombre: d.nombre,
          proyecto: d.proyecto || 'N/A',
          cliente: d.cliente || 'N/A',
          liderTecnico: d.liderTecnico || 'N/A',
          nroHoras: d.nroHoras || 0,
          estado: d.estado || 'En progreso',
          diasConReporte: d.diasConReporte || 0,
          diasACompletar: d.diasACompletar || 0
        })));
      },
      error: (err) => console.error(err)
    });
  }

  getMetricas(): MetricasSeguimiento {
    const cols = this._colaboradores();
    const horasRegistradas = cols.reduce((sum, c) => sum + (c.nroHoras || 0), 0);
    const colaboradoresActivos = cols.length;
    
    // Simplification for metrics until backend provides an endpoint
    return {
      horasPendientes: cols.reduce((sum, c) => sum + ((c.diasACompletar || 0) * 8), 0),
      horasRegistradas,
      promedioPorDia: colaboradoresActivos ? horasRegistradas / colaboradoresActivos : 0,
      colaboradoresActivos,
      proyectosUnicos: new Set(cols.map(c => c.proyecto)).size
    };
  }

  aprobarColaboradores(ids: string[]): void {
    this.http.post(`${environment.apiUrl}/time-report/seguimiento/aprobar`, { ids }).subscribe({
      next: () => {
        this._colaboradores.update(prev => 
          prev.map(c => ids.includes(c.id) ? { ...c, estado: 'Completo' } : c)
        );
      },
      error: (err) => console.error(err)
    });
  }
}
