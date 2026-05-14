import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ExcelService } from '../../services/excel.service';
import { ActividadesActions } from './actividades.actions'; // Importación directa
import { catchError, map, mergeMap, of, from } from 'rxjs';

@Injectable()
export class ActividadesEffects {
  private actions$ = inject(Actions);
  private excelService = inject(ExcelService);

  importarExcel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActividadesActions.importarExcel),
      mergeMap(({ archivo }) =>
        from(this.excelService.leerExcel(archivo)).pipe(
          map((actividades) => ActividadesActions.importarExcelSuccess({ actividades })),
          catchError((error) =>
            of(ActividadesActions.importarExcelFailure({ error: error.message || 'Error al procesar el Excel' }))
          )
        )
      )
    )
  );
}