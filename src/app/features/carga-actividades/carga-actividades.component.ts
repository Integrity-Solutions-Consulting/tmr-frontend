import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PaginacionComponent } from '../../shared/components/paginacion/paginacion.component';
import { BehaviorSubject, combineLatest, firstValueFrom, map, Observable, shareReplay, startWith, take, tap } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { Actividad } from '../../core/models/actividad.model';
import { ActividadesActions } from '../../core/state/actividades/actividades.actions';
import { selectActividadesList } from '../../core/state/actividades/actividades.selectors';
import { ClientesService } from '../clientes/servicios/clientes.service';
import { ColaboradoresService } from '../colaboradores/servicios/colaboradores.service';
import { ProyectosService } from '../proyectos/servicios/proyectos.service';
import { exportarReporteExcel } from '../../shared/utils/reporte-export.utils';

const COLOR_PRIMARIO = 'FF163572';
const COLOR_RECURSO = 'FFFFFFFF';
const COLOR_RECURSO_ALT = 'FFF8FAFC';
const COLOR_TEXTO = 'FF334155';
const COLOR_BORDE = 'FFE2E8F0';

@Component({
  selector: 'app-carga-actividades',
  standalone: true,
  imports: [CommonModule, AsyncPipe, ReactiveFormsModule, PaginacionComponent],
  templateUrl: './carga-actividades.component.html',
  styleUrls: ['./carga-actividades.component.scss']
})
export class CargaActividadesComponent implements OnInit {
  protected Math = Math;
  private store = inject(Store);
  private actions$ = inject(Actions);
  private proyectosService = inject(ProyectosService);
  private clientesService = inject(ClientesService);
  private colaboradoresService = inject(ColaboradoresService);

  searchControl = new FormControl('', { nonNullable: true });
  proyectoControl = new FormControl('', { nonNullable: true });
  fechaDesdeControl = new FormControl('', { nonNullable: true });
  fechaHastaControl = new FormControl('', { nonNullable: true });

  errorMessage: string = '';
  successMessage: string = '';
  listaErrores: string[] = [];
  cargando: boolean = false;

  paginaActual$ = new BehaviorSubject<number>(1);
  itemsPorPagina = 10;

  private proyectosValidos: string[] = [];
  private clientesValidos: string[] = [];
  private colaboradoresValidos: string[] = [];

  // Método para recibir cambios desde el componente de paginación compartido
  paginaCambia(nuevaPagina: number) {
    if (typeof nuevaPagina === 'number' && nuevaPagina >= 1) {
      this.paginaActual$.next(nuevaPagina);
    }
  }

  private actividadesRaw$: Observable<Actividad[]> = this.store.select(selectActividadesList) as Observable<Actividad[]>;

  horasPorRegistrar$: Observable<string> = this.actividadesRaw$.pipe(
    map((actividades: Actividad[]) => {
      const total = actividades.reduce((acc, curr) => acc + (Number(curr.nroHoras) || 0), 0);
      return total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    })
  );

  proyectos$ = this.actividadesRaw$.pipe(
    map((actividades: Actividad[]) => {
      const lista = actividades.map(a => a.proyecto?.trim() || 'SIN PROYECTO');
      return [...new Set(lista)].sort((a, b) => a.localeCompare(b, 'es'));
    })
  );

