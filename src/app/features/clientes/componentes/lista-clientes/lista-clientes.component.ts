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
  busquedaEstado           = '';
  estadosSeleccionados: string[] = [];

  // ── Paginación local ──────────────────────────────────────
  paginaActual = 1;
  totalPaginas = 1;
  tamanoPagina = 9;

  ngOnInit(): void {
    this.filtrosForm = this.fb.group({
      busqueda: [''],
      estado:   ['todos'],
    });

    // Cargar inicial
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

    // Sincronizar paginación desde el store
    this.paginacion$.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.paginaActual = p.paginaActual;
      this.totalPaginas = p.totalPaginas;
      this.tamanoPagina = p.tamanoPagina;
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
    return {
      busqueda: this.filtrosForm.get('busqueda')!.value ?? '',
      estado:   this.filtrosForm.get('estado')!.value   ?? 'todos',
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
    this.estadoSeleccionado    = estado === 'todos' ? 'Estado' : estado;
    this.dropdownEstadoAbierto = false;
    this.filtrosForm.get('estado')!.setValue(estado);
  }

  // ── Dropdown estado con checkboxes ────────────────────────
  toggleEstado(estado: string): void {
    const idx = this.estadosSeleccionados.indexOf(estado);
    if (idx > -1) {
      this.estadosSeleccionados.splice(idx, 1);
    } else {
      this.estadosSeleccionados.push(estado);
    }
    // Si hay uno seleccionado filtra, si no muestra todos
    if (this.estadosSeleccionados.length === 1) {
      this.filtrosForm.get('estado')!.setValue(this.estadosSeleccionados[0]);
    } else {
      this.filtrosForm.get('estado')!.setValue('todos');
    }
  }

  limpiarFiltroEstado(): void {
    this.estadosSeleccionados  = [];
    this.busquedaEstado        = '';
    this.filtrosForm.get('estado')!.setValue('todos');
    this.dropdownEstadoAbierto = false;
  }

  contarPorEstado(estado: string): number {
    let count = 0;
    this.clientes$.subscribe(c => {
      count = c.filter(x => x.estado === estado).length;
    }).unsubscribe();
    return count;
  }

  // ── Acciones tabla ────────────────────────────────────────
  verDetalle(cliente: Cliente): void {
    this.cerrarMenu();
    this.store.dispatch(ClientesActions.abrirModalDetalle({ cliente }));
  }

  abrirEditar(cliente: Cliente): void {
    this.cerrarMenu();
    this.store.dispatch(ClientesActions.abrirModalEditar({ cliente }));
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
        head: [['Código', 'Tipo ID', 'Identificador', 'Nombre Comercial', 'Correo electrónico', 'Teléfono', 'Estado']],
        body: clientes.map(c => [
          c.codigo, c.tipoId, c.identificador,
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
        'Código':           c.codigo,
        'Tipo ID':          c.tipoId,
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