import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ColaboradorUsuarioOption, Usuario } from '../models/configuracion.models';
import { environment } from '../../../../environments/environment';

export interface CrearUsuarioRequest {
  idPersona: number | null;
  email: string;
  password: string;
  rolesids: number[];
  debeCambiarPassword?: boolean;
}

export interface CrearUsuarioResponse {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data?: {
    id?: number;
    idusuario?: number;
    idpersona?: number | null;
    email?: string;
    fechaCreacion?: string;
  };
  id?: number;
  idusuario?: number;
  idpersona?: number | null;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/configuracion/usuarios`;
  private readonly COLABORADORES_API = `${environment.apiUrl}/colaboradores`;

  listarUsuarios(): Observable<Usuario[] | { data?: Usuario[] }> {
    return this.http.get<Usuario[] | { data?: Usuario[] }>(this.API);
  }

  crearUsuario(payload: CrearUsuarioRequest): Observable<HttpResponse<CrearUsuarioResponse>> {
    return this.http.post<CrearUsuarioResponse>(this.API, payload, { observe: 'response' });
  }

  listarColaboradores(): Observable<ColaboradorUsuarioOption[]> {
    return this.http.get<ColaboradorUsuarioOption[]>(this.COLABORADORES_API);
  }

  obtenerColaboradorDetalle(id: number): Observable<ColaboradorUsuarioOption> {
    return this.http.get<ColaboradorUsuarioOption>(`${this.COLABORADORES_API}/${id}`);
  }
}
