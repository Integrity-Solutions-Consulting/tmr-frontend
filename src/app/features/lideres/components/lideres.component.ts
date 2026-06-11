import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http'; 
import { ModalLider } from './modal-lider/modal-lider';
import { environment } from '../../../../environments/environment';
import { ModalDetalleLider } from './modal-detalle-lider/modal-detalle-lider';
import { ModalDescargaComponent } from './modal-descarga/modal-descarga.component';
import { ModalConfirmacion } from './modal-confirmacion/modal-confirmacion';

export interface Lider {
  id?: number;
  codigo: string;
  tipo: 'Interno' | 'Externo';
  nombre: string;
  cliente: string;
  correo: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
}

@Component({
  selector: 'app-lideres',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    ModalLider,
    ModalDetalleLider,
    ModalDescargaComponent,
    ModalConfirmacion
  ],
  templateUrl: './lideres.component.html',
  styleUrls: ['./lideres.component.scss'],
})
export class LideresComponent implements OnInit {

  // ── Data Real ───────────────────────────────────────────
  lideres: Lider[] = []; 
  lideresFiltrados: Lider[] = [];
  lideresPaginados: Lider[] = [];

  private apiUrl = `${environment.apiUrl}/lideres`;

  // ── Filtros ────────────────────────────────────────────
  busqueda = '';
  tipoFiltro = '';
  estadoFiltro: 'Activo' | 'Inactivo' | '' = 'Activo';

  // ── Paginación ─────────────────────────────────────────
  paginaActual = 1;
  porPagina = 10;
  totalPaginas = 1;
  paginas: number[] = [];

  // ── Modales ────────────────────────────────────────────
  mostrarFormulario = false;
  mostrarDetalle = false;
  mostrarDescarga = false;
  mostrarConfirmacion = false;
  mensajeConfirmacion = '';
  liderSeleccionado: any = null;
  liderParaEditar: any = null;
  modoEdicion = false;
  liderEditando: Lider | null = null;
  liderForm!: FormGroup;
  guardandoLider = false;

  // ── Estado Dropdown ────────────────────────────────────
  mostrarEstadoDropdown = false;

  constructor(private fb: FormBuilder, private http: HttpClient) { }

  ngOnInit(): void {
    this.liderForm = this.fb.group({
      codigo: ['', Validators.required],
      tipo: ['', Validators.required],
      nombre: ['', Validators.required],
      cliente: [''],
      correo: ['', [Validators.required, Validators.email]],
      telefono: [''],
      estado: ['Activo', Validators.required],
    });
    
    this.obtenerLideresDelBackend();
  }

