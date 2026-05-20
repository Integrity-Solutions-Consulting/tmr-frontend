import { createReducer, on } from '@ngrx/store';

import { Proyecto } from '../modelos/proyecto.model';

import {
  agregarProyecto,
  cargarProyectosExito,
  editarProyecto,
  eliminarProyecto
} from './proyectos.actions';

export interface ProyectosState {
  proyectos: Proyecto[];
}

export const initialState: ProyectosState = {
  proyectos: []
};

export const proyectosReducer = createReducer(
  initialState,

  on(cargarProyectosExito, (state, { proyectos }) => ({
    ...state,
    proyectos
  })),

  on(agregarProyecto, (state, { proyecto }) => ({
    ...state,
    proyectos: [...state.proyectos, proyecto]
  })),

  on(editarProyecto, (state, { proyecto }) => ({
    ...state,
    proyectos: state.proyectos.map(p =>
      p.codigo === proyecto.codigo ? proyecto : p
    )
  })),

  on(eliminarProyecto, (state, { codigo }) => ({
    ...state,
    proyectos: state.proyectos.filter(
      p => p.codigo !== codigo
    )
  }))
);