import { Injectable } from '@angular/core';
import { Colaborador } from '../models/colaborador.model';
import { exportarReportePdf, obtenerLogoReporte, fechaArchivo } from '../../../shared/utils/reporte-export.utils';

@Injectable({ providedIn: 'root' })
export class ExportarService {

  // ── EXPORTAR PDF ──────────────────────────────────────
  exportarPDF(colaboradores: Colaborador[]): void {
    void exportarReportePdf({
      titulo: 'Reporte de Colaboradores',
      nombreArchivo: 'Colaboradores',
      nombreHoja: 'Colaboradores',
      columnas: [
        { encabezado: 'Código', anchoPdf: 16 },
        { encabezado: 'Empresa / Asociación', anchoPdf: 22 },
        { encabezado: 'Contrato', anchoPdf: 18 },
        { encabezado: 'Estado', anchoPdf: 16, alineacion: 'center' },
        { encabezado: 'Tipo persona', anchoPdf: 18 },
        { encabezado: 'Tipo ID', anchoPdf: 15 },
        { encabezado: 'Núm. ID', anchoPdf: 20 },
        { encabezado: 'Nombres', anchoPdf: 22 },
        { encabezado: 'Apellidos', anchoPdf: 22 },
        { encabezado: 'Nacimiento', anchoPdf: 17 },
        { encabezado: 'Género', anchoPdf: 14 },
        { encabezado: 'Nacionalidad', anchoPdf: 18 },
        { encabezado: 'Departamento', anchoPdf: 20 },
        { encabezado: 'Ingreso', anchoPdf: 17 },
        { encabezado: 'Cargo', anchoPdf: 22 },
        { encabezado: 'Años', anchoPdf: 12 },
        { encabezado: 'Modalidad', anchoPdf: 16 },
        { encabezado: 'Categoría', anchoPdf: 17 },
        { encabezado: 'Correo', anchoPdf: 28 },
        { encabezado: 'Teléfono', anchoPdf: 17 },
        { encabezado: 'Dirección', anchoPdf: 28 },
        { encabezado: 'Proyectos asignados', anchoPdf: 36 },
      ],
      filas: colaboradores.map((colaborador) => [
        colaborador.codigoEmpleado ?? '-',
        colaborador.tipoIdentificacion ?? '-',
        colaborador.tipoContrato ?? '-',
        colaborador.estado ?? '-',
        colaborador.tipoPersona ?? '-',
        colaborador.idTipoIdentificacion?.toString() ?? '-',
        colaborador.numeroIdentificacion ?? colaborador.identificacion ?? '-',
        colaborador.nombres ?? '-',
        colaborador.apellidos ?? '-',
        this.formatearFechaValor(colaborador.fechaNacimiento),
        colaborador.genero ?? '-',
        colaborador.nacionalidad ?? '-',
        colaborador.departamento ?? '-',
        this.formatearFechaValor(colaborador.fechaContratacion),
        colaborador.cargo ?? '-',
        String(colaborador.aniosExperiencia ?? '-'),
        colaborador.modalidad ?? '-',
        colaborador.categoria ?? '-',
        colaborador.correoElectronico ?? '-',
        colaborador.telefono ?? '-',
        colaborador.direccion ?? '-',
        this.formatearProyectosColaborador(colaborador),
      ]),
      columnaEstado: 3,
      orientacionPdf: 'landscape',
      formatoPdf: 'a3',
    });
  }

  // ── EXPORTAR EXCEL ────────────────────────────────────
  async exportarExcel(colaboradores: Colaborador[]): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    // ── Hoja 1: Colaboradores ───────────────────────────
    const ws = workbook.addWorksheet('Colaboradores');
    ws.columns = [
      { key: 'codigoEmpleado', width: 18 },
      { key: 'empresa', width: 24 },
      { key: 'tipoContrato', width: 20 },
      { key: 'estado', width: 14 },
      { key: 'tipoPersona', width: 18 },
      { key: 'tipoIdentificacion', width: 22 },
      { key: 'numeroIdentificacion', width: 24 },
      { key: 'nombres', width: 24 },
      { key: 'apellidos', width: 24 },
      { key: 'fechaNacimiento', width: 18 },
      { key: 'genero', width: 16 },
      { key: 'nacionalidad', width: 18 },
      { key: 'departamento', width: 22 },
      { key: 'fechaContratacion', width: 18 },
      { key: 'cargo', width: 26 },
      { key: 'aniosExperiencia', width: 18 },
      { key: 'modalidad', width: 16 },
      { key: 'categoria', width: 18 },
      { key: 'correoElectronico', width: 34 },
      { key: 'telefono', width: 16 },
      { key: 'direccion', width: 36 },
      { key: 'proyectos', width: 54 },
    ];

