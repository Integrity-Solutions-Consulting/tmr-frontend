import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of, Subject, switchMap, takeUntil } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExportarService }                  from '../../servicios/exportar.service';
import { ColaboradoresService }             from '../../servicios/colaboradores.service';
import {
  Colaborador,
  FiltrosColaborador,
  CrearColaboradorDto,
  EditarColaboradorDto,
  Notificacion,
} from '../../models/colaborador.model';

import { CardsMetricasComponent }           from '../cards-metricas/cards-metricas.component';
import { FiltrosColaboradoresComponent }    from '../filtros-colaboradores/filtros-colaboradores.component';
import { DescargarMenuComponent }           from '../descargar-menu/descargar-menu.component';
import { TablaColaboradoresComponent }      from '../tabla-colaboradores/tabla-colaboradores.component';
import { PaginacionComponent }             from '../../../../shared/components/paginacion/paginacion.component';
import { ModalDetalleColaboradorComponent } from '../modal-detalle-colaborador/modal-detalle-colaborador.component';
import { ModalCrearColaboradorComponent }   from '../modal-crear-colaborador/modal-crear-colaborador.component';
import { ModalEditarColaboradorComponent }  from '../modal-editar-colaborador/modal-editar-colaborador.component';
import { NotificacionColaboradorComponent } from '../notificacion/notificacion.component';

@Component({
  selector: 'app-colaboradores-page',
  standalone: true,
  imports: [
    CommonModule,
    CardsMetricasComponent,
    FiltrosColaboradoresComponent,
    DescargarMenuComponent,
    TablaColaboradoresComponent,
    PaginacionComponent,
    ModalDetalleColaboradorComponent,
    ModalCrearColaboradorComponent,
    ModalEditarColaboradorComponent,
    NotificacionColaboradorComponent,
  ],
  templateUrl: './colaboradores-page.component.html',
  styleUrl:    './colaboradores-page.component.scss',
})
export class ColaboradoresPageComponent implements OnInit, OnDestroy {

  // ── Tabla ────────────────────────────────────────────────
  colaboradores: Colaborador[] = [];
  cargando      = false;
  total         = 0;
  totalPaginas  = 0;

  // ── Paginación ───────────────────────────────────────────
  paginaActual = 1;
  porPagina    = 10;

  // ── Filtros ──────────────────────────────────────────────
  filtros: FiltrosColaborador = { busqueda: '', estado: 'Todos' };

  // ── Métricas reactivas ───────────────────────────────────
  get noAsignados(): number { return this.svc.getMetricas().noAsignados(); }
  get asignados():   number { return this.svc.getMetricas().asignados();   }
  get inactivos():   number { return this.svc.getMetricas().inactivos();   }
  get activos():     number { return this.svc.getMetricas().activos();     }
  get totalColaboradores(): number { return this.activos + this.inactivos; }

  // ── Modales ──────────────────────────────────────────────
  modalDetalle: Colaborador | null = null;
  modalCrear   = false;
  modalEditar: Colaborador | null = null;

  // ── Notificación ─────────────────────────────────────────────────────
  notificacion: Notificacion | null = null;

  // ── Toasts (Removidos) ───────────────────────────────────────────────
  toasts: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private svc:         ColaboradoresService,
    private exportarSvc: ExportarService,
  ) {}

  ngOnInit(): void {
    this.cargarMetricas();
    this.cargarDatos();
  }

  // ── Carga ────────────────────────────────────────────────
  cargarDatos(): void {
    this.cargando = true;
    this.svc
      .getColaboradores(this.filtros, this.paginaActual, this.porPagina)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.colaboradores = res.data;
          this.total         = res.total;
          this.totalPaginas  = res.totalPaginas;
          this.cargando      = false;
        },
        error: () => {
          this.cargando = false;
          console.error('Error al cargar los colaboradores');
        },
      });
  }

  cargarMetricas(): void {
    this.svc
      .getMetricasGenerales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => console.error('Error al cargar las métricas de colaboradores'),
      });
  }

  // ── Filtros ──────────────────────────────────────────────
  onFiltrosCambian(filtros: FiltrosColaborador): void {
    this.filtros = { ...filtros };
    this.paginaActual = 1;
    this.cargarDatos();
  }

  // ── Paginación ───────────────────────────────────────────
  onPaginaCambia(pagina: number): void {
    this.paginaActual = pagina;
    this.cargarDatos();
  }

  // ── Modales abrir ────────────────────────────────────────
  abrirDetalle(col: Colaborador): void {
    this.svc.getColaboradorById(col.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detalle => this.modalDetalle = detalle,
        error: () => console.error('Error al cargar el detalle'),
      });
  }
  abrirCrear():                   void { this.modalCrear   = true; }
  abrirEditar(col: Colaborador): void {
      this.modalDetalle = null;
      this.svc.getColaboradorById(col.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: detalle => this.modalEditar = detalle,
          error: () => console.error('Error al cargar el colaborador para editar'),
        });
    }

  // ── Modales cerrar ───────────────────────────────────────
  cerrarDetalle(): void { this.modalDetalle = null;  }
  cerrarCrear():   void { this.modalCrear   = false; }
  cerrarEditar():  void { this.modalEditar  = null;  }

  // ── CRUD ─────────────────────────────────────────────────
  onCrear(request: any): void {
    this.svc.crearColaborador(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarCrear();
          this.paginaActual = 1;
          this.cargarDatos();
          this.cargarMetricas();
          this.notificacion = { tipo: 'exito', mensaje: 'El nuevo colaborador ha sido agregado exitosamente' };
        },
        error: (err) => {
          console.error('Error al crear el colaborador', err);
          // Mostramos el mensaje de error del backend si existe
          const mensaje = err?.error?.detail || 'Error al crear el colaborador';
          this.notificacion = { tipo: 'error', mensaje };
        },
      });
  }

  onEditar(request: any): void {
      if (!this.modalEditar) return;
      this.svc.editarColaborador(this.modalEditar.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cerrarEditar();
            this.cargarDatos();
            this.cargarMetricas();
            this.notificacion = { tipo: 'exito', mensaje: 'El colaborador ha sido actualizado exitosamente' };
          },
          error: (err) => {
            const mensaje = err?.error?.detail || 'Error al actualizar el colaborador';
            this.notificacion = { tipo: 'error', mensaje };
          },
        });
    }

  cerrarNotificacion(): void { this.notificacion = null; }

  colaboradorAEliminar: Colaborador | null = null;