  private actividadesFiltradasTodas$ = combineLatest([
    this.actividadesRaw$,
    this.cambioFiltro(this.searchControl),
    this.cambioFiltro(this.proyectoControl),
    this.cambioFiltro(this.fechaDesdeControl),
    this.cambioFiltro(this.fechaHastaControl)
  ]).pipe(
    map(([actividades, searchTerm, proyectoSelected, desde, hasta]) => {
      return this.aplicarFiltros(actividades, searchTerm, proyectoSelected, desde, hasta);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  totalItemsFiltrados$ = this.actividadesFiltradasTodas$.pipe(
    map(actividades => actividades.length)
  );

  actividadesFiltradas$ = combineLatest([
    this.actividadesFiltradasTodas$,
    this.paginaActual$
  ]).pipe(
    map(([actividades, pagina]) => {
      const inicio = (pagina - 1) * this.itemsPorPagina;
      return actividades.slice(inicio, inicio + this.itemsPorPagina);
    })
  );

  ngOnInit(): void {
    this.store.dispatch(ActividadesActions.cargarActividades());
  }

  mostrarDetalle = false;
  actividadSeleccionada: Actividad | null = null;

  selectActividad(actividad: Actividad): void {
    this.actividadSeleccionada = actividad;
  }

  verActividad(actividad?: Actividad): void {
    if (actividad) this.actividadSeleccionada = actividad;
    if (!this.actividadSeleccionada) return;
    this.mostrarDetalle = true;
  }

  editarActividad(actividad?: Actividad): void {
    const a = actividad ?? this.actividadSeleccionada;
    if (!a) return;
    console.log('Editar actividad', a);
  }

  eliminarActividad(actividad?: Actividad): void {
    const a = actividad ?? this.actividadSeleccionada;
    if (!a) return;
    console.log('Eliminar actividad', a);
  }

  private cambioFiltro(control: FormControl<string>): Observable<string> {
    return control.valueChanges.pipe(
      startWith(control.value),
      tap(() => this.paginaActual$.next(1))
    );
  }

  private aplicarFiltros(actividades: Actividad[], term: string, proyectoSelected: string, desde: string, hasta: string): Actividad[] {
    let filtrados = actividades;
    const busqueda = term.trim().toLowerCase();
    const proyecto = proyectoSelected.trim();
    const fechaDesde = this.parseFechaLocal(desde);
    const fechaHasta = this.parseFechaLocal(hasta);

    // Buscar en: código (liderTecnico), colaborador, cliente, proyecto
    if (busqueda) {
      filtrados = filtrados.filter(a =>
        (a.liderTecnico && a.liderTecnico.toLowerCase().includes(busqueda)) ||
        (a.colaborador && a.colaborador.toLowerCase().includes(busqueda)) ||
        (a.cliente && a.cliente.toLowerCase().includes(busqueda)) ||
        (a.proyecto && a.proyecto.toLowerCase().includes(busqueda))
      );
    }

    if (proyecto) {
      filtrados = filtrados.filter(a => (a.proyecto?.trim() || 'SIN PROYECTO') === proyecto);
    }

    if (fechaDesde || fechaHasta) {
      filtrados = filtrados.filter(a => {
        const fecha = this.parseFechaLocal(a.fecha);
        if (!fecha) return false;
        if (fechaDesde && fecha < fechaDesde) return false;
        if (fechaHasta && fecha > fechaHasta) return false;
        return true;
      });
    }

    return filtrados;
  }

  paginaSiguiente() {
    this.totalItemsFiltrados$.pipe(take(1)).subscribe(total => {
      const totalPaginas = Math.ceil(total / this.itemsPorPagina);
      if (this.paginaActual$.value < totalPaginas) {
        this.paginaActual$.next(this.paginaActual$.value + 1);
      }
    });
  }

  paginaAnterior() {
    if (this.paginaActual$.value > 1) this.paginaActual$.next(this.paginaActual$.value - 1);
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    this.errorMessage = '';
    this.successMessage = '';
    this.listaErrores = [];

    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'csv'].includes(ext!)) {
      this.errorMessage = 'Formato no válido. Use .xlsx o .csv';
      event.target.value = '';
      return;
    }

    this.cargando = true;

    const erroresValidacion = await this.validarArchivoExcel(file);
    if (erroresValidacion.length > 0) {
      this.cargando = false;
      this.errorMessage = 'No se puede subir el archivo. Corrija los datos inválidos en el Excel.';
      this.listaErrores = erroresValidacion;
      event.target.value = '';
      return;
    }

    // ✅ CORRECCIÓN: escuchar importarExcelSuccess en lugar de cargarActividadesSuccess
    // Así no dependemos del reload posterior y evitamos capturar eventos anteriores
    this.actions$.pipe(
      ofType(
        ActividadesActions.importarExcelSuccess,
        ActividadesActions.importarExcelFailure
      ),
      take(1)
    ).subscribe((action) => {
      this.cargando = false;

      if (action.type === ActividadesActions.importarExcelSuccess.type) {
        this.successMessage = 'Archivo cargado exitosamente';
        this.paginaActual$.next(1);
        return;
      }

      this.errorMessage = (action as any).error;
      this.listaErrores = (action as any).errores || [];
    });

    this.store.dispatch(ActividadesActions.importarExcel({ archivo: file }));
    event.target.value = '';
  }

  private async validarArchivoExcel(archivo: File): Promise<string[]> {
    await this.cargarListasDeValidos();

    const ext = archivo.name.split('.').pop()?.toLowerCase();
    const errores: string[] = [];

    try {
      const ExcelJS = await import('exceljs');
      const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
      const workbook = new Workbook();
      const valoresDeFilas: string[][] = [];

      if (ext === 'csv') {
        const texto = await archivo.text();
        texto.split(/\r?\n/).forEach(line => {
          if (!line.trim()) return;
          valoresDeFilas.push(line.split(',').map(cell => cell.trim()));
        });
      } else {
        const buffer = await archivo.arrayBuffer();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        worksheet.eachRow({ includeEmpty: false }, (row) => {
          const rowValues = Array.isArray(row.values) ? row.values as any[] : [];
          valoresDeFilas.push(rowValues.slice(1).map((value: any) => this.extraerTextoDeCelda(value)));
        });
      }

      if (valoresDeFilas.length === 0) {
        return ['El archivo está vacío o no tiene datos válidos.'];
      }

      const encabezados = valoresDeFilas[0].map(enc => this.normalizarTexto(enc));
      const filas = valoresDeFilas.slice(1);
      const campoProyecto = this.buscarCampo(encabezados, ['proyecto', 'proyectonombre', 'nombreproyecto', 'descripcionactividad']);
      const campoColaborador = this.buscarCampo(encabezados, ['colaborador', 'nombrecolaborador']);
      const campoCliente = this.buscarCampo(encabezados, ['cliente', 'clientenombre', 'nombrecliente']);

      if (campoProyecto < 0) errores.push('No se encontró la columna de proyecto en el archivo.');
      if (campoColaborador < 0) errores.push('No se encontró la columna de colaborador en el archivo.');
      if (campoCliente < 0) errores.push('No se encontró la columna de cliente en el archivo.');

      if (errores.length > 0) return errores;

      filas.forEach((fila, index) => {
        const rowIndex = index + 2;
        const proyecto = this.normalizarTexto(fila[campoProyecto]);
        const colaborador = this.normalizarTexto(fila[campoColaborador]);
        const cliente = this.normalizarTexto(fila[campoCliente]);

        if (!proyecto) {
          errores.push(`Fila ${rowIndex}: proyecto vacío.`);
        } else if (!this.proyectosValidos.includes(proyecto)) {
          errores.push(`Fila ${rowIndex}: proyecto '${fila[campoProyecto] || ''}' no existe en el sistema.`);
        }

        if (!colaborador) {
          errores.push(`Fila ${rowIndex}: colaborador vacío.`);
        } else if (!this.colaboradoresValidos.includes(colaborador)) {
          errores.push(`Fila ${rowIndex}: colaborador '${fila[campoColaborador] || ''}' no existe en el sistema.`);
        }

        if (!cliente) {
          errores.push(`Fila ${rowIndex}: cliente vacío.`);
        } else if (!this.clientesValidos.includes(cliente)) {
          errores.push(`Fila ${rowIndex}: cliente '${fila[campoCliente] || ''}' no existe en el sistema.`);
        }
      });
    } catch (error) {
      console.error('Error al validar el archivo de Excel', error);
      return ['No se pudo validar el archivo. Intente nuevamente con un archivo válido.'];
    }

    return errores;
  }

  private async cargarListasDeValidos(): Promise<void> {
    if (this.proyectosValidos.length && this.clientesValidos.length && this.colaboradoresValidos.length) {
      return;
    }

    try {
      const [proyectos, clientes, colaboradores] = await Promise.all([
        firstValueFrom(this.proyectosService.obtenerProyectos()),
        firstValueFrom(this.proyectosService.obtenerClientes()),
        firstValueFrom(this.colaboradoresService.getColaboradores({ busqueda: '', estado: 'Todos' }, 1, 9999))
      ]);

      this.proyectosValidos = [...new Set(proyectos.map(p => this.normalizarTexto(p.nombre)))].filter(Boolean);
      this.clientesValidos = [...new Set(clientes.map(c => this.normalizarTexto(c.nombre)))].filter(Boolean);
      this.colaboradoresValidos = [...new Set(colaboradores.data.map(c => this.normalizarTexto(c.nombreCompleto)))].filter(Boolean);
    } catch (error) {
      console.error('No se pudo cargar la lista de validaciones para Excel', error);
      this.proyectosValidos = this.proyectosValidos || [];
      this.clientesValidos = this.clientesValidos || [];
      this.colaboradoresValidos = this.colaboradoresValidos || [];
    }
  }

  private buscarCampo(encabezados: string[], candidatos: string[]): number {
    return encabezados.findIndex(enc => candidatos.includes(enc));
  }

  private normalizarTexto(valor: any): string {
    const texto = this.extraerTextoDeCelda(valor).toLowerCase();
    return texto.replace(/\s+/g, ' ').trim();
  }

  private extraerTextoDeCelda(valor: any): string {
    if (valor == null) return '';
    if (typeof valor === 'string') return valor.trim();
    if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor).trim();
    if (typeof valor === 'object' && 'text' in valor) {
      return String((valor as any).text).trim();
    }
    return String(valor).trim();
  }

