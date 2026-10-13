import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { DropdownScrollLockService } from '../../services/dropdown-scroll-lock.service';

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
export class DescargaMenuComponent implements OnDestroy {
  @Input() etiquetaBoton = 'Descargar';
  @Input() contenidos: DescargaContenido[] = [
    { id: 'proyectos', label: 'Proyectos' }
  ];
  @Input() opciones: DescargaOpcion[] = [];

  @Output() descargarPdf = new EventEmitter<string>();
  @Output() descargarExcel = new EventEmitter<string>();
  @Output() opcionSeleccionada = new EventEmitter<DescargaOpcion>();

  private dropdownScrollLock = inject(DropdownScrollLockService);

  abierto = false;
  contenidoSeleccionado = 'proyectos';

  // sm - Bloquea/libera el scroll de fondo mientras el menú está abierto, igual que mat-select
  // ("Tipo de proyecto"). El overlay propio del panel ya cierra al hacer clic afuera.
  toggle(): void {
    this.abierto = !this.abierto;
    if (this.abierto) {
      this.dropdownScrollLock.lock();
    } else {
      this.dropdownScrollLock.unlock();
    }
  }

  cerrar(): void {
    if (this.abierto) {
      this.dropdownScrollLock.unlock();
    }
    this.abierto = false;
  }

  ngOnDestroy(): void {
    if (this.abierto) {
      this.dropdownScrollLock.unlock();
      this.abierto = false;
    }
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
