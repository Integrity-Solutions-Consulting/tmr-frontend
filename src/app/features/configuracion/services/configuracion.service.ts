import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Feriado, Modulo, Rol, Usuario } from '../models/configuracion.models';
import { environment } from '../../../../environments/environment';

interface RolBackendPayload {
  nombre: string;
  descripcion: string;
  modulosids: number[];
  activo?: boolean;
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
  idPersona: number | null;
  rolesids: number[];
  email?: string;
  nombreusuario?: string;
  password?: string | null;
  debeCambiarPassword?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private http = inject(HttpClient);

  private readonly rolesState = signal<Rol[]>([]);
  private readonly usuariosState = signal<Usuario[]>([]);
  private readonly usuariosTotalesState = signal<Usuario[]>([]);
  private readonly feriadosState = signal<Feriado[]>([]);
  private readonly modulosState = signal<Modulo[]>([]);

  readonly roles = this.rolesState.asReadonly();
  readonly usuarios = this.usuariosState.asReadonly();
  readonly usuariosTotales = this.usuariosTotalesState.asReadonly();
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
    this.http.get<any[]>(`${environment.apiUrl}/configuracion/roles?pageSize=1000`).subscribe({
      next: (data) => this.rolesState.set((data ?? []).map((d) => ({
        id: d.idRol || d.id,
        nombre: d.nombreRol || d.nombre || '',
        descripcion: d.descripcionRol || d.descripcion || '',
        modulos: Array.isArray(d.modulos)
          ? d.modulos.map((m: any) => ({
              id: Number(m.id ?? m.idModulo ?? m.idmodulo ?? m.idRolModulo ?? m),
              nombre: String(m.nombre ?? m.nombreModulo ?? m.modulo ?? m.id ?? m),
            }))
              .filter((m: Modulo) => Number.isFinite(m.id) && m.id > 0)
          : [],
        modulosids: Array.isArray(d.modulosids ?? d.modulosIds ?? d.moduloIds)
          ? (d.modulosids ?? d.modulosIds ?? d.moduloIds)
              .map((id: unknown) => Number((id as any)?.id ?? id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          : undefined,
        activo: d.activo ?? true,
      }))),
      error: (err) => console.error(err),
    });
  }

  upsertRol(rol: Rol): void {
    const url = `${environment.apiUrl}/configuracion/roles`;
    const payload = this.toRolBackendPayload(rol);
    const existing = this.rolesState().find((r) => r.id === rol.id);

    if (existing) {
      this.http.put(`${url}/${rol.id}`, payload).subscribe(() => {
        if (existing.activo !== rol.activo) {
          this.setRolEstado(rol.id, rol.activo).subscribe();
        } else {
          this.loadRoles();
        }
      });
    } else {
      this.http.post<any>(url, payload).subscribe((response) => {
        const createdId = response?.id || response?.idRol || rol.id;
        if (rol.activo === false) {
          this.setRolEstado(createdId, false).subscribe();
        } else {
          this.loadRoles();
        }
      });
    }
  }

  setRolEstado(id: number, activo: boolean): Observable<unknown> {
    return this.http
      .patch(`${environment.apiUrl}/configuracion/roles/${id}`, { activo })
      .pipe(tap(() => this.loadRoles()));
  }

  deleteRol(id: number): Observable<unknown> {
    return this.http
      .delete(`${environment.apiUrl}/configuracion/roles/${id}`)
      .pipe(tap(() => this.loadRoles()));
  }

  loadUsuarios(activo?: boolean | null, search?: string): void {
    const params: Record<string, string> = { pageSize: '1000' };
    if (activo !== null && activo !== undefined) {
      params['activo'] = String(activo);
    }
    if (search && search.trim()) {
      params['search'] = search.trim();
    }

    const queryString = '?' + new URLSearchParams(params).toString();

    this.http
      .get<unknown[] | { items?: unknown[]; data?: unknown[] }>(
        `${environment.apiUrl}/configuracion/usuarios${queryString}`
      )
      .subscribe({
        next: (response) => {
          const data = Array.isArray(response) ? response : response.items ?? response.data ?? [];
          const usuarios = data.map((item) => this.mapUsuario(item));
          this.usuariosState.set(usuarios);

          if ((activo === null || activo === undefined) && !search?.trim()) {
            this.usuariosTotalesState.set(usuarios);
          }
        },
        error: (err) => console.error(err),
      });
  }

  loadUsuariosTotales(): void {
    this.http
      .get<unknown[] | { items?: unknown[]; data?: unknown[] }>(
        `${environment.apiUrl}/configuracion/usuarios?pageSize=1000`
      )
      .subscribe({
        next: (response) => {
          const data = Array.isArray(response) ? response : response.items ?? response.data ?? [];
          this.usuariosTotalesState.set(data.map((item) => this.mapUsuario(item)));
        },
        error: (err) => console.error(err),
      });
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
      this.updateUsuario(usuario.id, this.toUpdateUsuarioPayload(usuario)).subscribe(() => {
        this.loadUsuarios();
        this.loadUsuariosTotales();
      });
    } else {
      this.http.post(url, usuario).subscribe(() => {
        this.loadUsuarios();
        this.loadUsuariosTotales();
      });
    }
  }

