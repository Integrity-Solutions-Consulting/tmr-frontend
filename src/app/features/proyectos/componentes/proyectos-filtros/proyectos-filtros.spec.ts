import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProyectosFiltros } from './proyectos-filtros';

describe('ProyectosFiltros', () => {
  let component: ProyectosFiltros;
  let fixture: ComponentFixture<ProyectosFiltros>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProyectosFiltros],
    }).compileComponents();

    fixture = TestBed.createComponent(ProyectosFiltros);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
