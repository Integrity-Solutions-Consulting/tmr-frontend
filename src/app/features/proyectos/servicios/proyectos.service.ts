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

    return this.http.post(this.apiUrl, payload);
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

