import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DashboardData, DashboardMetricas, ProyectoResumen, HorasPorProyecto } from '../modelos/dashboard.model';
import { PROYECTOS_MOCK } from '../../proyectos/mocks/proyectos.mock';
import { COLABORADORES_MOCK } from '../../colaboradores/mock/colaboradores.mock';

// Mock data de clientes (extraído del servicio de clientes)
const CLIENTES_MOCK = [
  { nombreComercial: 'Banco Guayaquil', estado: 'Activo' },
  { nombreComercial: 'Banco Pichincha', estado: 'Activo' },
  { nombreComercial: 'Banco Bolivariano', estado: 'Activo' },
  { nombreComercial: 'Produbanco', estado: 'Activo' },
  { nombreComercial: 'Banco del Austro', estado: 'Activo' },
  { nombreComercial: 'Banco Internacional', estado: 'Activo' },
  { nombreComercial: 'Banco Solidario', estado: 'Activo' },
  { nombreComercial: 'Banco ProCredit', estado: 'Inactivo' },
  { nombreComercial: 'Citibank Ecuador', estado: 'Activo' },
  { nombreComercial: 'BanEcuador', estado: 'Activo' },
];

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor() { }

  /**
   * Obtiene los datos completos del dashboard
   */
  getDashboardData(): Observable<DashboardData> {
    const metricas = this.calcularMetricas();
    const proximosACerrar = this.obtenerProximosACerrar();
    const horasPorProyecto = this.calcularHorasPorProyecto();

    const dashboardData: DashboardData = {
      metricas,
      proximosACerrar,
      horasPorProyecto
    };

    return of(dashboardData);
  }

  /**
   * Calcula las métricas del dashboard
   */
  private calcularMetricas(): DashboardMetricas {
    const totalProyectos = PROYECTOS_MOCK.length;
    const horasReportadas = PROYECTOS_MOCK.reduce((sum, p) => sum + (p.horas || 0), 0);
    const colaboradoresActivos = COLABORADORES_MOCK.filter(c => c.estado === 'Activo').length;
    const clientesActivos = CLIENTES_MOCK.filter(c => c.estado === 'Activo').length;

    return {
      totalProyectos,
      horasReportadas,
      colaboradoresActivos,
      clientesActivos
    };
  }

  /**
   * Obtiene los proyectos próximos a cerrar (estado 'En progreso')
   */
  private obtenerProximosACerrar(): ProyectoResumen[] {
    return PROYECTOS_MOCK
      .filter(p => p.estado === 'En progreso')
      .slice(0, 3)
      .map(p => ({
        codigo: p.codigo,
        nombre: p.nombre,
        cliente: p.cliente || '',
        estado: p.estado,
        horas: p.horas || 0,
        presupuesto: p.presupuesto || 0
      }));
  }

  /**
   * Calcula las horas reportadas por proyecto
   */
  private calcularHorasPorProyecto(): HorasPorProyecto[] {
    return PROYECTOS_MOCK.map(p => ({
      proyecto: p.nombre,
      horas: p.horas || 0,
      codigo: p.codigo
    }));
  }
}
