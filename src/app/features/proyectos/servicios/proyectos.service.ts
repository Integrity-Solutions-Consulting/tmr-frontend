import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Proyecto, ProyectoLookups, LookupOption } from '../modelos/proyecto.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProyectosService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/proyectos`;

  private construirPayload(proyecto: Proyecto, esEdicion = false): any {
    const fmt = (f: any) => esEdicion ? f : this.formatearFechaCreacion(f);

    const lideres = proyecto.lideres?.length
      ? proyecto.lideres
      : [{
          idLider: proyecto.idLider ?? null,
          lider: proyecto.lider ?? null,
          costoHoraLider: proyecto.costoHoraLider ?? null,
          horasLider: proyecto.horasLider ?? null,
          recursos: proyecto.recursos ?? []
        }];

    const payload: any = {
      Codigo: proyecto.codigo,
      Nombre: proyecto.nombre,
      Descripcion: proyecto.descripcion ?? null,
      IdCliente: proyecto.idCliente ?? null,
      Cliente: proyecto.cliente ?? null,
      IdTipoProyecto: proyecto.idTipoProyecto ?? null,
      Tipo: proyecto.tipo ?? null,
      Estado: proyecto.estado || 'Activo',
      FechaInicio: fmt(proyecto.fechaInicio),
      FechaFin: fmt(proyecto.fechaFin),
      Presupuesto: proyecto.presupuesto ?? null,
      Horas: proyecto.horas ?? null,
      Lideres: lideres.map(l => ({
        IdLider: l.idLider ?? null,
        Lider: l.lider ?? null,
        LiderCosto: l.costoHoraLider ?? null,
        LiderHoras: l.horasLider ?? null,
        Recursos: (l.recursos ?? []).map(r => ({
          IdEmpleado: r.idEmpleado ?? null,
          Tipo: r.tipo,
          Nombre: r.nombre,
          Rol: r.rol,
          Entrada: fmt(r.entrada),
          Salida: fmt(r.salida),
          CostoHora: r.costoHora,
          Horas: r.horas
        }))
      }))
    };

    if (proyecto.idEstadoProyecto) {
      payload.IdEstadoProyecto = proyecto.idEstadoProyecto;
    }

    return payload;
  }

  obtenerProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.apiUrl);
  }

  obtenerLookups(): Observable<ProyectoLookups> {
    return this.http.get<ProyectoLookups>(`${this.apiUrl}/lookups`);
  }

  obtenerClientes(): Observable<LookupOption[]> {
    return this.obtenerLookups().pipe(map(data => data.clientes));
  }

  crearProyecto(proyecto: Proyecto): Observable<any> {
    return this.http.post(this.apiUrl, this.construirPayload(proyecto));
  }

  actualizarProyecto(id: number, proyecto: Proyecto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, this.construirPayload(proyecto, true));
  }

  obtenerProyecto(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.apiUrl}/${id}`);
  }

  private formatearFechaCreacion(fecha?: string | Date | null): string | null | undefined {
    if (!fecha) return fecha;

    if (fecha instanceof Date) {
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      return `${dia}-${mes}-${fecha.getFullYear()}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      const [anio, mes, dia] = fecha.split('-');
      return `${dia}-${mes}-${anio}`;
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
      const [dia, mes, anio] = fecha.split('/');
      return `${dia.padStart(2, '0')}-${mes.padStart(2, '0')}-${anio}`;
    }

    return fecha;
  }
}