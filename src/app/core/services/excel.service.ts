// excel.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  private http = inject(HttpClient);
  
  // CORRECCIÓN: Quitamos el '/excel' del final para que coincida con tu mapeo de .NET
  private apiUrl = 'http://localhost:5071/api/carga-actividades/excel';

  leerExcel(archivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', archivo, archivo.name);

    return this.http.post<any>(this.apiUrl, formData);
  }
}