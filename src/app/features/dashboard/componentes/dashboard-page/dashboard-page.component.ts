import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import * as DashboardActions from '../../store/dashboard.actions';
import * as DashboardSelectors from '../../store/dashboard.selectors';
import { DashboardMetricasComponent } from './dashboard-metricas/dashboard-metricas.component';
import { ProximosACerrarComponent } from './proximamente-cerrar/proximamente-cerrar.component';
import { GraficoHorasComponent } from './grafico-horas/grafico-horas.component';
import { DashboardService } from '../../servicios/dashboard.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    DashboardMetricasComponent,
    ProximosACerrarComponent,
    GraficoHorasComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  private dashboardService = inject(DashboardService);

  metricas$!: Observable<any>;
  proximosACerrar$!: Observable<any>;
  horasPorProyecto$!: Observable<any>;
  proyectosPorCliente$!: Observable<any>;
  loading$!: Observable<any>;

  // Estado del Drawer (Panel lateral)
  showDrawer = false;
  selectedProyecto: any = null;
  horasIncompletas: any[] = [];
  loadingIncompletas = false;
  rangoActual = 'mes';
  expandedCollaborators: { [id: number]: boolean } = {};
  enviandoAlerta: { [id: number]: boolean } = {};
  exitoAlerta: { [id: number]: boolean } = {};
  errorAlerta: { [id: number]: string } = {};

  constructor(private store: Store) {
    this.metricas$ = this.store.select(DashboardSelectors.selectMetricas);
    this.proximosACerrar$ = this.store.select(DashboardSelectors.selectProximosACerrar);
    this.horasPorProyecto$ = this.store.select(DashboardSelectors.selectHorasPorProyecto);
    this.proyectosPorCliente$ = this.store.select(DashboardSelectors.selectProyectosPorCliente);
    this.loading$ = this.store.select(DashboardSelectors.selectDashboardLoading);
  }

  ngOnInit(): void {
    this.store.dispatch(DashboardActions.loadDashboardData({ rango: 'mes' }));
  }

  onRangoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.rangoActual = select.value;
    this.store.dispatch(DashboardActions.loadDashboardData({ rango: this.rangoActual }));
    if (this.showDrawer && this.selectedProyecto) {
      this.cargarHorasIncompletas(this.selectedProyecto.id);
    }
  }

  onProyectoSelect(proyecto: any): void {
    this.selectedProyecto = proyecto;
    this.showDrawer = true;
    this.expandedCollaborators = {};
    this.cargarHorasIncompletas(proyecto.id);
  }

  cargarHorasIncompletas(idProyecto: number): void {
    this.loadingIncompletas = true;
    this.dashboardService.getHorasIncompletasProyecto(idProyecto, this.rangoActual)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.horasIncompletas = data;
          this.loadingIncompletas = false;
        },
        error: () => {
          this.horasIncompletas = [];
          this.loadingIncompletas = false;
        }
      });
  }

  cerrarDrawer(): void {
    this.showDrawer = false;
    this.selectedProyecto = null;
    this.horasIncompletas = [];
  }

  toggleCollaborator(idEmpleado: number): void {
    this.expandedCollaborators[idEmpleado] = !this.expandedCollaborators[idEmpleado];
  }

  enviarAlertaEmailServer(colab: any): void {
    const idEmp = colab.idEmpleado;
    if (this.enviandoAlerta[idEmp]) return;

    this.enviandoAlerta[idEmp] = true;
    this.errorAlerta[idEmp] = '';
    this.exitoAlerta[idEmp] = false;

    this.dashboardService.enviarNotificacionEmail(
      idEmp,
      colab.nombreCompleto,
      this.selectedProyecto.proyecto,
      colab.horasFaltantes
    ).subscribe({
      next: () => {
        this.enviandoAlerta[idEmp] = false;
        this.exitoAlerta[idEmp] = true;
        setTimeout(() => {
          this.exitoAlerta[idEmp] = false;
        }, 4000);
      },
      error: (err) => {
        this.enviandoAlerta[idEmp] = false;
        this.errorAlerta[idEmp] = err.error?.mensaje || 'Error al enviar correo';
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