  // ── Consumir API Real ──────────────────────────────────
  obtenerLideresDelBackend(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (data) => {
        this.lideres = data.map((l, i) => ({
          ...l,
          id: l.id,
          codigo: String(i + 1).padStart(3, '0'),
          nombre: `${l.nombres} ${l.apellidos}`,
          tipo: l.tipoNombre?.toLowerCase().includes('interno') ? 'Interno' : 'Externo',
          correo: l.email,
          telefono: l.telefono ?? '',  // ← FIX 2: simplificado
          cliente: '',
          estado: l.activo ? 'Activo' : 'Inactivo'
        }));
        this.aplicarFiltros();
      },
      error: (err) => {
        console.error('❌ Error al traer líderes:', err);
      }
    });
  }

  // ── Contadores cards dinámicos ──────────────────────────
  get totalInternos(): number {
    return this.lideres.filter(l => l.tipo === 'Interno').length;
  }

  get totalExternos(): number {
    return this.lideres.filter(l => l.tipo === 'Externo').length;
  }

  get totalInactivos(): number {
    return this.lideres.filter(l => l.estado === 'Inactivo').length;
  }

  get totalActivos(): number {
    return this.lideres.filter(l => l.estado === 'Activo').length;
  }

  // ── Paginación helpers ─────────────────────────────────
  get rangoInicio(): number {
    return this.lideresFiltrados.length === 0 ? 0 : (this.paginaActual - 1) * this.porPagina + 1;
  }

  get rangoFin(): number {
    return Math.min(this.paginaActual * this.porPagina, this.lideresFiltrados.length);
  }

  // ── Filtros ────────────────────────────────────────────
  filtrarPor(tipo: string): void {
    if (tipo === 'Inactivo') {
      this.estadoFiltro = this.estadoFiltro === 'Inactivo' ? 'Activo' : 'Inactivo';
      this.tipoFiltro = '';
    } else {
      if (this.tipoFiltro === tipo) {
        this.tipoFiltro = '';
        this.estadoFiltro = 'Activo';
      } else {
        this.tipoFiltro = tipo;
      }
    }
    this.aplicarFiltros();
  }

  filtrarEstado(estado: 'Activo' | 'Inactivo' | ''): void {
    this.estadoFiltro = estado === 'Activo' || estado === 'Inactivo' ? estado : 'Activo';
    this.aplicarFiltros();
  }

  toggleEstadoDropdown(event?: Event): void {
    event?.stopPropagation();
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: 'Activo' | 'Inactivo' | ''): void {
    this.estadoFiltro = estado === 'Activo' || estado === 'Inactivo' ? estado : '';
    this.mostrarEstadoDropdown = false;
    this.aplicarFiltros();
  }

  cerrarDropdowns(): void {
    this.mostrarEstadoDropdown = false;
  }

  aplicarFiltros(): void {
    const texto = this.busqueda.toLowerCase();
    this.lideresFiltrados = this.lideres.filter(l => {
      const matchTexto = !texto ||
        (l.nombre && l.nombre.toLowerCase().includes(texto)) ||
        (l.codigo && l.codigo.toLowerCase().includes(texto)) ||
        (l.correo && l.correo.toLowerCase().includes(texto)) ||
        (l.cliente && l.cliente.toLowerCase().includes(texto));
      const matchTipo = !this.tipoFiltro || l.tipo === this.tipoFiltro;
      const matchEstado = !this.estadoFiltro || l.estado === this.estadoFiltro;
      return matchTexto && matchTipo && matchEstado;
    });
    this.totalPaginas = Math.max(1, Math.ceil(this.lideresFiltrados.length / this.porPagina));
    this.paginaActual = 1;
    this.calcularPaginas();
    this.actualizarPaginados();
  }

  calcularPaginas(): void {
    const max = Math.min(this.totalPaginas, 4);
    const inicio = Math.max(1, Math.min(this.paginaActual - 2, this.totalPaginas - max + 1));
    this.paginas = Array.from({ length: max }, (_, i) => inicio + i);
  }

  actualizarPaginados(): void {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    this.lideresPaginados = this.lideresFiltrados.slice(inicio, inicio + this.porPagina);
  }

  irPagina(p: number): void {
    this.paginaActual = p;
    this.calcularPaginas();
    this.actualizarPaginados();
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) this.irPagina(this.paginaActual - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) this.irPagina(this.paginaActual + 1);
  }

  // ── Modal Formulario ───────────────────────────────────
  abrirFormulario(): void {
    this.mostrarDescarga = false;
    this.modoEdicion = false;
    this.liderEditando = null;
    this.liderParaEditar = null;
    this.guardandoLider = false;
    this.liderForm.reset({ estado: 'Activo' });
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.liderEditando = null;
    this.liderParaEditar = null;
    this.guardandoLider = false;
    this.liderForm.reset();
  }

  verLider(lider: Lider, numero: number): void {
    this.mostrarDescarga = false;
    this.liderSeleccionado = { ...lider, numero };
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.liderSeleccionado = null;
  }

  editarLider(lider: Lider): void {
    this.mostrarDescarga = false;
    this.modoEdicion = true;
    this.liderEditando = lider;
    this.liderParaEditar = lider;
    this.guardandoLider = false;
    this.mostrarFormulario = true;
  }

  guardarLider(payload: any): void {
    if (this.guardandoLider) return;

    if (!this.modoEdicion && this.liderYaExiste(payload)) {
      this.mensajeConfirmacion = 'Ya existe un líder con los mismos datos de contacto.';
      this.mostrarConfirmacion = true;
      setTimeout(() => this.mostrarConfirmacion = false, 3000);
      return;
    }

    this.guardandoLider = true;

    const solicitud = this.modoEdicion && this.liderParaEditar?.id
      ? {
          Nombres: payload.nombres,
          Apellidos: payload.apellidos,
          Email: payload.correo,
          Telefono: payload.telefono,
          Idtipo: payload.tipoId || undefined,
          Activo: payload.estado === 'Activo',
          Usuariomodificacion: 'frontend',
          Ipmodificacion: '127.0.0.1'
        }
      : {
          Idpersona: payload.personaId,
          Idtipo: payload.tipoId,
          Nombres: payload.nombres,    // ← FIX 1
          Apellidos: payload.apellidos, // ← FIX 1
          Email: payload.correo,        // ← FIX 1
          Telefono: payload.telefono,
          Usuariocreacion: 'frontend',
          Ipcreacion: '127.0.0.1'
        };

    const request$ = this.modoEdicion && this.liderParaEditar?.id
      ? this.http.put(`${this.apiUrl}/${this.liderParaEditar.id}`, solicitud)
      : this.http.post(this.apiUrl, solicitud);

    request$.subscribe({
      next: () => {
        this.guardandoLider = false;
        this.mensajeConfirmacion = this.modoEdicion
          ? 'Los cambios han sido<br>guardados exitosamente'
          : 'El nuevo líder ha sido<br>agregado exitosamente';
        this.mostrarConfirmacion = true;
        this.mostrarFormulario = false;
        this.liderEditando = null;
        this.obtenerLideresDelBackend();
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      },
      error: (err) => {
        this.guardandoLider = false;
        console.error('Error al guardar líder:', err);
        this.mensajeConfirmacion = 'No se pudo guardar el líder. Intente de nuevo.';
        this.mostrarConfirmacion = true;
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      }
    });
  }

  private liderYaExiste(payload: any): boolean {
    const correo = this.normalizarTexto(payload.correo);
    const telefono = this.normalizarTexto(payload.telefono);
    const nombreCompleto = this.normalizarTexto(`${payload.nombres ?? ''} ${payload.apellidos ?? ''}`);

    return this.lideres.some(lider =>
      this.normalizarTexto(lider.correo) === correo
      || this.normalizarTexto(lider.telefono) === telefono
      || this.normalizarTexto(lider.nombre) === nombreCompleto
    );
  }

  private normalizarTexto(valor: unknown): string {
    return String(valor ?? '').trim().toLowerCase();
  }

  abrirDescarga(): void {
    this.mostrarDescarga = true;
  }

  cerrarDescarga(): void {
    this.mostrarDescarga = false;
  }

  descargarPDF(): void {
    const doc = new jsPDF();
    doc.setTextColor(115, 115, 115);
    doc.text('Lista de Líderes', 14, 16);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      head: [['#', 'Tipo', 'Nombre', 'Cliente', 'Correo', 'Teléfono', 'Estado']],
      body: this.lideres.map((l, i) => [
        i + 1, l.tipo, l.nombre, l.cliente, l.correo, l.telefono, l.estado
      ]),
      startY: 22,
      headStyles: {
        fillColor: [22, 53, 114],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    doc.save('lideres.pdf');
    this.mostrarDescarga = false;
  }

  descargarExcel(): void {
    const datos = this.lideres.map((l, i) => ({
      '#': i + 1,
      'Tipo': l.tipo,
      'Nombre': l.nombre,
      'Cliente': l.cliente,
      'Correo': l.correo,
      'Teléfono': l.telefono,
      'Estado': l.estado
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Líderes');
    XLSX.writeFile(wb, 'lideres.xlsx');
    this.mostrarDescarga = false;
  }

  eliminarLider(lider: Lider): void {
    if (confirm(`¿Eliminar a ${lider.nombre}?`)) {
      const id = lider.id ?? lider.codigo;
      this.http.delete(`${this.apiUrl}/${id}`).subscribe({
        next: () => this.obtenerLideresDelBackend(),
        error: (err) => console.error('Error al eliminar líder:', err)
      });
    }
  }
}