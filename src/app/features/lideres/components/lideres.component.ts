// lideres.component.ts
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
import { ModalLider } from './modal-lider/modal-lider';
import { ModalDetalleLider } from './modal-detalle-lider/modal-detalle-lider';
import { ModalDescargaComponent } from './modal-descarga/modal-descarga.component';
import { ModalConfirmacion } from './modal-confirmacion/modal-confirmacion';

export interface Lider {
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

  // ── Data ───────────────────────────────────────────────
  lideres: Lider[] = [
    { codigo: '001', tipo: 'Externo', nombre: 'Valeria Antonella Pazmiño Terán', cliente: 'Banco Guayaquil', correo: 'valeria.pazmino@bancoguayaquil.fin.ec', telefono: '0986473829', estado: 'Activo' },
    { codigo: '002', tipo: 'Interno', nombre: 'Ricardo Molina', cliente: 'Banco Pichincha', correo: 'ricardo.molina@gmail.com.ec', telefono: '0992783645', estado: 'Inactivo' },
    { codigo: '003', tipo: 'Externo', nombre: 'Samantha Salcedo', cliente: 'Banco Bolivariano', correo: 'samantha.salcedo@hotmail.com.ec', telefono: '0989374652', estado: 'Activo' },
    { codigo: '004', tipo: 'Interno', nombre: 'Daniel Erazo', cliente: 'Produbanco', correo: 'daniel.erazo@pichincha.com.ec', telefono: '0997456321', estado: 'Activo' },
    { codigo: '005', tipo: 'Externo', nombre: 'Fernanda Benavides', cliente: 'Banco del Austro', correo: 'fernanda.ocana@lojanos.com.ec', telefono: '0982345678', estado: 'Inactivo' },
    { codigo: '006', tipo: 'Interno', nombre: 'Carlos Iturralde', cliente: 'Banco Internacional', correo: 'carlos.iturralde@quito.gob.ec', telefono: '0995678901', estado: 'Activo' },
    { codigo: '007', tipo: 'Externo', nombre: 'María Guzmán', cliente: 'Banco Solidario', correo: 'maria.guzman@cuenca.edu.ec', telefono: '0987654321', estado: 'Activo' },
    { codigo: '008', tipo: 'Interno', nombre: 'Luis Yánez', cliente: 'Banco ProCredit', correo: 'luis.yanez@espol.edu.ec', telefono: '0999887766', estado: 'Inactivo' },
    { codigo: '009', tipo: 'Interno', nombre: 'Luis Yánez', cliente: 'Citibank Ecuador', correo: 'luis.yanez@espol.edu.ec', telefono: '0999887766', estado: 'Activo' },
    { codigo: '010', tipo: 'Externo', nombre: 'Ana Torres', cliente: 'BanEcuador', correo: 'ana.torres@banecuador.fin.ec', telefono: '0978564321', estado: 'Activo' },
    { codigo: '011', tipo: 'Interno', nombre: 'Jorge Peña', cliente: 'Banco del Pacífico', correo: 'jorge.pena@pacifico.fin.ec', telefono: '0988776655', estado: 'Inactivo' },
  ];

  lideresFiltrados: Lider[] = [];
  lideresPaginados: Lider[] = [];

  // ── Filtros ────────────────────────────────────────────
  busqueda = '';
  tipoFiltro = '';
  estadoFiltro = '';

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
  modoEdicion = false;
  liderEditando: Lider | null = null;
  liderForm!: FormGroup;

  // ── Estado Dropdown ────────────────────────────────────
  mostrarEstadoDropdown = false;

  constructor(private fb: FormBuilder) { }

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
    this.aplicarFiltros();
  }

  // ── Contadores cards ───────────────────────────────────
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
    this.tipoFiltro = tipo;
    this.aplicarFiltros();
  }

  filtrarEstado(estado: string): void {
    this.estadoFiltro = estado;
    this.aplicarFiltros();
  }

  toggleEstadoDropdown(): void {
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: string): void {
  this.estadoFiltro = estado;
  if (estado === '') {
    this.mostrarEstadoDropdown = false; // solo cierra al limpiar
  }
  this.aplicarFiltros();
}

  cerrarDropdowns(): void {
    this.mostrarEstadoDropdown = false;
  }

  aplicarFiltros(): void {
    const texto = this.busqueda.toLowerCase();
    this.lideresFiltrados = this.lideres.filter(l => {
      const matchTexto = !texto ||
        l.nombre.toLowerCase().includes(texto) ||
        l.codigo.toLowerCase().includes(texto) ||
        l.correo.toLowerCase().includes(texto) ||
        l.cliente.toLowerCase().includes(texto);
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
    this.liderForm.reset({ estado: 'Activo' });
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.liderEditando = null;
    this.liderForm.reset();
  }

  // ── Modal Ver Detalle ──────────────────────────────────
  verLider(lider: Lider, numero: number): void {
    this.mostrarDescarga = false;
    this.liderSeleccionado = { ...lider, numero };
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.liderSeleccionado = null;
  }

  // ── Modal Editar ───────────────────────────────────────
  editarLider(lider: Lider): void {
    this.mostrarDescarga = false;
    this.modoEdicion = true;
    this.liderEditando = lider;
    this.liderForm.patchValue(lider);
    this.mostrarFormulario = true;
  }

  guardarLider(): void {
    this.mensajeConfirmacion = this.modoEdicion
      ? 'Los cambios han sido<br>guardados exitosamente'
      : 'El nuevo líder ha sido<br>agregado exitosamente';

    this.mostrarConfirmacion = true;
    setTimeout(() => {
      this.mostrarConfirmacion = false;
    }, 3000);
  }

  // ── Modal Descarga ─────────────────────────────────────
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
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
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
      this.lideres = this.lideres.filter(l => l !== lider);
      this.aplicarFiltros();
    }
  }
}