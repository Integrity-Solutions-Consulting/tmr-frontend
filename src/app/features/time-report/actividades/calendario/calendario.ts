import { Component, EventEmitter, Output, Input, inject, signal, computed, effect, OnInit, OnDestroy, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSelectChange } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActividadesService, FILTRO_SIN_PROYECTO } from '../../../../shared/services/actividades.service';
import { environment } from '../../../../../environments/environment';
import { FeriadosService } from '../../../../shared/services/feriados.service';
import { HorasFormatPipe } from '../../../../shared/pipes/horas-format.pipe';

// sm - Opción del filtro de proyectos del calendario.
interface OpcionProyecto {
    clave: string;
    nombre: string;
}

// sm - Valor de la opción "Todos los proyectos" del selector (no es un proyecto: al elegirla se limpia el filtro).
const OPCION_TODOS = '__todos__';

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
        MatTooltipModule,
        HorasFormatPipe
    ],
    templateUrl: './calendario.html',
    styleUrls: ['./calendario.scss']
})
export class Calendario implements OnInit, OnDestroy {
    @Output() diaSeleccionado = new EventEmitter<Date>();

    // sm - Nuevos inputs para poder incrustar este mismo calendario dentro del modal de "Ver calendario" de Seguimiento:
    // idEmpleadoOverride carga las actividades de OTRO colaborador (en vez del usuario logueado) y soloLectura bloquea
    // agregar/editar actividades (la navegación entre meses sigue funcionando igual).
    @Input() idEmpleadoOverride?: number;
    @Input() soloLectura = false;
    // sm - Cuando el modal se abre desde una fila de Seguimiento (colaborador+proyecto puntual), limita las métricas
    // del resumen (horas por registrar/promedio) a ESE proyecto, igual que exige esa fila (ver ActividadesService).
    // No filtra las actividades que se ven en las celdas del calendario: ahí se deja el día completo del colaborador
    // (incluye otros proyectos y novedades sin proyecto) para no ocultar contexto en una vista de solo lectura.
    @Input() idProyectoOverride?: number;
    // sm - Fecha (yyyy-MM-dd) cuyo mes se muestra al abrir. El modal de Seguimiento manda el "Fecha desde" del filtro
    // para que el calendario abra en el mes consultado y no siempre en el mes actual.
    @Input() fechaInicialOverride?: string;
    // sm - Líder que completa actividades desde Seguimiento: solo puede abrir las que él mismo cargó, no las del colaborador.
    @Input() idLiderEdicion?: number | null;

    private actividadesService = inject(ActividadesService);
    private feriadosService = inject(FeriadosService);
    private http = inject(HttpClient);

    public readonly opcionTodos = OPCION_TODOS;
    public readonly filtroProyectos = this.actividadesService.filtroProyectos;
    // sm - Proyectos asignados al colaborador de la sesión (los mismos que puede elegir en "Agregar actividad").
    private proyectosAsignados = signal<OpcionProyecto[]>([]);

