import { Component, inject } from '@angular/core';
import { NotificacionToastService, TipoToast } from '../../services/notificacion-toast.service';

// Toasts apilados arriba a la derecha, cada uno independiente (no mutan de estado entre sí).
// Se monta una sola vez en el AppComponent y se controla desde NotificacionToastService.
@Component({
  selector: 'app-notificacion-toast',
  standalone: true,
  imports: [],
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
      case 'warning': return 'warning';
      default: return 'info';
    }
  }
}
