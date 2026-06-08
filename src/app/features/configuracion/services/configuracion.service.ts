import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Feriado, Modulo, Rol, Usuario, RegisterUserRequest } from '../models/configuracion.models';
import { environment } from '../../../../environments/environment';

interface RolBackendPayload {
  nombre: string;
  descripcion: string;
  modulosids: number[];
}

interface FeriadoBackendPayload {
  nombreFeriado: string;
  fechaFeriado: string;
  tipoFeriado: string;
  esRecurrente: boolean;
  descripcion?: string;
}

export interface CatalogoResponse {
  id: number;
  codigovalor: string;
  valor: string;
}

export interface UpdateUsuarioPayload {
  nombres: string;
  apellidos: string;
  idgenero: number | null;
  idnacionalidad: number | null;
  fechanacimiento: string | null;
  telefono: string | null;
  direccion: string | null;
  rolesids: number[];
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private http = inject(HttpClient);

  private readonly rolesState = signal<Rol[]>([]);
  private readonly usuariosState = signal<Usuario[]>([]);
  private readonly feriadosState = signal<Feriado[]>([]);
  private readonly modulosState = signal<Modulo[]>([]);

  readonly roles = this.rolesState.asReadonly();
  readonly usuarios = this.usuariosState.asReadonly();
  readonly feriados = this.feriadosState.asReadonly();
  readonly modulos = this.modulosState.asReadonly();

  constructor() {
    this.loadModulos();
    this.loadRoles();
    this.loadUsuarios();
    this.loadFeriados();
  }

  loadModulos(): void {
    this.http.get<Modulo[]>(`${environment.apiUrl}/configuracion/roles/modulos`).subscribe({
      next: (data) => this.modulosState.set(data ?? []),
      error: (err) => console.error(err),
    });
  }

  loadRoles(): void {
    this.http.get<any[]>(`${environment.apiUrl}/configuracion/roles`).subscribe({
      next: (data) => this.rolesState.set((data ?? []).map((d) => ({
        id: d.idRol || d.id,
        nombre: d.nombreRol || d.nombre || '',
        descripcion: d.descripcionRol || d.descripcion || '',
        modulos: Array.isArray(d.modulos)
          ? d.modulos.map((m: any) => ({
              id: Number(m.id ?? m),
              nombre: String(m.nombre ?? m.id ?? m),
            }))
          : [],
        activo: d.activo ?? true,
      }))),
      error: (err) => console.error(err),
    });
  }

  upsertRol(rol: Rol): void {
    const url = `${environment.apiUrl}/configuracion/roles`;
    const payload = this.toRolBackendPayload(rol);

    if (this.rolesState().some((r) => r.id === rol.id)) {
      this.http.put(`${url}/${rol.id}`, payload).subscribe(() => this.loadRoles());
    } else {
      this.http.post(url, payload).subscribe(() => this.loadRoles());
    }
  }

  setRolEstado(id: number, activo: boolean): Observable<unknown> {
    return this.http
      .patch(`${environment.apiUrl}/configuracion/roles/${id}`, { activo })
      .pipe(tap(() => this.loadRoles()));
  }

  deleteRol(id: number): void {
    this.http.delete(`${environment.apiUrl}/configuracion/roles/${id}`).subscribe(() => this.loadRoles());
  }

  loadUsuarios(): void {
    this.http.get<unknown[] | { items?: unknown[]; data?: unknown[] }>(`${environment.apiUrl}/configuracion/usuarios`).subscribe({
      next: (response) => {
        const data = Array.isArray(response) ? response : response.items ?? response.data ?? [];
        this.usuariosState.set(data.map((item) => this.mapUsuario(item)));
      },
      error: (err) => console.error(err),
    });
  }