    // sm - Opciones del filtro: sus proyectos asignados, más los que tengan actividades en el mes visible aunque ya no
    // estén en sus asignaciones, más "Sin proyecto" (novedades como vacaciones o permisos). Orden alfabético.
    public opcionesProyecto = computed<OpcionProyecto[]>(() => {
        const porClave = new Map<string, OpcionProyecto>();
        for (const p of this.proyectosAsignados()) porClave.set(p.clave, p);
        for (const a of this.actividadesService.actividades()) {
            const clave = this.actividadesService.claveProyecto(a);
            if (clave !== FILTRO_SIN_PROYECTO && !porClave.has(clave)) {
                porClave.set(clave, { clave, nombre: (a as any).proyectoNombre || 'Proyecto' });
            }
        }
        const proyectos = [...porClave.values()].sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));
        return [...proyectos, { clave: FILTRO_SIN_PROYECTO, nombre: 'Sin proyecto' }];
    });

    // sm - Texto del selector: "Todos los proyectos", el nombre del único elegido o "N proyectos".
    public textoFiltro = computed(() => {
        const filtro = this.filtroProyectos();
        if (filtro.length === 0) return 'Todos los proyectos';
        if (filtro.length === 1) {
            return this.opcionesProyecto().find(o => o.clave === filtro[0])?.nombre ?? '1 proyecto';
        }
        return `${filtro.length} proyectos`;
    });

    public nombresDias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    public mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    constructor() {
        effect(() => {
            const fecha = this._fechaActual();
            const y = fecha.getFullYear();
            const m = fecha.getMonth() + 1;
            // sm - El calendario trae siempre todas las actividades del mes; el filtro de proyectos se aplica al mostrarlas.
            untracked(() => this.actividadesService.cargarCalendario(y, m, this.idEmpleadoOverride));
        });
        // sm - Las métricas se recalculan al cambiar de mes o el filtro de proyectos (el filtro solo existe en
        // Actividades; en el modal de solo lectura de Seguimiento queda vacío y se usa idProyectoOverride).
        effect(() => {
            const fecha = this._fechaActual();
            const filtro = this.soloLectura ? [] : this.filtroProyectos();
            const y = fecha.getFullYear();
            const m = fecha.getMonth() + 1;
            untracked(() => this.actividadesService.cargarResumen(y, m, this.idEmpleadoOverride, this.idProyectoOverride, filtro));
        });
    }

    private _fechaActual = signal(new Date());
    public mesSeleccionado = this._fechaActual().getMonth();

    ngOnInit() {
        // sm - El filtro de proyectos no se recuerda: cada vez que se entra a la pantalla arranca en "Todos".
        this.actividadesService.setFiltroProyectos([]);
        if (!this.soloLectura) this.cargarProyectosAsignados();
        const [anio, mes] = (this.fechaInicialOverride ?? '').split('-').map(Number);
        if (anio && mes) {
            this._fechaActual.set(new Date(anio, mes - 1, 1));
            this.mesSeleccionado = mes - 1;
        }
    }

    ngOnDestroy() {
        this.actividadesService.setFiltroProyectos([]);
    }

    private cargarProyectosAsignados() {
        this.http.get<any[]>(`${environment.apiUrl}/time-report/actividades/proyectos-disponibles`).subscribe({
            next: (res) => {
                const opciones = (res || [])
                    .filter(p => p?.id != null)
                    .map(p => ({ clave: String(p.id), nombre: (p.nombre || '').trim() || 'Proyecto' }));
                this.proyectosAsignados.set(opciones);
            },
            error: (err) => console.error('Error al cargar proyectos para el filtro del calendario', err)
        });
    }

    // sm - Selector de proyectos: elegir "Todos los proyectos" limpia el filtro; elegir proyectos quita "Todos".
    // Si se desmarcan todos, vuelve a "Todos".
    onFiltroProyectosChange(event: MatSelectChange) {
        const valores: string[] = event.value || [];
        const habiaFiltro = this.filtroProyectos().length > 0;
        const proyectos = valores.filter(v => v !== OPCION_TODOS);
        const nuevo = valores.includes(OPCION_TODOS) && habiaFiltro ? [] : proyectos;
        this.actividadesService.setFiltroProyectos(nuevo);
    }

    // sm - Valor del selector: los proyectos elegidos, o la opción "Todos" marcada si no hay filtro.
    public valorSelectorProyectos = computed(() => {
        const filtro = this.filtroProyectos();
        return filtro.length > 0 ? filtro : [OPCION_TODOS];
    });

    limpiarFiltroProyectos(event: MouseEvent) {
        event.stopPropagation();
        this.actividadesService.setFiltroProyectos([]);
    }

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
        // sm - Solo las actividades de los proyectos del filtro (con "Todos", todas). Las horas del día también.
        const actividades = this.actividadesService.getActividadesVisiblesPorFecha(fecha);
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
        // sm - En modo solo lectura no se permite abrir el modal de edición de actividad.
        if (this.soloLectura || this.chipBloqueado(actividad)) return;
        // La edición se inicia únicamente desde el resumen diario.
    }

    chipBloqueado(actividad: any): boolean {
        return this.idLiderEdicion != null && actividad.idLiderRegistro !== this.idLiderEdicion;
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
        // sm - En modo solo lectura no se permite abrir el modal de agregar actividad al hacer clic en un día.
        this.diaSeleccionado.emit(fecha);
    }
}
