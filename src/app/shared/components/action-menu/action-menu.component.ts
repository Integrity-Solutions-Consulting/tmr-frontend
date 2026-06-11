import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  action?: () => void;
}

@Component({
  selector: 'app-action-menu',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './action-menu.component.html',
  styleUrl: './action-menu.component.scss'
})
export class ActionMenuComponent {
  @ViewChild(MatMenuTrigger) private menuTrigger?: MatMenuTrigger;

  @Input() itemId = '';
  @Input() menuAbierto: string | null = null;
  @Input() acciones: ActionMenuItem[] = [
    { id: 'ver-mas', label: 'Ver mas' },
    { id: 'editar', label: 'Editar' }
  ];

  @Output() toggleMenu = new EventEmitter<{ id: string; event: Event }>();
  @Output() accionSeleccionada = new EventEmitter<ActionMenuItem>();

  get menuAbiertoPara(): boolean {
    return this.menuAbierto === this.itemId;
  }

  onToggleMenu(event: Event): void {
    event.stopPropagation();
    this.toggleMenu.emit({ id: this.itemId, event });
  }

  closeMenu(): void {
    this.menuTrigger?.closeMenu();
  }

  onAccionClick(accion: ActionMenuItem, event: Event): void {
    event.stopPropagation();
    if (accion.disabled) {
      return;
    }

    this.closeMenu();
    this.accionSeleccionada.emit(accion);
    accion.action?.();
  }
}
