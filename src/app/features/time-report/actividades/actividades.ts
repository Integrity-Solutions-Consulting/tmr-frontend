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

    fechaSeleccionada: Date = new Date();

    get fechaFormateada(): string {
        if (!this.fechaSeleccionada) return '';
        const dia = String(this.fechaSeleccionada.getDate()).padStart(2, '0');
        const mes = String(this.fechaSeleccionada.getMonth() + 1).padStart(2, '0');
        const anio = this.fechaSeleccionada.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

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
            maxHeight: '90vh',
            data: { fecha: this.fechaSeleccionada },
            disableClose: false,
            panelClass: 'tmr-dialog-panel'
        });
    }

    /**
     * Al seleccionar un día en el calendario, actualiza la fecha seleccionada.
     * En escritorio abre el modal inmediatamente.
     */
    onDiaSeleccionado(fecha: Date) {
        this.fechaSeleccionada = fecha;
        if (window.innerWidth > 1024) {
            this.dialog.open(AgregarActividad, {
                maxHeight: '90vh',
                data: { fecha },
                disableClose: false,
                panelClass: 'tmr-dialog-panel'
            });
        }
    }

    /**
     * Abre el modal de agregar actividad especificando una fecha determinada
     */
    abrirAgregarActividadConFecha(fecha: Date) {
        this.dialog.open(AgregarActividad, {
            maxHeight: '90vh',
            data: { fecha },
            disableClose: false,
            panelClass: 'tmr-dialog-panel'
        });
    }

    /**
     * Al seleccionar una actividad específica para editarla
     */
    onEditarActividad(actividad: any) {
        this.dialog.open(AgregarActividad, {
            maxHeight: '90vh',
            data: { actividad },
            disableClose: false,
            panelClass: 'tmr-dialog-panel'
        });
    }

    /**
     * Devuelve la clase correspondiente según el tipo de actividad para aplicar estilos en mobile
     */
    getActividadClass(act: any): string {
        const id = Number(act.idtipoactividad || 1);
        if (id % 3 === 0) return 'type-nacional';
        if (id % 3 === 1) return 'type-local';
        return 'type-religioso';
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
