import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
 
@Component({
  selector: 'app-descargar-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './descargar-menu.component.html',
  styleUrl: './descargar-menu.component.scss',
})
export class DescargarMenuComponent {
  @Output() descargarPDF   = new EventEmitter<void>();
  @Output() descargarExcel = new EventEmitter<void>();
 
  abierto = false;
 
  toggle(): void {
    this.abierto = !this.abierto;
  }
 
  onPDF(): void {
    this.abierto = false;
    this.descargarPDF.emit();
  }
 
  onExcel(): void {
    this.abierto = false;
    this.descargarExcel.emit();
  }
 
  cerrar(): void {
    this.abierto = false;
  }
}