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
  const dialog = { open: vi.fn(() => ({ afterClosed: () => ({ subscribe: vi.fn() }) })) };
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
    await component.agregar();
    expect(dialog.open).toHaveBeenCalled();
    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      data: { fecha, registroLider: undefined },
    }));
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

  it('limita la edición del líder al proyecto autorizado', () => {
    component.data.editable = true;
    component.data.registroLider = { idEmpleado: 7, nombreColaborador: 'Colaborador', proyecto: { id: 1, nombre: 'Proyecto' } };
    expect(component.puedeEditar({ idproyecto: 1 })).toBe(true);
    expect(component.puedeEditar({ idproyecto: 2 })).toBe(false);
    expect(component.puedeEditar({ idproyecto: null })).toBe(false);
  });

  it('permite al líder general editar la actividad del proyecto de la fila', () => {
    component.data.editable = true;
    component.data.registroLider = {
      idEmpleado: 7,
      nombreColaborador: 'Colaborador',
      proyecto: { id: 1, nombre: 'Proyecto' },
      esGlobal: true
    };
    expect(component.puedeEditar({ idproyecto: 1 })).toBe(true);
    expect(component.puedeEditar({ idproyecto: 2 })).toBe(false);
  });

  it('mantiene solo lectura para un usuario sin permiso de gestión', () => {
    component.data.editable = false;
    component.data.registroLider = undefined;
    expect(component.puedeEditar({ idproyecto: 1 })).toBe(false);
  });
});
