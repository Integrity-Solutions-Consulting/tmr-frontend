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
  // Diseño no funcional: Permisos por Ausencia y Vacaciones (Colaborador, Líder Interno y RRHH)
  {
    path: 'permisos',
    loadComponent: () =>
      import('./permisos/mis-permisos/mis-permisos').then(m => m.MisPermisosComponent),
  },
  {
    path: 'permisos/equipo',
    loadComponent: () =>
      import('./permisos/aprobaciones-lider/aprobaciones-lider').then(
        m => m.AprobacionesLiderComponent
      ),
  },
  {
    path: 'permisos/rrhh',
    loadComponent: () =>
      import('./permisos/gestion-rrhh/gestion-rrhh').then(m => m.GestionRrhhComponent),
  },
  {
    path: 'permisos/gerencia',
    loadComponent: () =>
      import('./permisos/permisos-gerencia/permisos-gerencia').then(
        m => m.PermisosGerenciaComponent
      ),
  },
  { path: '', redirectTo: 'actividades', pathMatch: 'full' }
];
