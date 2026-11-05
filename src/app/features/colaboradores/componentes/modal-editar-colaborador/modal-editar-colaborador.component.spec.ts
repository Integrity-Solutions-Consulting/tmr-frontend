import { ComponentFixture, TestBed } from '@angular/core/testing';
import { delay, of } from 'rxjs';
import { vi } from 'vitest';
import { ModalEditarColaboradorComponent } from './modal-editar-colaborador.component';
import { CatalogosService } from '../../servicios/catalogos.service';
import { ColaboradoresService } from '../../servicios/colaboradores.service';

const CATALOGOS: Record<string, { id: number; valor: string }[]> = {
  EMP: [{ id: 1, valor: 'ISC' }],
  TCT: [{ id: 2, valor: 'Fijo' }],
  TID: [{ id: 3, valor: 'Cédula' }],
  GEN: [],
  NAC: [],
  MDT: [],
  CAT: [],
  DEP: [{ id: 4, valor: 'Sistemas' }],
};

const COLABORADOR_BASE = {
  id: '10',
  tipoPersona: 'NATURAL',
  idTipoIdentificacion: 3,
  identificacion: '0912345678',
  nombres: 'Ana',
  apellidos: 'Pérez',
  idEmpresaCatalogo: 1,
  idTipoContrato: 2,
  estado: 'Activo',
  departamento: 'Sistemas',
  cargo: 'Analista',
  fechaContratacion: '2026-01-15',
  aniosExperiencia: 2,
};

describe('ModalEditarColaboradorComponent - correos', () => {
  let fixture: ComponentFixture<ModalEditarColaboradorComponent>;
  let component: ModalEditarColaboradorComponent;
  let emitido: any;

  // Los catálogos llegan después de crear la vista, igual que por HTTP en la app real.
  async function abrir(correos: { correoElectronico?: string; emailCorporativo?: string }): Promise<void> {
    fixture = TestBed.createComponent(ModalEditarColaboradorComponent);
    component = fixture.componentInstance;
    component.colaborador = { ...COLABORADOR_BASE, ...correos } as any;
    emitido = undefined;
    component.guardar.subscribe(valor => (emitido = valor));
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 20));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ModalEditarColaboradorComponent],
      providers: [
        {
          provide: CatalogosService,
          useValue: {
            getCatalogo: (codigo: string) => of(CATALOGOS[codigo] ?? []).pipe(delay(1)),
            getCargosPorDepartamento: () => of([{ id: 5, nombreCargo: 'Analista' }]).pipe(delay(1)),
          },
        },
        {
          provide: ColaboradoresService,
          useValue: { getColaboradores: () => of({ data: [] }) },
        },
      ],
    });
  });

  it('guarda a un colaborador que solo tiene correo institucional', async () => {
    await abrir({ correoElectronico: '', emailCorporativo: 'ana@integritysolutions.com.ec' });

    component.onGuardar();

    expect(component.form.get('correoElectronico')?.errors).toBeNull();
    expect(emitido?.emailCorporativo).toBe('ana@integritysolutions.com.ec');
  });

  it('guarda a un colaborador con ambos correos', async () => {
    await abrir({ correoElectronico: 'ana@gmail.com', emailCorporativo: 'ana@integritysolutions.com.ec' });

    component.onGuardar();

    expect(emitido?.email).toBe('ana@gmail.com');
    expect(emitido?.emailCorporativo).toBe('ana@integritysolutions.com.ec');
  });

  // TEMPORAL-CONTRATO: eliminar esta prueba al revertir.
  it('guarda a un colaborador sin tipo de contrato', async () => {
    await abrir({ correoElectronico: 'ana@gmail.com' });
    component.form.get('idTipoContrato')?.setValue(null);

    component.onGuardar();

    expect(emitido?.idTipoContrato).toBeNull();
    expect(emitido?.email).toBe('ana@gmail.com');
  });

  it('no guarda sin ningún correo y lleva al error', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await abrir({ correoElectronico: '', emailCorporativo: '' });

    component.onGuardar();
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve));

    expect(emitido).toBeUndefined();
    expect(fixture.nativeElement.querySelector('.form-field__error')?.textContent).toContain('al menos un correo');
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('al llenar el institucional deja de exigir el personal', async () => {
    await abrir({ correoElectronico: '', emailCorporativo: '' });

    component.form.get('emailCorporativo')?.setValue('ana@integritysolutions.com.ec');
    component.onGuardar();

    expect(emitido?.emailCorporativo).toBe('ana@integritysolutions.com.ec');
  });
});
