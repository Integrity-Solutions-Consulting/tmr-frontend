import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DescargaOpcion {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

@Component({
  selector: 'app-descarga-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './descarga-menu.component.html',
  styleUrl: './descarga-menu.component.scss',
})
export class DescargaMenuComponent {
  @Input() opciones: DescargaOpcion[] = [];
  @Input() titulo: string = 'Seleccione el formato:';
  @Input() etiquetaBoton: string = 'Descargar';

  @Output() opcionSeleccionada = new EventEmitter<DescargaOpcion>();

  abierto = false;

  toggle(): void {
    this.abierto = !this.abierto;
  }

  onOpcion(opcion: DescargaOpcion, event: Event): void {
    event.stopPropagation();
    this.abierto = false;
    this.opcionSeleccionada.emit(opcion);
    opcion.action();
  }

  cerrar(): void {
    this.abierto = false;
  }
}
