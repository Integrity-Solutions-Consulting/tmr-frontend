import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Colaborador } from '../models/colaborador.model';
import { SeguimientoFiltros, MetricasSeguimiento } from '../models/seguimiento.model';
import { environment } from '../../../environments/environment';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/time-report/seguimiento`;

  // sm - Petición de carga en curso, para cancelarla si llega un filtro nuevo antes de que responda.
  private cargaEnCurso?: Subscription;

  private _colaboradores = signal<Colaborador[]>([]);
  public colaboradores = this._colaboradores.asReadonly();

  // sm - true mientras se pide la lista: la tabla muestra "Cargando registros..." en lugar de quedar en blanco.
  private _cargando = signal(true);
  public cargando = this._cargando.asReadonly();

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

  // sm - silencioso: recarga automática (otra pestaña guardó, o se volvió a la pestaña). No muestra
  // "Cargando registros..." ni vacía la tabla: los datos se reemplazan cuando llegan.
  cargarColaboradores(filtros: SeguimientoFiltros, silencioso = false): void {
    let params = new HttpParams()
      .set('fechaDesde', filtros.fechaDesde || '')
      .set('fechaHasta', filtros.fechaHasta || '');
    // sm - La búsqueda (colaborador/proyecto) ya no se envía: se filtra en el frontend sobre los datos cargados.
    if (filtros.clienteSeleccionado) params = params.set('clienteSeleccionado', filtros.clienteSeleccionado);

    // sm - Se cancela la carga anterior si sigue en curso: así una respuesta vieja que llegue tarde
    // no pisa los datos del último filtro aplicado.
    this.cargaEnCurso?.unsubscribe();
    if (!silencioso) this._cargando.set(true);
    this.cargaEnCurso = this.http.get<Colaborador[]>(this.apiUrl, { params }).subscribe({
      next: (data) => {
        this._colaboradores.set(data || []);
        this._metricas.set(this.calcularMetricas(data || []));
        this._cargando.set(false);
      },
      error: (err) => {
        this._cargando.set(false);
        console.error('Error al cargar seguimiento', err);
      }
    });
  }
  calcularMetricas(colaboradores: Colaborador[]): MetricasSeguimiento {
    const totalRegistradas = (colaboradores || []).reduce((acc, c) => acc + Number(c.nroHoras || 0), 0);
    // sm - "Horas por registrar" la calcula el backend por colaborador (jornada 8 h, o 6 h para pasantes, solo días
    // laborables del rango sin feriados y solo los días que trabajó). Si aún no envía el campo, se respalda en
    // días a completar × 8 h para no mostrar 0.
    const totalPendientes = (colaboradores || []).reduce((acc, c) =>
      acc + (c.horasPorRegistrar != null ? Number(c.horasPorRegistrar) : Number(c.diasACompletar || 0) * 8), 0);
    const totalDiasConReporte = (colaboradores || []).reduce((acc, c) => acc + Number(c.diasConReporte || 0), 0);
    // sm - Promedio: horas registradas en días laborables ÷ días laborables del periodo (hasta hoy, sin fines de
    // semana ni feriados, y solo los días que trabajó cada colaborador). Si el backend aún no envía estos campos,
    // se respalda en horas registradas ÷ días con reporte.
    const tieneDatosPromedio = (colaboradores || []).some(c => c.diasLaborables != null);
    const totalDiasLaborables = (colaboradores || []).reduce((acc, c) => acc + Number(c.diasLaborables || 0), 0);
    const promedio = tieneDatosPromedio
      ? (totalDiasLaborables > 0 ? totalRegistradas / totalDiasLaborables : 0)
      : (totalDiasConReporte > 0 ? (totalRegistradas / totalDiasConReporte) : 0);
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
}
