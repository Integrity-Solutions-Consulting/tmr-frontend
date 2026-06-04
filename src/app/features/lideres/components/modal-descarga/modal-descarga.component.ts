import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-descarga',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-descarga.component.html',
  styleUrls: ['./modal-descarga.component.scss']
})
export class ModalDescargaComponent {
  @Input() mostrar = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() descargarPDF = new EventEmitter<void>();
  @Output() descargarExcel = new EventEmitter<void>();

  onDescargarPDF(): void {
    this.descargarPDF.emit();
    this.cerrar.emit();
  }

  onDescargarExcel(): void {
    this.descargarExcel.emit();
    this.cerrar.emit();
  }
}
