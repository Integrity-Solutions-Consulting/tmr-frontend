import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-descarga-modal',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './descarga-modal.html',
  styleUrl: './descarga-modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DescargaModal {

  @Input() visible = false;

  contenido = 'Proyectos';

  @Output() descargarPdf = new EventEmitter<string>();
  @Output() descargarExcel = new EventEmitter<string>();

}