import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeriadosService {
  private feriados: Date[] = [
    new Date(2026, 0, 1),   // Año Nuevo
    new Date(2026, 1, 16),  // Carnaval
    new Date(2026, 1, 17),  // Carnaval
    new Date(2026, 4, 1),   // Día del Trabajo
    new Date(2026, 4, 25),  // Batalla del Pichincha (trasladado)
    new Date(2026, 7, 10),  // Primer Grito de Independencia
    new Date(2026, 9, 9),   // Independencia de Guayaquil
    new Date(2026, 10, 2),  // Día de los Difuntos
    new Date(2026, 10, 3),  // Independencia de Cuenca
    new Date(2026, 11, 25), // Navidad
  ];

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
