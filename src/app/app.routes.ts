import { Routes } from '@angular/router';
import { layout } from './core/layout/layout';

export const routes: Routes = [
  { path: '', redirectTo: 'time-report/actividades', pathMatch: 'full' },
  {
    path: '',
    component: layout,
    children: [
      {
        path: 'time-report',
        loadChildren: () => import('./features/time-report/time-report.routes')
          .then(m => m.TIME_REPORT_ROUTES)
      },
      { path: 'dashboard', redirectTo: 'time-report/actividades' },
      { path: 'proyectos', redirectTo: 'time-report/actividades' },
      { path: 'colaboradores', redirectTo: 'time-report/actividades' },
      { path: 'clientes', redirectTo: 'time-report/actividades' },
      { path: 'lideres', redirectTo: 'time-report/actividades' },
    ]
  }
];
