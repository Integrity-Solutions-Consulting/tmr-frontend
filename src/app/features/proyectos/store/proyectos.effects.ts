import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map } from 'rxjs';

import { ProyectosService } from '../servicios/proyectos.service';
import { cargarProyectos, cargarProyectosExito } from './proyectos.actions';

@Injectable()
export class ProyectosEffects {
  private actions$ = inject(Actions);
  private proyectosService = inject(ProyectosService);

  cargarProyectos$ = createEffect(() =>
    this.actions$.pipe(
      ofType(cargarProyectos),
      map(() => {
        const proyectos = this.proyectosService.obtenerProyectos();

        return cargarProyectosExito({ proyectos });
      })
    )
  );
}