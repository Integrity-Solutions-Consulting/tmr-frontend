import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, HostListener, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { coincideBusqueda } from '../../../../shared/utils/texto.utils';
import { ModalScrollLockService } from '../../../../shared/services/modal-scroll-lock.service';
import { DropdownScrollLockService } from '../../../../shared/services/dropdown-scroll-lock.service';

interface TipoLider {
  id: number;
  valor: string;
}

interface PersonaDisponible {
  id: number;
  idPersona: number;
  nombreCompleto: string;
  email: string;
  telefono: string;
  activo: boolean;
}

@Component({
  selector: 'app-modal-lider',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, ScrollingModule],
  templateUrl: './modal-lider.html',
  styleUrl: './modal-lider.scss'
})
export class ModalLider implements OnInit, OnChanges, OnDestroy {
  @Input() mostrarFormulario = false;
  @Input() modoEdicion = false;
  @Input() lider: any | null = null;
  @Input() guardando = false;
  @Input() error: string | null = null;
  @Output() cerrarModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<any>();

  enviado = false;
  dropdownAbierto: string | null = null;
  nombresInvalido = false;
  apellidosInvalido = false;

  tiposLideres: TipoLider[] = [];
  personasDisponibles: PersonaDisponible[] = [];
  busquedaPersona = '';
  personasFiltradas: PersonaDisponible[] = [];

  form = {
    tipoId: '' as any,
    tipoNombre: '',
    personaId: '',
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    estado: 'Activo'
  };

  private estabaAbierto = false;

  constructor(
    private http: HttpClient,
    private scrollLock: ModalScrollLockService,
    private dropdownScrollLock: DropdownScrollLockService,
  ) {}

  ngOnInit() {
    this.loadTiposLideres();
    this.loadPersonasDisponibles();
    this.syncFormWithLider();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lider'] || changes['modoEdicion']) {
      this.syncFormWithLider();
    }

    if (changes['mostrarFormulario']) {
      if (this.mostrarFormulario && !this.estabaAbierto) {
        this.scrollLock.lock();
        this.estabaAbierto = true;
      } else if (!this.mostrarFormulario && this.estabaAbierto) {
        this.scrollLock.unlock();
        this.estabaAbierto = false;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.estabaAbierto) {
      this.scrollLock.unlock();
      this.estabaAbierto = false;
    }
    if (this.dropdownAbierto !== null) {
      this.dropdownScrollLock.unlock();
      this.dropdownAbierto = null;
    }
  }

  private syncFormWithLider(): void {
    if (this.modoEdicion && this.lider) {
      this.form = {
        tipoId: this.tiposLideres.find(t => t.valor === this.lider.tipo)?.id?.toString() || '',
        tipoNombre: this.lider.tipo || '',
        personaId: this.lider.idPersona?.toString() || '',
        identificacion: this.lider.numeroIdentificacion || '',
        nombres: this.lider.nombres || '',
        apellidos: this.lider.apellidos || '',
        correo: this.lider.correo || this.lider.email || '',
        telefono: this.lider.telefono || '',
        estado: this.lider.estado || 'Activo'
      };
    } else {
      this.form = {
        tipoId: '' as any,
        tipoNombre: '',
        personaId: '',
        identificacion: '',
        nombres: '',
        apellidos: '',
        correo: '',
        telefono: '',
        estado: 'Activo'
      };
    }
  }

  private loadTiposLideres(): void {
    this.http.get<TipoLider[]>(`${environment.apiUrl}/lideres/tipos`)
      .subscribe({
        next: (tipos) => {
          this.tiposLideres = tipos ?? [];
          if (this.modoEdicion && this.lider) {
            this.syncFormWithLider();
          }
        },
        error: (error) => console.error('Error al obtener tipos de líderes:', error)
      });
  }

  private loadPersonasDisponibles(): void {
    this.http.get<PersonaDisponible[]>(`${environment.apiUrl}/colaboradores`)
      .subscribe({
        next: (colaboradores) => {
          this.personasDisponibles = colaboradores ?? [];
          this.personasFiltradas = [...this.personasDisponibles];
          if (this.modoEdicion && this.lider) {
            this.syncFormWithLider();
          }
        },
        error: (error) => console.error('Error al obtener colaboradores:', error)
      });
  }

  @HostListener('document:click')
  onClickFuera() {
    this.cerrarDropdown();
  }

  toggleDropdown(nombre: string, event: Event) {
    event.stopPropagation();
    if (this.dropdownAbierto === nombre) {
      this.cerrarDropdown();
      return;
    }
    if (this.dropdownAbierto === null) {
      this.dropdownScrollLock.lock();
    }
    this.dropdownAbierto = nombre;
    if (nombre === 'persona') {
      this.busquedaPersona = '';
      this.personasFiltradas = [...this.personasDisponibles];
    }
  }

