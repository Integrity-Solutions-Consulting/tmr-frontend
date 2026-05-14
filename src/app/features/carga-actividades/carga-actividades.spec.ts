import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargaActividades } from './carga-actividades';

describe('CargaActividades', () => {
  let component: CargaActividades;
  let fixture: ComponentFixture<CargaActividades>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargaActividades],
    }).compileComponents();

    fixture = TestBed.createComponent(CargaActividades);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
