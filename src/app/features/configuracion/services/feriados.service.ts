import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Feriado, FeriadoCreate } from '../models/roles-feriados.models';

import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FeriadosService {
  private base = `${environment.apiUrl}/configuracion/dias-festivos`;

  constructor(private http: HttpClient) {}

  getFeriados(): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(this.base);
  }

  getFeriado(id: number): Observable<Feriado> {
    return this.http.get<Feriado>(`${this.base}/${id}`);
  }

  createFeriado(payload: FeriadoCreate): Observable<Feriado> {
    return this.http.post<Feriado>(this.base, payload);
  }

  updateFeriado(id: number, payload: FeriadoCreate & { activo?: boolean }): Observable<Feriado> {
    return this.http.put<Feriado>(`${this.base}/${id}`, payload);
  }

  deleteFeriado(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
