import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ModalScrollLockService } from '../../services/modal-scroll-lock.service';

@Component({
  selector: 'app-success-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './success-modal.component.html',
  styleUrl: './success-modal.component.scss'
})
export class SuccessModalComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() mensaje = 'Operación realizada exitosamente';

  @Output() cerrar = new EventEmitter<void>();

  private estabaAbierto = false;

  constructor(private scrollLock: ModalScrollLockService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['visible']) return;

    if (this.visible && !this.estabaAbierto) {
      this.scrollLock.lock();
      this.estabaAbierto = true;
    } else if (!this.visible && this.estabaAbierto) {
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

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
