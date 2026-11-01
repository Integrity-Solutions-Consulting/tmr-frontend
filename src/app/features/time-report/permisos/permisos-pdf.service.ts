import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import {
  DatosFormularioOficial,
  HorarioPermisoOficial,
  TipoPermisoOficial,
} from './formulario-permiso-oficial/formulario-permiso-oficial';

@Injectable({
  providedIn: 'root',
})
export class PermisosPdfService {
  private logoDataUrlCache: string | null = null;

  /**
   * Genera y descarga inmediatamente el PDF oficial A4 de Integrity Solutions:
   * "FORMULARIO DE SOLICITUD DE PERMISOS, LICENCIAS Y VACACIONES".
   */
  async descargarFormularioPdf(datos: DatosFormularioOficial): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2; // 182 mm
    let y = 12;

    // Cargar logo ISC si está disponible
    const logoDataUrl = await this.obtenerLogoDataUrl();
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 22, y, 44, 15);
      } catch {
        this.dibujarTituloLogoFallback(doc, pageWidth / 2, y + 8);
      }
    } else {
      this.dibujarTituloLogoFallback(doc, pageWidth / 2, y + 8);
    }

    // Folio en esquina superior derecha
    if (datos.folio) {
      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.roundedRect(marginX + contentWidth - 44, y + 1, 44, 7, 1.2, 1.2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(22, 53, 114);
      doc.text(`Folio: ${datos.folio}`, marginX + contentWidth - 22, y + 5.5, { align: 'center' });
    }

    y += 19;

    // =========================================================================
    // TABLA 1: TÍTULO Y FECHA DE SOLICITUD
    // =========================================================================
    const leftTitleW = 104;
    const rightDateW = contentWidth - leftTitleW; // 78 mm
    const colDateW = rightDateW / 3; // 26 mm

    // Celda izquierda (rowspan 3 = 18mm)
    doc.setFillColor(217, 217, 217);
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.rect(marginX, y, leftTitleW, 18, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      ['FORMULARIO DE SOLICITUD DE PERMISOS, LICENCIAS', 'Y VACACIONES'],
      marginX + leftTitleW / 2,
      y + 7.8,
      { align: 'center' },
    );

    // Fila 1 derecha: FECHA DE SOLICITUD
    doc.setFillColor(217, 217, 217);
    doc.rect(marginX + leftTitleW, y, rightDateW, 6, 'FD');
    doc.setFontSize(8);
    doc.text('FECHA DE SOLICITUD', marginX + leftTitleW + rightDateW / 2, y + 4.2, {
      align: 'center',
    });

    // Fila 2 derecha: Día | Mes | Año
    const subHeadersFecha = ['Día', 'Mes', 'Año'];
    subHeadersFecha.forEach((label, idx) => {
      const cx = marginX + leftTitleW + idx * colDateW;
      doc.setFillColor(241, 245, 249);
      doc.rect(cx, y + 6, colDateW, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(label, cx + colDateW / 2, y + 10.2, { align: 'center' });
    });

    // Fila 3 derecha: Valores Día | Mes | Año
    const valsFecha = [datos.diaSolicitud || '', datos.mesSolicitud || '', datos.anioSolicitud || ''];
    valsFecha.forEach((val, idx) => {
      const cx = marginX + leftTitleW + idx * colDateW;
      doc.setFillColor(255, 255, 255);
      doc.rect(cx, y + 12, colDateW, 6, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(String(val), cx + colDateW / 2, y + 16.2, { align: 'center' });
    });

    y += 21;

    // =========================================================================
    // TABLA 2: DATOS DEL COLABORADOR
    // =========================================================================
    doc.setFillColor(217, 217, 217);
    doc.rect(marginX, y, contentWidth, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('DATOS DEL COLABORADOR', marginX + contentWidth / 2, y + 4.2, { align: 'center' });
    y += 6;

    const colabCols = [
      { header: 'Apellidos y nombres', width: 42, value: datos.apellidosNombres || '' },
      { header: 'Número de cédula', width: 28, value: datos.numeroCedula || '' },
      { header: 'Cargo', width: 36, value: datos.cargo || '' },
      { header: 'Cliente', width: 40, value: datos.cliente || '' },
      { header: 'Jefe inmediato', width: 36, value: datos.jefeInmediato || '' },
    ];

    let curX = marginX;
    colabCols.forEach((col) => {
      doc.setFillColor(241, 245, 249);
      doc.rect(curX, y, col.width, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(col.header, curX + col.width / 2, y + 4.1, { align: 'center' });
      curX += col.width;
    });
    y += 6;

    curX = marginX;
    const rowColabH = 9;
    colabCols.forEach((col) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(curX, y, col.width, rowColabH, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.3);
      const lines = doc.splitTextToSize(String(col.value), col.width - 3);
      const startY = lines.length > 1 ? y + 3.8 : y + 5.5;
      doc.text(lines.slice(0, 2), curX + col.width / 2, startY, { align: 'center' });
      curX += col.width;
    });

    y += rowColabH + 3;

    // =========================================================================
    // SECCIÓN 3: TIPO DE PERMISO DE AUSENCIA DE TRABAJO
    // =========================================================================
    y = this.dibujarBarraSeccionAzul(doc, marginX, y, contentWidth, 'TIPO DE PERMISO DE AUSENCIA DE TRABAJO');

    doc.setFillColor(217, 217, 217);
    doc.rect(marginX, y, contentWidth, 5.5, 'FD');
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Favor marcar con una X el tipo de permiso solicitado:', marginX + 3, y + 3.9);
    y += 7.5;

    const tiposGrid: Array<Array<{ label: string; code: TipoPermisoOficial | null }>> = [
      [
        { label: 'Vacaciones', code: 'VACACIONES' },
        { label: 'Licencia por enfermedad', code: 'LICENCIA_ENFERMEDAD' },
        { label: 'Citas médicas', code: 'CITAS_MEDICAS' },
      ],
      [
        { label: 'Matrimonio', code: 'MATRIMONIO' },
        { label: 'Nacimiento de un Hijo/a', code: 'NACIMIENTO_HIJO' },
        { label: 'Otros', code: 'OTROS' },
      ],
      [
        { label: 'Maternidad', code: 'MATERNIDAD' },
        { label: 'Fallecimiento de un familiar', code: 'FALLECIMIENTO_FAMILIAR' },
        { label: '', code: null },
      ],
    ];

    const colTipoW = contentWidth / 3;
    tiposGrid.forEach((fila) => {
      fila.forEach((item, idx) => {
        if (!item.code) return;
        const cellX = marginX + idx * colTipoW;
        const marcado = datos.tipoPermiso === item.code;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.6);
        doc.setTextColor(15, 23, 42);
        doc.text(item.label, cellX + 2, y + 4);

        const boxX = cellX + colTipoW - 11;
        if (marcado) {
          doc.setFillColor(239, 246, 255);
          doc.setDrawColor(22, 53, 114);
        } else {
          doc.setFillColor(255, 255, 255);
          doc.setDrawColor(30, 41, 59);
        }
        doc.rect(boxX, y + 0.5, 7, 5, 'FD');

        if (marcado) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(22, 53, 114);
          doc.text('X', boxX + 3.5, y + 4.2, { align: 'center' });
        }
      });
      y += 7;
    });

    y += 1.5;

    // =========================================================================
    // SECCIÓN 4: MOTIVOS DEL PERMISO LABORAL O VACACIONAL
    // =========================================================================
    y = this.dibujarBarraSeccionAzul(doc, marginX, y, contentWidth, 'MOTIVOS DEL PERMISO LABORAL O VACACIONAL');

    const motivoBoxH = 18;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(51, 65, 85);
    doc.rect(marginX, y, contentWidth, motivoBoxH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const motivoLines = doc.splitTextToSize(datos.motivos || 'Sin detalle especificado.', contentWidth - 6);
    doc.text(motivoLines.slice(0, 3), marginX + 3, y + 4.8);

    if (datos.evidenciaNombre) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(22, 53, 114);
      doc.text(`Evidencia adjunta: ${datos.evidenciaNombre}`, marginX + 3, y + motivoBoxH - 2.2);
    }

    y += motivoBoxH + 3.5;

    // =========================================================================
    // TABLA 5: FECHAS Y DÍAS SOLICITADOS
    // =========================================================================
    const sideW = 34;
    const dateColW = (contentWidth - sideW) / 4; // 37 mm

    // Celda lateral "Fecha de la solicitud" (alto = 6 + 11 = 17 mm)
    doc.setFillColor(217, 217, 217);
    doc.setDrawColor(51, 65, 85);
    doc.rect(marginX, y, sideW, 17, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text('Fecha de la solicitud', marginX + 2.5, y + 9.5);

    const headersFechas = [
      'Fecha de inicio',
      'Fecha de finalización',
      'Fecha de regreso',
      'Fecha de aprobación',
    ];
    headersFechas.forEach((h, idx) => {
      const cx = marginX + sideW + idx * dateColW;
      doc.setFillColor(241, 245, 249);
      doc.rect(cx, y, dateColW, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.3);
      doc.text(h, cx + dateColW / 2, y + 4.1, { align: 'center' });
    });

    const valoresFechas = [
      datos.fechaInicio || '-',
      datos.fechaFinalizacion || '-',
      datos.fechaRegreso || '-',
      datos.fechaAprobacion || 'Pendiente',
    ];
    valoresFechas.forEach((v, idx) => {
      const cx = marginX + sideW + idx * dateColW;
      doc.setFillColor(255, 255, 255);
      doc.rect(cx, y + 6, dateColW, 11, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(String(v), cx + dateColW / 2, y + 12.5, { align: 'center' });
    });

    y += 17;

    // Fila Días solicitados
    doc.setFillColor(217, 217, 217);
    doc.rect(marginX, y, sideW, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text('Días solicitados', marginX + 2.5, y + 4.4);

    doc.setFillColor(255, 255, 255);
    doc.rect(marginX + sideW, y, contentWidth - sideW, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(22, 53, 114);
    doc.text(String(datos.diasSolicitados ?? ''), marginX + sideW + (contentWidth - sideW) / 2, y + 4.4, {
      align: 'center',
    });

    y += 10;

    // =========================================================================
    // TABLA 6: HORARIO Y HORAS SOLICITADAS
    // =========================================================================
    doc.setFillColor(217, 217, 217);
    doc.setDrawColor(51, 65, 85);
    doc.rect(marginX, y, sideW, 17, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text('Horario', marginX + 2.5, y + 9.5);

    const horariosCols: Array<{ label: string; code: HorarioPermisoOficial }> = [
      { label: 'Mañana', code: 'MANANA' },
      { label: 'Tarde', code: 'TARDE' },
      { label: 'Completa', code: 'COMPLETA' },
      { label: 'Otros', code: 'OTROS' },
    ];

    horariosCols.forEach((h, idx) => {
      const cx = marginX + sideW + idx * dateColW;
      doc.setFillColor(241, 245, 249);
      doc.rect(cx, y, dateColW, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.3);
      doc.setTextColor(15, 23, 42);
      doc.text(h.label, cx + dateColW / 2, y + 4.1, { align: 'center' });

      doc.setFillColor(255, 255, 255);
      doc.rect(cx, y + 6, dateColW, 11, 'FD');
      if (datos.horario === h.code) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(22, 53, 114);
        doc.text('X', cx + dateColW / 2, y + 11.2, { align: 'center' });
        if (datos.detalleHorario) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(71, 85, 105);
          const det = doc.splitTextToSize(datos.detalleHorario, dateColW - 2);
          doc.text(det[0], cx + dateColW / 2, y + 15.2, { align: 'center' });
        }
      }
    });

    y += 17;

    // Fila Horas solicitadas
    doc.setFillColor(217, 217, 217);
    doc.rect(marginX, y, sideW, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text('Horas solicitadas', marginX + 2.5, y + 4.4);

    doc.setFillColor(255, 255, 255);
    doc.rect(marginX + sideW, y, contentWidth - sideW, 6.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(22, 53, 114);
    doc.text(String(datos.horasSolicitadas ?? ''), marginX + sideW + (contentWidth - sideW) / 2, y + 4.4, {
      align: 'center',
    });

    y += 10;

    // =========================================================================
    // TABLA 7: FIRMAS Y TRAZABILIDAD DE APROBACIÓN
    // =========================================================================
    const firmaColW = (contentWidth - sideW) / 3;
    doc.setFillColor(217, 217, 217);
    doc.setDrawColor(51, 65, 85);
    doc.rect(marginX, y, sideW, 21, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(15, 23, 42);
    doc.text('Firmas', marginX + 2.5, y + 11.5);

    const firmasHeaders = ['Firma del solicitante', 'Jefe inmediato', 'Talento Humano'];
    firmasHeaders.forEach((fh, idx) => {
      const cx = marginX + sideW + idx * firmaColW;
      doc.setFillColor(241, 245, 249);
      doc.rect(cx, y, firmaColW, 6, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.3);
      doc.setTextColor(15, 23, 42);
      doc.text(fh, cx + firmaColW / 2, y + 4.1, { align: 'center' });
    });

    const firmasData = [
      {
        nombre: datos.apellidosNombres || 'Colaborador ISC',
        estado: `Registrado en TMR (${datos.diaSolicitud}/${datos.mesSolicitud}/${datos.anioSolicitud})`,
        aprobado: true,
      },
      {
        nombre: datos.aprobacionLider?.responsable || datos.jefeInmediato || 'Jefe Inmediato',
        estado: datos.aprobacionLider?.aprobado
          ? `Aprobado · ${datos.aprobacionLider.metodo || 'TMR'}`
          : 'Pendiente de aprobación',
        aprobado: Boolean(datos.aprobacionLider?.aprobado),
      },
      {
        nombre: datos.aprobacionTalentoHumano?.responsable || 'Talento Humano ISC',
        estado: datos.aprobacionTalentoHumano?.aprobado
          ? `Confirmado · ${datos.aprobacionTalentoHumano.fecha || ''}`
          : 'Pendiente de confirmación',
        aprobado: Boolean(datos.aprobacionTalentoHumano?.aprobado),
      },
    ];

    firmasData.forEach((fd, idx) => {
      const cx = marginX + sideW + idx * firmaColW;
      doc.setFillColor(255, 255, 255);
      doc.rect(cx, y + 6, firmaColW, 15, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor(15, 23, 42);
      const nomLines = doc.splitTextToSize(fd.nombre, firmaColW - 3);
      doc.text(nomLines[0], cx + firmaColW / 2, y + 12, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.6);
      if (fd.aprobado) {
        doc.setTextColor(21, 128, 61);
      } else {
        doc.setTextColor(180, 83, 9);
      }
      const estLines = doc.splitTextToSize(fd.estado, firmaColW - 3);
      doc.text(estLines[0], cx + firmaColW / 2, y + 17.5, { align: 'center' });
    });

    y += 24.5;

    // =========================================================================
    // SECCIÓN 8: COMENTARIOS
    // =========================================================================
    y = this.dibujarBarraSeccionAzul(doc, marginX, y, contentWidth, 'COMENTARIOS');
    const comentH = 18;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(51, 65, 85);
    doc.rect(marginX, y, contentWidth, comentH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const comentLines = doc.splitTextToSize(
      datos.comentarios || 'Sin comentarios adicionales.',
      contentWidth - 6,
    );
    doc.text(comentLines.slice(0, 3), marginX + 3, y + 5.2);

    // Pie de página
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Documento oficial generado por ISC Time Report · ${datos.folio || 'SOLICITUD DE PERMISO'}`,
      pageWidth / 2,
      288,
      { align: 'center' },
    );

    const nombreArchivo = `Formulario_Permiso_${(datos.folio || 'ISC').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    doc.save(nombreArchivo);
  }

  private dibujarBarraSeccionAzul(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    titulo: string,
  ): number {
    doc.setFillColor(79, 129, 189);
    doc.setDrawColor(51, 65, 85);
    doc.rect(x, y, width, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, x + width / 2, y + 4.2, { align: 'center' });
    return y + 6;
  }

  private dibujarTituloLogoFallback(doc: jsPDF, centerX: number, y: number): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(22, 53, 114);
    doc.text('INTEGRITY SOLUTIONS (ISC)', centerX, y, { align: 'center' });
  }

  private async obtenerLogoDataUrl(): Promise<string | null> {
    if (this.logoDataUrlCache) return this.logoDataUrlCache;

    try {
      const response = await fetch('assets/img/logo-isc.png');
      if (!response.ok) return null;
      const blob = await response.blob();
      return await new Promise<string | null>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.logoDataUrlCache = typeof reader.result === 'string' ? reader.result : null;
          resolve(this.logoDataUrlCache);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}
