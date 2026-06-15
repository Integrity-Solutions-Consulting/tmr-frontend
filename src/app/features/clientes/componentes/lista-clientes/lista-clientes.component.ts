import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Cliente, CrearClienteRequest, EditarClienteRequest } from '../../modelos/cliente.model';
import { ClientesActions } from '../../store/clientes.actions';
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

@Component({
  selector: 'app-lista-clientes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ModalCrearComponent,
    ModalEditarComponent,
    ModalDetalleComponent,
    ModalDescargaComponent,
    NotificacionComponent,
    PaginacionComponent,
  ],
  templateUrl: './lista-clientes.component.html',
  styleUrls: ['./lista-clientes.component.scss'],
})
export class ListaClientesComponent implements OnInit, OnDestroy {

  private store    = inject(Store);
  private fb       = inject(FormBuilder);
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

  // ── Formulario filtros ────────────────────────────────────
  filtrosForm!: FormGroup;

  // ── Menú tres puntos ──────────────────────────────────────
  menuAbierto: number | null = null;

  // ── Descarga ──────────────────────────────────────────────
  descargaAbierta = false;

  // ── Dropdown estado personalizado ─────────────────────────
  dropdownEstadoAbierto    = false;
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
  toggleMenu(id: number, e: MouseEvent): void {
    e.stopPropagation();
    this.menuAbierto = this.menuAbierto === id ? null : id;
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
    if (formato === 'pdf')   this.descargarPDF();
    if (formato === 'excel') this.descargarExcel();
  }

  private descargarPDF(): void {
    this.clientes$.subscribe(clientes => {
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.setTextColor(22, 53, 114);
      doc.text('Listado de Clientes', 14, 16);

      autoTable(doc, {
        startY: 24,
        head: [['Tipo', 'Identificador', 'Nombre Comercial', 'Correo electrónico', 'Teléfono', 'Estado']],
        body: clientes.map(c => [
          c.tipoId, c.identificador,
          c.nombreComercial, c.correoElectronico, c.telefono, c.estado,
        ]),
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [22, 53, 114], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });

      doc.save('clientes.pdf');
    }).unsubscribe();
  }

  private descargarExcel(): void {
    this.clientes$.subscribe(clientes => {
      const datos = clientes.map(c => ({
        'Tipo':          c.tipoId,
        'Identificador':    c.identificador,
        'Nombre Comercial': c.nombreComercial,
        'Correo':           c.correoElectronico,
        'Teléfono':         c.telefono,
        'Estado':           c.estado,
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      XLSX.writeFile(wb, 'clientes.xlsx');
    }).unsubscribe();
  }
}
