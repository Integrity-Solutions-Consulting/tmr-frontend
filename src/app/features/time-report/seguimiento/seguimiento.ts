import { Component, inject, ViewChild, AfterViewInit, computed, signal, effect, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ReporteTabularConfig, estandarizarCabeceraExcelExistente, exportarReporteExcel, exportarReportePdf } from '../../../shared/utils/reporte-export.utils';
import { HttpClient } from '@angular/common/http';
import { DatosSeguimientoPdf, crearReporteSeguimientoPdf } from '../../../shared/utils/seguimiento-pdf.utils';
import { environment } from '../../../../environments/environment';

import { SeguimientoService } from '../../../shared/services/seguimiento.service';
import { Colaborador, ProyectoResumen } from '../../../shared/models/colaborador.model';
import { HorasFormatPipe } from '../../../shared/pipes/horas-format.pipe';
import { PaginacionComponent } from '../../../shared/components/paginacion/paginacion.component';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { MetricasHorasComponent } from '../../../shared/components/metricas-horas/metricas-horas.component';
import * as ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { filter, firstValueFrom, lastValueFrom, Observable, Subject, takeUntil, timeout } from 'rxjs';
// sm - Toast de progreso de descarga compartido por toda la app (antes vivía solo en Seguimiento).
import { DescargaCanceladaError, DescargaProgresoService } from '../../../shared/services/descarga-progreso.service';
import { MetricasSeguimiento } from '../../../shared/models/seguimiento.model';
import { coincideBusqueda, normalizarTexto } from '../../../shared/utils/texto.utils';
// sm - Modal de "Ver calendario" (solo lectura) para inspeccionar el calendario de un colaborador desde Seguimiento.
import { CalendarioColaboradorModal } from './calendario-colaborador-modal/calendario-colaborador-modal';
// sm - SweetAlert2 para los pop ups de las descargas (sin actividades, descarga parcial y error).
import { PopupService } from '../../../shared/services/popup.service';
import { NotificacionToastService } from '../../../shared/services/notificacion-toast.service';
import { EstadoEmpleado, NotificacionesService } from '../../../shared/services/notificaciones.service';
import { fechaEcuadorInputHoy, primerDiaMesEcuador } from '../../../shared/utils/date-range.utils';
import { FechaLimitesService } from '../../../shared/services/fecha-limites.service';
import { TokenService } from '../../auth/servicios/token.service';
import { CambiosDatosService } from '../../../shared/services/cambios-datos.service';

// sm - Filtros que se recuerdan al salir y volver a Seguimiento. Se guardan en sessionStorage: duran mientras la
// pestaña esté abierta (también tras F5); al cerrar el navegador se vuelve al rango por defecto.
const CLAVE_FILTROS = 'tmr.seguimiento.filtros';
// sm - Al volver a la pestaña solo se recarga si la última carga tiene más de este tiempo (evita llamadas por
// cambiar de ventana un momento).
const RECARGA_AL_VOLVER_MS = 60_000;

interface FiltrosGuardados {
    fechaDesde?: string;
    fechaHasta?: string;
    cliente?: string;
    busqueda?: string;
}

function leerFiltrosGuardados(): FiltrosGuardados {
    try {
        return JSON.parse(sessionStorage.getItem(CLAVE_FILTROS) || '{}') ?? {};
    } catch {
        return {};
    }
}

// sm - Error propio para distinguir "colaborador sin actividades" de un fallo real de red o de generaciÃ³n.
class SinActividadesError extends Error {
    constructor(public readonly colaborador: string) {
        super(`No hay actividades registradas para ${colaborador} en este rango.`);
    }
}

// sm - Rango de fechas (yyyy-MM-dd) fijado al iniciar una descarga.
interface RangoDescarga {
    desde: string;
    hasta: string;
}

// sm - Un archivo a generar: un colaborador y, si tiene proyectos, el proyecto al que se limita ese archivo
// (una persona con 2 proyectos genera 2 items, uno por proyecto). Sin proyectos, un solo item sin filtrar.
interface ItemDescarga {
    colaborador: Colaborador;
    proyecto?: ProyectoResumen;
}

@Component({
    selector: 'app-seguimiento',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatPaginatorModule,
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatMenuModule,
        MatAutocompleteModule,
        MatDialogModule,
        PaginacionComponent,
        HeaderComponent,
        HorasFormatPipe,
        MetricasHorasComponent
    ],
    templateUrl: './seguimiento.html',
    styleUrl: './seguimiento.scss'
})
export class SeguimientoComponent implements AfterViewInit {
    private seguimientoService = inject(SeguimientoService);
    private http = inject(HttpClient);
    private dialog = inject(MatDialog);
    private popup = inject(PopupService);
    private notificacionesService = inject(NotificacionesService);
    private toastService = inject(NotificacionToastService);
    private fechaLimites = inject(FechaLimitesService);
    private tokenService = inject(TokenService);
    private descargas = inject(DescargaProgresoService);
    private cambiosDatos = inject(CambiosDatosService);
    private destroyRef = inject(DestroyRef);
    private readonly filtrosGuardados = leerFiltrosGuardados();

    // sm - Recarga automática: hora de la última carga, recarga pendiente (llegó un aviso con la pestaña oculta, un
    // modal abierto o una descarga en curso) y si la próxima carga debe conservar la selección del usuario.
    private ultimaCarga = 0;
    private recargaPendiente = false;
    private conservarSeleccion = false;

    public columnas: string[] = [
        'select', 'nombre', 'proyecto', 'cliente', 'liderTecnico',
        'nroHoras', 'estado', 'diasConReporte', 'diasACompletar', 'acciones'
    ];
    public dataSource = new MatTableDataSource<Colaborador>(this.seguimientoService.colaboradores());
    public selection = new SelectionModel<Colaborador>(true, []);
    public isDownloading = false;
    // sm - Fila "Cargando registros..." mientras llega la lista de colaboradores.
    public cargando = this.seguimientoService.cargando;

    // Filtros de bÃºsqueda (Estado Local)
    public busqueda = this.filtrosGuardados.busqueda ?? '';
    // sm - clienteSeleccionado es el texto del campo; clienteAplicado es el cliente con el que se filtrÃ³ la tabla.
    public clienteSeleccionado = this.filtrosGuardados.cliente ?? '';
    private clienteAplicado = this.filtrosGuardados.cliente ?? '';
    public clientes = signal<{ id: number, nombre: string }[]>([]);
    public clienteFilter = signal('');

    public clientesFiltrados = computed(() => {
        const q = this.clienteFilter().toLowerCase().trim();
        if (!q) return this.clientes();
        return this.clientes().filter(c => c.nombre.toLowerCase().includes(q));
    });
    // Fechas con la hora de Ecuador (no la del navegador), igual que el backend al calcular y notificar
    public fechaDesde = this.filtrosGuardados.fechaDesde ?? primerDiaMesEcuador();
    // sm - Se comenta el valor por defecto anterior (Ãºltimo dÃ­a del mes actual) porque "Fecha hasta" debe iniciar en el dÃ­a de hoy.
    // public fechaHasta = (() => {
    //     const d = new Date();
    //     const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    //     return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    // })();
    // sm - Nuevo valor por defecto: la fecha de hoy (fecha local del navegador, formato yyyy-MM-dd).
    // Recupera la fecha guardada o utiliza la fecha actual de Ecuador.
    public fechaHasta = this.filtrosGuardados.fechaHasta ?? fechaEcuadorInputHoy();

    // Fecha máxima permitida: hoy en Ecuador.
    public readonly fechaMaxima = fechaEcuadorInputHoy();

    // Fecha más antigua con actividades registradas.
    public fechaMinima: string | null = null;

    // PaginaciÃ³n (Estado Local para Rango)
    public pageIndex = 0;
    public pageSize = 5;

    @ViewChild(MatPaginator) paginator!: MatPaginator;

