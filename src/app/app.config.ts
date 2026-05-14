import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { actividadesReducer } from './core/state/actividades/actividades.reducer';
import { ActividadesEffects } from './core/state/actividades/actividades.effects';
import { proyectosReducer } from './features/proyectos/store/proyectos.reducer';
import { ProyectosEffects } from './features/proyectos/store/proyectos.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideStore({
      actividades: actividadesReducer,
      proyectos: proyectosReducer
    }),
    provideEffects([ActividadesEffects, ProyectosEffects]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode()
    })
  ]
};
