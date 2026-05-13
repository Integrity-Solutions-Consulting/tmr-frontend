import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BadgeEstado } from './badge-estado';

describe('BadgeEstado', () => {
  let component: BadgeEstado;
  let fixture: ComponentFixture<BadgeEstado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BadgeEstado],
    }).compileComponents();

    fixture = TestBed.createComponent(BadgeEstado);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
