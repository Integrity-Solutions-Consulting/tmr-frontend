import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Rol, RolCreate } from '../models/roles-feriados.models';

import { environment } from '../../../../environments/environment';

interface RolBackendPayload {
  nombre: string;
  descripcion: string;
  modulosids: number[];
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private base = `${environment.apiUrl}/configuracion/roles`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.base);
  }

  getRole(id: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.base}/${id}`);
  }

  createRole(payload: RolCreate): Observable<Rol> {
    return this.http.post<Rol>(this.base, this.toBackendPayload(payload));
  }

  updateRole(id: number, payload: RolCreate & { activo?: boolean }): Observable<Rol> {
    return this.http.put<Rol>(`${this.base}/${id}`, this.toBackendPayload(payload));
  }

  toggleRole(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, { activo });
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  private toBackendPayload(payload: RolCreate): RolBackendPayload {
    return {
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      modulosids: payload.modulos.map((modulo) => Number(modulo)).filter((id) => Number.isFinite(id) && id > 0),
    };
  }
}