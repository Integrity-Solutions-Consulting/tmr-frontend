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

  filtrandoAsignados = false;
  filtrandoInactivos = false;

  toggleAsignados(): void {
    if (this.filtrandoAsignados) {
      this.filtrandoAsignados = false;
      this.filtrarTabla.emit({ tipo: 'asignacion', valor: null });
    } else {
      this.filtrandoAsignados = true;
      this.filtrarTabla.emit({ tipo: 'asignacion', valor: 'asignado' });
    }
  }

  toggleActivos(): void {
    if (this.filtrandoInactivos) {
      this.filtrandoInactivos = false;
      this.filtrarTabla.emit({ tipo: 'estado', valor: 'Activo' });
    } else {
      this.filtrandoInactivos = true;
      this.filtrarTabla.emit({ tipo: 'estado', valor: 'Inactivo' });
    }
  }

  get asignacionNumero(): number {
    return this.filtrandoAsignados ? this.asignados : this.noAsignados;
  }

  get asignacionLabel(): string {
    return this.filtrandoAsignados ? 'Asignados' : 'No asignados';
  }

  get asignacionTitulo(): string {
    return this.filtrandoAsignados ? 'Mostrar todos' : 'Ver asignados';
  }

  get estadoNumero(): number {
    return this.filtrandoInactivos ? this.inactivos : this.activos;
  }

  get estadoLabel(): string {
    return this.filtrandoInactivos ? 'Inactivos' : 'Activos';
  }

  get estadoTitulo(): string {
    return this.filtrandoInactivos ? 'Mostrar activos' : 'Ver inactivos';
  }
}
