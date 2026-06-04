import { Routes } from '@angular/router';

export const clientesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./paginas/clientes.page').then(m => m.ClientesPage),
  },
];
