import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Lo que devuelve el backend para cada opción de dropdown.
export interface CatalogoItem {
  id: number;
  valor: string;
}

// Lo que devuelve el backend para los cargos.
export interface CargoItem {
  id: number;
  nombreCargo: string;
}

// Lo que devuelve el backend para la tabla de empleados.
export interface EmpleadoItem {
  id: number;
  nombres: string;
  apellidos: string;
  cargo?: string;
}

// Lo que devuelve el backend para las personas del ComboBox.
export interface PersonaItem {
  id: number;
  nombres: string;
  apellidos: string;
  numeroIdentificacion: string;
  fechaNacimiento: string | null;
  idGenero: number | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogosService {

  private http = inject(HttpClient);

  // URL base del módulo colaboradores en el backend.
  private readonly apiUrl = `${environment.apiUrl}/colaboradores`;

  // URL base del módulo administración en el backend.
  private readonly administracionApiUrl = `${environment.apiUrl}/administracion`;

  // Configuración para enviar cookies al backend.
  private readonly httpOptions = {
    withCredentials: true
  };
  private readonly cache = new Map<string, { expiresAt: number; request$: Observable<unknown> }>();
  private readonly cacheTtlMs = 5 * 60 * 1000;

  private getCached<T>(key: string, factory: () => Observable<T>): Observable<T> {
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > now) return cached.request$ as Observable<T>;

    const request$ = factory().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    this.cache.set(key, { expiresAt: now + this.cacheTtlMs, request$ });
    return request$;
  }

  // ── Catálogos genéricos para dropdowns ──
  // Códigos posibles: GEN, DEP, MDT, CAT, EMP, TCT
  getCatalogo(codigo: string): Observable<CatalogoItem[]> {
    return this.getCached(`catalogo:${codigo}`, () =>
      this.http.get<CatalogoItem[]>(`${this.apiUrl}/catalogos/${codigo}`, this.httpOptions)
    );
  }

  // ── Cargos filtrados por departamento ──
  getCargosPorDepartamento(idDepartamento: number): Observable<CargoItem[]> {
    return this.getCached(`cargos:${idDepartamento}`, () =>
      this.http.get<CargoItem[]>(`${this.apiUrl}/cargos?idDepartamento=${idDepartamento}`, this.httpOptions)
    );
  }


  // ── Empleados para el ComboBox de recursos del proyecto ──
  // Debe leer de la tabla administracion.tbl_administracion_empleado.
  getEmpleados(): Observable<EmpleadoItem[]> {
    return this.getCached('empleados', () =>
      this.http.get<EmpleadoItem[]>(`${this.administracionApiUrl}/empleados`, this.httpOptions)
    );
  }

  // ── Cargos desde la tabla administracion.tbl_administracion_cargo.
  getCargos(): Observable<CargoItem[]> {
    return this.getCached('cargos', () =>
      this.http.get<CargoItem[]>(`${this.administracionApiUrl}/cargos`, this.httpOptions)
    );
  }
}
