import { Routes } from '@angular/router';
import { authRoutes } from './features/auth/auth.routes';
import { AppLayout } from './core/layout/app-layout/app-layout';
import { ProyectosPage } from './features/proyectos/paginas/proyectos-page/proyectos-page';

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
];
