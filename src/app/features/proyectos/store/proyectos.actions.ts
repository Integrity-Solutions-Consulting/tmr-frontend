import { createAction, props } from '@ngrx/store';
import { Proyecto } from '../modelos/proyecto.model';

export const cargarProyectos = createAction(
  '[Proyectos] Cargar Proyectos'
);

export const cargarProyectosExito = createAction(
  '[Proyectos] Cargar Proyectos Exito',
  props<{ proyectos: Proyecto[] }>()
);

export const cargarProyectosFallo = createAction(
  '[Proyectos] Cargar Proyectos Fallo',
  props<{ error: string }>()
);

export const agregarProyecto = createAction(
  '[Proyectos] Agregar Proyecto',
  props<{ proyecto: Proyecto }>()
);

export const agregarProyectoExito = createAction(
  '[Proyectos] Agregar Proyecto Exito',
  props<{ proyecto: Proyecto }>()
);

export const agregarProyectoFallo = createAction(
  '[Proyectos] Agregar Proyecto Fallo',
  props<{ error: string }>()
);

export const editarProyecto = createAction(
  '[Proyectos] Editar Proyecto',
  props<{ proyecto: Proyecto }>()
);

export const editarProyectoExito = createAction(
  '[Proyectos] Editar Proyecto Exito',
  props<{ proyecto: Proyecto }>()
);

export const editarProyectoFallo = createAction(
  '[Proyectos] Editar Proyecto Fallo',
  props<{ error: string }>()
);

export const eliminarProyecto = createAction(
  '[Proyectos] Eliminar Proyecto',
  props<{ codigo: string }>()
);

export const eliminarProyectoExito = createAction(
  '[Proyectos] Eliminar Proyecto Exito',
  props<{ codigo: string }>()
);

export const eliminarProyectoFallo = createAction(
  '[Proyectos] Eliminar Proyecto Fallo',
  props<{ error: string }>()
);
