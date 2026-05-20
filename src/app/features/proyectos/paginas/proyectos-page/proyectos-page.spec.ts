import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProyectosPage } from './proyectos-page';

describe('ProyectosPage', () => {
  let component: ProyectosPage;
  let fixture: ComponentFixture<ProyectosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProyectosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProyectosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