  // sm - Bloquea/libera el scroll de fondo mientras el desplegable casero (tipo/persona) está
  // abierto, igual que hace mat-select de forma nativa con "Tipo de proyecto".
  private cerrarDropdown(): void {
    if (this.dropdownAbierto !== null) {
      this.dropdownScrollLock.unlock();
    }
    this.dropdownAbierto = null;
  }

  filtrarPersonas() {
    this.personasFiltradas = this.personasDisponibles.filter(p =>
      coincideBusqueda(p.nombreCompleto, this.busquedaPersona)
    );
  }

  seleccionar(campo: string, valor: any, event: Event) {
    event.stopPropagation();

    if (campo === 'tipo' && valor && typeof valor === 'object') {
      this.form.tipoId = valor.id.toString();
      this.form.tipoNombre = valor.valor;
      this.form.personaId = '';
      this.form.identificacion = '';
      this.form.nombres = '';
      this.form.apellidos = '';
      this.form.correo = '';
      this.form.telefono = '';
    } else if (campo === 'persona' && valor && typeof valor === 'object') {
      this.form.personaId = valor.idPersona.toString();
      this.form.identificacion = valor.numeroIdentificacion || '';
      this.form.nombres = valor.nombreCompleto.split(' ')[0];
      this.form.apellidos = valor.nombreCompleto.split(' ').slice(1).join(' ');
      this.form.correo = valor.email || '';
      this.form.telefono = valor.telefono || '';
    } else {
      (this.form as any)[campo] = valor;
    }

    this.cerrarDropdown();
  }

  getPersonaNombre(): string {
    const persona = this.personasDisponibles.find(
      p => p.id.toString() === this.form.personaId ||
           p.idPersona?.toString() === this.form.personaId
    );
    return persona ? persona.nombreCompleto : '';
  }
get nombreApellidoBloqueado(): boolean {
  if (this.modoEdicion) {
    return this.form.tipoNombre === 'Interno';
  }
  return this.form.tipoNombre === 'Interno' && !!this.form.personaId;
}
  cerrar() {
    this.enviado = false;
    this.cerrarDropdown();
    this.nombresInvalido = false;
    this.apellidosInvalido = false;
    this.syncFormWithLider();
    this.cerrarModal.emit();
  }

  isEmailValid(email: string): boolean {
    if (!email || email.trim().length === 0) return true;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.trim());
  }

  isTelefonoValid(telefono: string): boolean {
    if (!telefono || telefono.trim().length === 0) return true;
    const regex = /^(09\d{8}|0[2-7]\d{7})$/;
    return regex.test(telefono.trim());
  }

  isNombresValid(nombres: string): boolean {
    return !!nombres && nombres.trim().length >= 3 && nombres.trim().length <= 100;
  }

  isApellidosValid(apellidos: string): boolean {
    return !!apellidos && apellidos.trim().length >= 3 && apellidos.trim().length <= 100;
  }

  telefonoTocado = false;
  nombresTocado = false;
  apellidosTocado = false;
  correoTocado = false;

  onBlurTelefono(): void {
    this.telefonoTocado = true;
  }

  onBlurNombres(): void {
    this.nombresTocado = true;
  }

  onBlurApellidos(): void {
    this.apellidosTocado = true;
  }

  onBlurCorreo(): void {
    this.correoTocado = true;
  }
  formularioValido(): boolean {
    const baseValid = !!this.form.tipoId &&
                      this.isNombresValid(this.form.nombres) &&
                      this.isApellidosValid(this.form.apellidos) &&
                      this.isEmailValid(this.form.correo) &&
                      this.isTelefonoValid(this.form.telefono);

    if (this.modoEdicion) {
      return baseValid;
    }

    if (this.form.tipoNombre === 'Interno') {
      return baseValid && !!this.form.personaId;
    }

    return baseValid;
  }

  onGuardar() {
    if (this.guardando) return;
    this.enviado = true;
    if (!this.formularioValido()) return;
    this.guardar.emit(this.form);
  }

  soloNumerosYSignos(event: KeyboardEvent): boolean {
    const regex = /^[0-9]$/;
    if (event.key.length > 1) return true;
    if (!regex.test(event.key)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onInputNombres(event: Event) {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]/gu, '');
    this.nombresInvalido = valorOriginal !== input.value;
    this.form.nombres = input.value;
    if (this.nombresInvalido) {
      setTimeout(() => this.nombresInvalido = false, 2000);
    }
  }

  onInputApellidos(event: Event) {
    const input = event.target as HTMLInputElement;
    const valorOriginal = input.value;
    input.value = input.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'\-]/gu, '');
    this.apellidosInvalido = valorOriginal !== input.value;
    this.form.apellidos = input.value;
    if (this.apellidosInvalido) {
      setTimeout(() => this.apellidosInvalido = false, 2000);
    }
  }

  onInputTelefono(event: Event) {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.form.telefono = input.value;
  }
}