import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tabla } from './tabla';

describe('Tabla', () => {
  let component: Tabla;
  let fixture: ComponentFixture<Tabla>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tabla],
    }).compileComponents();

    fixture = TestBed.createComponent(Tabla);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
