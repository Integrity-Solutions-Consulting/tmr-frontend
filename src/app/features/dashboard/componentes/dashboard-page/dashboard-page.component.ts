import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import * as DashboardActions from '../../store/dashboard.actions';
import * as DashboardSelectors from '../../store/dashboard.selectors';
import { DashboardMetricasComponent } from './dashboard-metricas/dashboard-metricas.component';
import { ProximosACerrarComponent } from './proximamente-cerrar/proximamente-cerrar.component';
import { GraficoHorasComponent } from './grafico-horas/grafico-horas.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardMetricasComponent,
    ProximosACerrarComponent,
    GraficoHorasComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss']
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();

  metricas$!: Observable<any>;
  proximosACerrar$!: Observable<any>;
  horasPorProyecto$!: Observable<any>;
  loading$!: Observable<any>;

  constructor(private store: Store) {
    this.metricas$ = this.store.select(DashboardSelectors.selectMetricas);
    this.proximosACerrar$ = this.store.select(DashboardSelectors.selectProximosACerrar);
    this.horasPorProyecto$ = this.store.select(DashboardSelectors.selectHorasPorProyecto);
    this.loading$ = this.store.select(DashboardSelectors.selectDashboardLoading);
  }

  ngOnInit(): void {
    this.store.dispatch(DashboardActions.loadDashboardData({ rango: 'mes' }));
  }

  onRangoChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.store.dispatch(DashboardActions.loadDashboardData({ rango: select.value }));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
