import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalScrollLockService {
  private contador = 0;
  private overflowOriginal = '';

  lock(): void {
    if (this.contador === 0) {
      this.overflowOriginal = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    this.contador++;
  }

  unlock(): void {
    if (this.contador === 0) return;
    this.contador--;
    if (this.contador === 0) {
      document.body.style.overflow = this.overflowOriginal;
    }
  }
}
