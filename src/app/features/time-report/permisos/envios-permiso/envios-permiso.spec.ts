import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, Subject, throwError } from 'rxjs';
import { EnviosPermisoComponent } from './envios-permiso';
import { PermisosApiService } from '../permisos-api.service';

afterEach(() => TestBed.resetTestingModule());
const historial = { success: true, data: { envios: [], campana: [] } };
let api: { obtenerEnvios: ReturnType<typeof vi.fn>; reintentarEnvio: ReturnType<typeof vi.fn> };
beforeEach(() => {
  api = { obtenerEnvios: vi.fn(() => of(historial)), reintentarEnvio: vi.fn(() => of({})) };
  TestBed.configureTestingModule({ providers: [{ provide: PermisosApiService, useValue: api }] });
});
function crear() {
  const fixture = TestBed.createComponent(EnviosPermisoComponent);
  fixture.componentRef.setInput('solicitudId', 1);
  fixture.detectChanges();
  return fixture;
}
describe('Notificaciones de solicitud', () => {
  it('no consulta envíos hasta abrir el detalle', () => {
    const f = crear();
    expect(api.obtenerEnvios).not.toHaveBeenCalled();
    f.componentInstance.alAbrir({ target: { open: true } } as unknown as Event);
    expect(api.obtenerEnvios).toHaveBeenCalledWith(1);
  });
  it('evita dos peticiones de reintento mientras la primera está pendiente', () => {
    const pending = new Subject();
    api.reintentarEnvio.mockReturnValue(pending);
    const c = crear().componentInstance;
    c.reintentar('envio'); c.reintentar('envio');
    expect(api.reintentarEnvio).toHaveBeenCalledTimes(1);
    pending.next({});
    expect(c.reintentando()).toBeNull();
    expect(c.mensaje()).toContain('pendiente');
  });
  it('presenta el error y permite recuperar un reintento fallido', () => {
    api.reintentarEnvio.mockReturnValue(throwError(() => ({ status: 409, error: { message: 'El aviso ya no está vigente.' } })));
    const c = crear().componentInstance;
    c.reintentar('envio');
    expect(c.reintentando()).toBeNull();
    expect(c.error()).toContain('vigente');
  });
  it('descarta respuestas de otra solicitud al cambiar de detalle', () => {
    const pending = new Subject();
    api.obtenerEnvios.mockReturnValue(pending);
    const f = crear();
    f.componentInstance.cargar();
    f.componentRef.setInput('solicitudId', 2); f.detectChanges();
    pending.next({ success: true, data: { envios: [{ id: 'anterior' }], campana: [] } });
    expect(f.componentInstance.historial()).toBeNull();
  });
});
