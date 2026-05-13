import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router'; // provideRouter, NO providerRouter
import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { actividadesReducer } from './core/state/actividades/actividades.reducer';
import { ActividadesEffects } from './core/state/actividades/actividades.effects'; // Con mayúscula inicial

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideStore({
      actividades: actividadesReducer
    }),
    provideEffects([ActividadesEffects]), // Con mayúscula inicial
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode()
    })
  ]
};
