import { Component, Inject, inject, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
        MatTooltipModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatAutocompleteModule
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
    public proyectos = signal<{ id: string, nombre: string, codigo?: string | null }[]>([]);

    // Autocomplete filter signals
    public proyectoFilter = signal('');
    public tipoActividadFilter = signal('');

    public proyectosFiltrados = computed(() => {
        const q = this.proyectoFilter().toLowerCase().trim();
        if (!q) return this.proyectos();
        return this.proyectos().filter(p => p.nombre.toLowerCase().includes(q));
    });

    public tiposActividadFiltrados = computed(() => {
        const q = this.tipoActividadFilter().toLowerCase().trim();
        if (!q) return this.tiposActividad();
        return this.tiposActividad().filter(t => t.nombre.toLowerCase().includes(q));
    });

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
        if (!d) return new Date(NaN);
        const str = String(d).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
            const parts = str.split('-');
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            const [dia, mes, anio] = str.split('/').map(Number);
            return new Date(anio, mes - 1, dia);
        }
        return new Date(d);
    }

    ngOnInit() {
        this.cargarCatalogos();

        const act = this.data?.actividad;
        this.esEdicion = !!act;

        const defaultDate = this.parseLocal(act ? act.fechaactividad : (this.data?.fecha || new Date()));

        this.form = this.fb.group({
            tipoActividad: [act ? String(act.idtipoactividad) : null, [Validators.required, this.autocompleteValidator(this.tiposActividad)]],
            proyectoId: [act && act.idproyecto ? String(act.idproyecto) : null, [Validators.required, this.autocompleteValidator(this.proyectos)]],
            codigoRequerimiento: [act ? act.codigorequerimiento : '', [Validators.required, Validators.maxLength(50)]],
            descripcion: [act ? act.descripcionactividad : '', Validators.maxLength(255)],
            fechaActividad: [defaultDate, [Validators.required, this.formatoFechaValidator()]],
            numeroHoras: [act ? act.cantidadhoras : 4, [Validators.required, Validators.min(0.5), Validators.max(24)]],
            esRecurrente: [false],
            fechaInicio: [defaultDate, [this.formatoFechaValidator()]],
            fechaFin: ['', [this.formatoFechaValidator()]],
            horasPorDia: [act ? act.cantidadhoras : 4],
            incluirFinesDeSemana: [false],
            incluirFeriados: [false],
            notas: [act ? act.notas : ''],
            esbillable: [act ? act.esbillable : true]
        });

        // Listen for autocomplete search typing/value changes
        this.form.get('proyectoId')?.valueChanges.subscribe(val => {
            const selectedProy = this.proyectos().find(p => String(p.id) === String(val));
            if (!selectedProy) {
                this.proyectoFilter.set(val || '');
            } else {
                this.proyectoFilter.set('');
                if (!this.esEdicion && selectedProy.codigo) {
                    this.form.get('codigoRequerimiento')?.setValue(selectedProy.codigo);
                }
            }
        });

        this.form.get('tipoActividad')?.valueChanges.subscribe(val => {
            const isId = this.tiposActividad().some(t => String(t.id) === String(val));
            if (!isId) {
                this.tipoActividadFilter.set(val || '');
            } else {
                this.tipoActividadFilter.set('');
            }
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
                fechaInicioCtrl?.setValidators([Validators.required, this.formatoFechaValidator()]);
                fechaFinCtrl?.setValidators([Validators.required, this.formatoFechaValidator()]);
                horasPorDiaCtrl?.setValidators([Validators.required, Validators.min(0.5), Validators.max(24)]);

                // Asigna por defecto 4 días después si fechaFin no tiene valor
                if (fechaInicioCtrl?.value && fechaFinCtrl && !fechaFinCtrl.value) {
                    const inicio = this.parseLocal(fechaInicioCtrl.value);
                    if (!isNaN(inicio.getTime())) {
                        const fin = new Date(inicio);
                        fin.setDate(fin.getDate() + 4);
                        fechaFinCtrl.setValue(fin);
                        fechaFinCtrl.markAsPristine();
                    }
                }
            } else {
                fechaActividadCtrl?.setValidators([Validators.required, this.formatoFechaValidator()]);
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
                        fechaFinCtrl.setValue(fin);
                        fechaFinCtrl.markAsPristine();
                    }
                }
            }
        });
    }

    private formatoFechaValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const valor = control.value;
            if (!valor) return null;

            if (valor instanceof Date) {
                return isNaN(valor.getTime()) ? { formatoFecha: true } : null;
            }

            const str = String(valor).trim();
            const regex = /^\d{2}\/\d{2}\/\d{4}$/;
            if (!regex.test(str)) {
                return { formatoFecha: true };
            }

            const parts = str.split('/');
            const dia = Number(parts[0]);
            const mes = Number(parts[1]);
            const anio = Number(parts[2]);
            const date = new Date(anio, mes - 1, dia);

            if (date.getFullYear() !== anio || date.getMonth() + 1 !== mes || date.getDate() !== dia) {
                return { formatoFecha: true };
            }

            return null;
        };
    }

    bloquearCaracteresFecha(event: KeyboardEvent): void {
        const teclasPermitidas = [
            'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
            'ArrowLeft', 'ArrowRight', 'Home', 'End'
        ];

        if (teclasPermitidas.includes(event.key) || event.ctrlKey || event.metaKey) return;

        const esNumeroOBarra = /^[0-9/]$/.test(event.key);
        if (!esNumeroOBarra) {
            event.preventDefault();
            return;
        }

        const input = event.target as HTMLInputElement;
        if (input.value.length >= 10) {
            event.preventDefault();
        }
    }

    bloquearPegadoNoFecha(event: ClipboardEvent): void {
        const texto = event.clipboardData?.getData('text') ?? '';
        const input = event.target as HTMLInputElement;
        
        const seleccion = window.getSelection()?.toString() || '';
        const nuevoLargo = input.value.length - seleccion.length + texto.length;
        
        if (!/^[0-9/]+$/.test(texto) || nuevoLargo > 10) {
            event.preventDefault();
        }
    }

    // Cargar listas desplegables desde la Base de Datos
    private cargarCatalogos() {
        // Tipos de Actividad
        this.http.get<any[]>(`${environment.apiUrl}/time-report/actividades/tipos-actividad`)
            .subscribe({
                next: (res) => {
                    if (res) {
                        const mapped = res.map(t => ({ id: String(t.id), nombre: (t.nombre || '').trim() }));
                        const unique: typeof mapped = [];
                        const seen = new Set<string>();
                        for (const item of mapped) {
                            const nameLower = item.nombre.toLowerCase();
                            if (!seen.has(nameLower)) {
                                seen.add(nameLower);
                                unique.push(item);
                            }
                        }
                        this.tiposActividad.set(unique);
                    } else {
                        this.tiposActividad.set([]);
                    }
                    this.form?.get('tipoActividad')?.updateValueAndValidity();
                },
                error: (err) => {
                    console.error('Error al cargar tipos de actividad', err);
                }
            });

        // Proyectos
        this.http.get<any[]>(`${environment.apiUrl}/time-report/actividades/proyectos-disponibles`)
            .subscribe({
                next: (res) => {
                    if (res) {
                        const mapped = res.map(p => ({ id: String(p.id), nombre: (p.nombre || '').trim(), codigo: p.codigo }));
                        const unique: typeof mapped = [];
                        const seen = new Set<string>();
                        for (const item of mapped) {
                            const nameLower = item.nombre.toLowerCase();
                            if (!seen.has(nameLower)) {
                                seen.add(nameLower);
                                unique.push(item);
                            }
                        }
                        this.proyectos.set(unique);
                    } else {
                        this.proyectos.set([]);
                    }
                    this.form?.get('proyectoId')?.updateValueAndValidity();
                },
                error: (err) => console.error('Error al cargar proyectos disponibles', err)
            });
    }

    displayProyectoFn(val: any): string {
        if (!val) return '';
        const p = this.proyectos().find(x => String(x.id) === String(val));
        return p ? p.nombre : val;
    }

    displayTipoActividadFn(val: any): string {
        if (!val) return '';
        const t = this.tiposActividad().find(x => String(x.id) === String(val));
        return t ? t.nombre : val;
    }

    autocompleteValidator(listSignal: () => { id: string, nombre: string }[]): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const val = control.value;
            if (!val) return null;
            const exists = listSignal().some(item => String(item.id) === String(val));
            return exists ? null : { invalidOption: true };
        };
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
            const rawValue = this.form.getRawValue();
            const formValue = {
                ...rawValue,
                fechaActividad: this.formatFecha(rawValue.fechaActividad),
                fechaInicio: this.formatFecha(rawValue.fechaInicio),
                fechaFin: this.formatFecha(rawValue.fechaFin)
            };
            if (this.esEdicion) {
                this.actividadesService.actualizarActividad(this.data.actividad.id, formValue);
            } else {
                this.actividadesService.agregarActividad(formValue);
            }
            this.dialogRef.close();
        }
    }
}
