import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProyectosState } from './proyectos.reducer';

export const selectProyectosState =
  createFeatureSelector<ProyectosState>('proyectos');

export const selectProyectos = createSelector(
  selectProyectosState,
  state => state.proyectos
);

export const selectProyectosCargando = createSelector(
  selectProyectosState,
  state => state.cargando
);