onEliminar(col: Colaborador): void {
  this.colaboradorAEliminar = col;
}

confirmarEliminar(): void {
  if (!this.colaboradorAEliminar) return;
  this.svc.eliminarColaborador(this.colaboradorAEliminar.id)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.colaboradorAEliminar = null;
        this.cargarDatos();
        this.cargarMetricas();
        console.log('Colaborador eliminado correctamente');
      },
      error: () => console.error('Error al eliminar el colaborador'),
    });
}

cancelarEliminar(): void {
  this.colaboradorAEliminar = null;
}

  // ── Descargar ────────────────────────────────────────────
  onDescargarPDF(): void {
  this.obtenerColaboradoresParaExportar()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: colaboradores => {
        this.exportarPDF(colaboradores);
        console.log('PDF generado correctamente');
      },
      error: () => console.error('Error al generar el PDF'),
    });
}

onDescargarExcel(): void {
  this.obtenerColaboradoresParaExportar()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: colaboradores => {
        void this.exportarExcel(colaboradores);
        console.log('Excel generado correctamente');
      },
      error: () => console.error('Error al generar el Excel'),
    });
}
  // ── Toast ────────────────────────────────────────────────
private obtenerColaboradoresParaExportar() {
  return this.svc.getColaboradores(this.filtros, 1, 9999).pipe(
    switchMap(res => {
      const colaboradores = res.data ?? [];
      if (!colaboradores.length) return of([]);
      return forkJoin(colaboradores.map(col => this.svc.getColaboradorById(col.id)));
    })
  );
}

