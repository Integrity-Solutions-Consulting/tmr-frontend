import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModalCrearColaboradorComponent } from './modal-crear-colaborador.component';
import { CatalogosService } from '../../servicios/catalogos.service';
import { ColaboradoresService } from '../../servicios/colaboradores.service';

describe('ModalCrearColaboradorComponent - correos', () => {
  let fixture: ComponentFixture<ModalCrearColaboradorComponent>;
  let component: ModalCrearColaboradorComponent;

  const correosValidos = () =>
    component.form.get('correoElectronico')!.valid && component.form.get('emailCorporativo')!.valid;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModalCrearColaboradorComponent],
      providers: [
        {
          provide: CatalogosService,
          useValue: {
            getCatalogo: () => of([]),
            getCargosPorDepartamento: () => of([]),
          },
        },
        {
          provide: ColaboradoresService,
          useValue: { getColaboradores: () => of({ data: [] }) },
        },
      ],
    });

    fixture = TestBed.createComponent(ModalCrearColaboradorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('no acepta ambos correos vacíos', () => {
    expect(correosValidos()).toBe(false);
    expect(component.mensajeErrorTexto('correoElectronico')).toContain('al menos un correo');
  });

  it('acepta solo el correo personal', () => {
    component.form.get('correoElectronico')?.setValue('ana@gmail.com');

    expect(correosValidos()).toBe(true);
  });

  it('acepta solo el correo institucional', () => {
    component.form.get('emailCorporativo')?.setValue('ana@integritysolutions.com.ec');

    expect(correosValidos()).toBe(true);
  });

  it('vuelve a exigir un correo si se borra el único que había', () => {
    component.form.get('emailCorporativo')?.setValue('ana@integritysolutions.com.ec');
    component.form.get('emailCorporativo')?.setValue('');

    expect(correosValidos()).toBe(false);
  });

  it('mantiene las reglas de dominio de cada campo', () => {
    component.form.get('emailCorporativo')?.setValue('ana@gmail.com');
    component.form.get('correoElectronico')?.setValue('ana@integritysolutions.com.ec');

    expect(component.form.get('emailCorporativo')?.errors?.['correoNoInstitucional']).toBe(true);
    expect(component.form.get('correoElectronico')?.errors?.['correoEsInstitucional']).toBe(true);
  });
});
