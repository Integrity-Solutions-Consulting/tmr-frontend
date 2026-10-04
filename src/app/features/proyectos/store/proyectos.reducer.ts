import { createReducer, on } from '@ngrx/store';

import { Proyecto } from '../modelos/proyecto.model';

import { cargarProyectosExito } from './proyectos.actions';

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
  }))
);