private exportarPDF(colaboradores: Colaborador[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const fecha = this.formatearFecha(new Date());
  const pageW = 420;
  const pageH = 297;
  const marginX = 12;
  const footerY = pageH - 8;

  const dibujarCabecera = () => {
    doc.setFillColor(22, 53, 114);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Reporte de Colaboradores', marginX, 14);
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
  doc.text('Resumen de Colaboradores', marginX, 32);
  doc.setDrawColor(22, 53, 114);
  doc.setLineWidth(0.3);
  doc.line(marginX, 34, marginX + 70, 34);

  autoTable(doc, {
    startY: 37,
    head: [[
      'Codigo', 'Empresa / Asociacion', 'Contrato', 'Estado', 'Tipo persona',
      'Tipo ID', 'Num. ID', 'Nombres', 'Apellidos', 'Nacimiento',
      'Genero', 'Nacionalidad', 'Departamento', 'Ingreso', 'Cargo',
      'Anios', 'Modalidad', 'Categoria', 'Correo', 'Telefono', 'Direccion',
      'Proyectos asignados'
    ]],
    body: colaboradores.map(c => [
      c.codigoEmpleado ?? '-',
      c.tipoIdentificacion ?? '-',
      c.tipoContrato ?? '-',
      c.estado ?? '-',
      c.tipoPersona ?? '-',
      c.idTipoIdentificacion?.toString() ?? '-',
      c.numeroIdentificacion ?? c.identificacion ?? '-',
      c.nombres ?? '-',
      c.apellidos ?? '-',
      this.formatearFechaValor(c.fechaNacimiento),
      c.genero ?? '-',
      c.nacionalidad ?? '-',
      c.departamento ?? '-',
      this.formatearFechaValor(c.fechaContratacion),
      c.cargo ?? '-',
      String(c.aniosExperiencia ?? '-'),
      c.modalidad ?? '-',
      c.categoria ?? '-',
      c.correoElectronico ?? '-',
      c.telefono ?? '-',
      c.direccion ?? '-',
      this.formatearProyectosColaborador(c),
    ]),
    styles: {
      fontSize: 6.3,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
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
      fontSize: 6.2,
      halign: 'center',
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    bodyStyles: { textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === 3) {
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
    doc.text(`Pagina ${i} de ${pageCount}`, pageW / 2, footerY + 4, { align: 'center' });
    doc.text('TMR - Reporte de Colaboradores', marginX, footerY + 4);
    doc.text(fecha, pageW - marginX, footerY + 4, { align: 'right' });
  }

  doc.save('colaboradores.pdf');
}

private async exportarExcel(colaboradores: Colaborador[]): Promise<void> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const ws = workbook.addWorksheet('Colaboradores');

  ws.columns = [
    { header: 'Codigo empleado', key: 'codigoEmpleado', width: 18 },
    { header: 'Empresa / Asociacion', key: 'empresa', width: 24 },
    { header: 'Tipo de contrato', key: 'tipoContrato', width: 20 },
    { header: 'Estado', key: 'estado', width: 14 },
    { header: 'Tipo de persona', key: 'tipoPersona', width: 18 },
    { header: 'Tipo de identificacion', key: 'tipoIdentificacion', width: 22 },
    { header: 'Numero de identificacion', key: 'numeroIdentificacion', width: 24 },
    { header: 'Nombres', key: 'nombres', width: 24 },
    { header: 'Apellidos', key: 'apellidos', width: 24 },
    { header: 'Fecha de nacimiento', key: 'fechaNacimiento', width: 18 },
    { header: 'Genero', key: 'genero', width: 16 },
    { header: 'Nacionalidad', key: 'nacionalidad', width: 18 },
    { header: 'Departamento', key: 'departamento', width: 22 },
    { header: 'Fecha de ingreso', key: 'fechaContratacion', width: 18 },
    { header: 'Cargo', key: 'cargo', width: 26 },
    { header: 'Anios de experiencia', key: 'aniosExperiencia', width: 18 },
    { header: 'Modalidad', key: 'modalidad', width: 16 },
    { header: 'Categoria', key: 'categoria', width: 18 },
    { header: 'Correo electronico', key: 'correoElectronico', width: 34 },
    { header: 'Telefono', key: 'telefono', width: 16 },
    { header: 'Direccion', key: 'direccion', width: 36 },
    { header: 'Proyectos asignados', key: 'proyectos', width: 54 },
  ];

  colaboradores.forEach(c => ws.addRow({
    codigoEmpleado: c.codigoEmpleado ?? '-',
    empresa: c.tipoIdentificacion ?? '-',
    tipoContrato: c.tipoContrato ?? '-',
    estado: c.estado ?? '-',
    tipoPersona: c.tipoPersona ?? '-',
    tipoIdentificacion: c.idTipoIdentificacion?.toString() ?? '-',
    numeroIdentificacion: c.numeroIdentificacion ?? c.identificacion ?? '-',
    nombres: c.nombres ?? '-',
    apellidos: c.apellidos ?? '-',
    fechaNacimiento: this.formatearFechaValor(c.fechaNacimiento),
    genero: c.genero ?? '-',
    nacionalidad: c.nacionalidad ?? '-',
    departamento: c.departamento ?? '-',
    fechaContratacion: this.formatearFechaValor(c.fechaContratacion),
    cargo: c.cargo ?? '-',
    aniosExperiencia: c.aniosExperiencia ?? '-',
    modalidad: c.modalidad ?? '-',
    categoria: c.categoria ?? '-',
    correoElectronico: c.correoElectronico ?? '-',
    telefono: c.telefono ?? '-',
    direccion: c.direccion ?? '-',
    proyectos: this.formatearProyectosColaborador(c),
  }));

  this.aplicarEstiloExcel(ws, 4);
  const buffer = await workbook.xlsx.writeBuffer();
  this.crearDescargaExcel(buffer, 'colaboradores.xlsx');
}

private aplicarEstiloExcel(ws: any, colEstado: number): void {
  const header = ws.getRow(1);
  header.height = 24;
  header.eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163572' } };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = this.bordeDelgado();
  });

  ws.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    const fill = rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
    row.height = 24;
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

private formatearFechaValor(fecha?: string | null): string {
  if (!fecha) return '-';
  const valor = String(fecha).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
    const [y, m, d] = valor.substring(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return valor;
}

private formatearProyectosColaborador(colaborador: Colaborador): string {
  const proyectos = colaborador.proyectosAsignados ?? [];
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

  onToastCerrado(id: number): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
