import { Routes } from '@angular/router';
import { authRoutes } from './features/auth/auth.routes';
import { LayoutComponent } from './shared/componentes/layout/layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    children: authRoutes,
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'reportes/horas',
        loadComponent: () => import('./features/reportes/componentes/reporte-horas/reporte-horas.component').then(m => m.ReporteHorasComponent)
      },
      {
        path: 'reportes/fechas',
        loadComponent: () => import('./features/reportes/componentes/reporte-fechas/reporte-fechas.component').then(m => m.ReporteFechasComponent)
      },
      {
        path: '',
        redirectTo: 'reportes/horas',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];
