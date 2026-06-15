import { Component, inject, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Store } from '@ngrx/store';
import { take } from 'rxjs/operators';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Tabla } from '../../../../shared/components/tabla/tabla';
import { selectProyectos } from '../../store/proyectos.selectors';
import { ModalBase } from '../../../../shared/components/modal-base/modal-base';
import { BadgeEstado } from '../../../../shared/components/badge-estado/badge-estado';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SuccessModalComponent } from '../../../../shared/components/success-modal/success-modal.component';
import {
  DescargaMenuComponent,
  DescargaOpcion
} from '../../../../shared/components/descarga-menu/descarga-menu.component';
import { ProyectoForm } from '../../componentes/proyecto-form/proyecto-form';
import {
  FiltrosProyecto,
  ProyectosFiltros
} from '../../componentes/proyectos-filtros/proyectos-filtros';

import { Proyecto } from '../../modelos/proyecto.model';
import { ProyectosService } from '../../servicios/proyectos.service';

import {
  cargarProyectos,
  eliminarProyecto
} from '../../store/proyectos.actions';

// Colores corporativos
const COLOR_PRIMARIO   = 'FF163572';
const COLOR_LIDER      = 'FFE8EEF9';   // azul claro para filas de líder
const COLOR_RECURSO    = 'FFFFFFFF';   // blanco para recursos
const COLOR_RECURSO_ALT= 'FFF8FAFC';  // gris muy claro alternado
const COLOR_TEXTO      = 'FF334155';
const COLOR_BORDE      = 'FFE2E8F0';

@Component({
  selector: 'app-proyectos-page',
  standalone: true,
  imports: [
    MatButtonModule,
    Tabla,
    ModalBase,
    BadgeEstado,
    ConfirmDialogComponent,
    SuccessModalComponent,
    DescargaMenuComponent,
    ProyectoForm,
    ProyectosFiltros
  ],
  templateUrl: './proyectos-page.html',
  styleUrl: './proyectos-page.scss'
})
export class ProyectosPage implements OnDestroy {
  private store = inject(Store);
  private proyectosService = inject(ProyectosService);

  seguimientoMap: Record<number, string> = {};

  modalCrearVisible = false;
  modalDetalleVisible = false;
  confirmEliminarVisible = false;
  successCrearVisible = false;
  proyectoSeleccionado: Proyecto | null = null;
  proyectoDetalle: Proyecto | null = null;
  codigoPendienteEliminar: string | null = null;

  private successModalTimeoutId: ReturnType<typeof setTimeout> | null = null;

  filtros: FiltrosProyecto = {
    busqueda: '',
    estados: [],
    seguimiento: [],
    tipos: []
  };

  opcionesDescarga: DescargaOpcion[] = [
    {
      id: 'excel',
      label: 'Exportar Excel',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarProyectosExcel()
    },
    {
      id: 'pdf',
      label: 'Exportar PDF',
      icon: 'assets/iconos/download.svg',
      action: () => this.descargarProyectosPdf()
    }
  ];

  constructor() {
    this.store.dispatch(cargarProyectos());
    this.cargarSeguimientoLookups();
  }

  private cargarSeguimientoLookups(): void {
    this.proyectosService.obtenerLookups().pipe(take(1)).subscribe({
      next: (lookups) => {
        this.seguimientoMap = lookups.estados.reduce((map, estado) => {
          map[estado.id] = estado.nombre;
          return map;
        }, {} as Record<number, string>);
      },
      error: (error) => console.error('Error al cargar estados de seguimiento:', error)
    });
  }

  private obtenerSeguimientoNombre(idEstadoProyecto?: number | null): string {
    if (!idEstadoProyecto) return 'Sin seguimiento';
    return this.seguimientoMap[idEstadoProyecto] ?? 'Sin seguimiento';
  }

  ngOnDestroy(): void {
    if (this.successModalTimeoutId) clearTimeout(this.successModalTimeoutId);
  }

  abrirModalCrear(): void {
    this.proyectoSeleccionado = null;
    this.modalCrearVisible = true;
  }

