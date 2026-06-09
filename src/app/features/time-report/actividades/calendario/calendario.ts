import { Component, EventEmitter, Output, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ActividadesService } from '../../../../shared/services/actividades.service';
import { FeriadosService } from '../../../../shared/services/feriados.service';
import { HorasFormatPipe } from '../../../../shared/pipes/horas-format.pipe';

interface DiaCalendario {
    fecha: Date;
    esMesActual: boolean;
    esHoy: boolean;
    esFinDeSemana: boolean;
    esFeriado: boolean;
    horas: number;
    actividades: any[];
}

@Component({
    selector: 'app-calendario',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        HorasFormatPipe
    ],
    templateUrl: './calendario.html',
    styleUrls: ['./calendario.scss']
})
export class Calendario {
    @Output() diaSeleccionado = new EventEmitter<Date>();
    @Output() editarActividadEvent = new EventEmitter<any>();

    private actividadesService = inject(ActividadesService);
    private feriadosService = inject(FeriadosService);

    public nombresDias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    public mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    constructor() {
        effect(() => {
            const fecha = this._fechaActual();
            this.actividadesService.cargarCalendario(fecha.getFullYear(), fecha.getMonth() + 1);
        });
    }

    private _fechaActual = signal(new Date());
    public mesSeleccionado = this._fechaActual().getMonth();

    get mesLabel(): string {
        return this.mesesNombres[this._fechaActual().getMonth()];
    }

    get anioActual(): number {
        return this._fechaActual().getFullYear();
    }

    onMesChange() {
        const d = this._fechaActual();
        this._fechaActual.set(new Date(d.getFullYear(), this.mesSeleccionado, 1));
    }

    diasCalendario = computed(() => {
        const fecha = this._fechaActual();
        const mes = fecha.getMonth();
        const anio = fecha.getFullYear();
        const primerDia = new Date(anio, mes, 1);
        const ultimoDia = new Date(anio, mes + 1, 0);
        const dias: DiaCalendario[] = [];
        const hoy = new Date();

        const offset = primerDia.getDay();
        for (let i = offset; i > 0; i--) {
            dias.push(this.crearDia(new Date(anio, mes, 1 - i), false, hoy));
        }
        for (let i = 1; i <= ultimoDia.getDate(); i++) {
            dias.push(this.crearDia(new Date(anio, mes, i), true, hoy));
        }
        const resto = 42 - dias.length;
        for (let i = 1; i <= resto; i++) {
            dias.push(this.crearDia(new Date(anio, mes + 1, i), false, hoy));
        }
        return dias;
    });

    private crearDia(fecha: Date, esMesActual: boolean, hoy: Date): DiaCalendario {
        const actividades = this.actividadesService.getActividadesPorFecha(fecha);
        const horas = actividades.reduce((acc: number, curr: any) => acc + (curr.cantidadhoras || 0), 0);
        return {
            fecha,
            esMesActual,
            esHoy: this.mismaFecha(fecha, hoy),
            esFinDeSemana: fecha.getDay() === 0 || fecha.getDay() === 6,
            esFeriado: this.feriadosService.esFeriado(fecha),
            horas,
            actividades
        };
    }

    editarActividad(event: MouseEvent, actividad: any) {
        event.stopPropagation();
        this.editarActividadEvent.emit(actividad);
    }

    getActividadClass(act: any): string {
        const id = Number(act.idtipoactividad || 1);
        if (id % 3 === 0) return 'type-nacional';
        if (id % 3 === 1) return 'type-local';
        return 'type-religioso';
    }

    private mismaFecha(a: Date, b: Date): boolean {
        return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
    }

    anteriorMes() {
        const d = this._fechaActual();
        const nuevo = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        this._fechaActual.set(nuevo);
        this.mesSeleccionado = nuevo.getMonth();
    }

    siguienteMes() {
        const d = this._fechaActual();
        const nuevo = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        this._fechaActual.set(nuevo);
        this.mesSeleccionado = nuevo.getMonth();
    }

    irAHoy() {
        const hoy = new Date();
        this._fechaActual.set(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        this.mesSeleccionado = hoy.getMonth();
    }

    seleccionarDia(fecha: Date) {
        this.diaSeleccionado.emit(fecha);
    }
}
