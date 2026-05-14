import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

export interface DescargaOpcion {
  id: string;
  label: string;
  icon?: string;
  action: () => void;
}

export interface DescargaContenido {
  id: string;
  label: string;
}

@Component({
  selector: 'app-descarga-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatSelectModule],
  templateUrl: './descarga-menu.component.html',
  styleUrl: './descarga-menu.component.scss'
})
export class DescargaMenuComponent {
  @Input() etiquetaBoton = 'Descargar';
  @Input() contenidos: DescargaContenido[] = [
    { id: 'proyectos', label: 'Proyectos' }
  ];
  @Input() opciones: DescargaOpcion[] = [];

  @Output() descargarPdf = new EventEmitter<string>();
  @Output() descargarExcel = new EventEmitter<string>();
  @Output() opcionSeleccionada = new EventEmitter<DescargaOpcion>();

  abierto = false;
  contenidoSeleccionado = 'proyectos';

  toggle(): void {
    this.abierto = !this.abierto;
  }

  cerrar(): void {
    this.abierto = false;
  }

  onDescargarPdf(event: Event): void {
    event.stopPropagation();
    this.descargarPorFormato('pdf');
  }

  onDescargarExcel(event: Event): void {
    event.stopPropagation();
    this.descargarPorFormato('excel');
  }

  private descargarPorFormato(formato: 'pdf' | 'excel'): void {
    const opcion = this.opciones.find(item => item.id.toLowerCase().includes(formato));

    if (opcion) {
      this.opcionSeleccionada.emit(opcion);
      opcion.action();
    }

    if (formato === 'pdf') {
      this.descargarPdf.emit(this.contenidoSeleccionado);
    } else {
      this.descargarExcel.emit(this.contenidoSeleccionado);
    }

    this.cerrar();
  }
}
