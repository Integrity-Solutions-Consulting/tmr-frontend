import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { TokenInterceptor } from './core/interceptors/token.interceptor';
import { ApiResponseInterceptor } from './core/interceptors/api-response.interceptor';

// Reducers
import { authReducer } from './features/auth/store/auth.reducer';
import { clientesReducer } from './features/clientes/store/clientes.reducer';
import { actividadesReducer } from './core/state/actividades/actividades.reducer';
import { proyectosReducer } from './features/proyectos/store/proyectos.reducer';
import { dashboardReducer } from './features/dashboard/store/dashboard.reducer';

// Effects
import { AuthEffects } from './features/auth/store/auth.effects';
import * as ClientesEffects from './features/clientes/store/clientes.effects';
import { ActividadesEffects } from './core/state/actividades/actividades.effects';
import { ProyectosEffects } from './features/proyectos/store/proyectos.effects';
import { DashboardEffects } from './features/dashboard/store/dashboard.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ApiResponseInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true,
    },
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
