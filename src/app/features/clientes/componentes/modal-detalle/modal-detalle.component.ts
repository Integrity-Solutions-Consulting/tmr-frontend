import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cliente } from '../../modelos/cliente.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';

type SeccionDetalleCliente = 'general' | 'contacto' | 'proyectos';

@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent],
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
}
