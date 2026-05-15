import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HorasPorProyecto } from '../../../modelos/dashboard.model';
import { ReducePipe } from './reduce.pipe';

@Component({
  selector: 'app-grafico-horas',
  standalone: true,
  imports: [CommonModule, ReducePipe],
  templateUrl: './grafico-horas.component.html',
  styleUrls: ['./grafico-horas.component.scss']
})
export class GraficoHorasComponent {
  @Input() set horasData(data: HorasPorProyecto[]) {
    this._horasData = data;
    this.calcularMaximo();
  }

  get horasData(): HorasPorProyecto[] {
    return this._horasData;
  }

  private _horasData: HorasPorProyecto[] = [];
  maximo: number = 0;

  private calcularMaximo(): void {
    if (this.horasData.length > 0) {
      this.maximo = Math.max(...this.horasData.map(h => h.horas));
    }
  }

  getAltura(horas: number): number {
    if (this.maximo === 0) return 0;
    return (horas / this.maximo) * 100;
  }

  getNombreProyectoCorto(nombre: string): string {
    const partes = nombre.split(' ');
    return partes.slice(0, 3).join(' ');
  }
}