  cerrarModalCrear(): void {
    this.modalCrearVisible = false;
  }

  guardarProyecto(proyecto: Proyecto): void {
    if (this.proyectoSeleccionado) {
      const proyectoConId: Proyecto = { ...proyecto, id: this.proyectoSeleccionado.id };
      this.proyectosService.actualizarProyecto(proyectoConId.id, proyectoConId).subscribe({
        next: () => { this.store.dispatch(cargarProyectos()); this.cerrarModalCrear(); },
        error: (error) => console.error('Error al actualizar proyecto:', error)
      });
    } else {
      this.proyectosService.crearProyecto(proyecto).subscribe({
        next: () => {
          this.store.dispatch(cargarProyectos());
          this.cerrarModalCrear();
          this.mostrarSuccessCrear();
        },
        error: (error) => console.error('Error al crear proyecto:', error)
      });
    }
  }

  private mostrarSuccessCrear(): void {
    if (this.successModalTimeoutId) clearTimeout(this.successModalTimeoutId);
    this.successCrearVisible = true;
    this.successModalTimeoutId = window.setTimeout(() => this.cerrarSuccessCrear(), 1000);
  }

  cerrarSuccessCrear(): void {
    if (this.successModalTimeoutId) { clearTimeout(this.successModalTimeoutId); this.successModalTimeoutId = null; }
    this.successCrearVisible = false;
  }

  abrirModalEditar(proyecto: Proyecto): void {
    this.proyectosService.obtenerProyecto(proyecto.id).subscribe({
      next: (proyectoCompleto) => { this.proyectoSeleccionado = proyectoCompleto; this.modalCrearVisible = true; },
      error: (error) => console.error('Error al obtener proyecto:', error)
    });
  }

  abrirModalDetalle(proyecto: Proyecto): void {
    this.proyectosService.obtenerProyecto(proyecto.id).subscribe({
      next: (proyectoCompleto) => { this.proyectoDetalle = proyectoCompleto; this.modalDetalleVisible = true; },
      error: (error) => console.error('Error al obtener detalle del proyecto:', error)
    });
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible = false;
    this.proyectoDetalle = null;
  }

  solicitarEliminarProyecto(codigo: string): void {
    this.codigoPendienteEliminar = codigo;
    this.confirmEliminarVisible = true;
  }

  cancelarEliminarProyecto(): void {
    this.codigoPendienteEliminar = null;
    this.confirmEliminarVisible = false;
  }

  confirmarEliminarProyecto(): void {
    if (!this.codigoPendienteEliminar) return;
    this.store.dispatch(eliminarProyecto({ codigo: this.codigoPendienteEliminar }));
    this.cancelarEliminarProyecto();
  }

  aplicarFiltros(filtros: FiltrosProyecto): void {
    this.filtros = filtros;
  }

  descargarProyectosExcel(): void {
    this.obtenerProyectosActivos().subscribe({
      next: (proyectos) => void this.descargarXlsx(proyectos, 'Proyectos'),
      error: (error) => console.error('Error al descargar proyectos:', error)
    });
  }

  descargarProyectosPdf(): void {
    this.obtenerProyectosActivos().subscribe({
      next: (proyectos) => this.descargarPDF(proyectos, 'Proyectos'),
      error: (error) => console.error('Error al descargar proyectos:', error)
    });
  }

  private obtenerProyectosActivos() {
    return this.store.select(selectProyectos).pipe(take(1));
  }

