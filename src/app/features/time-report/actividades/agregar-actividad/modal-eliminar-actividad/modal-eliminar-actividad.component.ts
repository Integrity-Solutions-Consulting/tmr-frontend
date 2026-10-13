import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalScrollLockService } from '../../../../../shared/services/modal-scroll-lock.service';

@Component({
  selector: 'app-modal-eliminar-actividad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-eliminar-actividad.component.html',
  styleUrl: './modal-eliminar-actividad.component.scss'
})
export class ModalEliminarActividadComponent implements OnChanges, OnDestroy {
  @Input() mostrar = false;
  @Input() descripcionActividad = '';
  @Input() error: string | null = null;
  @Input() procesando = false;
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
