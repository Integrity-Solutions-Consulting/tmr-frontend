import { Component, Output, EventEmitter, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-descarga',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-descarga.component.html',
  styleUrl: './modal-descarga.component.scss',
})
export class ModalDescargaComponent {
  @Output() descargar = new EventEmitter<'pdf' | 'excel'>();
  @Output() cerrar    = new EventEmitter<void>();

  // ── Cerrar al hacer click fuera ───────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    const el = this['el'] as ElementRef;
    if (!el.nativeElement.contains(e.target)) {
      this.cerrar.emit();
    }
  }

  constructor(private el: ElementRef) {}
}