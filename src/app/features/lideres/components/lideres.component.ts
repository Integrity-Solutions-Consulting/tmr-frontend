import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http'; 
import { forkJoin } from 'rxjs';
import { ModalLider } from './modal-lider/modal-lider';
import { environment } from '../../../../environments/environment';
import { ModalDetalleLider } from './modal-detalle-lider/modal-detalle-lider';
import { ModalDescargaComponent } from './modal-descarga/modal-descarga.component';
import { SuccessModalComponent } from '../../../shared/components/success-modal/success-modal.component';
import { ModalEliminarLiderComponent } from './modal-eliminar-lider/modal-eliminar-lider.component';
import { BadgeEstadoComponent } from '../../../shared/components/badge-estado/badge-estado.component';

export interface ProyectoAsignado {
  id?: number;
  codigo: string;
  nombre: string;
  cliente: string;
  estado: string;
}

export interface Lider {
  id?: number;
  codigo: string;
  tipo: 'Interno' | 'Externo';
  nombre: string;
  cliente: string;
  correo: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
  proyectos: ProyectoAsignado[];
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
    SuccessModalComponent,
    ModalEliminarLiderComponent,
    BadgeEstadoComponent
  ],
  templateUrl: './lideres.component.html',
  styleUrls: ['./lideres.component.scss'],
})
export class LideresComponent implements OnInit {

  lideres: Lider[] = []; 
  lideresFiltrados: Lider[] = [];
  lideresPaginados: Lider[] = [];

  private apiUrl = `${environment.apiUrl}/lideres`;

  busqueda = '';
  tipoFiltro = '';
  estadoFiltro: 'Activo' | 'Inactivo' | '' = 'Activo';

  paginaActual = 1;
  porPagina = 10;
  totalPaginas = 1;
  paginas: number[] = [];

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
  mostrarEstadoDropdown = false;
  errorFormulario: string | null = null;

  // ── Eliminar ───────────────────────────────────────────
  mostrarEliminar = false;
  liderAEliminar: Lider | null = null;
  errorEliminar: string | null = null;

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

