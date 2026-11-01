import { Routes } from '@angular/router';
import { Actividades } from './actividades/actividades';
import { SeguimientoComponent } from './seguimiento/seguimiento';
import { roleGuard } from '../../core/guards/role.guard';

export const TIME_REPORT_ROUTES: Routes = [
  { path: 'actividades', component: Actividades },
  // sm - Seguimiento solo para usuarios con el módulo "Seguimiento" (o administradores), igual que en el menú lateral.
  { path: 'seguimiento', component: SeguimientoComponent, canActivate: [roleGuard] },
  // Fechas de corte de la notificación de horas faltantes: módulo "Fechas de Corte" (permiso NOTIFICACIONES_CONFIGURAR)
  {
    path: 'fechas-corte',
    canActivate: [roleGuard],
    loadComponent: () => import('./fechas-corte/fechas-corte').then(m => m.FechasCorteComponent),
  },
  { path: '', redirectTo: 'actividades', pathMatch: 'full' }
];
