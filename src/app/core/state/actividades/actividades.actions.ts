import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Actividad } from '../../models/actividad.model';

export const ActividadesActions = createActionGroup({
  source: 'Actividades',
  events: {
    'Importar Excel': props<{ archivo: File }>(),
    'Importar Excel Success': props<{ actividades: Actividad[] }>(),
    'Importar Excel Failure': props<{ error: string }>(),
    'Reset Estado': emptyProps(),
  }
});

