import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FiltroMetrica {
  tipo: 'estado' | 'asignacion';
  valor: string | null;
}

@Component({
  selector: 'app-cards-metricas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cards-metricas.component.html',
  styleUrl: './cards-metricas.component.scss',
})
export class CardsMetricasComponent {
  @Input() noAsignados: number = 0;
  @Input() asignados:   number = 0;
  @Input() inactivos:   number = 0;
  @Input() activos:     number = 0;

  @Output() filtrarTabla = new EventEmitter<FiltroMetrica>();

  mostrandoAsignados = false;
  mostrandoActivos   = false;

  toggleAsignados(): void {
    this.mostrandoAsignados = !this.mostrandoAsignados;
    this.filtrarTabla.emit({
      tipo:  'asignacion',
      valor: this.mostrandoAsignados ? 'asignado' : 'noAsignado',
    });
  }

  toggleActivos(): void {
    this.mostrandoActivos = !this.mostrandoActivos;
    this.filtrarTabla.emit({
      tipo:  'estado',
      valor: this.mostrandoActivos ? 'Activo' : 'Inactivo',
    });
  }
}
