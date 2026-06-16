import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, combineLatest, map, Observable, shareReplay, startWith, take, tap } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { Actividad } from '../../core/models/actividad.model';
import { ActividadesActions } from '../../core/state/actividades/actividades.actions';
import { selectActividadesList } from '../../core/state/actividades/actividades.selectors';

const COLOR_PRIMARIO = 'FF163572';
const COLOR_RECURSO = 'FFFFFFFF';
const COLOR_RECURSO_ALT = 'FFF8FAFC';
const COLOR_TEXTO = 'FF334155';
const COLOR_BORDE = 'FFE2E8F0';

@Component({
  selector: 'app-carga-actividades',
  standalone: true,
  imports: [AsyncPipe, ReactiveFormsModule],
  templateUrl: './carga-actividades.component.html',
  styleUrls: ['./carga-actividades.component.scss']
})
export class CargaActividadesComponent {
  protected Math = Math;
  private store = inject(Store);
  private actions$ = inject(Actions);
  
  searchControl = new FormControl('', { nonNullable: true });
  clienteControl = new FormControl('', { nonNullable: true });
  fechaDesdeControl = new FormControl('', { nonNullable: true });
  fechaHastaControl = new FormControl('', { nonNullable: true });
  
  errorMessage: string = '';
  successMessage: string = '';
  listaErrores: string[] = [];
  cargando: boolean = false;
  
  paginaActual$ = new BehaviorSubject<number>(1);
  itemsPorPagina = 10;

  private actividadesRaw$: Observable<Actividad[]> = this.store.select(selectActividadesList) as Observable<Actividad[]>;

  horasPorRegistrar$: Observable<string> = this.actividadesRaw$.pipe(
    map((actividades: Actividad[]) => {
      const total = actividades.reduce((acc, curr) => acc + (Number(curr.nroHoras) || 0), 0);
      return total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    })
  );

  clientes$ = this.actividadesRaw$.pipe(
    map((actividades: Actividad[]) => {
      const lista = actividades.map(a => a.cliente?.trim() || 'SIN CLIENTE');
      return [...new Set(lista)].sort((a, b) => a.localeCompare(b, 'es'));
    })
  );

  private actividadesFiltradasTodas$ = combineLatest([
    this.actividadesRaw$,
    this.cambioFiltro(this.searchControl),
    this.cambioFiltro(this.clienteControl),
    this.cambioFiltro(this.fechaDesdeControl),
    this.cambioFiltro(this.fechaHastaControl)
  ]).pipe(
    map(([actividades, searchTerm, clienteSelected, desde, hasta]) => {
      return this.aplicarFiltros(actividades, searchTerm, clienteSelected, desde, hasta);
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

  private cambioFiltro(control: FormControl<string>): Observable<string> {
    return control.valueChanges.pipe(
      startWith(control.value),
      tap(() => this.paginaActual$.next(1))
    );
  }

  private aplicarFiltros(actividades: Actividad[], term: string, clienteSelected: string, desde: string, hasta: string): Actividad[] {
    let filtrados = actividades;
    const busqueda = term.trim().toLowerCase();
    const cliente = clienteSelected.trim();
    const fechaDesde = this.parseFechaLocal(desde);
    const fechaHasta = this.parseFechaLocal(hasta);

    if (busqueda) {
      filtrados = filtrados.filter(a => 
        (a.colaborador && a.colaborador.toLowerCase().includes(busqueda)) || 
        (a.proyecto && a.proyecto.toLowerCase().includes(busqueda))
      );
    }

    if (cliente) {
      filtrados = filtrados.filter(a => (a.cliente?.trim() || 'SIN CLIENTE') === cliente);
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

  onFileSelected(event: any) {
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

    this.actions$.pipe(
      ofType(
        ActividadesActions.importarExcelSuccess,
        ActividadesActions.importarExcelFailure
      ),
      take(1)
    ).subscribe((action) => {
      this.cargando = false;

      if (action.type === ActividadesActions.importarExcelSuccess.type) {
        const total = action.actividades.length;
        this.successMessage = total > 0
          ? `Planilla procesada con éxito. ${total} registro(s) cargado(s) en la tabla.`
          : 'La planilla se procesó, pero el backend no devolvió registros para mostrar.';
        this.paginaActual$.next(1);
        return;
      }

      this.errorMessage = action.error;
      this.listaErrores = action.errores || [];
    });

    this.store.dispatch(
      ActividadesActions.importarExcel({ archivo: file })
    );

    event.target.value = '';
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
      const { Workbook } = await import('exceljs');
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

    if (iso) {
      return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    }

    const dmy = texto.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);

    if (dmy) {
      return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    }

    const valor = new Date(texto);

    return Number.isNaN(valor.getTime())
      ? null
      : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
}
