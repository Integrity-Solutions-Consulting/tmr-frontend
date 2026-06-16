import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Actividad } from '../../models/actividad.model';

export const ActividadesActions = createActionGroup({
  source: 'Actividades',
  events: {
    // Carga inicial desde la BD
    'Cargar Actividades': emptyProps(),
    'Cargar Actividades Success': props<{ actividades: Actividad[] }>(),
    'Cargar Actividades Failure': props<{ error: string }>(),

    // Importar desde Excel
    'Importar Excel': props<{ archivo: File }>(),
    'Importar Excel Success': props<{ actividades: Actividad[] }>(),
    'Importar Excel Failure': props<{ error: string; errores?: string[] }>(),

    'Reset Estado': emptyProps(),
  }
});