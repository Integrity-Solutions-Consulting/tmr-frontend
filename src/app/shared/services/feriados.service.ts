import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FeriadosService {
  private http = inject(HttpClient);
  private feriados: Date[] = [];

  constructor() {
    this.http.get<any[]>(`${environment.apiUrl}/configuracion/dias-festivos`).subscribe({
      next: (data) => {
        this.feriados = (data ?? [])
          .map(d => {
            const fechaStr = d.fechaFeriado || d.fecha;
            return fechaStr ? new Date(fechaStr + 'T00:00:00') : null;
          })
          .filter((date): date is Date => date !== null && !isNaN(date.getTime()));
      },
      error: (err) => console.error('Error loading feriados', err)
    });
  }

  esFeriado(fecha: Date): boolean {
    return this.feriados.some(f => 
      f.getDate() === fecha.getDate() && 
      f.getMonth() === fecha.getMonth() && 
      f.getFullYear() === fecha.getFullYear()
    );
  }

  getFeriados(): Date[] {
    return this.feriados;
  }
}