    ws.addRow([]);
    ws.addRow([]);
    ws.addRow([
      'Código empleado', 'Empresa / Asociación', 'Tipo de contrato', 'Estado', 'Tipo de persona',
      'Tipo de identificación', 'Número de identificación', 'Nombres', 'Apellidos', 'Fecha de nacimiento',
      'Género', 'Nacionalidad', 'Departamento', 'Fecha de ingreso', 'Cargo', 'Años de experiencia',
      'Modalidad', 'Categoría', 'Correo electrónico', 'Teléfono', 'Dirección', 'Proyectos asignados'
    ]);

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

    await this.aplicarEstiloEstandar(workbook, ws, 'Reporte de Colaboradores', 4);

    // ── Hoja 2: Resumen ─────────────────────────────────
    const wsResumen = workbook.addWorksheet('Resumen');
    wsResumen.columns = [
      { key: 'metrica', width: 30 },
      { key: 'total', width: 12 },
    ];

    wsResumen.addRow([]);
    wsResumen.addRow([]);
    wsResumen.addRow(['Métrica', 'Total']);

    const activosCount = colaboradores.filter(c => c.estado === 'Activo').length;
    const inactivosCount = colaboradores.filter(c => c.estado === 'Inactivo').length;
    const noAsignadosCount = colaboradores.filter(c => (!c.proyectosAsignados || c.proyectosAsignados.length === 0) && c.estado === 'Activo').length;
    const asignadosCount = colaboradores.filter(c => c.proyectosAsignados && c.proyectosAsignados.length > 0 && c.estado === 'Activo').length;

    wsResumen.addRow({ metrica: 'Total colaboradores', total: colaboradores.length });
    wsResumen.addRow({ metrica: 'Activos', total: activosCount });
    wsResumen.addRow({ metrica: 'Inactivos', total: inactivosCount });
    wsResumen.addRow({ metrica: 'No asignados (0 proyectos)', total: noAsignadosCount });
    wsResumen.addRow({ metrica: 'Asignados (1+ proyectos)', total: asignadosCount });

    await this.aplicarEstiloEstandar(workbook, wsResumen, 'Resumen de Colaboradores', 2);

    const buffer = await workbook.xlsx.writeBuffer();
    this.crearDescargaExcel(buffer, `Reporte_Colaboradores_${fechaArchivo()}.xlsx`);
  }

  // ── HELPERS ───────────────────────────────────────────
  private async aplicarEstiloEstandar(
    workbook: any,
    ws: any,
    tituloReporte: string,
    colEstado: number,
  ): Promise<void> {
    const cantidadColumnas = ws.columns.length;

    ws.mergeCells(1, 3, 1, cantidadColumnas);
    ws.mergeCells(2, 3, 2, cantidadColumnas);

    // Cabecera azul corporativo oscuro (FF1F497D)
    for (let rowNumber = 1; rowNumber <= 2; rowNumber++) {
      const row = ws.getRow(rowNumber);
      row.height = rowNumber === 1 ? 79.25 : 28.25;
      for (let colNumber = 1; colNumber <= cantidadColumnas; colNumber++) {
        const cell = row.getCell(colNumber);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
        if (rowNumber === 2) {
          cell.border = { bottom: { style: 'thin', color: { argb: 'FF163572' } } };
        }
      }
    }

    const cellTitulo = ws.getCell(1, 3);
    cellTitulo.value = tituloReporte;
    cellTitulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    cellTitulo.alignment = { vertical: 'middle', horizontal: 'center' };

    const cellGenerado = ws.getCell(2, 3);
    cellGenerado.value = `Generado: ${this.formatearFecha(new Date())}`;
    cellGenerado.font = { name: 'Calibri', size: 10, color: { argb: 'FFFFFFFF' } };
    cellGenerado.alignment = { vertical: 'middle', horizontal: 'right' };

    const logo = await obtenerLogoReporte();
    if (logo) {
      const logoId = workbook.addImage({ base64: logo, extension: 'png' });
      ws.addImage(logoId, {
        tl: { col: 0.15, row: 0.12 },
        ext: { width: 172, height: 55 },
      });
    }

    const headerRow = ws.getRow(3);
    headerRow.height = 18;
    headerRow.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF163572' } };
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      const border = { style: 'thin' as const, color: { argb: 'FF163572' } };
      cell.border = { top: border, left: border, bottom: border, right: border };
    });

    ws.eachRow((row: any, rowNumber: number) => {
      if (rowNumber <= 3) return;
      row.height = 18;
      row.eachCell((cell: any, colNumber: number) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' },
        };
        cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF334155' } };
        const border = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
        cell.border = { top: border, left: border, bottom: border, right: border };
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

        if (colNumber === colEstado) {
          const esActivo = String(cell.value ?? '').toLowerCase() === 'activo';
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: esActivo ? 'FF16A34A' : 'FF6B7280' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    ws.views = [{ state: 'frozen', ySplit: 3 }];
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: 3, column: cantidadColumnas },
    };
    ws.pageSetup = {
      orientation: cantidadColumnas > 6 ? 'landscape' : 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: '1:3',
      margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    };
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
}
