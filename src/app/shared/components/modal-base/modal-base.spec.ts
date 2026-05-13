import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalBase } from './modal-base';

describe('ModalBase', () => {
  let component: ModalBase;
  let fixture: ComponentFixture<ModalBase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalBase],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalBase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
