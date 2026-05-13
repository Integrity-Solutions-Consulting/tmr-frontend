import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import { provideRouter } from '@angular/router';

import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { proyectosReducer } from './features/proyectos/store/proyectos.reducer';
import { ProyectosEffects } from './features/proyectos/store/proyectos.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideZoneChangeDetection({
      eventCoalescing: true
    }),

    provideRouter(routes),

    provideStore({
      proyectos: proyectosReducer
    }),

    provideEffects([
      ProyectosEffects
    ]),

    provideStoreDevtools({
      maxAge: 25,
      logOnly: false
    })
  ]
};