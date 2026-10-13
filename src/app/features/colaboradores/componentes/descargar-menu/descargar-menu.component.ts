import { Component, Input, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownScrollLockService } from '../../../../shared/services/dropdown-scroll-lock.service';

@Component({
  selector: 'app-descargar-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './descargar-menu.component.html',
  styleUrl: './descargar-menu.component.scss',
})
export class DescargarMenuComponent implements OnDestroy {
  @Input()  disabled       = false;
  @Output() descargarPDF   = new EventEmitter<void>();
  @Output() descargarExcel = new EventEmitter<void>();

  private dropdownScrollLock = inject(DropdownScrollLockService);

  // sm - Accessor: cualquier asignación bloquea/libera el scroll de fondo sola
  // (DropdownScrollLockService), igual que mat-select ("Tipo de proyecto").
  private _abierto = false;
  get abierto(): boolean {
    return this._abierto;
  }
  set abierto(valor: boolean) {
    if (valor === this._abierto) return;
    this._abierto = valor;
    if (valor) {
      this.dropdownScrollLock.lock();
    } else {
      this.dropdownScrollLock.unlock();
    }
  }

  toggle(): void {
    this.abierto = !this.abierto;
  }

  onPDF(): void {
    this.abierto = false;
    this.descargarPDF.emit();
  }

  onExcel(): void {
    this.abierto = false;
    this.descargarExcel.emit();
  }

  cerrar(): void {
    this.abierto = false;
  }

  ngOnDestroy(): void {
    this.abierto = false;
  }
}
