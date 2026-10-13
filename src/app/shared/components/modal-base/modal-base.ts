import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ModalScrollLockService } from '../../services/modal-scroll-lock.service';

@Component({
  selector: 'app-modal-base',
  standalone: true,
  imports: [ScrollingModule],
  templateUrl: './modal-base.html',
  styleUrl: './modal-base.scss'
})
export class ModalBase implements OnChanges, OnDestroy {
  @Input() titulo: string = '';
  @Input() visible: boolean = false;
  @Input() wide: boolean = false;

  @Output() cerrar = new EventEmitter<void>();

  private readonly scrollLock = inject(ModalScrollLockService);
  private estabaAbierto = false;

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
}
