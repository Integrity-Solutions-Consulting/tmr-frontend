import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../modelos/cliente.model';

type SeccionDetalleCliente = 'general' | 'contacto' | 'proyectos';

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

  seccionesExpandido: Record<SeccionDetalleCliente, boolean> = {
    general: true,
    contacto: true,
    proyectos: false,
  };

  get totalProyectos(): number {
    return this.cliente?.proyectosAsignados?.length ?? 0;
  }

  toggleSeccion(seccion: SeccionDetalleCliente): void {
    this.seccionesExpandido[seccion] = !this.seccionesExpandido[seccion];
  }

  getEstadoClass(estado?: string | null): string {
    return (estado ?? 'sin seguimiento')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }
}
