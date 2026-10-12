import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, BehaviorSubject, combineLatest, takeUntil, debounceTime, distinctUntilChanged, forkJoin, of, switchMap, map } from 'rxjs';
import { AvanceExportacion, exportarReporteExcel, exportarReportePdf } from '../../../../shared/utils/reporte-export.utils';
import { DescargaProgresoService } from '../../../../shared/services/descarga-progreso.service';
import { Cliente, CrearClienteRequest, EditarClienteRequest } from '../../modelos/cliente.model';
import { ClientesService } from '../../servicios/clientes.service';
import { ClientesActions } from '../../store/clientes.actions';
import { DropdownScrollLockService } from '../../../../shared/services/dropdown-scroll-lock.service';
import {
  selectClientes, selectCargando, selectNotificacion,
  selectClienteSeleccionado, selectModalCrearAbierto,
  selectModalEditarAbierto, selectModalDetalleAbierto,
  selectPaginacionInfo, selectResumenClientes, selectFiltros
} from '../../store/clientes.selectors';
import { ModalCrearComponent }    from '../modal-crear/modal-crear.component';
import { ModalEditarComponent }   from '../modal-editar/modal-editar.component';
import { ModalDetalleComponent }  from '../modal-detalle/modal-detalle.component';
import { ModalDescargaComponent } from '../modal-descarga/modal-descarga.component';
import { NotificacionComponent }  from '../notificacion/notificacion.component';
import { PaginacionComponent } from '../../../../shared/components/paginacion/paginacion.component';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../../../shared/components/action-menu/action-menu.component';

import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { MatIconModule } from '@angular/material/icon';

type CampoOrdenableCliente = 'tipoId' | 'identificador' | 'nombreComercial' | 'correoElectronico' | 'telefono' | 'estado';
@Component({
  selector: 'app-lista-clientes',
  standalone: true,
  imports: [TarjetaResumenComponent,
    HeaderComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ModalCrearComponent,
    ModalEditarComponent,
    ModalDetalleComponent,
    ModalDescargaComponent,
    NotificacionComponent,
    PaginacionComponent,
    ActionMenuComponent,
    MatIconModule,
  ],
  templateUrl: './lista-clientes.component.html',
  styleUrls: ['./lista-clientes.component.scss'],
})
export class ListaClientesComponent implements OnInit, OnDestroy {

  private store    = inject(Store);
  private fb       = inject(FormBuilder);
  private clientesService = inject(ClientesService);
  private dropdownScrollLock = inject(DropdownScrollLockService);
  private descargas = inject(DescargaProgresoService);
  private destroy$ = new Subject<void>();

  // ── Selectores ────────────────────────────────────────────
  clientes$     = this.store.select(selectClientes);
  cargando$     = this.store.select(selectCargando);
  notificacion$ = this.store.select(selectNotificacion);
  clienteSelec$ = this.store.select(selectClienteSeleccionado);
  modalCrear$   = this.store.select(selectModalCrearAbierto);
  modalEditar$  = this.store.select(selectModalEditarAbierto);
  modalDetalle$ = this.store.select(selectModalDetalleAbierto);
  paginacion$   = this.store.select(selectPaginacionInfo);
  resumen$      = this.store.select(selectResumenClientes);

  // ── Orden de columnas ──────────────────────────────────────
  private sortState$ = new BehaviorSubject<{ campo: CampoOrdenableCliente | null; asc: boolean }>({ campo: null, asc: true });
  clientesOrdenados$ = combineLatest([this.clientes$, this.sortState$]).pipe(
    map(([clientes, sort]) => this.ordenarClientes(clientes, sort))
  );

  // ── Formulario filtros ────────────────────────────────────
  filtrosForm!: FormGroup;

  // ── Menú tres puntos ──────────────────────────────────────
  menuAbierto: string | null = null;

  // ── Descarga ──────────────────────────────────────────────
  descargaAbierta = false;

