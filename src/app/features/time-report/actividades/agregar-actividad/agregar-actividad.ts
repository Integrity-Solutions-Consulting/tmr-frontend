import { Component, Inject, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

import { ActividadesService } from '../../../../shared/services/actividades.service';
import { FeriadosService } from '../../../../shared/services/feriados.service';

@Component({
    selector: 'app-agregar-actividad',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule
    ],
    templateUrl: './agregar-actividad.html',
    styleUrls: ['./agregar-actividad.scss']
})
export class AgregarActividad implements OnInit {
    private fb = inject(FormBuilder);
    private actividadesService = inject(ActividadesService);
    private feriadosService = inject(FeriadosService);
    private dialogRef = inject(MatDialogRef<AgregarActividad>);
    private http = inject(HttpClient);

    public form!: FormGroup;
    public esEdicion = false;

    // Signals para llenar los dropdowns desde la base de datos
    public tiposActividad = signal<{ id: string, nombre: string }[]>([]);
    public proyectos = signal<{ id: string, nombre: string }[]>([]);

    // Convertimos los cambios del formulario a un Signal para que el computed reaccione
    private formValues = inject(FormBuilder).group({}); // temporal para inicializar
    public formState = toSignal(this.fb.group({}).valueChanges); // Se asignará en ngOnInit

    constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

    private formatFecha(d: Date | string | null | undefined): string {
        if (!d) return '';
        if (d instanceof Date) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        }
        const str = String(d).split('T')[0];
        const parts = str.split('-');
        if (parts.length === 3) {
            return str;
        }
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    private parseLocal(d: any): Date {
        if (d instanceof Date) return d;
        if (typeof d === 'string') {
            const parts = d.split('-');
            if (parts.length === 3) {
                return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            }
        }
        return new Date(d);
    }

    ngOnInit() {
        this.cargarCatalogos();

        const act = this.data?.actividad;
        this.esEdicion = !!act;

        const defaultDate = this.formatFecha(act ? act.fechaactividad : (this.data?.fecha || new Date()));

        this.form = this.fb.group({
            tipoActividad: [act ? String(act.idtipoactividad) : null, Validators.required],
            proyectoId: [act && act.idproyecto ? String(act.idproyecto) : null, Validators.required],
            codigoRequerimiento: [act ? act.codigorequerimiento : '', [Validators.required, Validators.maxLength(50)]],
            descripcion: [act ? act.descripcionactividad : '', Validators.maxLength(255)],
            fechaActividad: [defaultDate, Validators.required],
            numeroHoras: [act ? act.cantidadhoras : 4, [Validators.required, Validators.min(0.5), Validators.max(24)]],
            esRecurrente: [false],
            fechaInicio: [defaultDate],
            fechaFin: [''],
            horasPorDia: [act ? act.cantidadhoras : 4],
            incluirFinesDeSemana: [false],
            incluirFeriados: [false],
            notas: [act ? act.notas : ''],
            esbillable: [act ? act.esbillable : true]
        });

        // Escucha cambios en esRecurrente para habilitar/deshabilitar validadores y asignar fecha fin por defecto
        this.form.get('esRecurrente')?.valueChanges.subscribe(isRecurrent => {
            const fechaActividadCtrl = this.form.get('fechaActividad');
            const numeroHorasCtrl = this.form.get('numeroHoras');
            const fechaInicioCtrl = this.form.get('fechaInicio');
            const fechaFinCtrl = this.form.get('fechaFin');
            const horasPorDiaCtrl = this.form.get('horasPorDia');

            if (isRecurrent) {
                fechaActividadCtrl?.clearValidators();
                numeroHorasCtrl?.clearValidators();
                fechaInicioCtrl?.setValidators(Validators.required);
                fechaFinCtrl?.setValidators(Validators.required);
                horasPorDiaCtrl?.setValidators([Validators.required, Validators.min(0.5), Validators.max(24)]);

                // Asigna por defecto 4 días después si fechaFin no tiene valor
                if (fechaInicioCtrl?.value && fechaFinCtrl && !fechaFinCtrl.value) {
                    const inicio = this.parseLocal(fechaInicioCtrl.value);
                    if (!isNaN(inicio.getTime())) {
                        const fin = new Date(inicio);
                        fin.setDate(fin.getDate() + 4);
                        fechaFinCtrl.setValue(this.formatFecha(fin));
                        fechaFinCtrl.markAsPristine();
                    }
                }
            } else {
                fechaActividadCtrl?.setValidators(Validators.required);
                numeroHorasCtrl?.setValidators([Validators.required, Validators.min(0.5), Validators.max(24)]);
                fechaInicioCtrl?.clearValidators();
                fechaFinCtrl?.clearValidators();
                horasPorDiaCtrl?.clearValidators();
            }

            fechaActividadCtrl?.updateValueAndValidity();
            numeroHorasCtrl?.updateValueAndValidity();
            fechaInicioCtrl?.updateValueAndValidity();
            fechaFinCtrl?.updateValueAndValidity();
            horasPorDiaCtrl?.updateValueAndValidity();
        });

        // Escucha cambios en fechaInicio para actualizar fechaFin automáticamente si el usuario no la ha tocado manualmente
        this.form.get('fechaInicio')?.valueChanges.subscribe(fechaInicioValue => {
            const isRecurrent = this.form.get('esRecurrente')?.value;
            const fechaFinCtrl = this.form.get('fechaFin');

            if (isRecurrent && fechaInicioValue && fechaFinCtrl) {
                if (!fechaFinCtrl.value || fechaFinCtrl.pristine) {
                    const inicio = this.parseLocal(fechaInicioValue);
                    if (!isNaN(inicio.getTime())) {
                        const fin = new Date(inicio);
                        fin.setDate(fin.getDate() + 4);
                        fechaFinCtrl.setValue(this.formatFecha(fin));
                        fechaFinCtrl.markAsPristine();
                    }
                }
            }
        });
    }

