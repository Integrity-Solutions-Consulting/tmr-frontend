import { Component, Input } from '@angular/core';
import { HorasFormatPipe } from '../../pipes/horas-format.pipe';

// sm - Barra de métricas de horas compartida por Seguimiento y Actividades (mismo diseño y mismas métricas:
// Horas por registrar, Horas registradas y Promedio por día).
// - enBlanco: muestra guion y atenúa la barra (Seguimiento sin selección parcial). Actividades nunca la usa: muestra 0.
// - textoAyuda: texto que aparece a la derecha solo cuando la barra está en blanco.
// - El contenido proyectado (ng-content) se agrega al final de la barra (p. ej. el botón "Generar Reporte").
@Component({
    selector: 'app-metricas-horas',
    standalone: true,
    imports: [HorasFormatPipe],
    templateUrl: './metricas-horas.component.html',
    styleUrl: './metricas-horas.component.scss'
})
export class MetricasHorasComponent {
    @Input() horasPorRegistrar = 0;
    @Input() horasRegistradas = 0;
    @Input() promedioPorDia = 0;
    @Input() tituloHorasRegistradas = 'Horas registradas';
    @Input() descripcionHorasRegistradas = 'Total del periodo';
    @Input() enBlanco = false;
    @Input() textoAyuda = '';
}