  // ── Dropdown estado personalizado ─────────────────────────
  // sm - Accessor: cualquier asignación (true/false), venga de donde venga, bloquea/libera el
  // scroll de fondo sola (DropdownScrollLockService), igual que mat-select ("Tipo de proyecto").
  // (descargaAbierta NO necesita esto: ese dropdown vive en app-modal-descarga, un componente que
  // el *ngIf crea/destruye, y ya se bloquea/libera solo en su propio ngOnInit/ngOnDestroy.)
  private _dropdownEstadoAbierto = false;
  get dropdownEstadoAbierto(): boolean {
    return this._dropdownEstadoAbierto;
  }
  set dropdownEstadoAbierto(valor: boolean) {
    if (valor === this._dropdownEstadoAbierto) return;
    this._dropdownEstadoAbierto = valor;
    if (valor) {
      this.dropdownScrollLock.lock();
    } else {
      this.dropdownScrollLock.unlock();
    }
  }
  estadoSeleccionado       = 'Estado';
  estadosSeleccionados: string[] = [];

  // ── Paginación local ──────────────────────────────────────
  paginaActual = 1;
  totalPaginas = 1;
  tamanoPagina = 10;
  total = 0;

  ngOnInit(): void {
    this.filtrosForm = this.fb.group({
      busqueda: [''],
      estado:   ['todos'],
    });
    this.estadoSeleccionado = 'todos';

    // Cargar inicial
    this.store.dispatch(ClientesActions.cargarResumenClientes());
    this.despacharCarga();

    // Reaccionar a cambios en búsqueda con debounce
    this.filtrosForm.get('busqueda')!.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginaActual = 1;
      this.despacharFiltros();
    });

    // Reaccionar a cambios en estado inmediatamente
    this.filtrosForm.get('estado')!.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.paginaActual = 1;
      this.despacharFiltros();
    });


    this.paginacion$.pipe(takeUntil(this.destroy$)).subscribe((p: any) => {
      this.paginaActual = p.paginaActual;
      this.totalPaginas = p.totalPaginas;
      this.tamanoPagina = p.tamanoPagina;
      this.total = p.total ?? p.totalRegistros ?? p.totalItems ?? 0;
    });
  }

  ngOnDestroy(): void {
    if (this._dropdownEstadoAbierto) {
      this.dropdownScrollLock.unlock();
      this._dropdownEstadoAbierto = false;
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Helpers despacho ──────────────────────────────────────
  private despacharCarga(): void {
    const filtros = this.getFiltros();
    this.store.dispatch(ClientesActions.cargarClientes({
      pagina: this.paginaActual,
      tamanoPagina: this.tamanoPagina,
      filtros,
    }));
  }

  private despacharFiltros(): void {
    const filtros = this.getFiltros();
    this.store.dispatch(ClientesActions.cambiarFiltros({ filtros }));
    this.store.dispatch(ClientesActions.cargarClientes({
      pagina: 1,
      tamanoPagina: this.tamanoPagina,
      filtros,
    }));
  }

  private getFiltros() {
    const estado = this.filtrosForm.get('estado')!.value ?? 'todos';
    return {
      busqueda: this.filtrosForm.get('busqueda')!.value ?? '',
      estado,
    };
  }

  // ── Paginación ────────────────────────────────────────────
  get paginas(): number[] {
    const total  = this.totalPaginas;
    const actual = this.paginaActual;
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: number[] = [1];
    if (actual > 3) pages.push(-1); // ellipsis
    for (let i = Math.max(2, actual - 1); i <= Math.min(total - 1, actual + 1); i++) {
      pages.push(i);
    }
    if (actual < total - 2) pages.push(-1); // ellipsis
    pages.push(total);
    return pages;
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || pagina === this.paginaActual) return;
    this.paginaActual = pagina;
    this.store.dispatch(ClientesActions.cargarClientes({
      pagina,
      tamanoPagina: this.tamanoPagina,
      filtros: this.getFiltros(),
    }));
  }

  // ── Menú tres puntos ──────────────────────────────────────
  toggleMenu(payload: { id: string; event: Event }): void {
    payload.event.stopPropagation();
    this.menuAbierto = this.menuAbierto === payload.id ? null : payload.id;
  }

  cerrarMenu(): void {
    this.menuAbierto           = null;
    this.dropdownEstadoAbierto = false;
    this.descargaAbierta       = false;
  }

  // ── Dropdown estado ───────────────────────────────────────
  toggleDropdownEstado(e: MouseEvent): void {
    e.stopPropagation();
    this.dropdownEstadoAbierto = !this.dropdownEstadoAbierto;
    this.descargaAbierta       = false;
  }

  seleccionarEstado(estado: string): void {
    this.estadoSeleccionado    = estado;
    this.dropdownEstadoAbierto = false;
    this.filtrosForm.get('estado')!.setValue(estado);
    this.estadosSeleccionados = estado === 'todos' ? [] : [estado];
  }

  // ── Dropdown estado con checkboxes ────────────────────────
  toggleEstado(estado: string): void {
    const idx = this.estadosSeleccionados.indexOf(estado);
    if (idx > -1) {
      this.estadosSeleccionados.splice(idx, 1);
      if (this.estadosSeleccionados.length === 0) {
        this.filtrosForm.get('estado')!.setValue('todos');
        this.estadoSeleccionado = 'todos';
      } else {
        this.filtrosForm.get('estado')!.setValue(this.estadosSeleccionados[0]);
        this.estadoSeleccionado = this.estadosSeleccionados[0];
      }
    } else {
      this.estadosSeleccionados = [estado];
      this.filtrosForm.get('estado')!.setValue(estado);
      this.estadoSeleccionado = estado;
    }
  }

  limpiarFiltroEstado(): void {
    this.estadosSeleccionados  = [];
    this.filtrosForm.get('estado')!.setValue('todos');
    this.estadoSeleccionado    = 'todos';
    this.dropdownEstadoAbierto = false;
  }

  // ── Orden de columnas ──────────────────────────────────────
  ordenar(campo: CampoOrdenableCliente): void {
    const actual = this.sortState$.value;
    if (actual.campo === campo) {
      this.sortState$.next({ campo, asc: !actual.asc });
    } else {
      this.sortState$.next({ campo, asc: true });
    }
  }

  direccionOrden(campo: CampoOrdenableCliente): 'ascending' | 'descending' | 'none' {
    const actual = this.sortState$.value;
    if (actual.campo !== campo) return 'none';
    return actual.asc ? 'ascending' : 'descending';
  }

  get sortField(): CampoOrdenableCliente | null {
    return this.sortState$.value.campo;
  }

  get sortAsc(): boolean {
    return this.sortState$.value.asc;
  }

  private ordenarClientes(clientes: Cliente[] | null, sort: { campo: CampoOrdenableCliente | null; asc: boolean }): Cliente[] {
    const lista = clientes ?? [];
    if (!sort.campo) return lista;
    const campo = sort.campo;
    const factor = sort.asc ? 1 : -1;

    return [...lista].sort((a, b) => {
      const valorA = String((a as any)[campo] ?? '').toLowerCase();
      const valorB = String((b as any)[campo] ?? '').toLowerCase();
      return valorA.localeCompare(valorB, 'es', { numeric: true }) * factor;
    });
  }

  // ── Acciones tabla ────────────────────────────────────────
  verDetalle(cliente: Cliente): void {
    this.cerrarMenu();
    this.store.dispatch(ClientesActions.abrirModalDetalle({ cliente }));
    this.store.dispatch(ClientesActions.cargarClientePorId({ id: cliente.id }));
  }

  abrirEditar(cliente: Cliente): void {
    this.cerrarMenu();
    this.store.dispatch(ClientesActions.abrirModalEditar({ cliente }));
    this.store.dispatch(ClientesActions.cargarClientePorId({ id: cliente.id }));
  }

  accionesCliente(cliente: Cliente): ActionMenuItem[] {
    const activo = cliente.estado === 'Activo';

    return [
      { id: 'ver-mas', label: 'Ver más' },
      { id: 'editar', label: 'Editar' },
      {
        id: activo ? 'inactivar' : 'activar',
        label: activo ? 'Desactivar' : 'Activar',
        danger: activo,
      },
    ];
  }

  onAccionCliente(accion: ActionMenuItem, cliente: Cliente): void {
    if (accion.id === 'ver-mas') {
      this.verDetalle(cliente);
      return;
    }

    if (accion.id === 'editar') {
      this.abrirEditar(cliente);
      return;
    }

    if (accion.id === 'activar' || accion.id === 'inactivar') {
      this.cambiarEstadoCliente(cliente);
    }
  }

  private cambiarEstadoCliente(cliente: Cliente): void {
    this.cerrarMenu();
    const nuevoEstado = cliente.estado === 'Activo' ? 'Inactivo' : 'Activo';

    this.clientesService.getClientePorId(cliente.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: detalle => {
        this.store.dispatch(ClientesActions.editarCliente({
          id: cliente.id,
          request: {
            tipoId: detalle.tipoId,
            identificador: detalle.identificador,
            nombreComercial: detalle.nombreComercial,
            nombres: detalle.nombres ?? '',
            apellidos: detalle.apellidos ?? '',
            correoElectronico: detalle.correoElectronico,
            telefono: detalle.telefono,
            direccion: detalle.direccion ?? '',
            estado: nuevoEstado,
          },
        }));
      },
      error: error => console.error('Error al cambiar estado del cliente:', error),
    });
  }

  abrirCrear(): void {
    this.store.dispatch(ClientesActions.abrirModalCrear());
  }

  // ── Submit formularios ────────────────────────────────────
  onGuardarCrear(req: CrearClienteRequest): void {
    this.store.dispatch(ClientesActions.crearCliente({ request: req }));
  }

  onGuardarEditar(req: EditarClienteRequest, id: number): void {
    this.store.dispatch(ClientesActions.editarCliente({ id, request: req }));
  }

  // ── Cerrar modales ────────────────────────────────────────
  cerrarCrear():   void { this.store.dispatch(ClientesActions.cerrarModalCrear()); }
  cerrarEditar():  void { this.store.dispatch(ClientesActions.cerrarModalEditar()); }
  cerrarDetalle(): void { this.store.dispatch(ClientesActions.cerrarModalDetalle()); }
  cerrarNotif():   void { this.store.dispatch(ClientesActions.limpiarNotificacion()); }

  // ── Descarga ──────────────────────────────────────────────
  toggleDescarga(e: MouseEvent): void {
    e.stopPropagation();
    this.descargaAbierta       = !this.descargaAbierta;
    this.dropdownEstadoAbierto = false;
  }

  onDescargar(formato: 'pdf' | 'excel'): void {
    this.descargaAbierta = false;
    // sm - Toast de progreso compartido (con Cancelar): obtiene los datos y genera el archivo.
    this.descargas.ejecutar(formato === 'pdf' ? 'pdf' : 'xlsx', async ctx => {
      const clientes = await ctx.esperar(this.obtenerClientesParaExportar());
      if (formato === 'pdf') await this.descargarPDF(clientes, ctx);
      else await this.descargarExcel(clientes, ctx);
    }).catch(error => console.error('Error al exportar clientes:', error));
  }

  private obtenerClientesParaExportar() {
    return this.clientesService.getClientes(1, 9999, this.getFiltros()).pipe(
      switchMap(res => {
        const clientes = res.items ?? [];
        if (!clientes.length) return of([]);
        return forkJoin(clientes.map(cliente => this.clientesService.getClientePorId(cliente.id)));
      })
    );
  }

  private descargarPDF(clientes: Cliente[], avance?: AvanceExportacion): Promise<void> {
    return exportarReportePdf({
      titulo: 'Reporte de Clientes',
      nombreArchivo: 'Clientes',
      nombreHoja: 'Clientes',
      columnas: [
        { encabezado: 'Tipo ID', anchoPdf: 16 },
        { encabezado: 'Identificador', anchoPdf: 23 },
        { encabezado: 'Nombre comercial', anchoPdf: 32 },
        { encabezado: 'Nombres', anchoPdf: 25 },
        { encabezado: 'Apellidos', anchoPdf: 25 },
        { encabezado: 'Correo electrónico', anchoPdf: 36 },
        { encabezado: 'Teléfono', anchoPdf: 20 },
        { encabezado: 'Dirección', anchoPdf: 28 },
        { encabezado: 'Estado', anchoPdf: 18 },
        { encabezado: 'Proyectos asignados', anchoPdf: 24 },
      ],
      filas: clientes.map((cliente) => [
        cliente.tipoId ?? '-',
        cliente.identificador ?? '-',
        cliente.nombreComercial ?? '-',
        cliente.nombres ?? '-',
        cliente.apellidos ?? '-',
        cliente.correoElectronico ?? '-',
        cliente.telefono ?? '-',
        cliente.direccion ?? '-',
        cliente.estado ?? '-',
        this.formatearProyectosCliente(cliente),
      ]),
      columnaEstado: 8,
      orientacionPdf: 'landscape',
    }, avance);
  }

  private async descargarExcel(clientes: Cliente[], avance?: AvanceExportacion): Promise<void> {
    await exportarReporteExcel({
      titulo: 'Reporte de Clientes',
      nombreArchivo: 'Clientes',
      nombreHoja: 'Clientes',
      columnas: [
        { encabezado: 'Tipo de identificación', anchoExcel: 22 },
        { encabezado: 'Identificador', anchoExcel: 18 },
        { encabezado: 'Nombre comercial', anchoExcel: 34 },
        { encabezado: 'Nombres', anchoExcel: 24 },
        { encabezado: 'Apellidos', anchoExcel: 24 },
        { encabezado: 'Correo electrónico', anchoExcel: 34 },
        { encabezado: 'Teléfono', anchoExcel: 16 },
        { encabezado: 'Estado', anchoExcel: 14 },
        { encabezado: 'Dirección', anchoExcel: 36 },
        { encabezado: 'Proyectos asignados', anchoExcel: 48 },
      ],
      filas: clientes.map((cliente) => [
        cliente.tipoId ?? '-',
        cliente.identificador ?? '-',
        cliente.nombreComercial ?? '-',
        cliente.nombres ?? '-',
        cliente.apellidos ?? '-',
        cliente.correoElectronico ?? '-',
        cliente.telefono ?? '-',
        cliente.estado ?? '-',
        cliente.direccion ?? '-',
        this.formatearProyectosCliente(cliente),
      ]),
      columnaEstado: 7,
      orientacionPdf: 'landscape',
    }, avance);
    return;

    const ExcelJS = await import('exceljs');
    const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
    const workbook = new Workbook();
    const ws = workbook.addWorksheet('Clientes');

    ws.columns = [
      { header: 'Tipo de identificaciÃ³n', key: 'tipoId', width: 22 },
      { header: 'Identificador', key: 'identificador', width: 18 },
      { header: 'Nombre comercial', key: 'nombreComercial', width: 34 },
      { header: 'Nombres', key: 'nombres', width: 24 },
      { header: 'Apellidos', key: 'apellidos', width: 24 },
      { header: 'Correo electrÃ³nico', key: 'correoElectronico', width: 34 },
      { header: 'TelÃ©fono', key: 'telefono', width: 16 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'DirecciÃ³n', key: 'direccion', width: 36 },
      { header: 'Proyectos asignados', key: 'proyectos', width: 48 },
    ];

    clientes.forEach(c => ws.addRow({
      tipoId: c.tipoId ?? '-',
      identificador: c.identificador ?? '-',
      nombreComercial: c.nombreComercial ?? '-',
      nombres: c.nombres ?? '-',
      apellidos: c.apellidos ?? '-',
      correoElectronico: c.correoElectronico ?? '-',
      telefono: c.telefono ?? '-',
      estado: c.estado ?? '-',
      direccion: c.direccion ?? '-',
      proyectos: this.formatearProyectosCliente(c),
    }));

    this.aplicarEstiloExcel(ws, 8);
    const buffer = await workbook.xlsx.writeBuffer();
    this.crearDescargaExcel(buffer, 'clientes.xlsx');
    return;
    this.clientes$.subscribe(clientes => {
      const datos = clientes.map(c => ({
        'Tipo':          c.tipoId,
        'Identificador':    c.identificador,
        'Nombre Comercial': c.nombreComercial,
        'Correo':           c.correoElectronico,
        'Teléfono':         c.telefono,
        'Estado':           c.estado,
      }));

    }).unsubscribe();
  }

  private aplicarEstiloExcel(ws: any, colEstado: number): void {
    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163572' } };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = this.bordeDelgado();
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const fill = rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      row.height = 22;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
        cell.border = this.bordeDelgado('FFE2E8F0');
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        if (colNumber === colEstado) {
          const esActivo = String(cell.value ?? '').toLowerCase() === 'activo';
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: esActivo ? 'FF16A34A' : 'FF6B7280' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });
  }

  private bordeDelgado(color = 'FF163572'): any {
    const b = { style: 'thin', color: { argb: color } };
    return { top: b, left: b, bottom: b, right: b };
  }

  private formatearFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private formatearProyectosCliente(cliente: Cliente): string {
    const proyectos = cliente.proyectosAsignados ?? [];
    if (!proyectos.length) return '-';
    return proyectos.map(p => `${p.nombre} - ${p.cliente} - ${p.estado}`).join('; ');
  }

  private crearDescargaExcel(buffer: any, nombreArchivo: string): void {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
  }
}
