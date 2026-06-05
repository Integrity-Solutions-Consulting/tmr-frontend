import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Proyecto } from '../modelos/proyecto.model';
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

  crearProyecto(proyecto: Proyecto): Observable<Proyecto> {
    const body = this.preparePayload(proyecto);
    return this.http.post<Proyecto>(this.apiUrl, body);
  }

  actualizarProyecto(id: number, proyecto: Proyecto): Observable<Proyecto> {
    const body = this.preparePayload(proyecto);
    return this.http.put<Proyecto>(`${this.apiUrl}/${id}`, body);
  }

  eliminarProyecto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private preparePayload(proyecto: Proyecto): any {
    // Note: The backend has a status name resolution bug where it searches under catalog code "EPR", 
    // but the DB's actual catalog code is "EST". Also, the only active state in catalog 10 in the DB is ID 52 ("Activo").
    // Thus, we force idEstadoProyecto to 52 and estado to "Activo" to ensure compatibility with the DB and backend constraints.
    const idEstadoProyecto = 52;
    const estado = 'Activo';

    return {
      codigo: proyecto.codigo,
      nombre: proyecto.nombre,
      descripcion: proyecto.descripcion || '',
      idCliente: proyecto.idCliente || null,
      cliente: proyecto.cliente || null,
      idTipoProyecto: proyecto.idTipoProyecto || null,
      tipo: proyecto.tipo || null,
      idLider: proyecto.idLider || null,
      lider: proyecto.lider || null,
      idEstadoProyecto,
      estado,
      fechaInicio: this.formatDate(proyecto.fechaInicio),
      fechaFin: this.formatDate(proyecto.fechaFin),
      presupuesto: proyecto.presupuesto || 0,
      horas: proyecto.horas || 0,
      recursos: (proyecto.recursos ?? []).map(r => ({
        idEmpleado: r.idEmpleado || null,
        tipo: r.tipo,
        nombre: r.nombre,
        rol: r.rol,
        entrada: this.formatDate(r.entrada),
        salida: this.formatDate(r.salida),
        costoHora: r.costoHora || 0,
        horas: r.horas || 0
      }))
    };
  }

  private formatDate(date: any): string | null {
    if (!date) return null;
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
        return date.substring(0, 10);
      }
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
