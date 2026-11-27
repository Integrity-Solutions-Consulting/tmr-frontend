import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { UsuariosFormModal } from './usuarios-form-modal';
import { ConfiguracionService } from '../../services/configuracion.service';
import { UsuariosService } from '../../services/usuarios.service';
import { DropdownScrollLockService } from '../../../../shared/services/dropdown-scroll-lock.service';

describe('UsuariosFormModal', () => {
  let fixture: ComponentFixture<UsuariosFormModal>;
  let component: UsuariosFormModal;
  const updateUsuario = vi.fn(() => of({}));
  const close = vi.fn();

  beforeEach(async () => {
    updateUsuario.mockClear();
    close.mockClear();

    await TestBed.configureTestingModule({
      imports: [UsuariosFormModal],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            usuario: {
              id: 10,
              idUsuario: 20,
              idPersona: null,
              email: 'jesus@example.com',
              usuario: 'jesus',
              usuarioInterno: false,
              debeCambiarPassword: false,
              rolesids: ['2', '5'],
              estado: 'Activo',
            },
            roles: [
              { id: 2, nombre: 'Administrador', descripcion: '', modulos: [], activo: true },
              { id: 5, nombre: 'Lider General', descripcion: '', modulos: [], activo: true },
              { id: 8, nombre: 'Otro rol', descripcion: '', modulos: [], activo: true },
            ],
            nextId: 11,
          },
        },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: ConfiguracionService,
          useValue: {
            usuariosTotales: signal([]),
            toUpdateUsuarioPayload: (usuario: { idPersona: number | null; rolesids: string[]; email: string; usuario: string; usuarioInterno: boolean; debeCambiarPassword: boolean }) => ({
              idPersona: usuario.usuarioInterno ? usuario.idPersona : null,
              rolesids: usuario.rolesids.map(Number),
              email: usuario.email,
              nombreusuario: usuario.usuario,
              debeCambiarPassword: usuario.debeCambiarPassword,
            }),
            updateUsuario,
          },
        },
        {
          provide: UsuariosService,
          useValue: {
            listarColaboradores: () => of([]),
            crearUsuario: () => of({}),
          },
        },
        { provide: DropdownScrollLockService, useValue: { lock: vi.fn(), unlock: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga y conserva todos los roles existentes al editar', () => {
    expect(component.form.controls.rolesids.value).toEqual([2, 5]);
  });

  it('envía la lista completa de roles al agregar Lider General', () => {
    component.form.controls.rolesids.setValue([2, 5, 8]);
    component.save();

    expect(updateUsuario).toHaveBeenCalledWith(20, expect.objectContaining({ rolesids: [2, 5, 8] }));
    expect(close).toHaveBeenCalledWith('actualizado');
  });
});
