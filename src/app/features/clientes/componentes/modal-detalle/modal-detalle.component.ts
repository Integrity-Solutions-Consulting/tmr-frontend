import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../modelos/cliente.model';

@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-detalle.component.html',
  styleUrl: './modal-detalle.component.scss',
})
export class ModalDetalleComponent {
  @Input() cliente!: Cliente;
  @Output() cerrar = new EventEmitter<void>();

  expandido = false;

  toggleProyectos(): void {
    this.expandido = !this.expandido;
  }

  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.cerrar.emit();
    }
  }

  getEstadoClass(estado: string): string {
    const e = estado?.toLowerCase().trim();
    if (e === 'en progreso')    return 'en-progreso';
    if (e === 'completado')     return 'completado';
    if (e === 'cancelado')      return 'cancelado';
    if (e === 'en espera')      return 'en-espera';
    if (e === 'pausado')        return 'pausado';
    if (e === 'inactivo')       return 'inactivo';
    if (e === 'aprobado')       return 'aprobado';
    if (e === 'aplazado')       return 'aplazado';
    if (e === 'planificación')  return 'planificacion';
    return '';
  }
}