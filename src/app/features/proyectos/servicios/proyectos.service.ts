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

  obtenerProyectos(): Observable<Proyecto[]> {
    return this.http.get<Proyecto[]>(this.apiUrl);
  }

  obtenerLookups(): Observable<ProyectoLookups> {
    return this.http.get<ProyectoLookups>(`${this.apiUrl}/lookups`);
  }

  obtenerClientes(): Observable<LookupOption[]> {
    return this.obtenerLookups().pipe(
      map(data => data.clientes)
    );
  }

  crearProyecto(proyecto: Proyecto): Observable<any> {
    const payload: any = {
      Codigo: proyecto.codigo,
      Nombre: proyecto.nombre,
      Descripcion: proyecto.descripcion,
      IdCliente: proyecto.idCliente,
      Cliente: proyecto.cliente,
      IdTipoProyecto: proyecto.idTipoProyecto,
      Tipo: proyecto.tipo,
      IdLider: proyecto.idLider,
      Lider: proyecto.lider,
      IdEstadoProyecto: proyecto.idEstadoProyecto ?? 0,
      Estado: proyecto.estado,
      FechaInicio: this.formatearFechaCreacion(proyecto.fechaInicio),
      FechaFin: this.formatearFechaCreacion(proyecto.fechaFin),
      Presupuesto: proyecto.presupuesto,
      Horas: proyecto.horas,
      LiderCosto: proyecto.costoHoraLider,
      LiderHoras: proyecto.horasLider,
      Recursos: (proyecto.recursos || []).map(r => ({
        IdEmpleado: r.idEmpleado ?? null,
        Tipo: r.tipo,
        Nombre: r.nombre,
        Rol: r.rol,
        Entrada: this.formatearFechaCreacion(r.entrada),
        Salida: this.formatearFechaCreacion(r.salida),
        CostoHora: r.costoHora,
        Horas: r.horas
      }))
    };

    return this.http.post(this.apiUrl, payload);
  }

  private formatearFechaCreacion(fecha?: string | Date | null): string | null | undefined {
    if (!fecha) {
      return fecha;
    }

    if (fecha instanceof Date) {
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const anio = fecha.getFullYear();
      return `${dia}-${mes}-${anio}`;
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

  actualizarProyecto(id: number, proyecto: Proyecto): Observable<any> {
    const payload: any = {
      Codigo: proyecto.codigo,
      Nombre: proyecto.nombre,
      Descripcion: proyecto.descripcion,
      IdCliente: proyecto.idCliente,
      Cliente: proyecto.cliente,
      IdTipoProyecto: proyecto.idTipoProyecto,
      Tipo: proyecto.tipo,
      IdLider: proyecto.idLider,
      Lider: proyecto.lider,
      IdEstadoProyecto: proyecto.idEstadoProyecto ?? 0,
      Estado: proyecto.estado,
      FechaInicio: proyecto.fechaInicio,
      FechaFin: proyecto.fechaFin,
      Presupuesto: proyecto.presupuesto,
      Horas: proyecto.horas,
      LiderCosto: proyecto.costoHoraLider,
      LiderHoras: proyecto.horasLider,
      Recursos: (proyecto.recursos || []).map(r => ({
        IdEmpleado: r.idEmpleado ?? null,
        Tipo: r.tipo,
        Nombre: r.nombre,
        Rol: r.rol,
        Entrada: r.entrada,
        Salida: r.salida,
        CostoHora: r.costoHora,
        Horas: r.horas
      }))
    };

    return this.http.put(`${this.apiUrl}/${id}`, payload);
  }

  obtenerProyecto(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.apiUrl}/${id}`);
  }
}

