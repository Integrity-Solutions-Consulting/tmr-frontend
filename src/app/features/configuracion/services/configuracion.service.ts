import { Injectable, signal } from '@angular/core';
import { FERIADOS_MOCK, ROLES_MOCK } from '../mocks/configuracion.mock';
import { Feriado, Rol, Usuario, EstadoUsuario } from '../models/configuracion.models';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly rolesState = signal<Rol[]>(ROLES_MOCK);
  private readonly usuariosState = signal<Usuario[]>([]);
  private readonly feriadosState = signal<Feriado[]>(FERIADOS_MOCK);

  readonly roles = this.rolesState.asReadonly();
  readonly usuarios = this.usuariosState.asReadonly();
  readonly feriados = this.feriadosState.asReadonly();

  // ── Roles ─────────────────────────────────────────────────────────────────

  upsertRol(rol: Rol): void {
    this.rolesState.update((roles) => this.upsert(roles, rol));
  }

  setRolEstado(id: number, activo: boolean): void {
    this.rolesState.update((roles) =>
      roles.map((rol) => (rol.id === id ? { ...rol, activo } : rol))
    );
  }

  deleteRol(id: number): void {
    this.rolesState.update((roles) => roles.filter((rol) => rol.id !== id));
  }

  // ── Usuarios ───────────────────────────────────────────────────────────────

  upsertUsuario(usuario: Usuario): void {
    console.log('[DEBUG] upsertUsuario called with:', usuario);
    this.usuariosState.update((usuarios) => {
      const result = this.upsert(usuarios, usuario);
      console.log('[DEBUG] After upsert, usuariosState:', result);
      return result;
    });
    console.log('[DEBUG] Final usuarios state:', this.usuariosState());
  }

  setUsuarios(usuarios: Usuario[]): void {
    this.usuariosState.set(usuarios);
  }

  // TODO: cuando exista backend, reemplazar por PATCH /api/usuarios/{id} { estado }
  setUsuarioEstado(id: number, estado: EstadoUsuario): void {
    this.usuariosState.update((usuarios) =>
      usuarios.map((u) => (u.id === id ? { ...u, estado } : u))
    );
  }

  deleteUsuario(id: number): void {
    this.setUsuarioEstado(id, 'Inactivo');
  }

  getUsuarioById(id: number): Usuario | undefined {
    return this.usuariosState().find((u) => u.id === id);
  }

  // ── Feriados ───────────────────────────────────────────────────────────────
  // TODO: conectar con backend: POST/PUT /api/feriados, PATCH /api/feriados/{id}/estado

  upsertFeriado(feriado: Feriado): void {
    this.feriadosState.update((feriados) => this.upsert(feriados, feriado));
  }

  setFeriadoEstado(id: number, activo: boolean): void {
    this.feriadosState.update((feriados) =>
      feriados.map((f) => (f.id === id ? { ...f, activo } : f))
    );
  }

  deleteFeriado(id: number): void {
    this.feriadosState.update((feriados) => feriados.filter((feriado) => feriado.id !== id));
  }

  // ── Shared ─────────────────────────────────────────────────────────────────

  nextId(items: { id: number }[]): number {
    return Math.max(0, ...items.map((item) => item.id)) + 1;
  }

  private upsert<T extends { id: number }>(items: T[], nextItem: T): T[] {
    const exists = items.some((item) => item.id === nextItem.id);
    return exists
      ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
      : [nextItem, ...items];
  }
}
