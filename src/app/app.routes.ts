import { Routes } from '@angular/router';
import { Component } from '@angular/core';
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'clientes',
    pathMatch: 'full',
  },
  {
    path: 'clientes',
    loadChildren: () =>
      import('./features/clientes/clientes.routes').then(m => m.clientesRoutes),
  },
];