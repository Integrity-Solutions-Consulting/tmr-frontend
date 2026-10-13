import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Cliente } from '../../modelos/cliente.model';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import { ModalScrollLockService } from '../../../../shared/services/modal-scroll-lock.service';

type SeccionDetalleCliente = 'general' | 'contacto' | 'proyectos';

@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [CommonModule, BadgeEstadoComponent, ScrollingModule],
  templateUrl: './modal-detalle.component.html',
  styleUrl: './modal-detalle.component.scss',
})
export class ModalDetalleComponent implements OnInit, OnDestroy {
  @Input() cliente!: Cliente;
  @Output() cerrar = new EventEmitter<void>();

  private scrollLock = inject(ModalScrollLockService);

  ngOnInit(): void {
    this.scrollLock.lock();
  }

  ngOnDestroy(): void {
    this.scrollLock.unlock();
  }

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
