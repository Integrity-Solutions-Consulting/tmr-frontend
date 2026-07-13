import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cards-metricas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cards-metricas.component.html',
  styleUrl: './cards-metricas.component.scss',
})
export class CardsMetricasComponent {
  @Input() totalColaboradores: number = 0;
  @Input() noAsignados: number = 0;
  @Input() asignados:   number = 0;
  @Input() inactivos:   number = 0;
  @Input() activos:     number = 0;
}
