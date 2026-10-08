import { Routes } from '@angular/router';
import { Actividades } from './actividades/actividades';
import { SeguimientoComponent } from './seguimiento/seguimiento';
import { roleGuard } from '../../core/guards/role.guard';

export const TIME_REPORT_ROUTES: Routes = [
  { path: 'actividades', component: Actividades },
  // sm - Seguimiento solo para usuarios con el módulo "Seguimiento" (o administradores), igual que en el menú lateral.
  { path: 'seguimiento', component: SeguimientoComponent, canActivate: [roleGuard] },
  { path: '', redirectTo: 'actividades', pathMatch: 'full' }
];
