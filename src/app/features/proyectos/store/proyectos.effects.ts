import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, catchError, concatMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';

import { ProyectosService } from '../servicios/proyectos.service';
import * as ProyectosActions from './proyectos.actions';
import { selectProyectos } from './proyectos.selectors';

@Injectable()
export class ProyectosEffects {
  private actions$ = inject(Actions);
  private proyectosService = inject(ProyectosService);
  private store = inject(Store);

  cargarProyectos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProyectosActions.cargarProyectos),
      switchMap(() => 
        this.proyectosService.obtenerProyectos().pipe(
          map(proyectos => ProyectosActions.cargarProyectosExito({ proyectos })),
          catchError((error) => of(ProyectosActions.cargarProyectosFallo({ error: error.message })))
        )
      )
    )
  );

  agregarProyecto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProyectosActions.agregarProyecto),
      concatMap(({ proyecto }) =>
        this.proyectosService.crearProyecto(proyecto).pipe(
          map(creado => ProyectosActions.agregarProyectoExito({ proyecto: creado })),
          catchError((error) => of(ProyectosActions.agregarProyectoFallo({ error: error.message })))
        )
      )
    )
  );

  editarProyecto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProyectosActions.editarProyecto),
      concatMap(({ proyecto }) => {
        const id = proyecto.id;
        if (!id) {
          return of(ProyectosActions.editarProyectoFallo({ error: 'ID de proyecto no encontrado' }));
        }
        return this.proyectosService.actualizarProyecto(id, proyecto).pipe(
          map(actualizado => ProyectosActions.editarProyectoExito({ proyecto: actualizado })),
          catchError((error) => of(ProyectosActions.editarProyectoFallo({ error: error.message })))
        );
      })
    )
  );

  eliminarProyecto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProyectosActions.eliminarProyecto),
      withLatestFrom(this.store.select(selectProyectos)),
      concatMap(([{ codigo }, proyectos]) => {
        const proyecto = proyectos.find(p => p.codigo === codigo);
        if (!proyecto || !proyecto.id) {
          return of(ProyectosActions.eliminarProyectoFallo({ error: 'Proyecto no encontrado en el store' }));
        }
        return this.proyectosService.eliminarProyecto(proyecto.id).pipe(
          map(() => ProyectosActions.eliminarProyectoExito({ codigo })),
          catchError((error) => of(ProyectosActions.eliminarProyectoFallo({ error: error.message })))
        );
      })
    )
  );
}
