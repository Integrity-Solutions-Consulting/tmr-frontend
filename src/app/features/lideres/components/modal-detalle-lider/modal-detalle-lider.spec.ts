import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDetalleLider } from './modal-detalle-lider';

describe('ModalDetalleLider', () => {
  let component: ModalDetalleLider;
  let fixture: ComponentFixture<ModalDetalleLider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDetalleLider],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDetalleLider);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
