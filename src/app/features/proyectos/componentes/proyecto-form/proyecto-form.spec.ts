import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProyectoForm } from './proyecto-form';

describe('ProyectoForm', () => {
  let component: ProyectoForm;
  let fixture: ComponentFixture<ProyectoForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProyectoForm],
    }).compileComponents();

    fixture = TestBed.createComponent(ProyectoForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
