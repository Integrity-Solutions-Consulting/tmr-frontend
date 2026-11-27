import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargaActividadesComponent } from './carga-actividades.component';

describe('CargaActividadesComponent', () => {
  let component: CargaActividadesComponent;
  let fixture: ComponentFixture<CargaActividadesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargaActividadesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CargaActividadesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