  descargarExcel(): void {
    this.actividadesFiltradasTodas$.pipe(take(1)).subscribe({
      next: actividades => void this.descargarActividadesExcel(actividades),
      error: error => {
        this.errorMessage = 'No se pudo preparar el reporte.';
        console.error(error);
      }
    });
  }

  private async descargarActividadesExcel(actividades: Actividad[]): Promise<void> {
    try {
      await exportarReporteExcel({
        titulo: 'Reporte de Actividades',
        nombreArchivo: 'Actividades',
        nombreHoja: 'Actividades',
        columnas: [
          { encabezado: 'Fecha', anchoExcel: 15, alineacion: 'center' },
          { encabezado: 'Colaborador', anchoExcel: 36 },
          { encabezado: 'Proyecto', anchoExcel: 42 },
          { encabezado: 'Cliente', anchoExcel: 36 },
          { encabezado: 'Líder técnico', anchoExcel: 30 },
          { encabezado: 'Horas', anchoExcel: 12, alineacion: 'center' },
          { encabezado: 'Estado', anchoExcel: 18, alineacion: 'center' },
        ],
        filas: actividades.map((actividad) => [
          this.formatearFecha(actividad.fecha),
          actividad.colaborador || 'Sin colaborador',
          actividad.proyecto || 'Sin proyecto',
          actividad.cliente || 'Sin cliente',
          actividad.liderTecnico || '-',
          Number(actividad.nroHoras) || 0,
          actividad.estado || 'Pendiente',
        ]),
        orientacionPdf: 'landscape',
      });
      return;

      const ExcelJS = await import('exceljs');
      const Workbook = ExcelJS.Workbook || (ExcelJS as any).default?.Workbook || (ExcelJS as any).default;
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Actividades');

      worksheet.columns = [
        { header: 'Fecha', key: 'fecha', width: 15 },
        { header: 'Colaborador', key: 'colaborador', width: 36 },
        { header: 'Proyecto', key: 'proyecto', width: 42 },
        { header: 'Cliente', key: 'cliente', width: 36 },
        { header: 'Lider Tecnico', key: 'liderTecnico', width: 30 },
        { header: 'Horas', key: 'horas', width: 12 },
        { header: 'Estado', key: 'estado', width: 18 },
      ];

      actividades.forEach(actividad => {
        worksheet.addRow({
          fecha: this.formatearFecha(actividad.fecha),
          colaborador: actividad.colaborador || 'Sin colaborador',
          proyecto: actividad.proyecto || 'Sin proyecto',
          cliente: actividad.cliente || 'Sin cliente',
          liderTecnico: actividad.liderTecnico || '-',
          horas: Number(actividad.nroHoras) || 0,
          estado: actividad.estado || 'Pendiente'
        });
      });

      worksheet.getColumn('horas').numFmt = '#,##0.00';
      this.aplicarEstiloHoja(worksheet, 7);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      this.crearDescarga(blob, `Reporte_Actividades_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      this.errorMessage = 'No se pudo descargar el reporte.';
      console.error(error);
    }
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
          const estado = cell.value?.toString().toLowerCase() ?? '';
          const cargado = estado === 'cargado';
          const error = estado === 'error';
          cell.font = {
            name: 'Segoe UI',
            size: 10,
            bold: true,
            color: { argb: cargado ? 'FF16A34A' : error ? 'FFDC2626' : 'FFB45309' }
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });
  }

  private bordeDelgado(color = COLOR_PRIMARIO): any {
    const borde = { style: 'thin', color: { argb: color } };
    return { top: borde, left: borde, bottom: borde, right: borde };
  }

  private crearDescarga(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  formatearFecha(fecha?: string | Date | null): string {
    const valor = this.parseFechaLocal(fecha);
    if (!valor) return '-';
    const dia = String(valor.getDate()).padStart(2, '0');
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${valor.getFullYear()}`;
  }

  private parseFechaLocal(fecha?: string | Date | null): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) {
      return Number.isNaN(fecha.getTime())
        ? null
        : new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }

    const texto = String(fecha).trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

    const dmy = texto.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

    const valor = new Date(texto);
    return Number.isNaN(valor.getTime())
      ? null
      : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
}
