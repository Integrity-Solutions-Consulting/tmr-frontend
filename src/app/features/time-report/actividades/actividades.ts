import { Component, inject, OnInit } from '@angular/core';
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
export class Actividades implements OnInit {
    public actividadesService = inject(ActividadesService);
    private dialog = inject(MatDialog);

    ngOnInit() {
        this.actividadesService.cargarResumen();
        // Si tienes el mes y año actual, llama a cargarCalendario también
        const hoy = new Date();
        this.actividadesService.cargarCalendario(hoy.getFullYear(), hoy.getMonth() + 1);
    }

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
