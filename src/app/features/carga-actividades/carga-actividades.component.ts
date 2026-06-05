import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, map, startWith, take, BehaviorSubject, tap, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Actions, ofType } from '@ngrx/effects';
import { Actividad } from '../../core/models/actividad.model';
import { ActividadesActions } from '../../core/state/actividades/actividades.actions';
import { selectActividadesList } from '../../core/state/actividades/actividades.selectors';

@Component({
  selector: 'app-carga-actividades',
  standalone: true,
  imports: [AsyncPipe, DatePipe, ReactiveFormsModule], // 🚀 CORREGIDO: Agregado DatePipe aquí
  templateUrl: './carga-actividades.component.html',
  styleUrls: ['./carga-actividades.component.scss']
})
export class CargaActividadesComponent {
  protected Math = Math;
  private store = inject(Store);
  private actions$ = inject(Actions);
  private http = inject(HttpClient);
  
  searchControl = new FormControl(''); 
  clienteControl = new FormControl('');
  
  // Rango de Mayo de 2026 para tus datos reales
  fechaDesdeControl = new FormControl('2026-05-01');
  fechaHastaControl = new FormControl('2026-05-31');
  
  errorMessage: string = '';
  successMessage: string = '';
  listaErrores: string[] = [];
  cargando: boolean = false;
  
  paginaActual$ = new BehaviorSubject<number>(1);
  itemsPorPagina = 10;

  private actividadesRaw$: Observable<Actividad[]> = this.store.select(selectActividadesList) as Observable<Actividad[]>;

  // 🚀 CORREGIDO: Usamos 'nroHoras' que es la propiedad real en tu TypeScript model
  horasPorRegistrar$: Observable<string> = this.actividadesRaw$.pipe(
    map((actividades: Actividad[]) => {
      const total = actividades.reduce((acc, curr) => acc + (Number(curr.nroHoras) || 0), 0);
      return total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    })
  );

  // 🚀 CORREGIDO: Usamos 'cliente' en minúscula
  clientes$ = this.actividadesRaw$.pipe(
    map((actividades: Actividad[]) => {
      const lista = actividades.map(a => a.cliente || 'SIN CLIENTE');
      return [...new Set(lista)];
    })
  );

  // 🚀 CORREGIDO: Filtros adaptados exactamente a tu interfaz de Angular (colaborador, proyecto, cliente, fecha)
  private aplicarFiltros(actividades: Actividad[], term: string | null, clienteSelected: string | null, desde: string | null, hasta: string | null) {
    let filtrados = actividades;

    if (term) {
      const t = term.toLowerCase();
      filtrados = filtrados.filter(a => 
        (a.colaborador && a.colaborador.toLowerCase().includes(t)) || 
        (a.proyecto && a.proyecto.toLowerCase().includes(t))
      );
    }

    if (clienteSelected) {
      filtrados = filtrados.filter(a => a.cliente === clienteSelected);
    }

    if (desde) {
      filtrados = filtrados.filter(a => {
        if (!a.fecha) return true;
        const fecha = new Date(a.fecha);
        if (Number.isNaN(fecha.getTime())) return true;
        return fecha >= new Date(desde + 'T00:00:00');
      });
    }
    if (hasta) {
      filtrados = filtrados.filter(a => {
        if (!a.fecha) return true;
        const fecha = new Date(a.fecha);
        if (Number.isNaN(fecha.getTime())) return true;
        return fecha <= new Date(hasta + 'T23:59:59');
      });
    }

    return filtrados;
  }

  totalItemsFiltrados$ = combineLatest([
    this.actividadesRaw$,
    this.searchControl.valueChanges.pipe(startWith(''), tap(() => this.paginaActual$.next(1))),
    this.clienteControl.valueChanges.pipe(startWith(''), tap(() => this.paginaActual$.next(1))),
    this.fechaDesdeControl.valueChanges.pipe(startWith('2026-05-01'), tap(() => this.paginaActual$.next(1))),
    this.fechaHastaControl.valueChanges.pipe(startWith('2026-05-31'), tap(() => this.paginaActual$.next(1)))
  ]).pipe(
    map(([actividades, searchTerm, clienteSelected, desde, hasta]) => {
      return this.aplicarFiltros(actividades, searchTerm, clienteSelected, desde, hasta).length;
    })
  );

  actividadesFiltradas$ = combineLatest([
    this.actividadesRaw$,
    this.searchControl.valueChanges.pipe(startWith('')),
    this.clienteControl.valueChanges.pipe(startWith('')),
    this.fechaDesdeControl.valueChanges.pipe(startWith('2026-05-01')),
    this.fechaHastaControl.valueChanges.pipe(startWith('2026-05-31')),
    this.paginaActual$
  ]).pipe(
    map(([actividades, searchTerm, clienteSelected, desde, hasta, pagina]) => {
      const filtrados = this.aplicarFiltros(actividades, searchTerm, clienteSelected, desde, hasta);
      const inicio = (pagina - 1) * this.itemsPorPagina;
      return filtrados.slice(inicio, inicio + this.itemsPorPagina);
    })
  );

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
    if (!['xlsx', 'xls', 'xlm'].includes(ext!)) {
      this.errorMessage = 'Formato no válido. Use .xlsx, .xls o .xlm';
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

  descargarExcel() {
    this.http.get(`${environment.apiUrl}/carga-actividades/download`, {
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Reporte_Actividades_${new Date().toISOString().slice(0,10)}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.errorMessage = 'No se pudo descargar el reporte.';
        console.error(err);
      }
    });
  }

  private formatearFecha(fecha?: string | Date) {
    if (!fecha) return '';
    const valor = new Date(fecha);
    if (Number.isNaN(valor.getTime())) return '';
    return valor.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
