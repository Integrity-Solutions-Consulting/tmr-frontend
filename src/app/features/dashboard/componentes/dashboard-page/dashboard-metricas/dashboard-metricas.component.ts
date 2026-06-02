import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardMetricas } from '../../../modelos/dashboard.model';

@Component({
  selector: 'app-dashboard-metricas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-metricas.component.html',
  styleUrls: ['./dashboard-metricas.component.scss']
})
export class DashboardMetricasComponent {
  @Input() metricas!: DashboardMetricas;
}