  obtenerLideresDelBackend(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (lideres) => {
        this.http.get<any[]>(`${environment.apiUrl}/proyectos`).subscribe({
          next: (proyectos) => {
            this.procesarLideres(lideres, proyectos);
          },
          error: () => {
            this.procesarLideres(lideres, []);
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al traer líderes:', err);
      }
    });
  }

  private procesarLideres(lideres: any[], proyectos: any[]): void {
    const infoPorLider = new Map<number, { clientes: Set<string>; proyectos: Map<number, ProyectoAsignado> }>();

    proyectos.forEach((proyecto: any) => {
      const liderId = proyecto.idLider;
      if (liderId == null) return;

      const entrada = infoPorLider.get(liderId) ?? { clientes: new Set<string>(), proyectos: new Map<number, ProyectoAsignado>() };
      if (proyecto.cliente) entrada.clientes.add(proyecto.cliente);

      const proyectoId = proyecto.id ?? Math.random();
      entrada.proyectos.set(proyectoId, {
        id: proyecto.id,
        codigo: proyecto.codigo ?? '',
        nombre: proyecto.nombre ?? '',
        cliente: proyecto.cliente ?? '',
        estado: proyecto.estado ?? ''
      });

      infoPorLider.set(liderId, entrada);
    });

    this.lideres = lideres.map((l, i) => {
      const datos = infoPorLider.get(l.id) ?? { clientes: new Set<string>(), proyectos: new Map<number, ProyectoAsignado>() };
      return {
        ...l,
        id: l.id,
        idPersona: l.idPersona ?? l.idpersona ?? l.Idpersona ?? null,
        nombres: l.nombres,
        apellidos: l.apellidos,
        email: l.email,
        codigo: String(i + 1),
        nombre: `${l.nombres} ${l.apellidos}`,
        tipo: l.tipoNombre?.toLowerCase().includes('interno') ? 'Interno' : 'Externo',
        correo: l.email,
        telefono: l.telefono ?? '',
        cliente: Array.from(datos.clientes).join(', '),
        proyectos: Array.from(datos.proyectos.values()),
        estado: l.activo ? 'Activo' : 'Inactivo'
      };
    });

    this.aplicarFiltros();
  }

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

  get rangoInicio(): number {
    return this.lideresFiltrados.length === 0 ? 0 : (this.paginaActual - 1) * this.porPagina + 1;
  }

  get rangoFin(): number {
    return Math.min(this.paginaActual * this.porPagina, this.lideresFiltrados.length);
  }

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

  abrirFormulario(): void {
    this.mostrarDescarga = false;
    this.modoEdicion = false;
    this.liderEditando = null;
    this.liderParaEditar = null;
    this.guardandoLider = false;
    this.errorFormulario = null;
    this.liderForm.reset({ estado: 'Activo' });
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.liderEditando = null;
    this.liderParaEditar = null;
    this.guardandoLider = false;
    this.errorFormulario = null;
    this.liderForm.reset();
  }

  verLider(lider: Lider, numero: number): void {
    this.mostrarDescarga = false;
    this.liderSeleccionado = { ...lider, numero };
    if (!this.liderSeleccionado.proyectos) {
      this.liderSeleccionado.proyectos = [];
    }
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
    this.liderParaEditar = { ...lider };
    this.guardandoLider = false;
    this.errorFormulario = null;
    this.mostrarFormulario = true;
  }

  guardarLider(payload: any): void {
    if (this.guardandoLider) return;

    if (!this.modoEdicion && this.liderYaExiste(payload)) {
      this.errorFormulario = 'Ya existe un líder con los mismos datos de contacto o colaborador asignado.';
      return;
    }

    this.guardandoLider = true;

    const solicitud = this.modoEdicion && this.liderParaEditar?.id
      ? {
          Idlider: Number(this.liderParaEditar.id),
          Idpersona: payload.personaId ? Number(payload.personaId) : null,
          Nombres: payload.nombres.trim(),
          Apellidos: payload.apellidos.trim(),
          Email: payload.correo ? payload.correo.trim() : null,
          Telefono: payload.telefono ? payload.telefono.trim() : null,
          Idtipo: payload.tipoId ? Number(payload.tipoId) : undefined,
          Activo: payload.estado === 'Activo',
          NumeroIdentificacion: payload.identificacion ? payload.identificacion.trim() : null,
          Usuariomodificacion: 'frontend',
          Ipmodificacion: '127.0.0.1'
        }
      : {
          Idpersona: payload.personaId ? Number(payload.personaId) : null,
          Idtipo: payload.tipoId ? Number(payload.tipoId) : undefined,
          Nombres: payload.nombres.trim(),    
          Apellidos: payload.apellidos.trim(), 
          Email: payload.correo ? payload.correo.trim() : null,        
          Telefono: payload.telefono ? payload.telefono.trim() : null,
          NumeroIdentificacion: payload.identificacion ? payload.identificacion.trim() : null,
          Usuariocreacion: 'frontend',
          Ipcreacion: '127.0.0.1'
        };

    const request$ = this.modoEdicion && this.liderParaEditar?.id
      ? this.http.put(`${this.apiUrl}/${this.liderParaEditar.id}`, solicitud)
      : this.http.post(this.apiUrl, solicitud);

    request$.subscribe({
      next: () => {
        this.guardandoLider = false;
        this.errorFormulario = null;
        this.mensajeConfirmacion = this.modoEdicion
          ? 'Los cambios han sido guardados exitosamente'
          : 'El nuevo líder ha sido agregado exitosamente';
        this.mostrarConfirmacion = true;
        this.mostrarFormulario = false;
        this.liderEditando = null;
        this.obtenerLideresDelBackend(); 
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      },
      error: (err: any) => {
        this.guardandoLider = false;
        console.error('❌ Error al guardar líder en el servidor:', err);
        this.errorFormulario = err?.error?.detail || err?.error?.message || 'No se pudo guardar el líder. Intente de nuevo.';
      }
    });
  }

  private liderYaExiste(payload: any): boolean {
    if (payload.personaId) {
      return this.lideres.some(lider => lider.id === Number(payload.personaId));
    }

    const correo = this.normalizarTexto(payload.correo);
    const telefono = this.normalizarTexto(payload.telefono);
    const nombreCompleto = this.normalizarTexto(`${payload.nombres ?? ''} ${payload.apellidos ?? ''}`);

    return this.lideres.some(lider =>
      (lider.correo && this.normalizarTexto(lider.correo) === correo)
      || (lider.telefono && this.normalizarTexto(lider.telefono) === telefono)
      || (lider.nombre && this.normalizarTexto(lider.nombre) === nombreCompleto)
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
    const doc      = new jsPDF({ orientation: 'landscape' });
    const fecha    = new Date().toLocaleDateString('es-EC');
    const pageW    = 297;
    const pageH    = 210;
    const marginX  = 12;
    const footerY  = pageH - 8;

    const dibujarCabecera = () => {
      doc.setFillColor(22, 53, 114);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte de Líderes', marginX, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${fecha}`, pageW - marginX, 14, { align: 'right' });
      doc.setDrawColor(99, 135, 190);
      doc.setLineWidth(0.5);
      doc.line(0, 22, pageW, 22);
    };

    dibujarCabecera();

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text('Listado de Líderes', marginX, 32);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, 34, marginX + 60, 34);

    const bodyData = this.lideresFiltrados.map(l => [
      l.nombre || '-',
      l.correo || '-',
      l.telefono || '-',
      l.tipo || '-',
      l.estado === 'Activo' ? 'Activo' : 'Inactivo',
    ]);

    autoTable(doc, {
      startY: 37,
      head: [['Nombre del Líder', 'Correo Electrónico', 'Teléfono', 'Tipo', 'Estado']],
      body: bodyData,
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        valign: 'middle',
        overflow: 'linebreak',
        font: 'helvetica',
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [22, 53, 114],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      bodyStyles: { textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 70 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw ?? '').toLowerCase();
          data.cell.styles.textColor = val === 'activo' ? [22, 163, 74] : [107, 114, 128];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: marginX, right: marginX, bottom: 18 },
      didDrawPage: () => dibujarCabecera(),
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, footerY, pageW - marginX, footerY);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${i} de ${pageCount}`, pageW / 2, footerY + 4, { align: 'center' });
      doc.text('TMR — Reporte de Líderes', marginX, footerY + 4);
      doc.text(fecha, pageW - marginX, footerY + 4, { align: 'right' });
    }

    doc.save(`Lideres_${new Date().toISOString().slice(0, 10)}.pdf`);
    this.mostrarDescarga = false;
  }

  async descargarExcel(): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    const COLOR_PRIMARIO    = 'FF163572';
    const COLOR_RECURSO     = 'FFFFFFFF';
    const COLOR_RECURSO_ALT = 'FFF8FAFC';
    const COLOR_TEXTO       = 'FF334155';
    const COLOR_BORDE       = 'FFE2E8F0';

    const ws = workbook.addWorksheet('Líderes');
    ws.columns = [
      { header: 'Nombre',   key: 'nombre',   width: 40 },
      { header: 'Correo',   key: 'correo',   width: 40 },
      { header: 'Teléfono', key: 'telefono', width: 20 },
      { header: 'Tipo',     key: 'tipo',     width: 15 },
      { header: 'Estado',   key: 'estado',   width: 15 },
    ];

    this.lideresFiltrados.forEach(l => {
      ws.addRow({
        nombre:   l.nombre || '-',
        correo:   l.correo || '-',
        telefono: l.telefono || '-',
        tipo:     l.tipo || '-',
        estado:   l.estado === 'Activo' ? 'Activo' : 'Inactivo',
      });
    });

    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell: any) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font      = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      const b = { style: 'thin', color: { argb: COLOR_PRIMARIO } };
      cell.border    = { top: b, left: b, bottom: b, right: b };
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const fill = rowNumber % 2 === 0 ? COLOR_RECURSO_ALT : COLOR_RECURSO;
      row.height = 20;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font      = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
        const b = { style: 'thin', color: { argb: COLOR_BORDE } };
        cell.border    = { top: b, left: b, bottom: b, right: b };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        if (colNumber === 5) {
          const val = cell.value?.toString() ?? '';
          const esActivo = val.toLowerCase() === 'activo';
          cell.font = {
            name: 'Segoe UI', size: 10, bold: true,
            color: { argb: esActivo ? 'FF16A34A' : 'FF6B7280' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    this.crearDescarga(blob, `Lideres_${new Date().toISOString().slice(0, 10)}.xlsx`);
    this.mostrarDescarga = false;
  }

  private crearDescarga(blob: Blob, nombreArchivo: string): void {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  toggleEstadoLider(lider: Lider): void {
    const nuevoEstado = lider.estado !== 'Activo';
    const nombres = (lider as any).nombres || '';
    const apellidos = (lider as any).apellidos || '';
    const email = (lider as any).email || (lider as any).correo || null;
    const telefono = (lider as any).telefono || null;
    const numeroIdentificacion = (lider as any).numeroIdentificacion || null;
    const idTipo = (lider as any).idtipo || null;

    const solicitud = {
      Nombres: nombres,
      Apellidos: apellidos,
      Email: email,
      Telefono: telefono,
      Idtipo: idTipo,
      Activo: nuevoEstado,
      NumeroIdentificacion: numeroIdentificacion,
      Usuariomodificacion: 'frontend',
      Ipmodificacion: '127.0.0.1'
    };

    this.http.put(`${this.apiUrl}/${lider.id}`, solicitud).subscribe({
      next: () => {
        this.mensajeConfirmacion = nuevoEstado
          ? 'El líder ha sido activado exitosamente'
          : 'El líder ha sido desactivado exitosamente';
        this.mostrarConfirmacion = true;
        this.obtenerLideresDelBackend();
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      },
      error: (err) => console.error('Error al cambiar estado del líder:', err)
    });
  }

  abrirEliminar(lider: Lider): void {
    this.liderAEliminar = lider;
    this.errorEliminar = null;
    this.mostrarEliminar = true;
  }

  confirmarEliminarLider(): void {
    if (!this.liderAEliminar) return;
    const id = this.liderAEliminar.id ?? this.liderAEliminar.codigo;
    this.errorEliminar = null;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.mostrarEliminar = false;
        this.liderAEliminar = null;
        this.errorEliminar = null;
        this.mensajeConfirmacion = 'El líder ha sido eliminado exitosamente';
        this.mostrarConfirmacion = true;
        this.obtenerLideresDelBackend();
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      },
      error: (err) => {
        console.error('Error al eliminar líder:', err);
        this.errorEliminar = err?.error?.detail || err?.error?.message || 'No se pudo eliminar el líder. Intente de nuevo.';
      }
    });
  }
}