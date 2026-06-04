import { Injectable, signal } from '@angular/core';
import { FERIADOS_MOCK, ROLES_MOCK, USUARIOS_MOCK } from '../mocks/configuracion.mock';
import { Feriado, Rol, Usuario, EstadoUsuario } from '../models/configuracion.models';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly rolesState = signal<Rol[]>(ROLES_MOCK);
  private readonly usuariosState = signal<Usuario[]>([]);
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

  // Inactivación lógica: no eliminar físicamente los usuarios
  // TODO: cuando exista backend, reemplazar esta lógica por la llamada al endpoint correspondiente (PATCH/PUT).
  // Ejemplo: PATCH /api/usuarios/{id} { estado: 'Inactivo' }
  setUsuarioEstado(id: number, estado: EstadoUsuario): void {
    this.usuariosState.update((usuarios) =>
      usuarios.map((u) => (u.id === id ? { ...u, estado } : u))
    );
  }

  // Mantener una API compatible: deleteUsuario ahora inactiva el usuario
  deleteUsuario(id: number): void {
    this.setUsuarioEstado(id, 'Inactivo');
  }

  // Obtener usuario por id (útil para abrir detalle/editar)
  getUsuarioById(id: number): Usuario | undefined {
    return this.usuariosState().find((u) => u.id === id);
  }

  // TODO: puntos de extensión para conectar con backend en el futuro:
  // - getUsuarios(filtros): GET /api/usuarios
  // - getUsuarioById(id): GET /api/usuarios/{id}
  // - crearUsuario(dto): POST /api/usuarios
  // - editarUsuario(id, dto): PUT /api/usuarios/{id}
  // - cambiarEstado(id, estado): PATCH /api/usuarios/{id}/estado

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
