import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

interface FechaMinimaResponse {
  fechaMinima: string | null;
}

// sm - Fecha mínima real con datos (actividades), para que los filtros por fecha (Seguimiento, Carga de
// Actividades, Reportes) no dejen elegir un rango donde se sabe que no hay nada registrado.
@Injectable({ providedIn: 'root' })
export class FechaLimitesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/time-report/actividades/fecha-minima`;

  // sm - Una sola consulta por sesión: se comparte entre las 3 pantallas en vez de pedirla cada vez.
  private fechaMinimaActividades$?: Observable<string | null>;

  obtenerFechaMinimaActividades(): Observable<string | null> {
    if (!this.fechaMinimaActividades$) {
      this.fechaMinimaActividades$ = this.http
        .get<FechaMinimaResponse>(this.apiUrl)
        .pipe(
          map(r => r.fechaMinima),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this.fechaMinimaActividades$;
  }
}
