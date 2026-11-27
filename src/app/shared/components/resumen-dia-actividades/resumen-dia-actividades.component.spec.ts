import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { ResumenDiaActividadesComponent } from './resumen-dia-actividades.component';
import { ActividadesService } from '../../services/actividades.service';

describe('ResumenDiaActividadesComponent', () => {
  let component: ResumenDiaActividadesComponent;
  let fixture: ComponentFixture<ResumenDiaActividadesComponent>;
  const fecha = new Date(2026, 0, 15);
  const actividades = signal<any[]>([]);
  const dialog = { open: vi.fn() };
  let filtro: string[];

  beforeEach(async () => {
    actividades.set([]);
    filtro = [];
    dialog.open.mockClear();
    await TestBed.configureTestingModule({
      imports: [ResumenDiaActividadesComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { fecha, editable: false } },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        { provide: MatDialog, useValue: dialog },
        { provide: ActividadesService, useValue: {
          actividades,
          getActividadesVisiblesPorFecha: () => actividades().filter(a => !filtro.length || filtro.includes(String(a.idproyecto)))
        } }
      ]
    }).overrideComponent(ResumenDiaActividadesComponent, {
      set: { providers: [{ provide: MatDialog, useValue: dialog }] }
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenDiaActividadesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra un resumen vacío en modo solo lectura para un día sin actividades', () => {
    expect(component.actividades).toHaveLength(0);
    expect(component.totalHoras).toBe(0);
    expect(component.data.editable).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Sin actividades registradas');
    expect(fixture.nativeElement.textContent).not.toContain('Agregar actividad');
    component.agregar();
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('permite crear en un día vacío y pasa la fecha al formulario existente', async () => {
    component.data.editable = true;
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.resumen-dia__agregar').click();
    await vi.waitFor(() => expect(dialog.open).toHaveBeenCalled());
    expect(dialog.open.mock.calls[0][1].data).toEqual({ fecha });
    expect(component.actividades).toHaveLength(0);
  });

  it('mantiene el resumen filtrado y recalcula las horas al actualizar las actividades', () => {
    component.data.editable = true;
    filtro = ['1'];
    actividades.set([{ idproyecto: 1, cantidadhoras: 2 }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.resumen-dia__agregar')).not.toBeNull();
    actividades.set([{ idproyecto: 1, cantidadhoras: 2 }, { idproyecto: 2, cantidadhoras: 3 }, { idproyecto: 1, cantidadhoras: 4 }]);
    fixture.detectChanges();
    expect(component.actividades).toHaveLength(2);
    expect(component.totalHoras).toBe(6);
  });
});
