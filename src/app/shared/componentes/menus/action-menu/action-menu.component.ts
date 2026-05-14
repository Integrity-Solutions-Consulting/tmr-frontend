import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
  action: () => void;
}

@Component({
  selector: 'app-action-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './action-menu.component.html',
  styleUrl: './action-menu.component.scss',
})
export class ActionMenuComponent {
  @Input() itemId: string = '';
  @Input() menuAbierto: string | null = null;
  @Input() acciones: ActionMenuItem[] = [];

  @Output() toggleMenu = new EventEmitter<{ id: string; event: Event }>();
  @Output() accionSeleccionada = new EventEmitter<ActionMenuItem>();

  onToggleMenu(event: Event): void {
    event.stopPropagation();
    this.toggleMenu.emit({ id: this.itemId, event });
  }

  onAccionClick(accion: ActionMenuItem, event: Event): void {
    event.stopPropagation();
    this.accionSeleccionada.emit(accion);
    accion.action();
  }

  get menuAbiertoPara(): boolean {
    return this.menuAbierto === this.itemId;
  }
}