    // Cargar listas desplegables desde la Base de Datos
    private cargarCatalogos() {
        // Tipos de Actividad
        this.http.get<any[]>(`${environment.apiUrl}/time-report/actividades/tipos-actividad`)
            .subscribe({
                next: (res) => this.tiposActividad.set(res ? res.map(t => ({ id: String(t.id), nombre: t.nombre })) : []),
                error: (err) => {
                    console.error('Error al cargar tipos de actividad', err);
                }
            });

        // Proyectos
        this.http.get<any[]>(`${environment.apiUrl}/time-report/actividades/proyectos-disponibles`)
            .subscribe({
                next: (res) => this.proyectos.set(res ? res.map(p => ({ id: String(p.id), nombre: p.nombre })) : []),
                error: (err) => console.error('Error al cargar proyectos disponibles', err)
            });
    }

    // Preview dinámico usando lógica de negocio
    public previewText = computed(() => {
        const v = this.form?.value;
        if (!v?.esRecurrente || !v?.fechaInicio || !v?.fechaFin) return '';

        const inicio = this.parseLocal(v.fechaInicio);
        const fin = this.parseLocal(v.fechaFin);

        if (fin < inicio) return '';

        const count = this.calcularDias(inicio, fin, v.incluirFinesDeSemana, v.incluirFeriados);
        const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

        return `Se crearán ${count} actividades entre ${fmt(inicio)} y ${fmt(fin)}`;
    });

    private calcularDias(inicio: Date, fin: Date, incluirFDS: boolean, incluirFeriados: boolean): number {
        let count = 0;
        const cur = new Date(inicio);
        while (cur <= fin) {
            const esFDS = cur.getDay() === 0 || cur.getDay() === 6;
            const esFeriado = incluirFeriados ? false : this.feriadosService.esFeriado(cur);
            if ((incluirFDS || !esFDS) && !esFeriado) count++;
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    }

    cancelar() { this.dialogRef.close(); }

    eliminar() {
        if (this.esEdicion && confirm('¿Está seguro de que desea eliminar esta actividad?')) {
            this.actividadesService.eliminarActividad(this.data.actividad.id);
            this.dialogRef.close();
        }
    }

    guardar() {
        if (this.form.valid) {
            if (this.esEdicion) {
                this.actividadesService.actualizarActividad(this.data.actividad.id, this.form.value);
            } else {
                this.actividadesService.agregarActividad(this.form.value);
            }
            this.dialogRef.close();
        }
    }
}