  // ─── EXCEL ────────────────────────────────────────────────────────────────
  private async descargarXlsx(proyectos: Proyecto[], nombreBase: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    // ── Hoja 1: Resumen de proyectos ──
    const wsResumen = workbook.addWorksheet('Proyectos');
    wsResumen.columns = [
      { header: 'Código',      key: 'codigo',      width: 16 },
      { header: 'Nombre',      key: 'nombre',      width: 28 },
      { header: 'Cliente',     key: 'cliente',     width: 24 },
      { header: 'Tipo',        key: 'tipo',        width: 20 },
      { header: 'Seguimiento', key: 'seguimiento', width: 20 },
      { header: 'Estado',      key: 'estado',      width: 14 },
      { header: 'Inicio',      key: 'inicio',      width: 14 },
      { header: 'Fin',         key: 'fin',         width: 14 },
      { header: 'Horas',       key: 'horas',       width: 10 },
      { header: 'Presupuesto', key: 'presupuesto', width: 16 },
    ];

    proyectos.forEach(p => {
      wsResumen.addRow({
        codigo:      p.codigo,
        nombre:      p.nombre,
        cliente:     p.cliente ?? '-',
        tipo:        p.tipo ?? '-',
        seguimiento: this.obtenerSeguimientoNombre(p.idEstadoProyecto),
        estado:      p.estado ?? '-',
        inicio:      this.formatearFecha(p.fechaInicio),
        fin:         this.formatearFecha(p.fechaFin),
        horas:       p.horas ?? '',
        presupuesto: p.presupuesto ?? '',
      });
    });

    // Estado ahora está en la columna 5
    this.aplicarEstiloHoja(wsResumen, 6);

    // ── Hoja 2: Líderes y Recursos ──
    const wsDetalle = workbook.addWorksheet('Líderes y Recursos');
    wsDetalle.columns = [
      { header: 'Código Proyecto', key: 'codigoProyecto', width: 18 },
      { header: 'Nombre Proyecto', key: 'nombreProyecto', width: 28 },
      { header: 'Líder',           key: 'lider',          width: 28 },
      { header: 'Costo/h Líder',   key: 'costoLider',     width: 14 },
      { header: 'Horas Líder',     key: 'horasLider',     width: 13 },
      { header: 'Recurso',         key: 'recurso',        width: 28 },
      { header: 'Tipo',            key: 'tipoRecurso',    width: 12 },
      { header: 'Rol',             key: 'rol',            width: 24 },
      { header: 'Entrada',         key: 'entrada',        width: 13 },
      { header: 'Salida',          key: 'salida',         width: 13 },
      { header: 'Costo/h Recurso', key: 'costoRecurso',   width: 15 },
      { header: 'Horas Recurso',   key: 'horasRecurso',   width: 14 },
    ];

    let recursoRowIndex = 1;

    proyectos.forEach(proyecto => {
      const lideres = proyecto.lideres?.length
        ? proyecto.lideres
        : proyecto.lider
          ? [{ lider: proyecto.lider, costoHoraLider: proyecto.costoHoraLider, horasLider: proyecto.horasLider, recursos: proyecto.recursos ?? [] }]
          : [];

      lideres.forEach(lider => {
        const recursos = lider.recursos ?? [];

        if (!recursos.length) {
          // Líder sin recursos → una sola fila
          const row = wsDetalle.addRow({
            codigoProyecto: proyecto.codigo,
            nombreProyecto: proyecto.nombre,
            lider:          lider.lider ?? '-',
            costoLider:     lider.costoHoraLider ?? '',
            horasLider:     lider.horasLider ?? '',
            recurso:        '-',
            tipoRecurso:    '-',
            rol:            '-',
            entrada:        '-',
            salida:         '-',
            costoRecurso:   '',
            horasRecurso:   '',
          });
          this.aplicarFilaLider(row);
        } else {
          recursos.forEach((recurso, idx) => {
            const esFirst = idx === 0;
            const row = wsDetalle.addRow({
              codigoProyecto: esFirst ? proyecto.codigo : '',
              nombreProyecto: esFirst ? proyecto.nombre : '',
              lider:          esFirst ? (lider.lider ?? '-') : '',
              costoLider:     esFirst ? (lider.costoHoraLider ?? '') : '',
              horasLider:     esFirst ? (lider.horasLider ?? '') : '',
              recurso:        recurso.nombre ?? '-',
              tipoRecurso:    recurso.tipo ?? '-',
              rol:            recurso.rol ?? '-',
              entrada:        this.formatearFecha(recurso.entrada ?? null),
              salida:         this.formatearFecha(recurso.salida ?? null),
              costoRecurso:   recurso.costoHora ?? '',
              horasRecurso:   recurso.horas ?? '',
            });

            recursoRowIndex++;
            this.aplicarFilaRecurso(row, recursoRowIndex % 2 === 0);
          });
        }
      });
    });

    // Estilo header hoja detalle
    const headerDetalle = wsDetalle.getRow(1);
    headerDetalle.height = 22;
    headerDetalle.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = this.bordeDelgado();
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    this.crearDescarga(blob, `${nombreBase}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  private aplicarEstiloHoja(ws: any, colEstado: number): void {
    const header = ws.getRow(1);
    header.height = 22;
    header.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = this.bordeDelgado();
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const fill = rowNumber % 2 === 0 ? COLOR_RECURSO_ALT : COLOR_RECURSO;
      row.height = 20;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
        cell.border = this.bordeDelgado(COLOR_BORDE);
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        if (colNumber === colEstado) {
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
  }

  private aplicarFilaLider(row: any): void {
    row.height = 20;
    row.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIDER } };
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_PRIMARIO } };
      cell.border = this.bordeDelgado(COLOR_BORDE);
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  }

  private aplicarFilaRecurso(row: any, alternado: boolean): void {
    row.height = 19;
    row.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: alternado ? COLOR_RECURSO_ALT : COLOR_RECURSO } };
      cell.font = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
      cell.border = this.bordeDelgado(COLOR_BORDE);
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  }

  private bordeDelgado(color = COLOR_PRIMARIO): any {
    const b = { style: 'thin', color: { argb: color } };
    return { top: b, left: b, bottom: b, right: b };
  }

  // ─── PDF ─────────────────────────────────────────────────────────────────
  private descargarPDF(proyectos: Proyecto[], nombreBase: string): void {
    const doc = new jsPDF({ orientation: 'landscape' });
    const fecha = new Date().toLocaleDateString('es-EC');

    // ── Portada / título ──
    doc.setFillColor(22, 53, 114);
    doc.rect(0, 0, 297, 18, 'F');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('Reporte de Proyectos', 14, 12);
    doc.setFontSize(9);
    doc.text(`Generado: ${fecha}`, 250, 12);

    // ── Tabla resumen de proyectos ──
    doc.setFontSize(10);
    doc.setTextColor(22, 53, 114);
    doc.text('Resumen de Proyectos', 14, 26);

    autoTable(doc, {
      startY: 30,
      head: [['Código', 'Nombre', 'Cliente', 'Tipo', 'Seguimiento', 'Estado', 'Inicio', 'Fin', 'Horas', 'Presupuesto']],
      body: proyectos.map(p => [
        p.codigo,
        p.nombre,
        p.cliente ?? '-',
        p.tipo ?? '-',
        this.obtenerSeguimientoNombre(p.idEstadoProyecto),
        p.estado ?? '-',
        this.formatearFecha(p.fechaInicio),
        this.formatearFecha(p.fechaFin),
        String(p.horas ?? '-'),
        p.presupuesto ? `$${p.presupuesto}` : '-',
      ]),
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle', overflow: 'linebreak', font: 'helvetica' },
      headStyles: { fillColor: [22, 53, 114], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { textColor: [55, 65, 81] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 42 },
        2: { cellWidth: 32 },
        3: { cellWidth: 24 },
        4: { cellWidth: 20 }, // Seguimiento
        5: { cellWidth: 20 }, // Estado
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
        8: { cellWidth: 14 },
        9: { cellWidth: 20 },
      },
      didParseCell: (data) => {
        // Estado ahora está en la columna índice 5
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw ?? '').toLowerCase();
          data.cell.styles.textColor = val === 'activo' ? [22, 163, 74] : [107, 114, 128];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: 10, right: 10 }
    });

    // ── Tabla de líderes y recursos por proyecto ──
    proyectos.forEach(proyecto => {
      const lideres = proyecto.lideres?.length
        ? proyecto.lideres
        : proyecto.lider
          ? [{ lider: proyecto.lider, costoHoraLider: proyecto.costoHoraLider, horasLider: proyecto.horasLider, recursos: proyecto.recursos ?? [] }]
          : [];

      if (!lideres.length) return;

      const lastY = (doc as any).lastAutoTable?.finalY ?? 30;

      // Nueva página si no hay espacio
      if (lastY > 175) doc.addPage();

      const yPos = (doc as any).lastAutoTable?.finalY
        ? (doc as any).lastAutoTable.finalY + 10
        : 30;

      doc.setFontSize(9);
      doc.setTextColor(22, 53, 114);
      doc.text(`${proyecto.codigo} — ${proyecto.nombre}`, 10, yPos);

      // Construir filas: líder + sus recursos
      const body: any[] = [];

      lideres.forEach(lider => {
        const recursos = lider.recursos ?? [];

        // Fila del líder
        body.push([
          { content: 'LÍDER', styles: { fontStyle: 'bold', fillColor: [232, 238, 249], textColor: [22, 53, 114], fontSize: 7 } },
          { content: lider.lider ?? '-', styles: { fontStyle: 'bold', fillColor: [232, 238, 249], textColor: [22, 53, 114] } },
          { content: lider.costoHoraLider ? `$${lider.costoHoraLider}/h` : '-', styles: { fillColor: [232, 238, 249], textColor: [22, 53, 114] } },
          { content: lider.horasLider ? `${lider.horasLider}h` : '-', styles: { fillColor: [232, 238, 249], textColor: [22, 53, 114] } },
          { content: '', styles: { fillColor: [232, 238, 249] } },
          { content: '', styles: { fillColor: [232, 238, 249] } },
          { content: '', styles: { fillColor: [232, 238, 249] } },
          { content: '', styles: { fillColor: [232, 238, 249] } },
          { content: '', styles: { fillColor: [232, 238, 249] } },
        ]);

        // Filas de recursos
        recursos.forEach(recurso => {
          body.push([
            { content: 'RECURSO', styles: { fontSize: 7, textColor: [107, 114, 128] } },
            recurso.nombre ?? '-',
            '-',
            '-',
            recurso.tipo ?? '-',
            recurso.rol ?? '-',
            this.formatearFecha(recurso.entrada ?? null),
            this.formatearFecha(recurso.salida ?? null),
            recurso.costoHora ? `$${recurso.costoHora}/h` : '-',
          ]);
        });

        if (!recursos.length) {
          body.push(['', '(Sin recursos asignados)', '', '', '', '', '', '', '']);
        }
      });

      autoTable(doc, {
        startY: yPos + 4,
        head: [['Tipo', 'Nombre', 'Costo/h', 'Horas', 'Tipo Rec.', 'Rol', 'Entrada', 'Salida', 'Costo Rec.']],
        body,
        styles: { fontSize: 7.5, cellPadding: 2.5, valign: 'middle', overflow: 'linebreak' },
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { textColor: [55, 65, 81] },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 46 },
          2: { cellWidth: 18 },
          3: { cellWidth: 14 },
          4: { cellWidth: 18 },
          5: { cellWidth: 36 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 20 },
        },
        margin: { left: 10, right: 10 }
      });
    });

    // ── Pie de página ──
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(`Página ${i} de ${pageCount}`, 148, 208, { align: 'center' });
    }

    doc.save(`${nombreBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
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

  formatearFecha(fecha?: string | null): string {
    if (!fecha) return '-';

    const iso = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

    const dmy = fecha.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) return `${dmy[1]}/${dmy[2]}/${dmy[3]}`;

    const parsed = new Date(fecha);
    if (!isNaN(parsed.getTime())) {
      return `${String(parsed.getDate()).padStart(2,'0')}/${String(parsed.getMonth()+1).padStart(2,'0')}/${parsed.getFullYear()}`;
    }
    return fecha;
  }

  private formatearColaboradores(proyecto: Proyecto): string {
    const nombres = (proyecto.recursos ?? [])
      .map(r => r.nombre?.trim())
      .filter((n): n is string => Boolean(n));
    return nombres.length > 0 ? nombres.join(', ') : '-';
  }
}