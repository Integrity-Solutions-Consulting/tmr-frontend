import { Routes } from '@angular/router';
import { Actividades } from './actividades/actividades';
import { SeguimientoComponent } from './seguimiento/seguimiento.component';

export const TIME_REPORT_ROUTES: Routes = [
  { path: 'actividades', component: Actividades },
  { path: 'seguimiento', component: SeguimientoComponent },
  { path: '', redirectTo: 'actividades', pathMatch: 'full' }
];