    // Reactividad vÃ­a Signals desde el Servicio de Negocio
    //public metricas = computed(() => this.seguimientoService.getMetricas());
    //SM - Esto hace que cuando se seleccionen colaboradores, las mÃ©tricas se recalculen con base a los colaboradores seleccionados
    get metricas(): MetricasSeguimiento {
        if (this.selection.hasValue()) {
            return this.seguimientoService.calcularMetricas(this.selection.selected);
        }
        return this.seguimientoService.getMetricas();
    }

    // sm - La barra de mÃ©tricas queda "en blanco" (valores con guion) cuando no hay ningÃºn colaborador seleccionado
    // o cuando estÃ¡n seleccionados todos; solo muestra valores con una selecciÃ³n parcial (uno o varios, no todos).
    get metricasEnBlanco(): boolean {
        return !this.selection.hasValue() || this.isAllSelected();
    }

    // OrdenaciÃ³n manual para tabla HTML nativa
    public sortField: keyof Colaborador | '' = '';
    public sortAsc = true;

    private toTitleCase(str: string): string {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    get colaboradoresPaginados(): Colaborador[] {
        const start = this.pageIndex * this.pageSize;
        return this.dataSource.filteredData.slice(start, start + this.pageSize);
    }

    public ordenar(campo: keyof Colaborador) {
        if (this.sortField === campo) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortField = campo;
            this.sortAsc = true;
        }
        this.aplicarOrdenamiento();
        this.irAPrimeraPagina();
    }

    public direccionOrden(campo: keyof Colaborador): 'ascending' | 'descending' | 'none' {
        if (this.sortField !== campo) return 'none';
        return this.sortAsc ? 'ascending' : 'descending';
    }

    private aplicarOrdenamiento() {
        if (!this.sortField) return;
        const data = [...this.dataSource.data];
        data.sort((a, b) => {
            const valA = a[this.sortField as keyof Colaborador];
            const valB = b[this.sortField as keyof Colaborador];
            
            if (typeof valA === 'number' && typeof valB === 'number') {
                return this.sortAsc ? valA - valB : valB - valA;
            }
            
            const strA = String(valA || '').toLowerCase();
            const strB = String(valB || '').toLowerCase();
            return this.sortAsc 
                ? strA.localeCompare(strB) 
                : strB.localeCompare(strA);
        });
        this.dataSource.data = data;
    }

    constructor() {
        this.fechaLimites.obtenerFechaMinimaActividades().subscribe(f => this.fechaMinima = f);

        effect(() => {
            const raw = this.seguimientoService.colaboradores();
            const formatted = raw.map(c => ({
                ...c,
                nombre: this.toTitleCase(c.nombre),
                proyecto: this.toTitleCase(c.proyecto),
                cliente: this.toTitleCase(c.cliente),
                liderTecnico: this.toTitleCase(c.liderTecnico),
                // sm - El desglose por proyecto (chips del modal "Ver detalle") debe verse igual de prolijo
                // que las columnas de la tabla; sin esto quedaba con el casing crudo que manda el backend.
                proyectos: c.proyectos?.map(p => ({
                    ...p,
                    nombre: this.toTitleCase(p.nombre),
                    cliente: this.toTitleCase(p.cliente),
                    liderTecnico: this.toTitleCase(p.liderTecnico)
                }))
            }));
            // sm - En una recarga automática se vuelven a marcar las filas que el usuario tenía seleccionadas
            // (mismo colaborador y proyecto) y se mantiene la página, salvo que ya no exista.
            const clavesSeleccionadas = this.conservarSeleccion
                ? new Set(this.selection.selected.map(c => this.claveFila(c)))
                : null;
            this.conservarSeleccion = false;
            this.dataSource.data = formatted;
            this.aplicarOrdenamiento();
            if (clavesSeleccionadas) {
                this.selection.setSelection(...this.dataSource.data.filter(c => clavesSeleccionadas.has(this.claveFila(c))));
                this.pageIndex = Math.min(this.pageIndex, this.totalPaginas - 1);
                return;
            }
            // sm - Cada recarga reconstruye los colaboradores como objetos nuevos, asÃ­ que cualquier
            // selecciÃ³n previa queda con referencias huÃ©rfanas (el checkbox del header se veÃ­a
            // "indeterminado" y el footer de mÃ©tricas podÃ­a mostrar la selecciÃ³n vieja). Se limpia
            // para que la selecciÃ³n siempre corresponda a la data reciÃ©n cargada/filtrada.
            this.selection.clear();
        });

        // sm - Recarga automática: otra pestaña guardó proyectos/colaboradores/actividades/feriados.
        this.cambiosDatos.cambios$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.recargarAutomatico(true));

        // sm - Al volver a esta pestaña o ventana: recarga si hubo un aviso mientras estaba oculta o si los datos
        // tienen más de un minuto (cubre cambios hechos por otras personas).
        const alVolver = () => {
            if (document.visibilityState === 'visible') this.recargarAutomatico(false);
        };
        document.addEventListener('visibilitychange', alVolver);
        window.addEventListener('focus', alVolver);
        this.destroyRef.onDestroy(() => {
            document.removeEventListener('visibilitychange', alVolver);
            window.removeEventListener('focus', alVolver);
        });

