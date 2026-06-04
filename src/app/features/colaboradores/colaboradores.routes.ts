import { Routes } from '@angular/router';
 
export const COLABORADORES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./componentes/colaboradores-page/colaboradores-page.component').then(
        m => m.ColaboradoresPageComponent
      ),
  },
];
