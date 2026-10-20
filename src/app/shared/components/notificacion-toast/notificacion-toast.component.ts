import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificacionToastService, TipoToast } from '../../services/notificacion-toast.service';

// Toasts apilados arriba a la derecha para seguir una petición paso a paso (aviso manual de horas, etc.).
// Se monta una sola vez en el AppComponent y se controla desde NotificacionToastService.
@Component({
  selector: 'app-notificacion-toast',
  standalone: true,
  imports: [NgClass],
  templateUrl: './notificacion-toast.component.html',
  styleUrl: './notificacion-toast.component.scss',
})
export class NotificacionToastComponent {
  protected readonly servicio = inject(NotificacionToastService);
  protected readonly toasts = this.servicio.toasts;

  protected icono(tipo: TipoToast): string {
    switch (tipo) {
      case 'exito': return 'check_circle';
      case 'error': return 'error';
      case 'aviso': return 'info';
      default: return 'mail';
    }
  }

  protected iconoPaso(estado: string): string {
    switch (estado) {
      case 'ok': return 'check';
      case 'error': return 'close';
      case 'aviso': return 'remove';
      default: return '';
    }
  }
}
