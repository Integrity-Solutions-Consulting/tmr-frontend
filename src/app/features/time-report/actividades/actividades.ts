import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { Calendario } from './calendario/calendario';
import { AgregarActividad } from './agregar-actividad/agregar-actividad';
import { GenerarReporte } from './generar-reporte/generar-reporte';

import { ActividadesService } from '../../../shared/services/actividades.service';
import { HorasFormatPipe } from '../../../shared/pipes/horas-format.pipe';

@Component({
    selector: 'app-actividades',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        Calendario,
        HorasFormatPipe
    ],
    templateUrl: './actividades.html',
    styleUrls: ['./actividades.scss']
})
export class Actividades {
    public actividadesService = inject(ActividadesService);
    private dialog = inject(MatDialog);

    /**
     * Abre el modal de agregar actividad sin fecha preseleccionada
     */
    abrirAgregarActividad() {
        this.dialog.open(AgregarActividad, {
            width: '600px',
            maxHeight: '90vh',
            disableClose: false
        });
    }

    /**
     * Al seleccionar un día en el calendario, abre el modal con esa fecha
     */
    onDiaSeleccionado(fecha: Date) {
        this.dialog.open(AgregarActividad, {
            width: '600px',
            maxHeight: '90vh',
            data: { fecha },
            disableClose: false
        });
    }

    /**
     * Abre el configurador de reportes
     */
    abrirGenerarReporte() {
        this.dialog.open(GenerarReporte, {
            width: '460px',
        });
    }
}