  setUsuarios(usuarios: Usuario[]): void {
    this.usuariosState.set(usuarios);
    this.usuariosTotalesState.set(usuarios);
  }

  deleteUsuario(id: number, activo?: boolean | null): void {
    this.http
      .delete(`${environment.apiUrl}/configuracion/usuarios/${id}`)
      .subscribe(() => {
        this.loadUsuarios(activo);
        this.loadUsuariosTotales();
      });
  }

  setUsuarioEstado(id: number, activo: boolean, filtroActual?: boolean | null): Observable<unknown> {
    return this.http
      .patch(`${environment.apiUrl}/configuracion/usuarios/${id}`, { activo })
      .pipe(tap(() => {
        this.loadUsuarios(filtroActual);
        this.loadUsuariosTotales();
      }));
  }

  getUsuarioById(id: number): Usuario | undefined {
    return this.usuariosState().find((u) => u.id === id);
  }

  mapUsuario(item: unknown): Usuario {
    const d = item as Record<string, any>;
    const roleIds = d['rolesids'] ?? d['rolesIds'] ?? d['roles'] ?? (d['rol'] ? [d['rol']] : []);
    const idUsuario = Number(d['idUsuario'] ?? d['idusuario'] ?? d['id'] ?? 0);
    const idPersonaRaw = d['idPersona'] ?? d['idpersona'];
    const idPersona = idPersonaRaw === null || idPersonaRaw === undefined ? null : Number(idPersonaRaw);
    const nombres = d['nombres'] ?? d['nombre'] ?? null;
    const apellidos = d['apellidos'] ?? null;
    const email = String(d['email'] ?? '').trim();
    const usuario = String(d['usuario'] ?? (email.includes('@') ? email.split('@')[0] : email)).trim();
    const usuarioInterno = idPersona !== null;

    return {
      id: idUsuario,
      idUsuario,
      idPersona,
      estado: d['estado'] ?? (d['activo'] === false ? 'Inactivo' : 'Activo'),
      nombres,
      apellidos,
      email,
      usuario,
      password: '',
      debeCambiarPassword: Boolean(d['debeCambiarPassword'] ?? d['debecambiarpassword'] ?? false),
      usuarioInterno: Boolean(d['usuarioInterno'] ?? usuarioInterno),
      fechanacimiento: d['fechaNacimiento'] ?? d['fechanacimiento'] ?? null,
      telefono: d['telefono'] ? String(d['telefono']) : null,
      direccion: d['direccion'] ? String(d['direccion']) : null,
      rolesids: Array.isArray(roleIds)
        ? roleIds.map((roleId) => String((roleId as any).id ?? (roleId as any).idRol ?? roleId))
        : [],
      ultimologin: d['ultimologin'] ?? d['ultimoLogin'] ?? null,
    };
  }

  toUpdateUsuarioPayload(usuario: Usuario, passwordNueva?: string | null): UpdateUsuarioPayload {
    return {
      idPersona: usuario.usuarioInterno ? usuario.idPersona : null,
      rolesids: usuario.rolesids.map((roleId) => Number(roleId)).filter((roleId) => Number.isFinite(roleId)),
      email: usuario.email || undefined,
      nombreusuario: usuario.usuario || undefined,
      password: passwordNueva || null,
      debeCambiarPassword: usuario.debeCambiarPassword,
    };
  }

  loadFeriados(): void {
    this.http.get<any[]>(`${environment.apiUrl}/configuracion/dias-festivos?pageSize=1000`).subscribe({
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
      modulosids: (rol.modulosids ?? rol.modulos.map((m) => m.id))
        .map((id) => Number(id))
        .filter((id): id is number => Number.isFinite(id) && id > 0),
      activo: rol.activo,
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
}
