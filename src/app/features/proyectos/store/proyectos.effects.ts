import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { ProyectosService } from '../servicios/proyectos.service';
import { 
  cargarProyectos, 
  cargarProyectosExito,
  agregarProyecto,
  editarProyecto
} from './proyectos.actions';

@Injectable()
export class ProyectosEffects {
  private actions$ = inject(Actions);
  private proyectosService = inject(ProyectosService);

  cargarProyectos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cargarProyectos),
      switchMap(() => 
        this.proyectosService.obtenerProyectos().pipe(
          map(proyectos => cargarProyectosExito({ proyectos })),
          catchError(() => of(cargarProyectosExito({ proyectos: [] })))
        )
      )
    )
  );

  agregarProyecto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(agregarProyecto),
      switchMap(({ proyecto }) =>
        this.proyectosService.crearProyecto(proyecto).pipe(
          map(() => cargarProyectos()),
          catchError(() => of(cargarProyectos()))
        )
      )
    )
  );

  editarProyecto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(editarProyecto),
      switchMap(({ proyecto }) => {
        console.log('effect proyecto.id:', proyecto.id); // ← agrega esto
        return this.proyectosService.actualizarProyecto(proyecto.id, proyecto).pipe(
          map(() => cargarProyectos()),
          catchError(() => of(cargarProyectos()))
        );
      })
    )
  );
}
