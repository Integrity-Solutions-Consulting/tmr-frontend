import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardData } from '../modelos/dashboard.model';
import { environment } from '../../../../environments/environment';

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
}
