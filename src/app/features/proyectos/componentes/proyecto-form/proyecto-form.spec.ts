import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProyectoFormComponent } from './proyecto-form';

describe('ProyectoFormComponent', () => {
  let component: ProyectoFormComponent;
  let fixture: ComponentFixture<ProyectoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProyectoFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProyectoFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
