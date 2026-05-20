import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalLider } from './modal-lider';

describe('ModalLider', () => {
  let component: ModalLider;
  let fixture: ComponentFixture<ModalLider>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalLider],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalLider);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