  crearUsuarioAdministrativo(payload: RegisterUserRequest): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/configuracion/usuarios/register-user`, payload);
  }

  getCatalogo(codigo: string): Observable<CatalogoResponse[]> {
    return this.http.get<CatalogoResponse[]>(`${environment.apiUrl}/catalogos/${codigo}`);
  }

  getUsuarioDetalle(id: number): Observable<Usuario> {
    return this.http
      .get<unknown>(`${environment.apiUrl}/configuracion/usuarios/${id}`)
      .pipe(map((item) => this.mapUsuario(item)));
  }

  updateUsuario(id: number, payload: UpdateUsuarioPayload): Observable<unknown> {
    return this.http.put(`${environment.apiUrl}/configuracion/usuarios/${id}`, payload);
  }

  upsertUsuario(usuario: Usuario): void {
    const url = `${environment.apiUrl}/configuracion/usuarios`;
    if (this.usuariosState().some((u) => u.id === usuario.id)) {
      this.updateUsuario(usuario.id, this.toUpdateUsuarioPayload(usuario)).subscribe(() => this.loadUsuarios());
    } else {
      this.http.post(url, usuario).subscribe(() => this.loadUsuarios());
    }
  }

  setUsuarios(usuarios: Usuario[]): void {
    this.usuariosState.set(usuarios);
  }

  deleteUsuario(id: number): void {
    this.http.delete(`${environment.apiUrl}/configuracion/usuarios/${id}`).subscribe(() => this.loadUsuarios());
  }

  setUsuarioEstado(id: number, activo: boolean): Observable<unknown> {
    return this.http
      .patch(`${environment.apiUrl}/configuracion/usuarios/${id}`, { activo })
      .pipe(tap(() => this.loadUsuarios()));
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
    const usuario = String(d['usuario'] ?? (email.includes('@') ? email.split('@')[0] : email)).trim();
    const usuarioInterno = email.toLowerCase().endsWith('@integritysolutions.com.ec');

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
      usuario,
      password: '',
      debeCambiarPassword: Boolean(d['debeCambiarPassword'] ?? d['debecambiarpassword'] ?? false),
      usuarioInterno: Boolean(d['usuarioInterno'] ?? usuarioInterno),
      idtipoidentificacion: this.mapTipoIdentificacionToFormId(tipoIdentificacion, idTipoIdentificacion),
      idgenero: String(d['idgenero'] ?? d['idGenero'] ?? ''),
      idnacionalidad: String(d['idnacionalidad'] ?? d['idNacionalidad'] ?? ''),
      fechanacimiento: fechaNacimiento,
      telefono: d['telefono'] ? String(d['telefono']) : null,
      direccion: d['direccion'] ? String(d['direccion']) : null,
      rolesids: Array.isArray(roleIds) ? roleIds.map((roleId) => String((roleId as any).id ?? roleId)) : [],
    };
  }

  toUpdateUsuarioPayload(usuario: Usuario): UpdateUsuarioPayload {
    return {
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      idgenero: this.toNullableNumber(usuario.idgenero),
      idnacionalidad: this.toNullableNumber(usuario.idnacionalidad),
      fechanacimiento: usuario.fechanacimiento,
      telefono: usuario.telefono?.trim() || null,
      direccion: usuario.direccion?.trim() || null,
      rolesids: usuario.rolesids.map((roleId) => Number(roleId)).filter((roleId) => Number.isFinite(roleId)),
    };
  }

  loadFeriados(): void {
    this.http.get<any[]>(`${environment.apiUrl}/configuracion/dias-festivos`).subscribe({
      next: (data) => this.feriadosState.set((data ?? []).map((d) => ({
        id: d.idDiaFestivo || d.id,
        nombre: d.nombreFeriado || d.motivo || d.nombre || '',
        tipo: d.tipoFeriado || d.tipo || 'Nacional',
        fecha: d.fechaFeriado || d.fecha || new Date().toISOString(),
        descripcion: d.descripcion,
        recurrente: d.esRecurrente ?? d.recurrente ?? false,
        activo: d.activo ?? true,
      }))),
      error: (err) => console.error(err),
    });
  }

  upsertFeriado(feriado: Feriado): void {
    const url = `${environment.apiUrl}/configuracion/dias-festivos`;
    const payload = this.toFeriadoBackendPayload(feriado);

    if (this.feriadosState().some((f) => f.id === feriado.id)) {
      this.http.put(`${url}/${feriado.id}`, payload).subscribe(() => this.loadFeriados());
    } else {
      this.http.post(url, payload).subscribe(() => this.loadFeriados());
    }
  }

  setFeriadoEstado(id: number, activo: boolean): void {
    this.feriadosState.update((feriados) =>
      feriados.map((f) => (f.id === id ? { ...f, activo } : f))
    );
  }

  deleteFeriado(id: number): Observable<unknown> {
    return this.http
      .delete(`${environment.apiUrl}/configuracion/dias-festivos/${id}`)
      .pipe(tap(() => this.loadFeriados()));
  }

  nextId(items: { id: number }[]): number {
    return items.length > 0 ? Math.max(0, ...items.map((item) => item.id)) + 1 : 1;
  }

  private toRolBackendPayload(rol: Rol): RolBackendPayload {
    return {
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      modulosids: rol.modulos
        .map((m) => m.id)
        .filter((id): id is number => Number.isFinite(id) && id > 0),
    };
  }

  private toFeriadoBackendPayload(feriado: Feriado): FeriadoBackendPayload {
    return {
      nombreFeriado: feriado.nombre,
      fechaFeriado: feriado.fecha,
      tipoFeriado: this.normalizeFeriadoTipo(feriado.tipo),
      esRecurrente: feriado.recurrente,
      descripcion: feriado.descripcion,
    };
  }

  private normalizeFeriadoTipo(tipo: unknown): string {
    return String(tipo) === 'Institucional' ? 'Religioso' : String(tipo);
  }

  private normalizeTipoIdentificacion(value: unknown): 'C' | 'R' | 'P' | 'O' {
    const tipo = String(value ?? 'C').toUpperCase();
    return tipo === 'R' || tipo === 'P' || tipo === 'O' ? tipo : 'C';
  }

  private mapTipoIdentificacionToFormId(tipo: string, fallback: unknown): string {
    return String(fallback ?? '');
  }

  private toNullableNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
  }
}
