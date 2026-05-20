import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-modal-base',
  standalone: true,
  imports: [],
  templateUrl: './modal-base.html',
  styleUrl: './modal-base.scss'
})
export class ModalBase {
  @Input() titulo: string = '';
  @Input() visible: boolean = false;
  @Input() wide: boolean = false;

  @Output() cerrar = new EventEmitter<void>();
}
