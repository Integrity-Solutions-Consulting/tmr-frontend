import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

/**
 * Punto único para los avisos de la aplicación. Mantiene el estilo de los
 * popups de Seguimiento y evita que cada pantalla vuelva a declarar las
 * mismas clases de SweetAlert.
 */
@Injectable({ providedIn: 'root' })
export class PopupService {
  show(icon: string, title: string, html: string, success = false): Promise<any> {
    return Swal.fire({
      icon: 'info',
      iconHtml: `<span class="material-symbols-outlined">${icon}</span>`,
      title,
      html,
      confirmButtonText: 'Entendido',
      buttonsStyling: false,
      customClass: {
        container: 'tmr-swal-container',
        popup: 'tmr-swal',
        icon: `tmr-swal__icon${success ? ' tmr-swal__icon--success' : ''}`,
        title: 'tmr-swal__title',
        htmlContainer: 'tmr-swal__text',
        actions: 'tmr-swal__actions',
        confirmButton: 'tmr-swal__btn-primary',
      },
    });
  }

  loading(title: string, html: string): void {
    void Swal.fire({
      title,
      html,
      allowOutsideClick: false,
      showConfirmButton: false,
      customClass: {
        container: 'tmr-swal-container',
        popup: 'tmr-swal tmr-swal--loading',
        title: 'tmr-swal__title',
        htmlContainer: 'tmr-swal__text',
      },
      didOpen: () => Swal.showLoading(),
    });
  }

  close(): void {
    Swal.close();
  }
}
