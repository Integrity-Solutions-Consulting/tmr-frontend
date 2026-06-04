import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Usuario } from '../models/configuracion.models';

export interface CrearUsuarioRequest {
  numeroidentificacion: string;
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
  idtipoidentificacion: number;
  idgenero: number;
  idnacionalidad: number;
  fechanacimiento: string;
  telefono?: string | null;
  direccion?: string | null;
  rolesids: number[];
}

export interface CrearUsuarioResponse {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: {
    id?: number;
    email?: string;
    fechaCreacion?: string;
  };
  id?: number;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly API = 'http://localhost:5091/api/configuracion/usuarios';

  listarUsuarios(): Observable<Usuario[] | { data?: Usuario[] }> {
    return this.http.get<Usuario[] | { data?: Usuario[] }>(this.API);
  }

  crearUsuario(payload: CrearUsuarioRequest): Observable<HttpResponse<CrearUsuarioResponse>> {
    return this.http.post<CrearUsuarioResponse>(this.API, payload, { observe: 'response' });
  }
}
