import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Rol, RolCreate } from '../models/roles-feriados.models';

@Injectable({ providedIn: 'root' })
export class RolesService {
  private base = `/api/roles`;

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Rol[]> {
    return this.http.get<Rol[]>(this.base);
  }

  getRole(id: number): Observable<Rol> {
    return this.http.get<Rol>(`${this.base}/${id}`);
  }

  createRole(payload: RolCreate): Observable<Rol> {
    return this.http.post<Rol>(this.base, payload);
  }

  updateRole(id: number, payload: RolCreate & { activo?: boolean }): Observable<Rol> {
    return this.http.put<Rol>(`${this.base}/${id}`, payload);
  }

  toggleRole(id: number, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, { activo });
  }

  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
