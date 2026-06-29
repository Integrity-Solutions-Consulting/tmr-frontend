import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CatalogosService, CatalogoItem } from '../../servicios/catalogos.service';
import { ColaboradoresService } from '../../servicios/colaboradores.service';
import { RegistrarSalidaRequest } from '../../models/colaborador.model';

@Component({
  selector: 'app-modal-registrar-salida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './modal-registrar-salida.component.html',
  styleUrl: './modal-registrar-salida.component.scss',
})
export class ModalRegistrarSalidaComponent implements OnInit {
  @Input() colaborador!: any;
  @Output() cerrar = new EventEmitter<void>();
  @Output() salidaRegistrada = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private catalogosService = inject(CatalogosService);
  private colaboradoresService = inject(ColaboradoresService);

  form!: FormGroup;
  enviado = false;
  cargando = false;

  tiposSalida: CatalogoItem[] = [];
  causasSalida: CatalogoItem[] = [];

  ngOnInit(): void {
    this.form = this.fb.group({
      fechaSalida: [this.obtenerFechaActual(), Validators.required],
      idTipoSalida: [null, Validators.required],
      idCausaSalida: [null, Validators.required],
      comentario: [''],
    });

    this.cargarCatalogos();
  }

  private obtenerFechaActual(): string {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, '0');
    const d = String(hoy.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private cargarCatalogos(): void {
    this.catalogosService.getCatalogo('TOS').subscribe((data: CatalogoItem[]) => {
      this.tiposSalida = data;
    });

    this.catalogosService.getCatalogo('CAS').subscribe((data: CatalogoItem[]) => {
      this.causasSalida = data;
    });
  }

  campoInvalido(campo: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl && ctrl.invalid && (ctrl.touched || this.enviado));
  }

  tieneValor(campo: string): boolean {
    const val = this.form.get(campo)?.value;
    return val != null && val !== undefined && val !== '';
  }

  onGuardar(): void {
    this.enviado = true;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    const v = this.form.getRawValue();

    const request: RegistrarSalidaRequest = {
      fechaSalida: v.fechaSalida,
      idTipoSalida: Number(v.idTipoSalida),
      idCausaSalida: Number(v.idCausaSalida),
      comentario: v.comentario?.trim() || null,
      idEmpleadoReemplazo: null,
    };

    this.colaboradoresService.registrarSalida(this.colaborador.id, request)
      .subscribe({
        next: () => {
          this.cargando = false;
          this.salidaRegistrada.emit();
        },
        error: (err: any) => {
          this.cargando = false;
          console.error('Error al registrar salida:', err);
        }
      });
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}