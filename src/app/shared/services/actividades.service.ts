import { Injectable, computed, signal } from '@angular/core';
import { Actividad } from '../models/actividad.model';

const HOY = new Date();
const MES = HOY.getMonth();
const ANIO = HOY.getFullYear();

@Injectable({ providedIn: 'root' })
export class ActividadesService {
  private _actividades = signal<Actividad[]>([
    {
      id: '1',
      tipoActividad: 'Desarrollo',
      proyectoId: 'p1',
      proyectoNombre: 'Proyecto bolsa de empleo',
      codigoRequerimiento: 'ISC_FS_BOLSA_EMPLEO',
      descripcion: 'Desarrollo de componentes UI',
      fechaActividad: new Date(ANIO, MES, 6),
      numeroHoras: 2.5,
      esRecurrente: false
    },
    {
      id: '2',
      tipoActividad: 'Reunión',
      proyectoId: 'p2',
      proyectoNombre: 'Middleware Fábrica de software',
      codigoRequerimiento: 'MID_FAB_001',
      descripcion: 'Reunión de planning sprint',
      fechaActividad: new Date(ANIO, MES, 12),
      numeroHoras: 1.5,
      esRecurrente: false
    },
    {
      id: '3',
      tipoActividad: 'Desarrollo',
      proyectoId: 'p3',
      proyectoNombre: 'Accesos Fábrica de software',
      codigoRequerimiento: 'ACC_FAB_002',
      descripcion: 'Implementación módulo accesos',
      fechaActividad: new Date(ANIO, MES, 19),
      numeroHoras: 8,
      esRecurrente: false
    },
    {
      id: '4',
      tipoActividad: 'Testing',
      proyectoId: 'p1',
      proyectoNombre: 'Proyecto bolsa de empleo',
      codigoRequerimiento: 'ISC_FS_TEST_01',
      descripcion: 'Pruebas de integración',
      fechaActividad: new Date(ANIO, MES, 22),
      numeroHoras: 4,
      esRecurrente: false
    }
  ]);

  public readonly actividades = this._actividades.asReadonly();

  // === Computed signals ===
  public readonly horasRegistradasHoy = computed(() => {
    const hoy = new Date();
    return this._actividades()
      .filter(a => this.mismaFecha(a.fechaActividad, hoy))
      .reduce((acc, curr) => acc + curr.numeroHoras, 0);
  });

  public readonly horasMesActual = computed(() => {
    const hoy = new Date();
    return this._actividades()
      .filter(a =>
        a.fechaActividad.getMonth() === hoy.getMonth() &&
        a.fechaActividad.getFullYear() === hoy.getFullYear()
      )
      .reduce((acc, curr) => acc + curr.numeroHoras, 0);
  });

  public readonly horasSemanaActual = computed(() => {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    inicioSemana.setHours(0, 0, 0, 0);
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);
    return this._actividades()
      .filter(a => a.fechaActividad >= inicioSemana && a.fechaActividad <= finSemana)
      .reduce((acc, curr) => acc + curr.numeroHoras, 0);
  });

  public readonly horasPorRegistrar = computed(() => {
    const objetivo = 8;
    return Math.max(0, objetivo - this.horasRegistradasHoy());
  });

  // === Methods ===
  getActividadesPorFecha(fecha: Date): Actividad[] {
    return this._actividades().filter(a => this.mismaFecha(a.fechaActividad, fecha));
  }

  agregarActividad(data: any): void {
    const nuevas: Actividad[] = [];

    if (data.esRecurrente && data.fechaInicio && data.fechaFin) {
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      const cur = new Date(inicio);
      while (cur <= fin) {
        const esFDS = cur.getDay() === 0 || cur.getDay() === 6;
        if (!esFDS || data.incluirFinesDeSemana) {
          nuevas.push({
            id: Math.random().toString(36).substr(2, 9),
            tipoActividad: data.tipoActividad,
            proyectoId: data.proyectoId,
            proyectoNombre: this.nombreProyecto(data.proyectoId),
            codigoRequerimiento: data.codigoRequerimiento,
            descripcion: data.descripcion,
            fechaActividad: new Date(cur),
            numeroHoras: data.horasPorDia || data.numeroHoras,
            esRecurrente: true
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      nuevas.push({
        id: Math.random().toString(36).substr(2, 9),
        tipoActividad: data.tipoActividad,
        proyectoId: data.proyectoId,
        proyectoNombre: this.nombreProyecto(data.proyectoId),
        codigoRequerimiento: data.codigoRequerimiento,
        descripcion: data.descripcion,
        fechaActividad: new Date(data.fechaActividad),
        numeroHoras: data.numeroHoras,
        esRecurrente: false
      });
    }

    this._actividades.update(prev => [...prev, ...nuevas]);
  }

  private nombreProyecto(id: string): string {
    const map: Record<string, string> = {
      p1: 'Proyecto bolsa de empleo',
      p2: 'Middleware Fábrica de software',
      p3: 'Accesos Fábrica de software',
      p4: 'Arquitectura Fábrica de software',
      p5: 'DESARROLLO DE APLICACIONES NAOS'
    };
    return map[id] || id;
  }

  private mismaFecha(a: Date, b: Date): boolean {
    return (
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
    );
  }
}
