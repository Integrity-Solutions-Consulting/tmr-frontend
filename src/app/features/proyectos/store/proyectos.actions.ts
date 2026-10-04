import { createAction, props } from '@ngrx/store';
import { Proyecto } from '../modelos/proyecto.model';

// sm - Se quitaron agregarProyecto/editarProyecto/eliminarProyecto: nunca se disparaban desde ningún
// componente (crear/editar/activar-inactivar llaman directo a ProyectosService desde proyectos-page.ts y
// luego recargan la lista con cargarProyectos). Eran acciones, efectos y casos de reducer muertos.

export const cargarProyectos = createAction(
  '[Proyectos] Cargar Proyectos'
);

export const cargarProyectosExito = createAction(
  '[Proyectos] Cargar Proyectos Exito',
  props<{ proyectos: Proyecto[] }>()
);
