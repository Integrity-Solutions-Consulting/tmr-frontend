import { Component, Output, EventEmitter, HostListener, ElementRef, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DropdownScrollLockService } from '../../../../shared/services/dropdown-scroll-lock.service';

@Component({
  selector: 'app-modal-descarga',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-descarga.component.html',
  styleUrl: './modal-descarga.component.scss',
})
export class ModalDescargaComponent implements OnInit, OnDestroy {
  @Output() descargar = new EventEmitter<'pdf' | 'excel'>();
  @Output() cerrar    = new EventEmitter<void>();

  private dropdownScrollLock = inject(DropdownScrollLockService);

  // ── Cerrar al hacer click fuera ───────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const el = this['el'] as ElementRef;
    if (!el.nativeElement.contains(e.target)) {
      this.cerrar.emit();
    }
  }

  // sm - El padre crea/destruye este componente con *ngIf al abrir/cerrar, así que el propio
  // ciclo de vida basta para bloquear/liberar el scroll, igual que mat-select ("Tipo de proyecto").
  ngOnInit(): void {
    this.dropdownScrollLock.lock();
  }

  ngOnDestroy(): void {
    this.dropdownScrollLock.unlock();
  }

  constructor(private el: ElementRef) {}
}
