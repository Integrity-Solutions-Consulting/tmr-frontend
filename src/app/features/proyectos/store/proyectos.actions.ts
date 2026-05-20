import { createAction, props } from '@ngrx/store';
import { Proyecto } from '../modelos/proyecto.model';

export const cargarProyectos = createAction(
  '[Proyectos] Cargar Proyectos'
);

export const cargarProyectosExito = createAction(
  '[Proyectos] Cargar Proyectos Exito',
  props<{ proyectos: Proyecto[] }>()
);

export const agregarProyecto = createAction(
  '[Proyectos] Agregar Proyecto',
  props<{ proyecto: Proyecto }>()
);

export const editarProyecto = createAction(
  '[Proyectos] Editar Proyecto',
  props<{ proyecto: Proyecto }>()
);

export const eliminarProyecto = createAction(
  '[Proyectos] Eliminar Proyecto',
  props<{ codigo: string }>()
);