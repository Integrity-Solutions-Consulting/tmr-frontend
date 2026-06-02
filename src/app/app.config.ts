import { provideHttpClient } from '@angular/common/http'; // <-- IMPORTANTE PARA EL SERVICES
import { routes } from './app.routes';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { TokenInterceptor } from './core/interceptors/token.interceptor';
import { routes } from './app.routes';

// Reducers
import { authReducer } from './features/auth/store/auth.reducer';
import { clientesReducer } from './features/clientes/store/clientes.reducer';
import { actividadesReducer } from './core/state/actividades/actividades.reducer';
import { ActividadesEffects } from './core/state/actividades/actividades.effects'; 

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(), // <-- PROVEEDOR AGREGADO PARA HTTP
    provideStore({
      auth: authReducer,
      clientes: clientesReducer,
      actividades: actividadesReducer,
      proyectos: proyectosReducer,
      dashboard: dashboardReducer,
    }),
    provideEffects(AuthEffects, ClientesEffects, ActividadesEffects, ProyectosEffects, DashboardEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
  ],
};