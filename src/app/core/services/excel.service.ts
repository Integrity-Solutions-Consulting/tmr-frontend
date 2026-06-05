// excel.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/carga-actividades/excel`;

  leerExcel(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', archivo, archivo.name);

    return this.http.post<any>(this.apiUrl, formData);
  }
}
