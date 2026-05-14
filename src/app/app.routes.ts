import { Routes } from '@angular/router';
import { authRoutes } from './features/auth/auth.routes';

export const routes: Routes = [
  {
    path: 'auth',
    children: authRoutes,
  },
  {
    path: 'clientes',
    loadChildren: () =>
      import('./features/clientes/clientes.routes').then(m => m.clientesRoutes),
  },
  {
    path: '',
    redirectTo: '/clientes',
    pathMatch: 'full',
  },
];
