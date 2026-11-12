import { Routes } from '@angular/router';
 
export const COLABORADORES_ROUTES: Routes = [
  {
    path: ':id/detalle',
    loadComponent: () => import('./componentes/detalle-colaborador-page/detalle-colaborador-page.component').then(m => m.DetalleColaboradorPageComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./componentes/colaboradores-page/colaboradores-page.component').then(
        m => m.ColaboradoresPageComponent
      ),
  },
];
