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
    return this.http.post(this.apiUrl, proyecto);
  }

  actualizarProyecto(id: number, proyecto: Proyecto): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, proyecto);
  }

  obtenerProyecto(id: number): Observable<Proyecto> {
    return this.http.get<Proyecto>(`${this.apiUrl}/${id}`);
  }
}

