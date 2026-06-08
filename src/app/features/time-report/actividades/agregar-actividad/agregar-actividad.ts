import { Component, Inject, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

import { ActividadesService } from '../../../../shared/services/actividades.service';
import { FeriadosService } from '../../../../shared/services/feriados.service';
import { TipoActividad } from '../../../../shared/models/actividad.model';

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
        MatDatepickerModule,
        MatNativeDateModule,
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

    // Signals para llenar los dropdowns desde la base de datos
    public tiposActividad = signal<{ id: string, nombre: string }[]>([]);
    public proyectos = signal<{ id: string, nombre: string }[]>([]);

    // Convertimos los cambios del formulario a un Signal para que el computed reaccione
    private formValues = inject(FormBuilder).group({}); // temporal para inicializar
    public formState = toSignal(this.fb.group({}).valueChanges); // Se asignará en ngOnInit

    constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

    ngOnInit() {
        this.cargarCatalogos();

        this.form = this.fb.group({
            tipoActividad: [null, Validators.required],
            proyectoId: [null, Validators.required],
            codigoRequerimiento: ['', [Validators.required, Validators.maxLength(50)]],
            descripcion: ['', Validators.maxLength(255)],
            fechaActividad: [this.data?.fecha || new Date(), Validators.required],
            numeroHoras: [4, [Validators.required, Validators.min(0.5), Validators.max(24)]],
            esRecurrente: [false],
            fechaInicio: [this.data?.fecha || new Date()],
            fechaFin: [null],
            horasPorDia: [4],
            incluirFinesDeSemana: [false],
            incluirFeriados: [false],
            notas: [''],
            esbillable: [true]
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

        const inicio = new Date(v.fechaInicio);
        const fin = new Date(v.fechaFin);

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

    guardar() {
        if (this.form.valid) {
            this.actividadesService.agregarActividad(this.form.value);
            this.dialogRef.close();
        }
    }
}
