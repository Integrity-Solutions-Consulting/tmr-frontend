import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter }        from '@angular/router';
import { provideStore }         from '@ngrx/store';
import { provideEffects }       from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes }          from './app.routes';
import { clientesReducer } from './features/clientes/store/clientes.reducer';
import * as ClientesEffects from './features/clientes/store/clientes.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore({ clientes: clientesReducer }),
    provideEffects(ClientesEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: false }),
  ],
};
