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
  private apiUrl = `${environment.apiUrl}/time-report/seguimiento`;

  private _colaboradores = signal<Colaborador[]>([]);
  public colaboradores = this._colaboradores.asReadonly();

  private _metricas = signal<MetricasSeguimiento>({
    horasPendientes: 0,
    horasRegistradas: 0,
    promedioPorDia: 0,
    colaboradoresActivos: 0,
    proyectosUnicos: 0
  });

  getMetricas(): MetricasSeguimiento {
    return this._metricas();
  }

  cargarColaboradores(filtros: any): void {
    let params = new HttpParams()
      .set('fechaDesde', filtros.fechaDesde || '')
      .set('fechaHasta', filtros.fechaHasta || '');
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros.clienteSeleccionado) params = params.set('clienteSeleccionado', filtros.clienteSeleccionado);
    if (filtros.periodo) params = params.set('periodo', filtros.periodo);

    this.http.get<Colaborador[]>(this.apiUrl, { params }).subscribe({
      next: (data) => {
        this._colaboradores.set(data || []);
        this._metricas.set(this.calcularMetricas(data || []));
      },
      error: (err) => console.error('Error al cargar seguimiento', err)
    });
  }
  //SM -Extraer la lógica de cálculo de métricas a un método separado para poder reutilizarlo en otros lugares
  //SM - Arreglar el cálculo de promedio para que se calcule sobre los días con reporte
  calcularMetricas(colaboradores: Colaborador[]): MetricasSeguimiento {
    const totalRegistradas = (colaboradores || []).reduce((acc, c) => acc + Number(c.nroHoras || 0), 0);
    const totalPendientes = (colaboradores || []).reduce((acc, c) => acc + Number(c.diasACompletar || 0) * 8, 0);
    const totalDiasConReporte = (colaboradores || []).reduce((acc, c) => acc + Number(c.diasConReporte || 0), 0);
    const promedio = totalDiasConReporte > 0 ? (totalRegistradas / totalDiasConReporte) : 0;
    //Se actualizo calculo de promedio, para que para que el promedio sea calculado sobre los días con reporte, no sobre todos los colaboradores
    //por lo cual se agrego una nueva variable totalDiasConReporte que suma los días con reporte de todos los colaboradores
    const activos = (colaboradores || []).filter(c => Number(c.nroHoras || 0) > 0).length;

    const proyectosSet = new Set<string>();
    (colaboradores || []).forEach(c => {
      if (c.proyecto) c.proyecto.split(',').forEach(p => proyectosSet.add(p.trim()));
    });

    return {
      horasPendientes: totalPendientes,
      horasRegistradas: totalRegistradas,
      promedioPorDia: promedio,
      colaboradoresActivos: activos,
      proyectosUnicos: proyectosSet.size
    };
  }

  aprobarColaboradores(ids: (number | string)[]): void {
    const idsNum = ids.map(id => Number(id));
    this.http.post(`${this.apiUrl}/aprobar`, { ids: idsNum }).subscribe({
      next: () => {
        this._colaboradores.update(prev =>
          prev.map(c => idsNum.includes(Number(c.id)) ? { ...c, estado: 'Completo' } : c)
        );
      },
      error: (err) => console.error('Error al aprobar', err)
    });
  }
}
