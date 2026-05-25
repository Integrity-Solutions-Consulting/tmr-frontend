import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router'; 
import { provideHttpClient } from '@angular/common/http'; // <-- IMPORTANTE PARA EL SERVICES
import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { actividadesReducer } from './core/state/actividades/actividades.reducer';
import { ActividadesEffects } from './core/state/actividades/actividades.effects'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(), // <-- PROVEEDOR AGREGADO PARA HTTP
    provideStore({
      actividades: actividadesReducer
    }),
    provideEffects([ActividadesEffects]), 
    provideStoreDevtools({
      maxAge: 25,
      logOnly: !isDevMode()
    })
  ]
};