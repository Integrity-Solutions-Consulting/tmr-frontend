import '@angular/compiler';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { environment } from '../../../environments/environment';
import { ProveedoresService } from './proveedores.service';

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

describe('ProveedoresService', () => {
  let service: ProveedoresService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProveedoresService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProveedoresService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('centraliza y normaliza los parámetros de listado', () => {
    service
      .listar({
        pagina: 2,
        tamanoPagina: 10,
        busqueda: '  Acme  ',
        tipoProveedorId: '7',
        estado: ['true'],
        ordenarPor: 'tipoProveedor',
        ascendente: false,
      })
      .subscribe();

    const request = http.expectOne((req) => req.url === `${environment.apiUrl}/proveedores`);
    expect(request.request.params.get('pagina')).toBe('2');
    expect(request.request.params.get('busqueda')).toBe('Acme');
    expect(request.request.params.get('tipoProveedorId')).toBe('7');
    expect(request.request.params.get('activo')).toBe('true');
    expect(request.request.params.get('ordenarPor')).toBe('tipo');
    expect(request.request.params.get('ascendente')).toBe('false');
    request.flush({ items: [], total: 0, pagina: 2, tamanoPagina: 10 });
  });

  it('comparte el catálogo de tipos entre pestañas y consumidores', () => {
    const recibidos: unknown[] = [];
    service.obtenerTipos().subscribe((tipos) => recibidos.push(tipos));
    service.obtenerTipos().subscribe((tipos) => recibidos.push(tipos));

    const request = http.expectOne(`${environment.apiUrl}/proveedores/tipos`);
    request.flush([{ id: 1, nombre: 'Servicios' }]);

    expect(recibidos).toEqual([[{ id: 1, nombre: 'Servicios' }], [{ id: 1, nombre: 'Servicios' }]]);
  });
});
