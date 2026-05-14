import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { 
  combineLatest, 
  map, 
  startWith, 
  take, 
  BehaviorSubject, 
  tap,
  Observable 
} from 'rxjs';
import * as ActividadesActions from '../../core/state/actividades/actividades.actions';
import { selectActividadesList } from '../../core/state/actividades/actividades.selectors';

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
  
  searchControl = new FormControl(''); 
  clienteControl = new FormControl('');
  errorMessage: string = '';
  
  paginaActual$ = new BehaviorSubject<number>(1);
  itemsPorPagina = 10;

  private actividadesRaw$ = this.store.select(selectActividadesList);

  horasPorRegistrar$: Observable<string> = this.actividadesRaw$.pipe(
    map(actividades => {
      const total = actividades.reduce((acc, curr) => acc + (Number(curr.nroHoras) || 0), 0);
      return total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    })
  );

  clientes$ = this.actividadesRaw$.pipe(
    map(actividades => [...new Set(actividades.map(a => a.cliente))])
  );

  totalItemsFiltrados$ = combineLatest([
    this.actividadesRaw$,
    this.searchControl.valueChanges.pipe(startWith(''), tap(() => this.paginaActual$.next(1))),
    this.clienteControl.valueChanges.pipe(startWith(''), tap(() => this.paginaActual$.next(1)))
  ]).pipe(
    map(([actividades, searchTerm, clienteSelected]) => {
      let filtrados = actividades;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtrados = filtrados.filter(a => 
          a.colaborador.toLowerCase().includes(term) || a.proyecto.toLowerCase().includes(term)
        );
      }
      if (clienteSelected) filtrados = filtrados.filter(a => a.cliente === clienteSelected);
      return filtrados.length;
    })
  );

  actividadesFiltradas$ = combineLatest([
    this.actividadesRaw$,
    this.searchControl.valueChanges.pipe(startWith('')),
    this.clienteControl.valueChanges.pipe(startWith('')),
    this.paginaActual$
  ]).pipe(
    map(([actividades, searchTerm, clienteSelected, pagina]) => {
      let filtrados = actividades;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtrados = filtrados.filter(a => 
          a.colaborador.toLowerCase().includes(term) || a.proyecto.toLowerCase().includes(term)
        );
      }
      if (clienteSelected) filtrados = filtrados.filter(a => a.cliente === clienteSelected);
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
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'xlm'].includes(ext!)) {
      this.errorMessage = 'Formato no válido. Use .xlsx, .xls o .xlm';
      return;
    }
    this.store.dispatch(ActividadesActions.ActividadesActions.importarExcel({ archivo: file }));
    event.target.value = '';
    this.paginaActual$.next(1);
  }

  descargarExcel() {
    this.actividadesRaw$.pipe(take(1)).subscribe(actividades => {
      const ws = XLSX.utils.json_to_sheet(actividades);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Datos');
      XLSX.writeFile(wb, 'Reporte_Actividades.xlsx');
    });
  }
}