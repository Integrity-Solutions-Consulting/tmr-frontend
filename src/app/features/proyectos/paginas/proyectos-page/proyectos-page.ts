import { Component, inject, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { Store } from '@ngrx/store';
import { finalize, map, take } from 'rxjs/operators';
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
  cargarProyectos
} from '../../store/proyectos.actions';

// Colores corporativos
const COLOR_PRIMARIO    = 'FF163572';
const COLOR_LIDER       = 'FFE8EEF9';
const COLOR_RECURSO     = 'FFFFFFFF';
const COLOR_RECURSO_ALT = 'FFF8FAFC';
const COLOR_TEXTO       = 'FF334155';
const COLOR_BORDE       = 'FFE2E8F0';
const COLOR_SEPARADOR   = 'FFE2E8F0';

@Component({
  selector: 'app-proyectos-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatExpansionModule,
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
  confirmCambioEstadoVisible = false;
  confirmTitulo = '';
  confirmMensaje = '';
  confirmTextoConfirmar = 'Confirmar';
  successCrearVisible = false;
  guardandoProyecto = false;
  proyectoSeleccionado: Proyecto | null = null;
  proyectoDetalle: Proyecto | null = null;
  proyectoPendienteCambioEstado: Proyecto | null = null;

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
    if (this.guardandoProyecto) return;

    this.guardandoProyecto = true;

    const finalizeAction = (): void => {
      this.guardandoProyecto = false;
    };

    const handleError = (error: any): void => {
      console.error('Error al guardar proyecto:', error);
    };

    if (this.proyectoSeleccionado) {
      const proyectoConId: Proyecto = { ...proyecto, id: this.proyectoSeleccionado.id };
      this.proyectosService.actualizarProyecto(proyectoConId.id, proyectoConId).pipe(
        finalize(() => finalizeAction())
      ).subscribe({
        next: (response) => {
          if (response.status === 200 || response.status === 204) {
            this.store.dispatch(cargarProyectos());
            this.cerrarModalCrear();
          } else {
            console.error('Respuesta inesperada al actualizar proyecto:', response);
          }
        },
        error: handleError
      });
    } else {
      this.proyectosService.crearProyecto(proyecto).pipe(
        finalize(() => finalizeAction())
      ).subscribe({
        next: (response) => {
          if (response.status === 201 || response.status === 200) {
            this.store.dispatch(cargarProyectos());
            this.cerrarModalCrear();
            this.mostrarSuccessCrear();
          } else {
            console.error('Respuesta inesperada al crear proyecto:', response);
          }
        },
        error: handleError
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

  solicitarCambiarEstadoProyecto(proyecto: Proyecto): void {
    this.proyectoPendienteCambioEstado = proyecto;
    const estadoActual = proyecto.activo === false || proyecto.estado?.toLowerCase() === 'inactivo' ? 'Inactivo' : 'Activo';
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';

    this.confirmTitulo = `${nuevoEstado} proyecto`;
    this.confirmMensaje = `Esta acción marcará el proyecto como ${nuevoEstado.toLowerCase()}. ¿Deseas continuar?`;
    this.confirmTextoConfirmar = nuevoEstado;
    this.confirmCambioEstadoVisible = true;
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

  cancelarCambiarEstadoProyecto(): void {
    this.proyectoPendienteCambioEstado = null;
    this.confirmCambioEstadoVisible = false;
  }

  confirmarCambiarEstadoProyecto(): void {
    if (!this.proyectoPendienteCambioEstado) return;

    const proyecto = this.proyectoPendienteCambioEstado;
    const estadoActual = proyecto.activo === false || proyecto.estado?.toLowerCase() === 'inactivo' ? 'Inactivo' : 'Activo';
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';

    const proyectoActualizado: Proyecto = {
      ...proyecto,
      activo: nuevoEstado === 'Activo',
      estado: nuevoEstado
    };

    this.proyectosService.actualizarProyecto(proyectoActualizado.id, proyectoActualizado).pipe(
      take(1)
    ).subscribe({
      next: (response) => {
        if (response.status === 200 || response.status === 204) {
          this.store.dispatch(cargarProyectos());
        } else {
          console.error('Respuesta inesperada al cambiar estado del proyecto:', response);
        }
      },
      error: (error) => console.error('Error al cambiar estado del proyecto:', error)
    });

    this.cancelarCambiarEstadoProyecto();
  }

  aplicarFiltros(filtros: FiltrosProyecto): void {
    this.filtros = filtros;
  }

  descargarProyectosExcel(): void {
    this.obtenerProyectosFiltrados().subscribe({
      next: (proyectos) => void this.descargarXlsx(proyectos, 'Proyectos'),
      error: (error) => console.error('Error al descargar proyectos:', error)
    });
  }

  descargarProyectosPdf(): void {
    this.obtenerProyectosFiltrados().subscribe({
      next: (proyectos) => this.descargarPDF(proyectos, 'Proyectos'),
      error: (error) => console.error('Error al descargar proyectos:', error)
    });
  }

  private obtenerProyectosFiltrados() {
    return this.store.select(selectProyectos).pipe(
      take(1),
      map((proyectos) => proyectos
        .filter((proyecto) => this.proyectoCoincideConFiltros(proyecto, this.filtros))
        .sort((a, b) => {
          const aActivo = this.normalizarEstadoProyecto(a) === 'Activo';
          const bActivo = this.normalizarEstadoProyecto(b) === 'Activo';
          if (aActivo === bActivo) return 0;
          return aActivo ? -1 : 1;
        })
      )
    );
  }

  private proyectoCoincideConFiltros(proyecto: Proyecto, filtros: FiltrosProyecto): boolean {
    const busqueda = filtros.busqueda.toLowerCase();
    const estado = this.normalizarEstadoProyecto(proyecto);

    const coincideBusqueda =
      proyecto.codigo.toLowerCase().includes(busqueda) ||
      proyecto.nombre.toLowerCase().includes(busqueda) ||
      (proyecto.cliente ?? '').toLowerCase().includes(busqueda);

    const coincideEstado =
      !filtros.estados.length ||
      filtros.estados.includes(estado);

    const coincideTipo =
      !filtros.tipos.length ||
      filtros.tipos.includes(proyecto.tipo ?? '');

    const coincideSeguimiento =
      !(filtros.seguimiento && filtros.seguimiento.length) ||
      (filtros.seguimiento ?? []).includes(proyecto.idEstadoProyecto ?? -1);

    return coincideBusqueda && coincideEstado && coincideTipo && coincideSeguimiento;
  }

  private normalizarEstadoProyecto(proyecto: Proyecto): string {
    if (typeof proyecto.activo === 'boolean') {
      return proyecto.activo ? 'Activo' : 'Inactivo';
    }
    const estado = (proyecto.estado ?? '').trim().toLowerCase();
    return estado === 'inactivo' ? 'Inactivo' : 'Activo';
  }

  // ─── EXCEL ────────────────────────────────────────────────────────────────
  private async descargarXlsx(proyectos: Proyecto[], nombreBase: string): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    // ── Hoja 1: Resumen de proyectos ──
    const wsResumen = workbook.addWorksheet('Proyectos');
    wsResumen.columns = [
      { header: 'Código',      key: 'codigo',      width: 16 },
      { header: 'Nombre',      key: 'nombre',      width: 40 },
      { header: 'Cliente',     key: 'cliente',     width: 40 },
      { header: 'Tipo',        key: 'tipo',        width: 25 },
      { header: 'Seguimiento', key: 'seguimiento', width: 25 },
      { header: 'Estado',      key: 'estado',      width: 18 },
      { header: 'Inicio',      key: 'inicio',      width: 15 },
      { header: 'Fin',         key: 'fin',         width: 15 },
      { header: 'Horas',       key: 'horas',       width: 12 },
      { header: 'Presupuesto', key: 'presupuesto', width: 20 },
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

    this.aplicarEstiloHoja(wsResumen, 6);

    // ── Hoja 2: Líderes y Recursos (estructura plana, sin filas vacías intermedias) ──
    const wsDetalle = workbook.addWorksheet('Líderes y Recursos');
    wsDetalle.columns = [
      { header: 'Código Proyecto', key: 'codigoProyecto', width: 20 },
      { header: 'Nombre Proyecto', key: 'nombreProyecto', width: 40 },
      { header: 'Tipo Fila',       key: 'tipoFila',       width: 15 },
      { header: 'Líder',           key: 'lider',          width: 40 },
      { header: 'Costo/h Líder',   key: 'costoLider',     width: 18 },
      { header: 'Horas Líder',     key: 'horasLider',     width: 15 },
      { header: 'Recurso',         key: 'recurso',        width: 40 },
      { header: 'Tipo Recurso',    key: 'tipoRecurso',    width: 20 },
      { header: 'Rol',             key: 'rol',            width: 40 },
      { header: 'Entrada',         key: 'entrada',        width: 15 },
      { header: 'Salida',          key: 'salida',         width: 15 },
      { header: 'Costo/h Recurso', key: 'costoRecurso',   width: 18 },
      { header: 'Horas Recurso',   key: 'horasRecurso',   width: 15 },
    ];

    // Estilo header hoja detalle
    const headerDetalle = wsDetalle.getRow(1);
    headerDetalle.height = 22;
    headerDetalle.eachCell((cell: any) => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font      = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = this.bordeDelgado();
    });

    proyectos.forEach(proyecto => {
      const lideres = proyecto.lideres?.length
        ? proyecto.lideres
        : proyecto.lider
          ? [{ lider: proyecto.lider, costoHoraLider: proyecto.costoHoraLider, horasLider: proyecto.horasLider, recursos: proyecto.recursos ?? [] }]
          : [];

      // Deduplicar líderes por nombre para evitar repeticiones
      const lideresUnicos = lideres.filter((l, i, arr) =>
        arr.findIndex(x => x.lider === l.lider) === i
      );

      lideresUnicos.forEach((lider, liderIdx) => {
        // ── Fila LÍDER ──
        const filaLider = wsDetalle.addRow({
          codigoProyecto: liderIdx === 0 ? proyecto.codigo : '',
          nombreProyecto: liderIdx === 0 ? proyecto.nombre : '',
          tipoFila:       'LÍDER',
          lider:          lider.lider ?? '-',
          costoLider:     lider.costoHoraLider ?? '',
          horasLider:     lider.horasLider ?? '',
          recurso:        '',
          tipoRecurso:    '',
          rol:            '',
          entrada:        '',
          salida:         '',
          costoRecurso:   '',
          horasRecurso:   '',
        });
        filaLider.height = 22;
        filaLider.eachCell((cell: any) => {
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_LIDER } };
          cell.font      = { name: 'Segoe UI', size: 10, bold: true, color: { argb: COLOR_PRIMARIO } };
          cell.border    = this.bordeDelgado(COLOR_BORDE);
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        const recursos = lider.recursos ?? [];

        if (!recursos.length) {
          // Fila "sin recursos" directamente sin filas vacías previas
          const filaVacia = wsDetalle.addRow({
            codigoProyecto: '',
            nombreProyecto: '',
            tipoFila:       '',
            lider:          '',
            costoLider:     '',
            horasLider:     '',
            recurso:        'Sin recursos asignados',
            tipoRecurso:    '',
            rol:            '',
            entrada:        '',
            salida:         '',
            costoRecurso:   '',
            horasRecurso:   '',
          });
          filaVacia.height = 18;
          filaVacia.eachCell((cell: any) => {
            cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_RECURSO } };
            cell.font      = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF9CA3AF' } };
            cell.border    = this.bordeDelgado(COLOR_BORDE);
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          });
        } else {
          recursos.forEach((recurso, idx) => {
            const alterno = idx % 2 === 0;
            const fila = wsDetalle.addRow({
              codigoProyecto: '',
              nombreProyecto: '',
              tipoFila:       'Recurso',
              lider:          '',
              costoLider:     '',
              horasLider:     '',
              recurso:        recurso.nombre ?? '-',
              tipoRecurso:    recurso.tipo ?? '-',
              rol:            recurso.rol ?? '-',
              entrada:        this.formatearFecha(recurso.entrada ?? null),
              salida:         this.formatearFecha(recurso.salida ?? null),
              costoRecurso:   recurso.costoHora ?? '',
              horasRecurso:   recurso.horas ?? '',
            });
            fila.height = 19;
            fila.eachCell((cell: any) => {
              cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: alterno ? COLOR_RECURSO : COLOR_RECURSO_ALT } };
              cell.font      = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
              cell.border    = this.bordeDelgado(COLOR_BORDE);
              cell.alignment = { vertical: 'middle', horizontal: 'left' };
            });
          });
        }
      });

      // ── Fila separadora entre proyectos (UNA sola, al final de cada proyecto) ──
      const filaSep = wsDetalle.addRow({});
      filaSep.height = 5;
      for (let c = 1; c <= 13; c++) {
        const cell = filaSep.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_SEPARADOR } };
      }
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
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_PRIMARIO } };
      cell.font      = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border    = this.bordeDelgado();
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const fill = rowNumber % 2 === 0 ? COLOR_RECURSO_ALT : COLOR_RECURSO;
      row.height = 20;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
        cell.font      = { name: 'Segoe UI', size: 10, color: { argb: COLOR_TEXTO } };
        cell.border    = this.bordeDelgado(COLOR_BORDE);
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

  private bordeDelgado(color = COLOR_PRIMARIO): any {
    const b = { style: 'thin', color: { argb: color } };
    return { top: b, left: b, bottom: b, right: b };
  }

  // ─── PDF ─────────────────────────────────────────────────────────────────
  private descargarPDF(proyectos: Proyecto[], nombreBase: string): void {
    const doc      = new jsPDF({ orientation: 'landscape' });
    const fecha    = new Date().toLocaleDateString('es-EC');
    const pageW    = 297;
    const pageH    = 210;  // alto landscape en mm
    const marginX  = 12;
    const footerY  = pageH - 8; // coordenada fija para el pie

    // ── Helper: cabecera reutilizable ──
    const dibujarCabecera = () => {
      doc.setFillColor(22, 53, 114);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Reporte de Proyectos', marginX, 14);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${fecha}`, pageW - marginX, 14, { align: 'right' });
      doc.setDrawColor(99, 135, 190);
      doc.setLineWidth(0.5);
      doc.line(0, 22, pageW, 22);
    };

    dibujarCabecera();

    // ── Subtítulo sección resumen ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text('Resumen de Proyectos', marginX, 32);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, 34, marginX + 60, 34);

    // ── Tabla resumen ──
    autoTable(doc, {
      startY: 37,
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
        0: { cellWidth: 18,  halign: 'center' },
        1: { cellWidth: 44 },
        2: { cellWidth: 34 },
        3: { cellWidth: 26 },
        4: { cellWidth: 24,  halign: 'center' },
        5: { cellWidth: 20,  halign: 'center' },
        6: { cellWidth: 18,  halign: 'center' },
        7: { cellWidth: 18,  halign: 'center' },
        8: { cellWidth: 14,  halign: 'center' },
        9: { cellWidth: 22,  halign: 'right'  },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw ?? '').toLowerCase();
          data.cell.styles.textColor = val === 'activo' ? [22, 163, 74] : [107, 114, 128];
          data.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: marginX, right: marginX, bottom: 18 },
      didDrawPage: () => dibujarCabecera(),
    });

    // ── Sección detalle: siempre empieza en página nueva ──
    doc.addPage();
    dibujarCabecera();

    let currentY = 30;

    // Subtítulo detalle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 53, 114);
    doc.text('Detalle de Líderes y Recursos', marginX, currentY);
    doc.setDrawColor(22, 53, 114);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY + 2, marginX + 70, currentY + 2);
    currentY += 10;

    proyectos.forEach(proyecto => {
      const lideres = proyecto.lideres?.length
        ? proyecto.lideres
        : proyecto.lider
          ? [{ lider: proyecto.lider, costoHoraLider: proyecto.costoHoraLider, horasLider: proyecto.horasLider, recursos: proyecto.recursos ?? [] }]
          : [];

      if (!lideres.length) return;

      // Deduplicar líderes por nombre
      const lideresUnicos = lideres.filter((l, i, arr) =>
        arr.findIndex(x => x.lider === l.lider) === i
      );

      // Construir body de la tabla del proyecto
      const body: any[] = [];

      lideresUnicos.forEach((lider, liderIdx) => {
        const recursos = lider.recursos ?? [];

        // Separador visual entre líderes del mismo proyecto
        if (liderIdx > 0) {
          body.push([{
            content: '',
            colSpan: 9,
            styles: { fillColor: [226, 232, 240], cellPadding: 1 }
          }]);
        }

        // ── Fila LÍDER ──
        const estiloLider: any = {
          fontStyle:  'bold',
          fillColor:  [210, 222, 245],
          textColor:  [22, 53, 114],
          fontSize:   8,
        };
        body.push([
          { content: 'LÍDER',                                                    styles: { ...estiloLider, halign: 'center' } },
          { content: lider.lider ?? '-',                                         styles: estiloLider },
          { content: lider.costoHoraLider ? `$${lider.costoHoraLider}/h` : '-', styles: { ...estiloLider, halign: 'right' } },
          { content: lider.horasLider ? `${lider.horasLider}h` : '-',           styles: { ...estiloLider, halign: 'center' } },
          { content: '', styles: { fillColor: [210, 222, 245] } },
          { content: '', styles: { fillColor: [210, 222, 245] } },
          { content: '', styles: { fillColor: [210, 222, 245] } },
          { content: '', styles: { fillColor: [210, 222, 245] } },
          { content: '', styles: { fillColor: [210, 222, 245] } },
        ]);

        // ── Filas RECURSOS ──
        if (!recursos.length) {
          body.push([
            { content: '', styles: { fillColor: [255, 255, 255] } },
            {
              content: 'Sin recursos asignados',
              colSpan: 8,
              styles: {
                fontStyle:  'italic',
                textColor:  [156, 163, 175],
                fillColor:  [255, 255, 255],
                fontSize:   7.5,
              }
            }
          ]);
        } else {
          recursos.forEach((recurso, idx) => {
            const bg: [number, number, number] = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
            body.push([
              { content: 'Recurso',                                              styles: { fontSize: 7, textColor: [148, 163, 184], fillColor: bg, halign: 'center' } },
              { content: recurso.nombre ?? '-',                                  styles: { fillColor: bg, textColor: [51, 65, 85] } },
              { content: recurso.costoHora ? `$${recurso.costoHora}/h` : '-',   styles: { fillColor: bg, textColor: [107, 114, 128], halign: 'right' } },
              { content: recurso.horas ? `${recurso.horas}h` : '-',             styles: { fillColor: bg, textColor: [107, 114, 128], halign: 'center' } },
              { content: recurso.tipo ?? '-',                                    styles: { fillColor: bg, textColor: [51, 65, 85] } },
              { content: recurso.rol ?? '-',                                     styles: { fillColor: bg, textColor: [51, 65, 85] } },
              { content: this.formatearFecha(recurso.entrada ?? null),           styles: { fillColor: bg, textColor: [51, 65, 85], halign: 'center' } },
              { content: this.formatearFecha(recurso.salida ?? null),            styles: { fillColor: bg, textColor: [51, 65, 85], halign: 'center' } },
              { content: '-',                                                    styles: { fillColor: bg, textColor: [156, 163, 175], halign: 'center' } },
            ]);
          });
        }
      });


      // Calcular altura aproximada del bloque completo del proyecto
      const alturaEstimadaProyecto =
        24 +                // encabezado proyecto + separación
        (body.length * 10) + // filas con margen de seguridad
        18;                 // margen seguridad

      // Si no cabe completo, empezar en una página nueva
      if (currentY + alturaEstimadaProyecto > footerY - 10) {
        doc.addPage();
        dibujarCabecera();
        currentY = 30;
      }

      // ── Encabezado del proyecto ──
      doc.setFillColor(232, 238, 249);
      doc.roundedRect(marginX, currentY, pageW - marginX * 2, 8, 1, 1, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 53, 114);
      doc.text(`${proyecto.codigo}  —  ${proyecto.nombre}`, marginX + 3, currentY + 5.5);
      doc.setFont('helvetica', 'normal');

      autoTable(doc, {
        startY: currentY + 10,
        head: [['Tipo', 'Nombre', 'Costo/h', 'Horas', 'Tipo Rec.', 'Rol', 'Entrada', 'Salida', 'Costo Rec.']],
        body,
        styles: {
          fontSize: 7.5,
          cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
          valign: 'middle',
          overflow: 'linebreak',
          cellWidth: 'wrap',
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor:   [51, 65, 85],
          textColor:   255,
          fontStyle:   'bold',
          fontSize:    7.5,
          halign:      'center',
          cellPadding: { top: 4, bottom: 4, left: 6, right: 6 },
        },
        bodyStyles: {
          textColor: [55, 65, 81],
          minCellHeight: 10
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center' },
          1: { cellWidth: 90 },
          2: { cellWidth: 22, halign: 'right' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 28 },
          5: { cellWidth: 80 },
          6: { cellWidth: 24, halign: 'center' },
          7: { cellWidth: 24, halign: 'center' },
          8: { cellWidth: 22, halign: 'center' },
        },
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        tableWidth: 'auto',
        margin: { left: marginX, right: marginX, bottom: 18 },
        didDrawPage: (data) => {
          dibujarCabecera();
          if (data.pageNumber > 1) {
            const yHead = 28;
            doc.setFillColor(232, 238, 249);
            doc.roundedRect(marginX, yHead, pageW - marginX * 2, 7, 1, 1, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(22, 53, 114);
            doc.text(`${proyecto.codigo}  —  ${proyecto.nombre} (cont.)`, marginX + 3, yHead + 5);
          }
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    // ── Pie de página en TODAS las páginas ──
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
      doc.text('TMR — Reporte de Proyectos', marginX, footerY + 4);
      doc.text(fecha, pageW - marginX, footerY + 4, { align: 'right' });
    }

    doc.save(`${nombreBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private crearDescarga(blob: Blob, nombreArchivo: string): void {
    const link = document.createElement('a');
    const url  = URL.createObjectURL(blob);
    link.href     = url;
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
      return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
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
