import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalDescargaComponent } from './modal-descarga.component';

describe('ModalDescargaComponent', () => {
  let component: ModalDescargaComponent;
  let fixture: ComponentFixture<ModalDescargaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDescargaComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ModalDescargaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
