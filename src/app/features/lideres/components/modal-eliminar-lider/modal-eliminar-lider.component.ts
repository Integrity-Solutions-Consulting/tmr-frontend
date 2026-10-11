import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalScrollLockService } from '../../../../shared/services/modal-scroll-lock.service';

@Component({
  selector: 'app-modal-eliminar-lider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-eliminar-lider.component.html',
  styleUrl: './modal-eliminar-lider.component.scss'
})
export class ModalEliminarLiderComponent implements OnChanges, OnDestroy {
  @Input() mostrar = false;
  @Input() nombreLider = '';
  @Input() error: string | null = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() confirmarEliminar = new EventEmitter<void>();

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
}