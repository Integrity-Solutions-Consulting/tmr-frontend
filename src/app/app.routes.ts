import { Routes } from '@angular/router';
import { authRoutes } from './features/auth/auth.routes';
import { AppLayout } from './core/layout/app-layout/app-layout';
import { ProyectosPage } from './features/proyectos/paginas/proyectos-page/proyectos-page';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // ── Raíz → Dashboard ───────────────────────────────────────
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // ── Auth (sin sidebar) ───────────────────────────────────
  { path: 'auth', children: authRoutes },

  // ── App principal (sidebar + navbar) — requiere auth ─────
  {
    path: '',
    component: AppLayout,
    canActivate: [authGuard],
    children: [

      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/componentes/dashboard-page/dashboard-page.component').then(
            m => m.DashboardPageComponent
          ),
      },

      // Proyectos
      { path: 'proyectos', component: ProyectosPage },

      // Colaboradores
      {
        path: 'colaboradores',
        loadChildren: () =>
          import('./features/colaboradores/colaboradores.routes').then(
            m => m.COLABORADORES_ROUTES
          ),
      },

      // Clientes
      {
        path: 'clientes',
        loadChildren: () =>
          import('./features/clientes/clientes.routes').then(m => m.clientesRoutes),
      },

      // Líderes
      {
        path: 'lideres',
        loadComponent: () =>
          import('./features/lideres/components/lideres.component').then(
            m => m.LideresComponent
          ),
      },

      // Time Report (actividades + seguimiento)
      {
        path: 'time-report',
        loadChildren: () =>
          import('./features/time-report/time-report.routes').then(m => m.TIME_REPORT_ROUTES),
      },

      // Carga de Actividades por Excel
      {
        path: 'carga-actividades',
        loadComponent: () =>
          import('./features/carga-actividades/carga-actividades.component').then(
            m => m.CargaActividadesComponent
          ),
      },

      // Reportes
      {
        path: 'reportes',
        children: [
          { path: '', redirectTo: 'horas', pathMatch: 'full' },
          {
            path: 'horas',
            loadComponent: () =>
              import('./features/reportes/componentes/reporte-horas/reporte-horas.component').then(
                m => m.ReporteHorasComponent
              ),
          },
          {
            path: 'fechas',
            loadComponent: () =>
              import('./features/reportes/componentes/reporte-fechas/reporte-fechas.component').then(
                m => m.ReporteFechasComponent
              ),
          },
        ],
      },

      // Configuración (Usuarios, Roles, Feriados)
      {
        path: 'configuracion',
        children: [
          { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/configuracion/pages/usuarios-page/usuarios-page').then(
                m => m.UsuariosPage
              ),
          },
          {
            path: 'roles',
            loadComponent: () =>
              import('./features/configuracion/pages/roles-page/roles-page').then(
                m => m.RolesPage
              ),
          },
          {
            path: 'feriados',
            loadComponent: () =>
              import('./features/configuracion/pages/feriados-page/feriados-page').then(
                m => m.FeriadosPage
              ),
          },
        ],
      },
    ],
  },

  // Wildcard → login
  { path: '**', redirectTo: 'auth/login' },
];
