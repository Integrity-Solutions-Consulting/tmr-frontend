import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ModalBase } from '../../../shared/components/modal-base/modal-base';
import { BadgeEstado } from '../../../shared/components/badge-estado/badge-estado';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SuccessModalComponent } from '../../../shared/components/success-modal/success-modal.component';
import { DescargaMenuComponent, DescargaOpcion } from '../../../shared/components/descarga-menu/descarga-menu.component';
import { PaginacionComponent } from '../../../shared/componentes/paginacion/paginacion.component';

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
    ModalBase,
    BadgeEstado,
    ConfirmDialogComponent,
    SuccessModalComponent,
    DescargaMenuComponent,
    PaginacionComponent
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

  // ── Modales ────────────────────────────────────────────
  modalCrearVisible = false;
  modalDetalleVisible = false;
  confirmEliminarVisible = false;
  successCrearVisible = false;
  
  mensajeConfirmacion = '';
  liderSeleccionado: Lider | null = null;
  liderEliminar: Lider | null = null;
  
  liderForm!: FormGroup;

  // ── Estado Dropdown ────────────────────────────────────
  mostrarEstadoDropdown = false;
  
  opcionesDescarga: DescargaOpcion[] = [
    {
      id: 'excel',
      label: 'Exportar Excel',
      icon: 'assets/imagenes/iconos/download.svg',
      action: () => this.descargarExcel()
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      icon: 'assets/imagenes/iconos/download.svg',
      action: () => this.descargarPDF()
    }
  ];

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

  // ── Filtros ────────────────────────────────────────────
  filtrarPor(tipo: string): void {
    this.tipoFiltro = this.tipoFiltro === tipo ? '' : tipo;
    this.aplicarFiltros();
  }

  toggleEstadoDropdown(): void {
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: string): void {
    this.estadoFiltro = estado;
    if (estado === '') {
      this.mostrarEstadoDropdown = false;
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
    this.actualizarPaginados();
  }

  actualizarPaginados(): void {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    this.lideresPaginados = this.lideresFiltrados.slice(inicio, inicio + this.porPagina);
  }

  onPageChange(pagina: number): void {
    this.paginaActual = pagina;
    this.actualizarPaginados();
  }

  // ── Modales ───────────────────────────────────
  abrirModalCrear(): void {
    this.liderSeleccionado = null;
    this.liderForm.reset({ estado: 'Activo' });
    this.modalCrearVisible = true;
  }

  cerrarModalCrear(): void {
    this.modalCrearVisible = false;
  }

  abrirModalEditar(lider: Lider): void {
    this.liderSeleccionado = lider;
    this.liderForm.patchValue(lider);
    this.modalCrearVisible = true;
  }

  guardarLider(): void {
    if (this.liderForm.invalid) return;

    this.mensajeConfirmacion = this.liderSeleccionado
      ? 'Los cambios han sido guardados exitosamente'
      : 'El nuevo líder ha sido agregado exitosamente';

    this.cerrarModalCrear();
    this.successCrearVisible = true;
  }

  abrirModalDetalle(lider: Lider): void {
    this.liderSeleccionado = lider;
    this.modalDetalleVisible = true;
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible = false;
    this.liderSeleccionado = null;
  }
  
  cerrarSuccessCrear(): void {
    this.successCrearVisible = false;
  }

  solicitarEliminarLider(lider: Lider): void {
    this.liderEliminar = lider;
    this.confirmEliminarVisible = true;
  }

  cancelarEliminarLider(): void {
    this.liderEliminar = null;
    this.confirmEliminarVisible = false;
  }

  confirmarEliminarLider(): void {
    if (!this.liderEliminar) return;

    this.lideres = this.lideres.filter(l => l !== this.liderEliminar);
    this.aplicarFiltros();
    this.cancelarEliminarLider();
  }

  // ── Descarga ─────────────────────────────────────
  descargarPDF(): void {
    const doc = new jsPDF();
    doc.setTextColor(115, 115, 115);
    doc.text('Lista de Líderes', 14, 16);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      head: [['Código', 'Tipo', 'Nombre', 'Cliente', 'Correo', 'Teléfono', 'Estado']],
      body: this.lideres.map(l => [
        l.codigo, l.tipo, l.nombre, l.cliente, l.correo, l.telefono, l.estado
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
  }

  descargarExcel(): void {
    const datos = this.lideres.map(l => ({
      'Código': l.codigo,
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
  }
}