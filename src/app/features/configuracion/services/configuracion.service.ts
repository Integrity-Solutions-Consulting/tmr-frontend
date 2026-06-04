import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Feriado, Rol, Usuario, EstadoUsuario, RegisterUserRequest } from '../models/configuracion.models';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private http = inject(HttpClient);

  private readonly rolesState = signal<Rol[]>([]);
  private readonly usuariosState = signal<Usuario[]>([]);
  private readonly feriadosState = signal<Feriado[]>([]);

  readonly roles = this.rolesState.asReadonly();
  readonly usuarios = this.usuariosState.asReadonly();
  readonly feriados = this.feriadosState.asReadonly();

  constructor() {
    this.loadRoles();
    this.loadUsuarios();
    this.loadFeriados();
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  loadRoles() {
    this.http.get<any[]>(`${environment.apiUrl}/configuracion/roles`).subscribe({
      next: (data) => this.rolesState.set(data.map(d => ({
        id: d.idRol || d.id, nombre: d.nombreRol || d.nombre || '', descripcion: d.descripcionRol || d.descripcion || '', modulos: d.modulos || [],
        activo: d.activo ?? true
      }))),
      error: (err) => console.error(err)
    });
  }

  upsertRol(rol: Rol): void {
    const url = `${environment.apiUrl}/configuracion/roles`;
    if (this.rolesState().some(r => r.id === rol.id)) {
      this.http.put(`${url}/${rol.id}`, rol).subscribe(() => this.loadRoles());
    } else {
      this.http.post(url, rol).subscribe(() => this.loadRoles());
    }
  }

  setRolEstado(id: number, activo: boolean): void {
    this.rolesState.update((roles) =>
      roles.map((rol) => (rol.id === id ? { ...rol, activo } : rol))
    );
  }

  deleteRol(id: number): void {
    this.http.delete(`${environment.apiUrl}/configuracion/roles/${id}`).subscribe(() => this.loadRoles());
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────

  loadUsuarios() {
    this.http.get<unknown[] | { data?: unknown[] }>(`${environment.apiUrl}/configuracion/usuarios`).subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : response.data ?? [];
        this.usuariosState.set(data.map((item) => this.mapUsuario(item)));
      },
      error: (err) => console.error(err)
    });
  }

  crearUsuarioAdministrativo(payload: RegisterUserRequest): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/configuracion/usuarios/register-user`, payload);
  }

  upsertUsuario(usuario: Usuario): void {
    const url = `${environment.apiUrl}/configuracion/usuarios`;
    if (this.usuariosState().some(u => u.id === usuario.id)) {
      this.http.put(`${url}/${usuario.id}`, usuario).subscribe(() => this.loadUsuarios());
    } else {
      this.http.post(url, usuario).subscribe(() => this.loadUsuarios());
    }
  }

  /** Método auxiliar para actualizar el estado local sin llamar al backend. */
  setUsuarios(usuarios: Usuario[]): void {
    this.usuariosState.set(usuarios);
  }

  /** Cambia el estado de un usuario localmente. Conectar a PATCH /api/usuarios/{id} cuando el backend lo soporte. */
  setUsuarioEstado(id: number, estado: EstadoUsuario): void {
    this.usuariosState.update((usuarios) =>
      usuarios.map((u) => (u.id === id ? { ...u, estado } : u))
    );
  }

  deleteUsuario(id: number): void {
    this.http.delete(`${environment.apiUrl}/configuracion/usuarios/${id}`).subscribe(() => this.loadUsuarios());
  }

  getUsuarioById(id: number): Usuario | undefined {
    return this.usuariosState().find((u) => u.id === id);
  }

  mapUsuario(item: unknown): Usuario {
    const d = item as Record<string, any>;
    const roleIds = d['rolesids'] ?? d['rolesIds'] ?? d['roles'] ?? (d['rol'] ? [d['rol']] : []);
    const nombres = String(d['nombres'] ?? d['nombre'] ?? '').trim();
    const apellidos = String(d['apellidos'] ?? '').trim();
    const tipoIdentificacion = this.normalizeTipoIdentificacion(d['tipoIdentificacion']);
    const idTipoIdentificacion = d['idTipoIdentificacion'] ?? d['idtipoidentificacion'] ?? '';
    const idGenero = d['idGenero'] ?? d['idgenero'] ?? '';
    const idNacionalidad = d['idNacionalidad'] ?? d['idnacionalidad'] ?? '';
    const fechaNacimiento = d['fechaNacimiento'] ?? d['fechanacimiento'] ?? null;
    const email = String(d['email'] ?? d['correoContacto'] ?? '').trim();

    return {
      id: Number(d['id'] ?? d['idUsuario'] ?? d['idPersona'] ?? 0),
      estado: d['estado'] ?? (d['activo'] === false ? 'Inactivo' : 'Activo'),
      idGenero,
      idNacionalidad,
      idTipoIdentificacion,
      tipoIdentificacion,
      numeroidentificacion: String(d['numeroidentificacion'] ?? d['numeroIdentificacion'] ?? ''),
      nombres,
      apellidos,
      correoContacto: String(d['correoContacto'] ?? email),
      tipoPersona: d['tipoPersona'] ?? 'NATURAL',
      fechaNacimiento,
      usuarioCreacion: String(d['usuarioCreacion'] ?? ''),
      idUsuarioCreacion: String(d['idUsuarioCreacion'] ?? ''),
      ip: String(d['ip'] ?? ''),
      email,
      usuario: String(d['usuario'] ?? email),
      password: '',
      debeCambiarPassword: Boolean(d['debeCambiarPassword'] ?? false),
      usuarioInterno: Boolean(d['usuarioInterno'] ?? true),
      idtipoidentificacion: this.mapTipoIdentificacionToFormId(tipoIdentificacion, idTipoIdentificacion),
      idgenero: String(d['idgenero'] ?? d['idGenero'] ?? ''),
      idnacionalidad: String(d['idnacionalidad'] ?? d['idNacionalidad'] ?? ''),
      fechanacimiento: fechaNacimiento,
      telefono: d['telefono'] ? String(d['telefono']) : null,
      direccion: d['direccion'] ? String(d['direccion']) : null,
      rolesids: Array.isArray(roleIds) ? roleIds.map((roleId) => String(roleId)) : [],
    };
  }

  private normalizeTipoIdentificacion(value: unknown): 'C' | 'R' | 'P' | 'O' {
    const tipo = String(value ?? 'C').toUpperCase();
    return tipo === 'R' || tipo === 'P' || tipo === 'O' ? tipo : 'C';
  }

  private mapTipoIdentificacionToFormId(tipo: string, fallback: unknown): string {
    const map: Record<string, string> = {
      C: 'cedula',
      R: 'ruc',
      P: 'pasaporte',
      O: 'otro-documento',
    };

    return map[tipo] ?? String(fallback ?? '');
  }

  // ── Feriados ───────────────────────────────────────────────────────────────

  loadFeriados() {
    this.http.get<any[]>(`${environment.apiUrl}/configuracion/dias-festivos`).subscribe({
      next: (data) => this.feriadosState.set(data.map(d => ({
        id: d.idDiaFestivo || d.id, nombre: d.motivo || d.nombre || '', tipo: d.tipo || 'Nacional', fecha: d.fecha || new Date().toISOString(),
        recurrente: d.recurrente ?? false, activo: d.activo ?? true
      }))),
      error: (err) => console.error(err)
    });
  }

  upsertFeriado(feriado: Feriado): void {
    const url = `${environment.apiUrl}/configuracion/dias-festivos`;
    if (this.feriadosState().some(f => f.id === feriado.id)) {
      this.http.put(`${url}/${feriado.id}`, feriado).subscribe(() => this.loadFeriados());
    } else {
      this.http.post(url, feriado).subscribe(() => this.loadFeriados());
    }
  }

  setFeriadoEstado(id: number, activo: boolean): void {
    this.feriadosState.update((feriados) =>
      feriados.map((f) => (f.id === id ? { ...f, activo } : f))
    );
  }

  deleteFeriado(id: number): void {
    this.http.delete(`${environment.apiUrl}/configuracion/dias-festivos/${id}`).subscribe(() => this.loadFeriados());
  }

  // ── Shared ─────────────────────────────────────────────────────────────────

  nextId(items: { id: number }[]): number {
    return items.length > 0 ? Math.max(0, ...items.map((item) => item.id)) + 1 : 1;
  }
}
