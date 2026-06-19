import { Injectable } from '@angular/core';
import { Colaborador } from '../models/colaborador.model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({ providedIn: 'root' })
export class ExportarService {

  // ── EXPORTAR PDF ──────────────────────────────────────
  exportarPDF(colaboradores: Colaborador[]): void {
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

  // ── EXPORTAR EXCEL ────────────────────────────────────
  async exportarExcel(colaboradores: Colaborador[]): Promise<void> {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();

    // ── Hoja 1: Colaboradores ───────────────────────────
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

    // ── Hoja 2: Resumen ─────────────────────────────────
    const wsResumen = workbook.addWorksheet('Resumen');
    wsResumen.columns = [
      { header: 'Métrica', key: 'metrica', width: 30 },
      { header: 'Total', key: 'total', width: 12 },
    ];

    const activosCount = colaboradores.filter(c => c.estado === 'Activo').length;
    const inactivosCount = colaboradores.filter(c => c.estado === 'Inactivo').length;
    const noAsignadosCount = colaboradores.filter(c => (!c.proyectosAsignados || c.proyectosAsignados.length === 0) && c.estado === 'Activo').length;
    const asignadosCount = colaboradores.filter(c => c.proyectosAsignados && c.proyectosAsignados.length > 0 && c.estado === 'Activo').length;

    wsResumen.addRow({ metrica: 'Total colaboradores', total: colaboradores.length });
    wsResumen.addRow({ metrica: 'Activos', total: activosCount });
    wsResumen.addRow({ metrica: 'Inactivos', total: inactivosCount });
    wsResumen.addRow({ metrica: 'No asignados (0 proyectos)', total: noAsignadosCount });
    wsResumen.addRow({ metrica: 'Asignados (1+ proyectos)', total: asignadosCount });

    this.aplicarEstiloExcel(wsResumen, 2);

    const buffer = await workbook.xlsx.writeBuffer();
    this.crearDescargaExcel(buffer, `colaboradores_${this.getFechaArchivo()}.xlsx`);
  }

  // ── HELPERS ───────────────────────────────────────────
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

  private getFechaArchivo(): string {
    const now = new Date();
    const d = now.getDate().toString().padStart(2, '0');
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  }
}
