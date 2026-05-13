import { Injectable, signal } from '@angular/core';
import { Colaborador } from '../models/colaborador.model';
import { SeguimientoFiltros, MetricasSeguimiento } from '../models/seguimiento.model';

@Injectable({
  providedIn: 'root'
})
export class SeguimientoService {
  private _colaboradores = signal<Colaborador[]>([
    {
      id: '1',
      nombre: 'Daniel Francisco Caisaguano Sanchez',
      proyecto: 'Middleware Fábrica de software',
      cliente: 'BANCO DEL PACÍFICO',
      liderTecnico: 'Elba Basurto',
      nroHoras: 96.00,
      estado: 'En progreso',
      diasConReporte: 12,
      diasACompletar: 8
    },
    {
      id: '2',
      nombre: 'Dylan Alejandro Beltran Tovar',
      proyecto: 'Accesos Fábrica de software',
      cliente: 'BANCO DEL PACÍFICO',
      liderTecnico: 'DIANA CHECA',
      nroHoras: 152.00,
      estado: 'En progreso',
      diasConReporte: 19,
      diasACompletar: 1
    },
    {
      id: '3',
      nombre: 'Michelle Allison Vargas Orozco',
      proyecto: 'Proyecto Omnicanalidad, QUICK WINS DESARROLLO',
      cliente: 'BANCO BOLIVARIANO, BANCO DEL PACÍFICO',
      liderTecnico: 'Johanna Guano, Karla Garcia',
      nroHoras: 160.00,
      estado: 'Completo',
      diasConReporte: 19,
      diasACompletar: 1
    },
    {
      id: '4',
      nombre: 'Akira Mahilyn Aguirre Lugo',
      proyecto: 'Accesos Fábrica de software',
      cliente: 'BANCO DEL PACÍFICO',
      liderTecnico: 'DIANA CHECA',
      nroHoras: 160.00,
      estado: 'Completo',
      diasConReporte: 20,
      diasACompletar: 0
    },
    {
      id: '5',
      nombre: 'Angel Enrique Vivanco García',
      proyecto: 'DESARROLLO DE APLICACIONES DE PLATAFORMA NAOS, Proyecto automatización Time Report, Proyecto bolsa de empleo',
      cliente: 'BANCO DEL PACÍFICO, INTEGRITY SOLUTIONS',
      liderTecnico: 'Johanna Guano, JOSE ALCIVAR, Luis Fernando Sanchez Cordova',
      nroHoras: 160.00,
      estado: 'Completo',
      diasConReporte: 20,
      diasACompletar: 0
    },
    {
      id: '6',
      nombre: 'Bryan Estiven Silva Mercado',
      proyecto: 'Arquitectura Fábrica de software',
      cliente: 'BANCO DEL PACÍFICO',
      liderTecnico: 'EDUARDO PEREZ',
      nroHoras: 160.00,
      estado: 'Completo',
      diasConReporte: 20,
      diasACompletar: 0
    },
    {
      id: '7',
      nombre: 'Carlos Eduardo Solorzano Zavala',
      proyecto: 'Middleware Fábrica de software',
      cliente: 'BANCO DEL PACÍFICO',
      liderTecnico: 'Elba Basurto',
      nroHoras: 160.00,
      estado: 'Completo',
      diasConReporte: 20,
      diasACompletar: 0
    },
    {
      id: '8',
      nombre: 'Edwin Saul Falcones Franco',
      proyecto: 'DESARROLLO DE APLICACIONES DE PLATAFORMA NAOS',
      cliente: 'BANCO DEL PACÍFICO',
      liderTecnico: 'JOSE ALCIVAR',
      nroHoras: 160.00,
      estado: 'Completo',
      diasConReporte: 20,
      diasACompletar: 0
    }
  ]);

  public colaboradores = this._colaboradores.asReadonly();

  getMetricas(): MetricasSeguimiento {
    return {
      horasPendientes: 96.50,
      horasRegistradas: 1473.50,
      promedioPorDia: 73.68,
      colaboradoresActivos: 10,
      proyectosUnicos: 8
    };
  }

  aprobarColaboradores(ids: string[]): void {
    this._colaboradores.update(prev => 
      prev.map(c => ids.includes(c.id) ? { ...c, estado: 'Completo' } : c)
    );
  }
}
