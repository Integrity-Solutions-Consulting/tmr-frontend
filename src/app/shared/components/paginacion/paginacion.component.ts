import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-paginacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paginacion.component.html',
  styleUrl: './paginacion.component.scss',
})
export class PaginacionComponent implements OnChanges {
  @Input() paginaActual: number = 1;
  @Input() totalPaginas: number = 1;
  @Input() total: number = 0;
  @Input() porPagina: number = 10;
  @Output() paginaCambia = new EventEmitter<number>();

  paginas: (number | '...')[] = [];

  ngOnChanges(): void {
    this.generarPaginas();
  }

  generarPaginas(): void {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    const res: (number | '...')[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) res.push(i);
    } else {
      res.push(1);
      if (actual > 3) res.push('...');
      const inicio = Math.max(2, actual - 1);
      const fin = Math.min(total - 1, actual + 1);
      for (let i = inicio; i <= fin; i++) res.push(i);
      if (actual < total - 2) res.push('...');
      res.push(total);
    }
    this.paginas = res;
  }

  get registroInicio() { return (this.paginaActual - 1) * this.porPagina + 1; }
  get registroFin() { return Math.min(this.paginaActual * this.porPagina, this.total); }

  irA(p: number | '...') { if (p !== '...') this.paginaCambia.emit(p); }
  primera() { this.irA(1); }
  anterior() { if (this.paginaActual > 1) this.irA(this.paginaActual - 1); }
  siguiente() { if (this.paginaActual < this.totalPaginas) this.irA(this.paginaActual + 1); }
  ultima() { this.irA(this.totalPaginas); }
}
