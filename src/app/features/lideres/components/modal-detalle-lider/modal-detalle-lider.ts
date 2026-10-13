import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, inject } from '@angular/core';
import { ModalScrollLockService } from '../../../../shared/services/modal-scroll-lock.service';

@Component({
  selector: 'app-modal-detalle-lider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-detalle-lider.html',
  styleUrl: './modal-detalle-lider.scss'
})
export class ModalDetalleLider implements OnInit, OnDestroy {
  @Input() lider: any;
  @Output() cerrarModal = new EventEmitter<void>();

  private scrollLock = inject(ModalScrollLockService);

  proyectosExpandido = false;

  ngOnInit(): void {
    this.scrollLock.lock();
  }

  ngOnDestroy(): void {
    this.scrollLock.unlock();
  }

  cerrar() {
    this.cerrarModal.emit();
  }

  toggleProyectos() {
    this.proyectosExpandido = !this.proyectosExpandido;
  }
}