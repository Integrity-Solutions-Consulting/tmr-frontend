import { Component, Inject, inject, OnInit, computed } from '@angular/core';
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
import { map } from 'rxjs/operators';

import { ActividadesService } from '../../../../shared/services/actividades.service';
import { FeriadosService } from '../../../../shared/services/feriados.service';
import { ProyectosService } from '../../../proyectos/servicios/proyectos.service';
import { LookupOption } from '../../../proyectos/modelos/proyecto.model';
import { TipoActividad } from '../../../../shared/models/actividad.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

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
    private proyectosService = inject(ProyectosService);
    private http = inject(HttpClient);

    public form!: FormGroup;
    public proyectos: LookupOption[] = [];
    public tiposActividad: TipoActividad[] = [];
    public cargando = false;

    constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

    ngOnInit() {
        this.cargarDatos();
        this.form = this.fb.group({
            idtipoactividad: ['', Validators.required],
            idproyecto: ['', Validators.required],
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

    private cargarDatos(): void {
        this.cargando = true;
        
        // Cargar proyectos
        this.proyectosService.obtenerLookups().subscribe({
            next: (lookups) => {
                this.proyectos = lookups.clientes || [];
            },
            error: (err) => console.error('Error cargando proyectos', err),
            complete: () => this.cargando = false
        });

        // Cargar tipos de actividad
        this.cargarTiposActividad();
    }

    private cargarTiposActividad(): void {
        this.http.get<any[]>(`${environment.apiUrl}/time-report/tipos-actividad`)
            .pipe(
                map((tipos) => tipos.map((tipo) => ({
                    id: tipo.id ?? tipo.idtipoactividad,
                    nombre: tipo.nombre ?? tipo.tipoActividadNombre ?? tipo.nombreActividad ?? tipo.descripcion ?? 'Tipo de actividad',
                    descripcion: tipo.descripcion
                })))
            )
            .subscribe({
                next: (tipos) => {
                    this.tiposActividad = tipos;
                },
                error: (err) => console.error('Error cargando tipos de actividad', err)
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
