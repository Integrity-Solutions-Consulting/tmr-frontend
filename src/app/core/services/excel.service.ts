import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/carga-actividades`;

  // GET: trae todas las actividades guardadas en BD
  obtenerActividades(): Observable<any> {
    return this.http.get<any>(this.baseUrl);
  }

  // POST: sube el Excel al backend para procesarlo y guardarlo en BD
  leerExcel(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', archivo, archivo.name);
    return this.http.post<any>(`${this.baseUrl}/excel`, formData);
  }
}