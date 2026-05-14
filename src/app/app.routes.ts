import { Routes } from '@angular/router';
import { authRoutes } from './features/auth/auth.routes';
import { AppLayout } from './core/layout/app-layout/app-layout';
import { ReporteFechasComponent } from './features/reportes/componentes/reporte-fechas/reporte-fechas.component';
import { TablaEjemplosComponent } from './shared/componentes/tabla-ejemplos';

// Routes configuration
export const routes: Routes = [
  {
    path: 'auth',
    children: authRoutes,
  },
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full',
  },
/*  { 
    path: 'appMenu',
    component: AppLayout,
  },
  {
    path: 'colaboradores',
    loadChildren: () =>
      import('./features/colaboradores/colaboradores.routes').then(
        m => m.COLABORADORES_ROUTES
      ),
  },
  {
    path: 'reportes',
    component: ReporteFechasComponent,
  },
  {
    path: 'tabla-ejemplos',
    component: TablaEjemplosComponent,
  },

*/
  
];