        // sm - Si la recarga quedó pendiente por un modal abierto, se hace al cerrarlo.
        this.dialog.afterAllClosed
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.procesarRecargaPendiente());
    }

   
    // sm - porAviso: llegó un aviso de cambios (recarga siempre). Si no, es la vuelta a la pestaña: solo con datos viejos.
    // Nunca recarga con la pestaña oculta, un modal abierto o una descarga en curso: lo deja pendiente.
    private recargarAutomatico(porAviso: boolean) {
        if (porAviso) this.recargaPendiente = true;
        else if (Date.now() - this.ultimaCarga >= RECARGA_AL_VOLVER_MS) this.recargaPendiente = true;
        this.procesarRecargaPendiente();
    }

    private procesarRecargaPendiente() {
        if (!this.recargaPendiente) return;
        if (document.visibilityState !== 'visible' || this.dialog.openDialogs.length > 0 || this.isDownloading) return;
        this.recargaPendiente = false;
        this.conservarSeleccion = true;
        this.recargarColaboradores(true);
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        // sm - La bÃºsqueda es solo por colaborador (nombre completo) y proyecto. Se normaliza el texto (sin tildes,
        // minÃºsculas y espacios simples) para que "juan  perez" encuentre a "Juan PÃ©rez".
        // sm - La búsqueda es solo por colaborador (nombre completo) y proyecto. Coincide por palabras sueltas
        // (sin tildes, minúsculas y espacios simples) para que "juan perez" o "Jorge Lino" encuentren a
        // "Juan Pérez" o "Jorge Augusto Lino Bermeo" aunque se salte el segundo nombre.
        this.dataSource.filterPredicate = (data: Colaborador, filter: string) =>
            coincideBusqueda(data.nombre, filter)
            || coincideBusqueda(data.proyecto, filter);
        // sm - Búsqueda recordada de la visita anterior a Seguimiento.
        if (this.busqueda) this.dataSource.filter = normalizarTexto(this.busqueda);

        // Cargar clientes desde lookups
        this.http.get<any>(`${environment.apiUrl}/proyectos/lookups`).subscribe({
            next: (res) => {
                if (res && res.clientes) {
                    this.clientes.set(res.clientes);
                }
            },
            error: (err) => console.error('Error al cargar clientes lookups', err)
        });

        // Cargar datos inicialmente
        this.recargarColaboradores();
    }

    public onCustomPageChange(page: number): void {
        this.pageIndex = page - 1;
        if (this.dataSource.paginator) {
            this.dataSource.paginator.pageIndex = this.pageIndex;
            this.dataSource.paginator.page.next({
                pageIndex: this.pageIndex,
                pageSize: this.pageSize,
                length: this.totalRegistros
            });
        }
    }

    get totalRegistros(): number {
        // sm - Solo filteredData: antes, si la bÃºsqueda no encontraba nada, mostraba el total sin filtrar.
        return this.dataSource.filteredData.length;
    }

    get totalPaginas(): number {
        return Math.ceil(this.totalRegistros / this.pageSize) || 1;
    }

    get paginaActualHuman(): number {
        return this.pageIndex + 1;
    }

    get registroDesde(): number {
        if (!this.totalRegistros) {
            return 0;
        }
        return this.pageIndex * this.pageSize + 1;
    }

    get registroHasta(): number {
        return Math.min((this.pageIndex + 1) * this.pageSize, this.totalRegistros);
    }

    // sm - Filtros que dependen del servidor (fechas y cliente): recargan los datos desde el backend.
    public aplicarFiltros() {
        this.irAPrimeraPagina();
        this.recargarColaboradores();
    }

    // sm - BÃºsqueda por colaborador/proyecto: se aplica sobre los datos ya cargados, sin llamar al servidor en cada tecla.
    // Se limpia la selecciÃ³n para que siempre corresponda a los resultados visibles (igual que al recargar).
    public aplicarBusqueda() {
        this.guardarFiltros();
        this.dataSource.filter = normalizarTexto(this.busqueda);
        this.selection.clear();
        this.irAPrimeraPagina();
    }

    // sm - Cliente: mientras se escribe solo se filtran las opciones del autocompletado; la tabla se recarga
    // al elegir una opciÃ³n o al borrar el campo (todos los clientes), no con cada letra.
    public onClienteInput(event: Event) {
        this.filtrarClientes(event);
        if (!this.clienteSeleccionado.trim() && this.clienteAplicado) {
            this.seleccionarCliente('');
        }
    }

    public seleccionarCliente(cliente: string) {
        this.clienteSeleccionado = cliente;
        this.clienteAplicado = cliente;
        this.aplicarFiltros();
    }

    // sm - Al cerrar el autocompletado sin elegir una opciÃ³n, el campo vuelve a mostrar el cliente realmente aplicado.
    public onClientePanelCerrado() {
        this.clienteSeleccionado = this.clienteAplicado;
        this.clienteFilter.set('');
    }

    private recargarColaboradores(silencioso = false) {
        // sm - Una carga pedida por el usuario (filtros) no conserva la selección; la automática sí.
        if (!silencioso) this.conservarSeleccion = false;
        this.ultimaCarga = Date.now();
        this.guardarFiltros();
        this.seguimientoService.cargarColaboradores({
            fechaDesde: this.fechaDesde,
            fechaHasta: this.fechaHasta,
            clienteSeleccionado: this.clienteAplicado
        }, silencioso);
    }

    private guardarFiltros() {
        const filtros: FiltrosGuardados = {
            fechaDesde: this.fechaDesde,
            fechaHasta: this.fechaHasta,
            cliente: this.clienteAplicado,
            busqueda: this.busqueda
        };
        try {
            sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(filtros));
        } catch {
            // sm - Sin sessionStorage (modo privado/bloqueado) solo se pierde recordar los filtros.
        }
    }

    private irAPrimeraPagina() {
        this.pageIndex = 0;
        this.dataSource.paginator?.firstPage();
    }

    private normalizarBusqueda(texto: string): string {
        return (texto ?? '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    // sm - "Seleccionar todos" debe cubrir todas las pÃ¡ginas del resultado ya filtrado
    // (rango de fechas/cliente del backend + bÃºsqueda de texto del cliente), no solo dataSource.data
    // (que ignora la bÃºsqueda de texto) ni la pÃ¡gina visible.
    // sm - "Seleccionar todos" debe cubrir todas las páginas del resultado ya filtrado
    // (rango de fechas/cliente del backend + búsqueda de texto del cliente), no solo dataSource.data
    // (que ignora la búsqueda de texto) ni la página visible.
    public isAllSelected() {
        const filtrados = this.dataSource.filteredData;
        return filtrados.length > 0 && this.selection.selected.length === filtrados.length;
    }

    public masterToggle() {
        this.isAllSelected()
            ? this.selection.clear()
            : this.dataSource.filteredData.forEach(row => this.selection.select(row));
    }

    // sm - Expande los colaboradores seleccionados a un item por archivo a generar: si un colaborador tiene varios
    // proyectos, se genera un archivo por proyecto (en vez de uno solo mezclando todo).
    private itemsParaDescarga(colaboradores: Colaborador[]): ItemDescarga[] {
        const items: ItemDescarga[] = [];
        for (const colaborador of colaboradores) {
            const proyectos = colaborador.proyectos && colaborador.proyectos.length > 0 ? colaborador.proyectos : [undefined];
            for (const proyecto of proyectos) items.push({ colaborador, proyecto });
        }
        return items;
    }

    public async descargarSeleccionados(formato: 'xlsx' | 'pdf') {
        if (!this.selection.hasValue() || this.isDownloading) return;

        const seleccionados = [...this.selection.selected];
        // sm - Un colaborador con varios proyectos genera un archivo por proyecto, asÃ­ que el total de archivos
        // puede ser mayor que la cantidad de filas seleccionadas.
        const items = this.itemsParaDescarga(seleccionados);
        // sm - El rango se fija al iniciar: si el usuario cambia las fechas durante la descarga,
        // todos los reportes (y los pop ups) siguen usando el mismo rango.
        const rango: RangoDescarga = { desde: this.fechaDesde, hasta: this.fechaHasta };
        this.isDownloading = true;
        // sm - En lugar del mensaje "Preparando...", se muestra el toast animado con barra de progreso.
        this.iniciarProgresoDescarga(formato, items.length);

        try {
            if (items.length === 1) {
                if (formato === 'xlsx') {
                    await this.descargarDetalle(items[0].colaborador, rango, false, items[0].proyecto);
                } else {
                    await this.descargarPdfDetalle(items[0].colaborador, rango, items[0].proyecto);
                }
                await this.finalizarProgresoDescarga();
                return;
            }

            if (seleccionados.length === 1) {
                // sm - Un solo colaborador con varios proyectos: se descargan sus archivos directo, sin ZIP
                // (un ZIP con un solo colaborador adentro no aporta nada, y evita que al seleccionar varios
                // colaboradores se termine armando un ZIP con otros ZIPs adentro; ese caso sÃ­ usa un Ãºnico
                // ZIP plano con todos los archivos, ver descargarReportesZip).
                const incluidos = await this.descargarReportesDirecto(items, formato, rango);
                const sinActividades = items.length - incluidos;
                if (incluidos === 0) {
                    this.cerrarProgresoDescarga();
                    this.mostrarPopup('event_busy', 'Sin actividades',
                        `<strong>${this.escaparHtml(seleccionados[0].nombre)}</strong> no tiene actividades registradas en ninguno de sus `
                        + `<strong>${items.length}</strong> proyectos entre ${this.rangoPopup(rango)}. No se generÃ³ ningÃºn archivo.`);
                    return;
                }
                await this.finalizarProgresoDescarga();
                if (sinActividades > 0) {
                    const uno = sinActividades === 1;
                    this.mostrarPopup('rule', 'Descarga parcial',
                        `Se descargaron <strong>${incluidos} de ${items.length}</strong> reportes de `
                        + `<strong>${this.escaparHtml(seleccionados[0].nombre)}</strong>. <strong>${sinActividades}</strong> `
                        + `${uno ? 'proyecto no tiene' : 'proyectos no tienen'} actividades entre ${this.rangoPopup(rango)}.`);
                }
                return;
            }

            // sm - Varios colaboradores seleccionados: un Ãºnico ZIP plano con todos los reportes (cada colaborador
            // aporta un archivo por proyecto), sin anidar un ZIP dentro de otro.
            const incluidos = await this.descargarReportesZip(items, formato, rango);
            const sinActividades = items.length - incluidos;
            if (incluidos === 0) {
                // sm - Todos los seleccionados estÃ¡n vacÃ­os: no se descarga ningÃºn ZIP.
                this.cerrarProgresoDescarga();
                this.mostrarPopup('event_busy', 'Sin actividades',
                    `Ninguno de los <strong>${items.length}</strong> reportes seleccionados tiene actividades registradas entre `
                    + `${this.rangoPopup(rango)}. No se generÃ³ ningÃºn archivo.`);
                return;
            }
            // sm - Se completa la barra al 100% antes de cerrar el toast.
            await this.finalizarProgresoDescarga();
            if (sinActividades > 0) {
                // sm - Mezcla de vacÃ­os y llenos: se informa solo el conteo de lo descargado y lo omitido.
                const uno = sinActividades === 1;
                this.mostrarPopup('rule', 'Descarga parcial',
                    `Se descargaron <strong>${incluidos} de ${items.length}</strong> reportes. `
                    + `<strong>${sinActividades}</strong> ${uno ? 'reporte no tiene' : 'reportes no tienen'} `
                    + `actividades entre ${this.rangoPopup(rango)} y no se ${uno ? 'incluyÃ³' : 'incluyeron'} en el ZIP.`);
            }
        } catch (error) {
            // sm - Cualquier fin anticipado (sin actividades, cancelaciÃ³n o error) cierra el toast de progreso.
            this.cerrarProgresoDescarga();
            // sm - Si el Ãºnico colaborador seleccionado no tiene actividades, se muestra el pop up en lugar del error genÃ©rico.
            if (error instanceof SinActividadesError) {
                this.mostrarPopup('event_busy', 'Sin actividades',
                    `<strong>${this.escaparHtml(error.colaborador)}</strong> no tiene actividades registradas entre ${this.rangoPopup(rango)}.`);
                return;
            }
            // sm - Si el usuario pulsÃ³ "Cancelar" en el toast, no se muestra nada mÃ¡s.
            if (error instanceof DescargaCanceladaError) {
                return;
            }
            console.error('Error al descargar los reportes de seguimiento:', error);
            this.mostrarPopup('error', 'No se pudo descargar', 'No se pudieron preparar los reportes. Intenta nuevamente.');
        } finally {
            this.isDownloading = false;
            // sm - Si llegó un aviso de cambios durante la descarga, se recarga ahora.
            this.procesarRecargaPendiente();
        }
    }

    // sm - Muestra el toast de descarga. La descarga mÃºltiple avanza por archivo/reporte (progreso real);
    // el Excel individual no reporta avance, asÃ­ que usa barra indeterminada.
    // sm - El toast (título, barra, porcentaje y Cancelar) ahora es el compartido de la app: DescargaProgresoService.
    private iniciarProgresoDescarga(formato: 'xlsx' | 'pdf', cantidad: number): void {
        this.descargas.iniciar(formato, cantidad);
    }

    private actualizarProgresoDescarga(progreso: number, detalle: string): void {
        this.descargas.actualizar(progreso, detalle);
    }

    // sm - Deja la barra en 100%, espera un instante para que se vea completa y cierra el toast con su animaciÃ³n de salida.
    private async finalizarProgresoDescarga(): Promise<void> {
        await this.descargas.finalizar();
    }

    // sm - Cierra el toast con la animaciÃ³n de salida y luego lo quita del DOM.
    private cerrarProgresoDescarga(): void {
        this.descargas.cerrar();
    }

    private async esperarCancelable<T>(peticion: Observable<T>): Promise<T> {
        return this.descargas.esperarCancelable(peticion);
    }
    // sm - Descarga cada reporte directo al navegador (sin ZIP): se usa cuando se selecciona un solo colaborador
    // con varios proyectos, para no armar un ZIP con un Ãºnico colaborador adentro. Devuelve cuÃ¡ntos se descargaron;
    // los que no tengan actividades en el rango se omiten.
    private async descargarReportesDirecto(items: ItemDescarga[], formato: 'xlsx' | 'pdf', rango: RangoDescarga): Promise<number> {
        let incluidos = 0;
        for (const [indice, item] of items.entries()) {
            this.descargas.verificarCancelacion();
            const nombreBase = this.nombreArchivo(item.colaborador.nombre, item.proyecto?.nombre);
            if (formato === 'pdf') {
                const contenido = await this.generarPdfColaborador(item.colaborador, rango, item.proyecto);
                if (contenido) {
                    this.guardarArchivo(new Blob([contenido], { type: 'application/pdf' }), `${nombreBase}.pdf`);
                    incluidos++;
                }
            } else {
                const contenido = await this.descargarDetalle(item.colaborador, rango, true, item.proyecto);
                if (contenido) {
                    this.guardarArchivo(
                        new Blob([contenido], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                        `${nombreBase}.xlsx`,
                    );
                    incluidos++;
                }
            }
            this.actualizarProgresoDescarga(((indice + 1) / items.length) * 100, `${indice + 1} de ${items.length} reportes generados`);
        }
        return incluidos;
    }

    // sm - Arma un Ãºnico ZIP (PDF o Excel) solo con los reportes que tienen actividades en el rango. Un colaborador
    // con varios proyectos aporta un item por proyecto (ver itemsParaDescarga), cada uno con su propio archivo.
    // Devuelve cuÃ¡ntos reportes se incluyeron; si es 0 no se descarga nada.
    private async descargarReportesZip(items: ItemDescarga[], formato: 'xlsx' | 'pdf', rango: RangoDescarga): Promise<number> {
        const zip = new JSZip();
        const nombresUsados = new Set<string>();
        let incluidos = 0;
        for (const [indice, item] of items.entries()) {
            this.descargas.verificarCancelacion();
            const contenido = formato === 'pdf'
                ? await this.generarPdfColaborador(item.colaborador, rango, item.proyecto)
                : await this.descargarDetalle(item.colaborador, rango, true, item.proyecto);
            if (contenido) {
                // sm - Nombres repetidos (homÃ³nimos, o el mismo proyecto por alguna razÃ³n) no se sobrescriben: se les agrega un sufijo.
                const base = this.nombreArchivo(item.colaborador.nombre, item.proyecto?.nombre);
                let nombre = base;
                for (let sufijo = 2; nombresUsados.has(nombre.toLowerCase()); sufijo++) nombre = `${base}_${sufijo}`;
                nombresUsados.add(nombre.toLowerCase());
                zip.file(`${nombre}.${formato}`, contenido);
                incluidos++;
            }
            // sm - El 90% de la barra se reparte entre reportes y el 10% restante queda para comprimir el ZIP.
            this.actualizarProgresoDescarga(
                ((indice + 1) / items.length) * 90,
                `${indice + 1} de ${items.length} reportes generados`,
            );
        }
        if (incluidos === 0) return 0;

        const contenidoZip = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, metadata => {
            this.actualizarProgresoDescarga(90 + metadata.percent * 0.1, 'Comprimiendo archivos...');
        });
        this.descargas.verificarCancelacion();
        this.guardarArchivo(contenidoZip, `Seguimiento_${formato === 'pdf' ? 'PDF' : 'Excel'}_${rango.desde}_a_${rango.hasta}.zip`);
        return incluidos;
    }

    // sm - Dispara la descarga de un archivo generado en el navegador.
    private guardarArchivo(contenido: Blob, nombre: string): void {
        const url = URL.createObjectURL(contenido);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = nombre;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // sm - Nombre de archivo (sin extensiÃ³n) igual para Excel y PDF, individual o dentro del ZIP: "Reporte_Juan_Perez_Proyecto".
    // Se agrega el proyecto porque una misma persona puede generar varios archivos (uno por proyecto).
    private nombreArchivo(nombre: string, proyecto?: string): string {
        const limpiar = (texto: string) => texto.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().replace(/\s+/g, '_').slice(0, 100);
        const nombreLimpio = limpiar(nombre) || 'colaborador';
        const proyectoLimpio = proyecto ? limpiar(proyecto) : '';
        return proyectoLimpio ? `Reporte_${nombreLimpio}_${proyectoLimpio}` : `Reporte_${nombreLimpio}`;
    }

    // sm - Pop up base de las descargas de Seguimiento. Usa las clases "tmr-swal" (styles/_sweetalert.scss) para verse
    // igual que los modales de la app: tarjeta blanca, icono en cÃ­rculo azul, tÃ­tulo oscuro, texto gris y botÃ³n primario
    // #163572 (con soporte de tema oscuro).
    private mostrarPopup(icono: string, titulo: string, html: string): void {
        void this.popup.show(icono, titulo, html, icono === 'download_done');
    }

    private rangoPopup(rango: RangoDescarga): string {
        return `<strong>${this.formatearFechaPopup(rango.desde)}</strong> y <strong>${this.formatearFechaPopup(rango.hasta)}</strong>`;
    }

    private escaparHtml(texto: string): string {
        return String(texto ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    private formatearFechaPopup(fecha: string): string {
        const [anio, mes, dia] = (fecha ?? '').split('-');
        return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
    }

    // sm - BotÃ³n "Reporte": exporta la tabla (resultados filtrados) con el formato estÃ¡ndar de reportes de la app.
    // Se eliminÃ³ la versiÃ³n anterior (ExcelJS/jsPDF manual) que quedaba despuÃ©s de un "return" y nunca se ejecutaba.
    public async exportarExcel() {
        await this.descargas.ejecutar('xlsx', ctx => exportarReporteExcel(this.configuracionReporteTabla(), ctx))
            .catch(error => console.error('Error al exportar el reporte de seguimiento:', error));
    }

    public exportarPDF() {
        this.descargas.ejecutar('pdf', ctx => exportarReportePdf(this.configuracionReporteTabla(), ctx))
            .catch(error => console.error('Error al exportar el reporte de seguimiento:', error));
    }

    // sm - Columnas y filas compartidas por el Excel y el PDF del reporte de la tabla.
    private configuracionReporteTabla(): ReporteTabularConfig {
        return {
            titulo: 'Reporte de Seguimiento',
            nombreArchivo: 'Seguimiento',
            nombreHoja: 'Seguimiento',
            columnas: [
                { encabezado: 'Colaborador', anchoExcel: 30, anchoPdf: 48 },
                { encabezado: 'Proyecto', anchoExcel: 25, anchoPdf: 45 },
                { encabezado: 'Cliente', anchoExcel: 25, anchoPdf: 42 },
                { encabezado: 'LÃ­der tÃ©cnico', anchoExcel: 25, anchoPdf: 42 },
                { encabezado: 'Horas registradas', anchoExcel: 18, anchoPdf: 22, alineacion: 'center' },
                { encabezado: 'Seguimiento', anchoExcel: 18, anchoPdf: 28, alineacion: 'center' },
                { encabezado: 'DÃ­as con reporte', anchoExcel: 18, anchoPdf: 24, alineacion: 'center' },
                { encabezado: 'DÃ­as a completar', anchoExcel: 18, anchoPdf: 24, alineacion: 'center' },
                // sm - Datos de salida: los del colaborador solo si está Inactivo; la salida del proyecto, si la tiene.
                { encabezado: 'Estado colaborador', anchoExcel: 16, anchoPdf: 22, alineacion: 'center' },
                { encabezado: 'Fecha de salida', anchoExcel: 16, anchoPdf: 22, alineacion: 'center' },
                { encabezado: 'Tipo de salida', anchoExcel: 18, anchoPdf: 26 },
                { encabezado: 'Causa de salida', anchoExcel: 24, anchoPdf: 34 },
                { encabezado: 'Motivo de salida', anchoExcel: 32, anchoPdf: 44 },
                { encabezado: 'Salida del proyecto', anchoExcel: 18, anchoPdf: 24, alineacion: 'center' },
            ],
            filas: this.dataSource.filteredData.map((colaborador) => [
                colaborador.nombre,
                colaborador.proyecto,
                colaborador.cliente,
                colaborador.liderTecnico,
                Number(colaborador.nroHoras),
                colaborador.estado,
                Number(colaborador.diasConReporte),
                Number(colaborador.diasACompletar),
                colaborador.colaboradorActivo === false ? 'Inactivo' : 'Activo',
                this.formatearFechaSalida(colaborador.fechaSalida),
                colaborador.tipoSalida || '-',
                colaborador.causaSalida || '-',
                colaborador.motivoSalida?.trim() || '-',
                this.formatearFechaSalida(colaborador.salidaProyecto),
            ]),
            orientacionPdf: 'landscape',
        };
    }

    // sm - Fechas de salida del backend (dd-MM-yyyy, o ISO yyyy-MM-dd) a dd/MM/yyyy; '-' si no hay.
    private formatearFechaSalida(fecha?: string | null): string {
        if (!fecha) return '-';
        const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
        if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
        return fecha.replace(/-/g, '/');
    }

    // sm - Información adicional (fuera de la tabla) del Time Report individual: salida del colaborador si está
    // Inactivo y salida del proyecto si la tiene. Vacío si no aplica.
    private infoSalidaReporte(col: Colaborador): string[] {
        const lineas: string[] = [];
        if (col.colaboradorActivo === false) {
            const partes = [`Fecha de salida del colaborador: ${this.formatearFechaSalida(col.fechaSalida)}`];
            if (col.tipoSalida) partes.push(`Tipo: ${col.tipoSalida}`);
            if (col.causaSalida) partes.push(`Causa: ${col.causaSalida}`);
            if (col.motivoSalida?.trim()) partes.push(`Motivo: ${col.motivoSalida.trim()}`);
            lineas.push(partes.join('  |  '));
        }
        if (col.salidaProyecto) {
            lineas.push(`Salida del proyecto: ${this.formatearFechaSalida(col.salidaProyecto)}`);
        }
        return lineas;
    }

    public filtrarClientes(event: any) {
        const val = event?.target ? event.target.value : event;
        this.clienteFilter.set(val || '');
    }

    // sm - Abre el calendario del colaborador en un modal (encima de Seguimiento, sin navegar de pÃ¡gina) y solo lectura.
    public verCalendarioColaborador(col: Colaborador): void {
        this.dialog.open(CalendarioColaboradorModal, {
            data: { colaborador: col, fechaDesde: this.fechaDesde },
            width: '900px',
            maxHeight: '90vh',
            panelClass: 'tmr-dialog-panel',
            disableClose: true
        });
    }

    // sm - Actividades y feriados de un colaborador en el rango (misma consulta para el reporte Excel y el PDF).
    // Con proyecto, filtra el reporte a solo ese proyecto (una persona con varios proyectos genera un archivo por
    // proyecto: ver itemsParaDescarga). Se puede cancelar desde el toast de descarga.
    private obtenerActividadesColaborador(col: Colaborador, rango: RangoDescarga, proyecto?: ProyectoResumen): Promise<DatosSeguimientoPdf> {
        const params: Record<string, string> = { fechaDesde: rango.desde, fechaHasta: rango.hasta };
        // sm - Ahora cada fila de Seguimiento es un colaborador+proyecto puntual (ya no una fila por colaborador
        // con todos sus proyectos mezclados), asÃ­ que siempre se filtra por el proyecto de la fila para no mezclar
        // horas de otro proyecto del mismo colaborador en el reporte.
        if (proyecto) params['idProyecto'] = String(proyecto.idProyecto);
        return this.esperarCancelable(this.http.get<DatosSeguimientoPdf>(
            `${environment.apiUrl}/time-report/seguimiento/colaborador/${col.id}/actividades`,
            { params },
        ));
    }

    // sm - Genera el PDF de un colaborador (o de uno de sus proyectos); devuelve undefined si no tiene actividades en el rango.
    private async generarPdfColaborador(col: Colaborador, rango: RangoDescarga, proyecto?: ProyectoResumen): Promise<ArrayBuffer | undefined> {
        const respuesta = await this.obtenerActividadesColaborador(col, rango, proyecto);
        if (!respuesta.actividades || respuesta.actividades.length === 0) return undefined;
        const contenido = await crearReporteSeguimientoPdf(col.nombre, rango.desde, rango.hasta, respuesta, '', this.infoSalidaReporte(col));
        this.descargas.verificarCancelacion();
        return contenido;
    }

    private async descargarPdfDetalle(col: Colaborador, rango: RangoDescarga, proyecto?: ProyectoResumen): Promise<void> {
        const contenido = await this.generarPdfColaborador(col, rango, proyecto);
        if (!contenido) throw new SinActividadesError(proyecto ? `${col.nombre} (${proyecto.nombre})` : col.nombre);
        this.guardarArchivo(new Blob([contenido], { type: 'application/pdf' }), `${this.nombreArchivo(col.nombre, proyecto?.nombre)}.pdf`);
    }

    // sm - Genera el Excel de un colaborador (o de uno de sus proyectos). Con devolverBuffer devuelve el contenido
    // (para el ZIP) o undefined si no tiene actividades; sin Ã©l lo descarga directamente o lanza SinActividadesError
    // para mostrar el pop up.
    private async descargarDetalle(col: Colaborador, rango: RangoDescarga, devolverBuffer = false, proyecto?: ProyectoResumen) {
        const res = await this.obtenerActividadesColaborador(col, rango, proyecto);

        const rawActividades: any[] = res.actividades || [];
        const feriados = res.feriados || [];

        if (rawActividades.length === 0) {
            if (devolverBuffer) return undefined;
            throw new SinActividadesError(proyecto ? `${col.nombre} (${proyecto.nombre})` : col.nombre);
        }

        // AgrupaciÃ³n de actividades por Cliente
        const groupsByClient: { [clientName: string]: any[] } = {};
        rawActividades.forEach(act => {
            const client = act.clienteProyecto || 'Sin Cliente';
            if (!groupsByClient[client]) {
                groupsByClient[client] = [];
            }
            groupsByClient[client].push(act);
        });

        const startDate = new Date(rango.desde + 'T00:00:00');
        const endDate = new Date(rango.hasta + 'T00:00:00');
        const listDates: Date[] = [];
        let cur = new Date(startDate);
        while (cur <= endDate) {
            listDates.push(new Date(cur));
            cur.setDate(cur.getDate() + 1);
        }
        const totalDays = listDates.length;
        const totalCols = 6 + totalDays + 1; // NÂ° + Tipo + LÃ­der + Req + Desc + TotalAct + DÃ­as + TotalActFinal

        const workbook = new ExcelJS.Workbook();

        const clientNames = Object.keys(groupsByClient);
        for (let clientIdx = 0; clientIdx < clientNames.length; clientIdx++) {
            const clientName = clientNames[clientIdx];
            const clientActividades = groupsByClient[clientName];

            // Limpiar nombre de hoja para que sea vÃ¡lido en Excel
            let sheetName = `Reporte_${clientName}`.replace(/[*?:\\/\[\]]/g, '').substring(0, 31);
            if (sheetName.length === 0) sheetName = `Reporte_${clientIdx + 1}`;
            const worksheet = workbook.addWorksheet(sheetName);

            // Configurar anchos de columna
            const colWidths = [5, 20, 25, 25, 60, 15]; // NÂ°, Tipo, LÃ­der, Req, Desc, Total
            for (let i = 0; i < totalDays; i++) {
                colWidths.push(4.5); // DÃ­as
            }
            colWidths.push(15); // Total Final
            worksheet.columns = colWidths.map((w, idx) => ({
                key: `col_${idx + 1}`,
                width: w
            }));

            // Fila 4: Cliente
            worksheet.getCell(4, 1).value = 'Cliente:';
            worksheet.getCell(4, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF163572' } };
            worksheet.getCell(4, 3).value = clientName;
            worksheet.getCell(4, 3).font = { name: 'Arial', size: 11, bold: true };

            // Fila 5: Nombre del consultor
            worksheet.getCell(5, 1).value = 'Nombre del consultor:';
            worksheet.getCell(5, 1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF163572' } };
            worksheet.getCell(5, 3).value = col.nombre;
            worksheet.getCell(5, 3).font = { name: 'Arial', size: 11, bold: true };

            // Fila 6: Encabezados de tabla
            worksheet.getCell(6, 1).value = 'NÂ°';
            worksheet.getCell(6, 2).value = 'TIPO DE ACTIVIDAD';
            worksheet.getCell(6, 3).value = 'LIDER DE PROYECTO';
            worksheet.getCell(6, 4).value = 'CODIGO REQUERIMIENTO / INCIDENTE';
            worksheet.getCell(6, 5).value = 'DESCRIPCION DE TRABAJOS REALIZADOS';
            worksheet.getCell(6, 6).value = 'TOTAL HORAS POR ACTIVIDAD';
            worksheet.getCell(6, 7).value = 'DISTRIBUCION DE TIEMPO DEL DIA';
            worksheet.getCell(6, totalCols).value = 'TOTAL HORAS POR ACT.';

            // Combinaciones de encabezado
            worksheet.mergeCells(6, 1, 8, 1); // NÂ°
            worksheet.mergeCells(6, 2, 8, 2); // Tipo
            worksheet.mergeCells(6, 3, 8, 3); // LÃ­der
            worksheet.mergeCells(6, 4, 8, 4); // Req
            worksheet.mergeCells(6, 5, 8, 5); // Desc
            worksheet.mergeCells(6, 6, 8, 6); // Total
            worksheet.mergeCells(6, 7, 6, 6 + totalDays); // DistribuciÃ³n del tiempo
            worksheet.mergeCells(6, totalCols, 8, totalCols); // Total Final

            // Fila 7: NÃºmeros de dÃ­a (01..31)
            listDates.forEach((date, dateIdx) => {
                const dayNum = String(date.getDate()).padStart(2, '0');
                worksheet.getCell(7, 7 + dateIdx).value = dayNum;
            });

            // Fila 8: Iniciales de dÃ­a de la semana (L, M, M, J, V, S, D)
            const weekdays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
            listDates.forEach((date, dateIdx) => {
                const dayName = weekdays[date.getDay()];
                worksheet.getCell(8, 7 + dateIdx).value = dayName;
            });

            // Estilo del encabezado
            const tableHeaderFill: ExcelJS.Fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF163572' }
            };

            for (let r = 6; r <= 8; r++) {
                for (let c = 1; c <= totalCols; c++) {
                    const cell = worksheet.getCell(r, c);
                    cell.fill = tableHeaderFill;
                    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
                        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
                    };
                }
            }

            // Agrupar actividades por combinaciÃ³n Ãºnica
            const groupedRows: { [key: string]: {
                tipo: string,
                lider: string,
                req: string,
                desc: string,
                isRecurrente: boolean,
                hoursByDay: { [dateStr: string]: number }
            } } = {};

            clientActividades.forEach(act => {
                const isRec = !!(act.esRecurrente || act.recurrente);
                const key = `${act.tipoActividad}|${act.liderProyecto}|${act.codigoRequerimiento}|${act.descripcion}|${isRec}`;
                if (!groupedRows[key]) {
                    groupedRows[key] = {
                        tipo: act.tipoActividad,
                        lider: act.liderProyecto,
                        req: act.codigoRequerimiento,
                        desc: act.descripcion,
                        isRecurrente: isRec,
                        hoursByDay: {}
                    };
                }
                const dateStr = act.fecha;
                groupedRows[key].hoursByDay[dateStr] = (groupedRows[key].hoursByDay[dateStr] || 0) + Number(act.horas);
            });

            // Escribir datos
            let currentRow = 9;
            let seqNum = 1;

            const alternatingFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            const whiteFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
            const weekendFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8DB4E2' } };
            const feriadoFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; 
            const vacacionesFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } }; 
            const permisoFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF76933C' } };
            const recurrenteFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCCC0DA' } };

            Object.keys(groupedRows).forEach(key => {
                const group = groupedRows[key];
                const isAlternating = (seqNum % 2 === 0);
                const baseFill = isAlternating ? alternatingFill : whiteFill;

                worksheet.getCell(currentRow, 1).value = seqNum++;
                worksheet.getCell(currentRow, 2).value = group.tipo;
                worksheet.getCell(currentRow, 3).value = group.lider;
                worksheet.getCell(currentRow, 4).value = group.req;
                worksheet.getCell(currentRow, 5).value = group.desc;

                // DÃ­as
                listDates.forEach((date, dateIdx) => {
                    const dateStr = this.formatDate(date);
                    const hrs = group.hoursByDay[dateStr];
                    if (hrs > 0) {
                        worksheet.getCell(currentRow, 7 + dateIdx).value = hrs;
                    }
                });

                // FÃ³rmulas
                const startAddr = worksheet.getCell(currentRow, 7).address.replace(/[0-9]/g, '');
                const endAddr = worksheet.getCell(currentRow, 6 + totalDays).address.replace(/[0-9]/g, '');
                worksheet.getCell(currentRow, 6).value = { formula: `SUM(${startAddr}${currentRow}:${endAddr}${currentRow})` } as any;
                worksheet.getCell(currentRow, totalCols).value = { formula: `SUM(${startAddr}${currentRow}:${endAddr}${currentRow})` } as any;

                // Estilo de fila de datos
                for (let c = 1; c <= totalCols; c++) {
                    const cell = worksheet.getCell(currentRow, c);
                    cell.fill = baseFill;
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };

                    if (c === 1 || c === 6 || c === totalCols) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF334155' } };
                    } else if (c >= 7 && c <= 6 + totalDays) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        
                        // Aplicar rellenos por nomenclatura
                        const dateIdx = c - 7;
                        const date = listDates[dateIdx];
                        const dateStr = this.formatDate(date);
                        const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
                        const isFeriado = feriados.includes(dateStr);
                        const hasVal = (cell.value !== null && cell.value !== undefined && cell.value !== '');

                        if (hasVal && group.tipo === 'Vacaciones') {
                            cell.fill = vacacionesFill;
                        } else if (hasVal && group.tipo === 'Permiso') {
                            cell.fill = permisoFill;
                        } else if (hasVal && group.isRecurrente) {
                            cell.fill = recurrenteFill;
                        } else if (isFeriado) {
                            cell.fill = feriadoFill;
                        } else if (isWeekend) {
                            cell.fill = weekendFill;
                        }
                    } else {
                        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                    }
                }

                currentRow++;
            });

            // Fila de Totales
            const totalRow = currentRow;
            worksheet.getCell(totalRow, 1).value = 'TOTAL';
            worksheet.getCell(totalRow, 6).value = { formula: `SUM(F9:F${totalRow - 1})` } as any;
            worksheet.getCell(totalRow, totalCols).value = { formula: `SUM(${worksheet.getCell(totalRow, totalCols).address.replace(/[0-9]/g, '')}9:${worksheet.getCell(totalRow, totalCols).address.replace(/[0-9]/g, '')}${totalRow - 1})` } as any;

            listDates.forEach((date, dateIdx) => {
                const colNum = 7 + dateIdx;
                const colLetter = worksheet.getCell(totalRow, colNum).address.replace(/[0-9]/g, '');
                worksheet.getCell(totalRow, colNum).value = { formula: `SUM(${colLetter}9:${colLetter}${totalRow - 1})` } as any;
            });

            // Estilo de la fila de totales
            for (let c = 1; c <= totalCols; c++) {
                const cell = worksheet.getCell(totalRow, c);
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF163572' } };
                cell.alignment = { horizontal: c === 1 ? 'left' : 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FF163572' } },
                    bottom: { style: 'double', color: { argb: 'FF163572' } }
                };

                const dateIdx = c - 7;
                if (dateIdx >= 0 && dateIdx < totalDays) {
                    const date = listDates[dateIdx];
                    const dateStr = this.formatDate(date);
                    const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
                    const isFeriado = feriados.includes(dateStr);

                    if (isFeriado) {
                        cell.fill = feriadoFill;
                    } else if (isWeekend) {
                        cell.fill = weekendFill;
                    } else {
                        cell.fill = whiteFill;
                    }
                } else {
                    cell.fill = whiteFill;
                }
            }

            // sm - Información adicional de salida (fuera de la tabla), entre los totales y las firmas.
            this.infoSalidaReporte(col).forEach((linea, i) => {
                const celda = worksheet.getCell(totalRow + 2 + i, 2);
                celda.value = linea;
                celda.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF163572' } };
            });

            // Firmas
            const sigRow1 = totalRow + 5;
            const sigRow2 = totalRow + 6;

            worksheet.getCell(sigRow1, 2).value = `Elaborado por: ${col.nombre}`;
            worksheet.getCell(sigRow1, 2).font = { name: 'Arial', size: 10, italic: true };
            worksheet.getCell(sigRow2, 2).value = `ISC INTEGRITY SOLUTIONS & CONSULTING CIA. LTDA.`;
            worksheet.getCell(sigRow2, 2).font = { name: 'Arial', size: 10, bold: true };

            const distinctLeaders = Array.from(new Set(clientActividades.map(act => act.liderProyecto).filter(Boolean)));
            const leaderName = distinctLeaders.length > 0 ? distinctLeaders.join(', ') : 'Sin LÃ­der';
            worksheet.getCell(sigRow1, 8).value = `Revisado y Aprobado por: ${leaderName}`;
            worksheet.getCell(sigRow1, 8).font = { name: 'Arial', size: 10, italic: true };
            worksheet.getCell(sigRow2, 8).value = `Empresa: ${clientName}`;
            worksheet.getCell(sigRow2, 8).font = { name: 'Arial', size: 10, bold: true };

            // Nomenclatura (Leyenda)
            const nomTitleRow = totalRow + 9;
            const nomVacRow = totalRow + 10;
            const nomFerRow = totalRow + 11;
            const nomPermRow = totalRow + 12;
            const nomWkRow = totalRow + 13;
            const nomRecRow = totalRow + 14;

            worksheet.getCell(nomTitleRow, 2).value = 'Nomenclatura';
            worksheet.getCell(nomTitleRow, 2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF163572' } };

            const legendCells = [
                { row: nomVacRow, label: 'Vacaciones', fill: vacacionesFill },
                { row: nomFerRow, label: 'Feriado', fill: feriadoFill },
                { row: nomPermRow, label: 'Permiso', fill: permisoFill },
                { row: nomWkRow, label: 'Fines de Semana', fill: weekendFill },
                { row: nomRecRow, label: 'Actividad Recurrente', fill: recurrenteFill }
            ];

            legendCells.forEach(item => {
                const cLabel = worksheet.getCell(item.row, 3);
                cLabel.value = item.label;
                cLabel.fill = item.fill;
                cLabel.font = { name: 'Arial', size: 9 };
                cLabel.alignment = { horizontal: 'center', vertical: 'middle' };
                cLabel.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });

            // Llamar a la estandarizaciÃ³n de cabeceras corporativas
            const currentMonthName = startDate.toLocaleString('es-EC', { month: 'long' }).toUpperCase();
            await estandarizarCabeceraExcelExistente(
                workbook,
                worksheet,
                `TIME REPORT - ${clientName.toUpperCase()}`,
                totalCols,
                `${currentMonthName} ${startDate.getFullYear()}`,
                8,
                false
            );
        }

        // Guardar archivo y disparar descarga
        const buffer = await workbook.xlsx.writeBuffer();
        // sm - Si el usuario canceló mientras se armaba el Excel, no se descarga ni se agrega al ZIP.
        this.descargas.verificarCancelacion();
        if (devolverBuffer) return buffer;
        this.guardarArchivo(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${this.nombreArchivo(col.nombre, proyecto?.nombre)}.xlsx`,
        );
        return undefined;
    }

    private formatDate(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // sm - Se eliminaron cambiarPeriodo/ajustarFechasPorPeriodo (ya no existen los botones Quincena/Mes completo) y el
    // cÃ¡lculo del "periodo" que se enviaba al backend sin usarse. Solo se asegura que "hasta" no sea menor que "desde".
    public onFechaManualChange() {
        if (this.fechaDesde && this.fechaHasta && this.fechaHasta < this.fechaDesde) {
            this.fechaHasta = this.fechaDesde;
        }
        this.aplicarFiltros();
    }

    // Aviso manual: el POST solo encola la solicitud (202); el resultado real (enviado / fallido / omitido)
    // se consulta con GET /notificaciones/estado hasta que el backend lo registre. El avance se muestra en un
    // toast arriba a la derecha (no bloquea la pantalla), así que se puede avisar a varios colaboradores a la vez.
    // Cada fila es colaborador + proyecto y cada proyecto exige su propia jornada: el aviso es por fila.
    private notificandoFilas = signal<ReadonlySet<string>>(new Set());

    private claveFila(colaborador: Colaborador): string {
        return `${colaborador.id}:${this.proyectoDeFila(colaborador)?.idProyecto ?? 'sin-proyecto'}`;
    }

    // Undefined en la fila "Sin Proyecto" (el aviso usa todas sus horas, igual que esa fila)
    private proyectoDeFila(colaborador: Colaborador) {
        return colaborador.proyectos?.[0];
    }

    public estaNotificando(colaborador: Colaborador): boolean {
        return this.notificandoFilas().has(this.claveFila(colaborador));
    }

    private marcarNotificando(clave: string, activo: boolean) {
        this.notificandoFilas.update(claves => {
            const siguiente = new Set(claves);
            if (activo) siguiente.add(clave); else siguiente.delete(clave);
            return siguiente;
        });
    }

    // El permiso NOTIFICACIONES_EJECUTAR se asigna a Administrador y Líder (script 14); el backend lo valida igual.
    public readonly puedeNotificar = this.tokenService.hasRole('ADMINISTRADOR') || this.tokenService.isLider();

    async notificarColaborador(colaborador: Colaborador) {
        const idEmpleado = +colaborador.id;
        const clave = this.claveFila(colaborador);
        if (!this.puedeNotificar || this.notificandoFilas().has(clave)) return;

        const nombre = colaborador.nombre;
        const proyecto = this.proyectoDeFila(colaborador);
        const deProyecto = proyecto ? ` (${proyecto.nombre})` : '';

        // Sin rango el backend no sabría qué horas informar
        if (!this.fechaDesde || !this.fechaHasta) {
            const toast = this.toastService.iniciar(`Notificando a ${nombre}`, '', []);
            this.toastService.error(toast, 'Faltan las fechas',
                'Selecciona la fecha desde y la fecha hasta del filtro antes de notificar.');
            return;
        }

        this.marcarNotificando(clave, true);
        const toast = this.toastService.iniciar(
            `Notificando a ${nombre}${deProyecto}`,
            'Enviando la solicitud al servidor...',
            ['Solicitud enviada', 'Procesando y enviando el correo']);

        let avisoDemora: ReturnType<typeof setTimeout> | undefined;
        try {
            // Mismo rango y proyecto que la fila: el correo informa las horas que el líder está viendo
            const solicitud = await lastValueFrom(this.notificacionesService.notificar({
                empleadoIds: [idEmpleado],
                fechaDesde: this.fechaDesde,
                fechaHasta: this.fechaHasta,
                idProyecto: proyecto?.idProyecto,
            }));
            this.toastService.avanzar(toast, 'Esperando la confirmación del envío...');
            avisoDemora = setTimeout(() => this.toastService.actualizarDetalle(toast,
                'Hay otros correos en cola; el resultado aparecerá aquí cuando termine.'), 20000);

            const estado = await this.esperarResultadoNotificacion(idEmpleado, solicitud.solicitadoEnMs, proyecto?.idProyecto);

            switch (estado?.estado) {
                case 'Enviado':
                    this.toastService.exito(toast, 'Notificación enviada',
                        `Se envió un recordatorio a ${nombre}${proyecto ? ` por el proyecto ${proyecto.nombre}` : ''}.`);
                    break;
                case 'Omitido':
                    this.toastService.aviso(toast, 'Notificación no enviada',
                        `${nombre}: ${estado.detalle ?? 'no corresponde avisar en este momento'}.`);
                    break;
                case 'Fallido':
                    this.toastService.error(toast, 'No se pudo enviar',
                        `El correo para ${nombre} no pudo enviarse${this.motivoFallo(estado.detalle)}. Intenta nuevamente en unos minutos.`);
                    break;
                default:
                    this.toastService.aviso(toast, 'Envío en proceso',
                        `El recordatorio para ${nombre} sigue en cola; se enviará en breve.`);
            }
        } catch (err: any) {
            console.error('Error al notificar:', err);
            this.toastService.error(toast, 'No se pudo enviar la notificación', this.mensajeErrorSolicitud(err, nombre));
        } finally {
            clearTimeout(avisoDemora);
            this.marcarNotificando(clave, false);
        }
    }

    // El detalle técnico del fallo (p. ej. la respuesta de Apprise) puede ser largo: se muestra recortado
    private motivoFallo(detalle: string | null): string {
        const texto = detalle?.replace(/\s+/g, ' ').trim();
        if (!texto) return '';
        return ` (motivo: ${texto.length > 160 ? texto.slice(0, 157) + '...' : texto})`;
    }

    // Mensaje legible para el error del POST /notificar, venga como { mensaje }, ProblemDetails o validación
    private mensajeErrorSolicitud(err: any, nombre: string): string {
        if (err?.status === 403) return 'No tienes permiso para enviar notificaciones.';
        if (err?.status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión e intenta de nuevo.';
        if (err?.status === 0) return 'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.';

        const cuerpo = err?.error;
        if (err?.status === 400) {
            const errores = cuerpo?.errors;
            const primerError = Array.isArray(errores)
                ? (errores[0]?.message ?? errores[0]?.mensaje ?? errores[0])
                : errores && typeof errores === 'object'
                    ? (Object.values(errores).flat()[0] as string | undefined)
                    : undefined;
            const texto = cuerpo?.mensaje ?? cuerpo?.message ?? cuerpo?.detail ?? primerError ?? cuerpo?.title;
            return typeof texto === 'string' && texto.trim()
                ? texto
                : 'Los datos de la solicitud no son válidos. Revisa las fechas del filtro.';
        }
        if (err?.status >= 500) return 'El servidor no pudo registrar la solicitud. Intenta nuevamente en unos minutos.';
        return `No se pudo registrar la solicitud para ${nombre}.`;
    }

    // Espera el resultado por SSE (el backend lo empuja en cuanto lo registra, hasta ~5 min).
    // Si el stream no está disponible o se corta, sigue consultando GET /estado.
    // Devuelve null si el aviso sigue en cola al agotarse la espera.
    private async esperarResultadoNotificacion(idEmpleado: number, desdeMs: number, idProyecto?: number): Promise<EstadoEmpleado | null> {
        try {
            const evento = await firstValueFrom(
                this.notificacionesService.streamEstado([idEmpleado], desdeMs, idProyecto).pipe(
                    filter(e => e.tipo === 'fin' || e.estado.idEmpleado === idEmpleado),
                    timeout(6 * 60 * 1000)),
                { defaultValue: undefined });
            if (evento?.tipo === 'estado') return evento.estado;
            if (evento?.tipo === 'fin') return null;
            // Sin "fin": la conexión se cortó antes de tiempo, se sigue por consulta
        } catch (err) {
            console.warn('Stream de estado no disponible; se consulta el estado periódicamente:', err);
        }
        return this.consultarResultadoNotificacion(idEmpleado, desdeMs, idProyecto);
    }

    // Respaldo: consulta el estado cada 3 s (máx. ~90 s). Devuelve null si no se registró o si la consulta falla.
    private async consultarResultadoNotificacion(idEmpleado: number, desdeMs: number, idProyecto?: number): Promise<EstadoEmpleado | null> {
        const intentos = 30;
        for (let i = 0; i < intentos; i++) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
                const respuesta = await lastValueFrom(this.notificacionesService.getEstado([idEmpleado], desdeMs, idProyecto));
                const estado = respuesta.empleados.find(e => e.idEmpleado === idEmpleado);
                if (estado && estado.estado !== 'Pendiente') return estado;
            } catch (err) {
                console.error('Error al consultar el estado de la notificación:', err);
                return null;
            }
        }
        return null;
    }
}
