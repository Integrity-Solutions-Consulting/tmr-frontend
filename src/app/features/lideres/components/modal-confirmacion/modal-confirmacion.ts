import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalScrollLockService } from '../../../../shared/services/modal-scroll-lock.service';

@Component({
  selector: 'app-modal-confirmacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-confirmacion.html',
  styleUrl: './modal-confirmacion.scss'
})
export class ModalConfirmacion implements OnChanges, OnDestroy {
  @Input() mostrar = false;
  @Input() mensaje = 'El nuevo líder ha sido agregado exitosamente';
  @Output() cerrarModal = new EventEmitter<void>();

  private estabaAbierto = false;

  constructor(private scrollLock: ModalScrollLockService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['mostrar']) return;

    if (this.mostrar && !this.estabaAbierto) {
      this.scrollLock.lock();
      this.estabaAbierto = true;
    } else if (!this.mostrar && this.estabaAbierto) {
      this.scrollLock.unlock();
      this.estabaAbierto = false;
    }
  }

  ngOnDestroy(): void {
    if (this.estabaAbierto) {
      this.scrollLock.unlock();
      this.estabaAbierto = false;
    }
  }

  cerrar() {
    this.cerrarModal.emit();
  }
}
