import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ExcelService } from '../../services/excel.service';
import { ActividadesActions } from './actividades.actions'; 
import { catchError, map, mergeMap, of } from 'rxjs';
import { Actividad } from '../../models/actividad.model';

@Injectable()
export class ActividadesEffects {
  private actions$ = inject(Actions);
  private excelService = inject(ExcelService);

  private getValue(source: any, keys: string[], fallback: any = '') {
    const key = keys.find(k => {
      const value = source?.[k];

      return value !== undefined &&
        value !== null &&
        (typeof value !== 'string' || value.trim() !== '');
    });

    const value = key ? source[key] : fallback;

    return typeof value === 'string' ? value.trim() : value;
  }

  private normalizarActividad(item: any): Actividad {
    return {
      id: String(this.getValue(item, ['id', 'Id'], crypto.randomUUID())),
      colaborador: this.getValue(item, ['colaborador', 'Colaborador'], 'Sin colaborador'),
      proyecto: this.getValue(item, ['proyecto', 'Proyecto', 'descripcionActividad', 'DescripcionActividad'], 'Sin proyecto'),
      cliente: this.getValue(item, ['cliente', 'Cliente'], 'Sin cliente'),
      liderTecnico: this.getValue(item, ['liderTecnico', 'LiderTecnico'], ''),
      fecha: this.getValue(item, ['fecha', 'Fecha', 'fechaActividad', 'FechaActividad'], undefined),
      nroHoras: Number(this.getValue(item, ['nroHoras', 'NroHoras', 'cantidadHoras', 'CantidadHoras'], 0)),
      estado: this.getValue(item, ['estado', 'Estado'], 'Cargado')
    };
  }

  private obtenerActividades(response: any): Actividad[] {
    const lista = Array.isArray(response)
      ? response
      : this.getValue(response, ['actividades', 'Actividades', 'items', 'Items', 'data', 'Data'], []);

    return Array.isArray(lista) ? lista.map(item => this.normalizarActividad(item)) : [];
  }

  private obtenerErrores(error: any): string[] {
    const body = error?.error;
    if (!body || typeof body === 'string') return [];

    const errores = this.getValue(body, ['erroresValidacion', 'ErroresValidacion', 'errors', 'Errors'], []);
    if (Array.isArray(errores)) return errores.map(String);
    if (typeof errores === 'object') return Object.values(errores).flat().map(String);

    return [];
  }

  private obtenerMensajeError(error: any): string {
    const body = error?.error;
    if (typeof body === 'string') return body;

    return this.getValue(
      body,
      ['message', 'Message', 'mensaje', 'Mensaje', 'title', 'Title'],
      error.message || 'Error al procesar el Excel'
    );
  }

  importarExcel$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActividadesActions.importarExcel),
      mergeMap(({ archivo }) =>
        this.excelService.leerExcel(archivo).pipe(
          map((response: any) => {
            const isSuccess = this.getValue(response, ['isSuccess', 'IsSuccess'], true);

            if (!isSuccess) {
              return ActividadesActions.importarExcelFailure({
                error: this.getValue(response, ['message', 'Message'], 'Error al procesar el Excel'),
                errores: this.getValue(response, ['erroresValidacion', 'ErroresValidacion'], [])
              });
            }
            
            return ActividadesActions.importarExcelSuccess({ 
              actividades: this.obtenerActividades(response)
            });
          }),
          catchError((error) => {
            return of(ActividadesActions.importarExcelFailure({
              error: this.obtenerMensajeError(error),
              errores: this.obtenerErrores(error)
            }));
          })
        )
      )
    )
  );
}
