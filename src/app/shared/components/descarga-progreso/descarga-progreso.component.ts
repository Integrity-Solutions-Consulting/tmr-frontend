import { Component, inject } from '@angular/core';
import { DescargaProgresoService } from '../../services/descarga-progreso.service';

// sm - Toast animado de descarga (título, barra de progreso y botón Cancelar). Se monta una sola vez en el
// AppComponent y lo usan todas las descargas de la app a través de DescargaProgresoService.
@Component({
  selector: 'app-descarga-progreso',
  standalone: true,
  templateUrl: './descarga-progreso.component.html',
  styleUrl: './descarga-progreso.component.scss',
})
export class DescargaProgresoComponent {
  protected readonly descargas = inject(DescargaProgresoService);
  protected readonly estado = this.descargas.estado;
}
