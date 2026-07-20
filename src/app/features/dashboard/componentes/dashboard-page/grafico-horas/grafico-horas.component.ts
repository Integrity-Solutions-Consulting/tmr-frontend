import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { HorasPorProyecto, ProyectosPorCliente } from '../../../modelos/dashboard.model';
import { ReducePipe } from './reduce.pipe';

@Component({
  selector: 'app-grafico-horas',
  standalone: true,
  imports: [CommonModule, ReducePipe, MatIconModule],
  templateUrl: './grafico-horas.component.html',
  styleUrls: ['./grafico-horas.component.scss']
})
export class GraficoHorasComponent {

  @Output() proyectoSelect = new EventEmitter<HorasPorProyecto>();

  onProyectoClick(item: HorasPorProyecto): void {
    this.proyectoSelect.emit(item);
  }

  @Input() set horasData(data: HorasPorProyecto[]) {
    this._horasData = data;
    this.calcularMaximo();
  }

  get horasData(): HorasPorProyecto[] {
    return this._horasData;
  }

  @Input() proyectosPorCliente: ProyectosPorCliente[] = [];
  @Input() totalProyectos: number = 0;

  private _horasData: HorasPorProyecto[] = [];
  maximo: number = 0;
  
  // Carousel State
  currentSlide: number = 0;
  totalSlides: number = 2; // 0: Horas reportadas, 1: Proyectos activos

  // Colors for Donut Chart
  colors: string[] = ['#0ea5e9', '#3b82f6', '#6366f1', '#ec4899', '#f59e0b', '#f97316', '#a855f7', '#10b981'];

  private calcularMaximo(): void {
    if (this.horasData.length > 0) {
      this.maximo = Math.max(...this.horasData.map(h => h.horas));
    }
  }

  getAltura(item: HorasPorProyecto): number {
    if (item.horasAsignadas && item.horasAsignadas > 0) {
      return Math.min((item.horas / item.horasAsignadas) * 100, 100);
    }
    if (this.maximo === 0) return 0;
    return (item.horas / this.maximo) * 100;
  }

  getNombreProyectoCorto(nombre: string): string {
    const partes = nombre.split(' ');
    return partes.slice(0, 3).join(' ');
  }

  getAvanceJornada(): number {
    if (!this.horasData || this.horasData.length === 0) return 0;
    
    let totalEfectivo = 0;
    let totalAsignadas = 0;

    for (const item of this.horasData) {
      if (item.horasAsignadas && item.horasAsignadas > 0) {
        totalAsignadas += item.horasAsignadas;
        totalEfectivo += Math.min(item.horas, item.horasAsignadas);
      }
    }

    if (totalAsignadas === 0) return 0;
    return Math.min((totalEfectivo / totalAsignadas) * 100, 100);
  }

  getPorcentajeProyecto(item: HorasPorProyecto): number {
    if (!item.horasAsignadas || item.horasAsignadas === 0) return 0;
    return Math.min((item.horas / item.horasAsignadas) * 100, 100);
  }

  // Carousel Navigation
  prevSlide(): void {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
  }

  setSlide(index: number): void {
    this.currentSlide = index;
  }

  // Get dynamic slice details for SVG Donut Chart
  get donutSlices() {
    let accumulatedPercentage = 0;
    // Calculate total projects across top clients to calculate accurate segment values
    const total = this.proyectosPorCliente.reduce((sum, p) => sum + p.proyectosAsignados, 0);

    return this.proyectosPorCliente.map((item, index) => {
      const percentage = total > 0 ? (item.proyectosAsignados / total) * 100 : 0;
      const circumference = 2 * Math.PI * 50; // ~314.159
      const strokeLength = (percentage / 100) * circumference;
      const strokeSpace = circumference - strokeLength;
      const offset = (accumulatedPercentage / 100) * circumference;
      
      accumulatedPercentage += percentage;

      return {
        cliente: item.cliente,
        proyectos: item.proyectosAsignados,
        porcentaje: item.porcentaje,
        color: this.colors[index % this.colors.length],
        dashArray: `${strokeLength} ${strokeSpace}`,
        dashOffset: `-${offset}`
      };
    });
  }
}
