import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'carga-actividades',
        loadComponent: () => import('./features/carga-actividades/carga-actividades.component')
          .then(m => m.CargaActividadesComponent)
      },
      { path: '', redirectTo: 'carga-actividades', pathMatch: 'full' }
    ]
  }
];