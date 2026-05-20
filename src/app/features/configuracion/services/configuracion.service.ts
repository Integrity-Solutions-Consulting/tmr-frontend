import { Injectable, signal } from '@angular/core';
import { FERIADOS_MOCK, ROLES_MOCK, USUARIOS_MOCK } from '../mocks/configuracion.mock';
import { Feriado, Rol, Usuario } from '../models/configuracion.models';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly rolesState = signal<Rol[]>(ROLES_MOCK);
  private readonly usuariosState = signal<Usuario[]>(USUARIOS_MOCK);
  private readonly feriadosState = signal<Feriado[]>(FERIADOS_MOCK);

  readonly roles = this.rolesState.asReadonly();
  readonly usuarios = this.usuariosState.asReadonly();
  readonly feriados = this.feriadosState.asReadonly();

  upsertRol(rol: Rol): void {
    this.rolesState.update((roles) => this.upsert(roles, rol));
  }

  deleteRol(id: number): void {
    this.rolesState.update((roles) => roles.filter((rol) => rol.id !== id));
  }

  upsertUsuario(usuario: Usuario): void {
    this.usuariosState.update((usuarios) => this.upsert(usuarios, usuario));
  }

  deleteUsuario(id: number): void {
    this.usuariosState.update((usuarios) => usuarios.filter((usuario) => usuario.id !== id));
  }

  upsertFeriado(feriado: Feriado): void {
    this.feriadosState.update((feriados) => this.upsert(feriados, feriado));
  }

  deleteFeriado(id: number): void {
    this.feriadosState.update((feriados) => feriados.filter((feriado) => feriado.id !== id));
  }

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
