import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-boton',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './boton.html',
  styleUrl: './boton.scss',
})
export class Boton {
  @Input() label = '';
  @Input() icon = '';
  @Input() type: 'primary' | 'secondary' | 'danger' = 'primary';
  @Input() disabled = false;
  
  @Output() clicked = new EventEmitter<void>();

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}
