import { Injectable } from '@angular/core';

// Bloquea el scroll (rueda del mouse / touch) de TODO el documento mientras haya al menos
// un desplegable casero abierto, excepto dentro de los paneles marcados con el atributo
// `data-scroll-lock-exempt` (para que la propia lista de opciones del desplegable, si es
// larga y tiene su scroll interno, se pueda seguir desplazando con normalidad). Misma idea
// que el backdrop transparente que usa mat-select/mat-autocomplete de Angular Material.
@Injectable({ providedIn: 'root' })
export class DropdownScrollLockService {
  private contador = 0;
  private readonly onWheel = (e: Event) => this.bloquearSiFuera(e);
  private readonly onTouchMove = (e: Event) => this.bloquearSiFuera(e);

  lock(): void {
    if (this.contador === 0) {
      window.addEventListener('wheel', this.onWheel, { passive: false });
      window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    }
    this.contador++;
  }

  unlock(): void {
    if (this.contador === 0) return;
    this.contador--;
    if (this.contador === 0) {
      window.removeEventListener('wheel', this.onWheel);
      window.removeEventListener('touchmove', this.onTouchMove);
    }
  }

  private bloquearSiFuera(e: Event): void {
    const destino = e.target as HTMLElement | null;
    if (destino?.closest?.('[data-scroll-lock-exempt]')) return;
    e.preventDefault();
  }
}
