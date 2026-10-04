import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

// sm - Tonos de la tarjeta. Los del dashboard (corporativo, destacado, cian, peligro, neutro) más éxito y advertencia
// para tipos que ya tienen un color propio en el sistema (ej. tipos de feriado en el calendario).
export type TonoTarjeta = 'corporativo' | 'destacado' | 'cian' | 'peligro' | 'neutro' | 'exito' | 'advertencia';

/**
 * sm - Tarjeta de resumen única del sistema, con el diseño del Dashboard ejecutivo (estilo small-box: acento de color
 * a la izquierda, número grande, título e ícono de fondo). La usan el dashboard, Clientes, Colaboradores, Líderes,
 * Reportes, Usuarios, Roles, Catálogos y Días Festivos para que todas se vean igual.
 * Si se indica `accion` (ej. "Ver detalle"), la tarjeta es clicable, muestra el pie y emite `abrir`.
 */
@Component({
  selector: 'app-tarjeta-resumen',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule],
  templateUrl: './tarjeta-resumen.component.html',
  styleUrl: './tarjeta-resumen.component.scss',
})
export class TarjetaResumenComponent {
  readonly valor = input<string | number | null>(0);
  readonly titulo = input('');
  readonly icono = input('');
  readonly tono = input<TonoTarjeta>('corporativo');
  readonly accion = input<string | null>(null);
  readonly seleccionada = input(false);
  readonly definicion = input<string | null>(null);

  readonly abrir = output<void>();

  clic(): void {
    if (this.accion()) this.abrir.emit();
  }
}
