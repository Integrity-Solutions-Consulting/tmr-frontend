import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, isDevMode, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MAT_DATE_LOCALE, MAT_DATE_FORMATS, provideNativeDateAdapter } from '@angular/material/core';

import { routes } from './app.routes';
import { JwtInterceptor } from './core/interceptors/jwt.interceptor';
import { TokenInterceptor } from './core/interceptors/token.interceptor';
import { ApiResponseInterceptor } from './core/interceptors/api-response.interceptor';
import { loadUserModulesInitializer } from './core/initializers/load-user-modules.initializer';

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

export const MY_DATE_FORMATS = {
  parse: {
    dateInput: ['dd/MM/yyyy', 'd/M/yyyy', 'dd/MM/yy'],
  },
  display: {
    dateInput: 'dd/MM/yyyy',
    monthYearLabel: 'MMM yyyy',
    dateA11yLabel: 'dd/MM/yyyy',
    monthYearA11yLabel: 'MMMM yyyy',
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'es-EC' },
    provideNativeDateAdapter(MY_DATE_FORMATS),
    { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },       // idioma del calendario (meses/días en español)
    { provide: MAT_DATE_FORMATS, useValue: MY_DATE_FORMATS }, // formato dd/MM/yyyy
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
    // ✅ CAMBIO: Agregar inicializador para precargar módulos al arrancar
    {
      provide: APP_INITIALIZER,
      useFactory: () => loadUserModulesInitializer,
      multi: true,
    },
  ],
};