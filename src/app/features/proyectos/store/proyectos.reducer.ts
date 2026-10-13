import { createReducer, on } from '@ngrx/store';

import { Proyecto } from '../modelos/proyecto.model';

import { cargarProyectos, cargarProyectosExito } from './proyectos.actions';

export interface ProyectosState {
  proyectos: Proyecto[];
  // sm - true mientras se piden los proyectos: la tabla muestra "Cargando proyectos..." en lugar de quedar en blanco.
  cargando: boolean;
}

export const initialState: ProyectosState = {
  proyectos: [],
  cargando: true
};

export const proyectosReducer = createReducer(
  initialState,

  on(cargarProyectos, state => ({
    ...state,
    cargando: true
  })),

  // sm - El efecto también despacha cargarProyectosExito (con lista vacía) cuando la petición falla.
  on(cargarProyectosExito, (state, { proyectos }) => ({
    ...state,
    proyectos,
    cargando: false
  }))
);
