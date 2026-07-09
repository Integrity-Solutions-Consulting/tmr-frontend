import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardData } from '../modelos/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/dashboard`;

  getDashboardData(rango?: string): Observable<DashboardData> {
    let params = {};
    if (rango) {
      params = { rango };
    }
    return this.http.get<DashboardData>(this.apiUrl, { params });
  }

  getHorasIncompletasProyecto(idProyecto: number, rango?: string): Observable<any[]> {
    let params = {};
    if (rango) {
      params = { rango };
    }
    return this.http.get<any[]>(`${this.apiUrl}/proyectos/${idProyecto}/horas-incompletas`, { params });
  }
}
