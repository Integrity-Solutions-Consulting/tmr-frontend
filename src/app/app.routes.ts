import { Routes } from '@angular/router';

export const routes: Routes = [];
import { authRoutes } from './features/auth/auth.routes';
import { AppLayout } from './core/layout/app-layout/app-layout';
import { ProyectosPage } from './features/proyectos/paginas/proyectos-page/proyectos-page';
import { LayoutComponent } from './shared/componentes/layout/layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    children: authRoutes,
  },
  {
    path: '',
    component: AppLayout,
    children: [
      {
        path: '',
        redirectTo: 'proyectos',
        pathMatch: 'full',
      },
      {
        path: 'proyectos',
        component: ProyectosPage,
      },
    ],
  },
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
