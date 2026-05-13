import { Routes } from '@angular/router';
import { AppLayout } from './core/layout/app-layout/app-layout';

export const routes: Routes = [
  {
    path: '',
    component: AppLayout,
    children: [
      {
        path: '',
        redirectTo: 'proyectos',
        pathMatch: 'full'
      },
      {
        path: 'proyectos',
        loadComponent: () =>
          import('./features/proyectos/paginas/proyectos-page/proyectos-page')
            .then(m => m.ProyectosPage)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'proyectos'
  }
];