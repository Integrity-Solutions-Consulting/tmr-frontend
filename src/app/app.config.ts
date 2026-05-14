import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { clientesReducer } from './features/clientes/store/clientes.reducer';
import * as ClientesEffects from './features/clientes/store/clientes.effects';
import { actividadesReducer } from './core/state/actividades/actividades.reducer';
import { ActividadesEffects } from './core/state/actividades/actividades.effects';
import { actividadesReducer } from './core/state/actividades/actividades.reducer';
import { ActividadesEffects } from './core/state/actividades/actividades.effects';
import { proyectosReducer } from './features/proyectos/store/proyectos.reducer';
import { ProyectosEffects } from './features/proyectos/store/proyectos.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore({
      clientes: clientesReducer,
      actividades: actividadesReducer,
    }),
    provideEffects(ClientesEffects, ActividadesEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
    provideRouter(routes)
  ]
};
