import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { TokenService } from '../../features/auth/servicios/token.service';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { PaginacionComponent } from '../../shared/components/paginacion/paginacion.component';
import { Boton } from '../../shared/components/boton/boton';
import { BadgeEstadoComponent } from '../../shared/components/badge-estado/badge-estado.component';
import {
  ActionMenuComponent,
  ActionMenuItem,
} from '../../shared/components/action-menu/action-menu.component';
import {
  DescargaMenuComponent,
  DescargaOpcion,
} from '../../shared/components/descarga-menu/descarga-menu.component';
import { ModalBase } from '../../shared/components/modal-base/modal-base';
import { PopupService } from '../../shared/services/popup.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';
import {
  FilterDropdownComponent,
  FilterDropdownOption,
} from '../../shared/components/filter-dropdown/filter-dropdown.component';
import { SearchInput } from '../../shared/components/search-input/search-input';
import { TarjetaResumenComponent } from '../../shared/components/tarjeta-resumen/tarjeta-resumen.component';
import { exportarReporteExcel, exportarReportePdf } from '../../shared/utils/reporte-export.utils';
import { rucEcuatorianoValidator } from '../../shared/validators/form-validators';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  firstValueFrom,
  of,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DetailModal } from '../../shared/components/detail-modal/detail-modal';
import {
  CampoOrdenableProveedor,
  Proveedor,
  ProveedorPayload,
  ResumenProveedores,
  TipoProveedor,
} from './proveedor.model';
import { ProveedoresService } from './proveedores.service';

@Component({
  selector: 'app-proveedores-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    PaginacionComponent,
    Boton,
    BadgeEstadoComponent,
    ActionMenuComponent,
    DescargaMenuComponent,
    ModalBase,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatIconModule,
    FilterBarComponent,
    FilterDropdownComponent,
    SearchInput,
    TarjetaResumenComponent,
    MatDialogModule,
  ],
  templateUrl: './proveedores.page.html',
  styleUrl: './proveedores.page.scss',
})
export class ProveedoresPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly tokenService = inject(TokenService);
  private readonly popup = inject(PopupService);
  private readonly dialog = inject(MatDialog);
  private readonly proveedoresService = inject(ProveedoresService);
  private readonly destroy$ = new Subject<void>();
  private readonly recargar$ = new Subject<void>();
  private readonly accionesCache = new Map<number, ActionMenuItem[]>();
  proveedores: Proveedor[] = [];
  tipos: TipoProveedor[] = [];
  cargando = false;
  error = '';
  pagina = 1;
  porPagina = 10;
  total = 0;
  resumen: ResumenProveedores = { total: 0, activos: 0, inactivos: 0 };
  orden: CampoOrdenableProveedor = 'nombreproveedor';
  asc = true;
  editando: Proveedor | null = null;
  modalAbierto = false;
  guardando = false;
  get puedeGestionar(): boolean {
    return this.tokenService.canManageProveedores();
  }
  filtros = this.fb.nonNullable.group({
    busqueda: '',
    tipoProveedorId: '',
    estado: this.fb.nonNullable.control<string[]>([]),
  });
  form = this.fb.group({
    nombreProveedor: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150),
        Validators.pattern(/\S(?:.*\S)?/),
      ],
    ],
    idTipoProveedor: ['', Validators.required],
    ruc: ['', [Validators.maxLength(13), rucEcuatorianoValidator()]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    telefono: ['', [Validators.pattern(/^(?:\+593|0)\d{9}$/)]],
    direccion: [
      '',
      [Validators.minLength(5), Validators.maxLength(255), Validators.pattern(/\S(?:.*\S)?/)],
    ],
    activo: [true],
  });

  readonly opcionesDescarga: DescargaOpcion[] = [
    { id: 'excel', label: 'Exportar Excel', action: () => this.exportar('excel') },
    { id: 'pdf', label: 'Exportar PDF', action: () => this.exportar('pdf') },
  ];
  get opcionesTiposFiltro(): FilterDropdownOption[] {
    return this.tipos.map((tipo) => ({ value: tipo.id.toString(), label: tipo.nombre }));
  }
  get tiposSeleccionados(): string[] {
    const tipo = this.filtros.controls.tipoProveedorId.value;
    return tipo ? [tipo] : [];
  }
  readonly opcionesEstadoBarra: FilterDropdownOption[] = [
    { value: 'true', label: 'Activo' },
    { value: 'false', label: 'Inactivo' },
  ];

  ngOnInit(): void {
    this.filtros.controls.busqueda.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.filtrar());

    this.recargar$
      .pipe(
        startWith(undefined),
        tap(() => {
          this.cargando = true;
          this.error = '';
        }),
        switchMap(() =>
          this.proveedoresService.listar(this.consultaActual()).pipe(
            catchError(() => {
              this.error = 'No fue posible cargar los proveedores.';
              return of(null);
            }),
            finalize(() => (this.cargando = false)),
          ),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((respuesta) => {
        if (!respuesta) return;
        this.proveedores = respuesta.items;
        this.total = respuesta.total;
        this.accionesCache.clear();
        if (this.pagina > this.totalPaginas) {
          this.pagina = this.totalPaginas;
          this.cargar();
        }
      });

    this.cargarTipos();
    this.cargarResumen();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.porPagina));
  }
  cargar(): void {
    this.recargar$.next();
  }
  cargarTipos(): void {
    this.proveedoresService
      .obtenerTipos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (tipos) => (this.tipos = tipos), error: () => (this.tipos = []) });
  }
  cargarResumen(): void {
    this.proveedoresService
      .obtenerResumen()
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (resumen) => (this.resumen = resumen) });
  }
  filtrar(): void {
    this.pagina = 1;
    this.cargar();
  }
  limpiar(): void {
    this.filtros.reset({ busqueda: '', tipoProveedorId: '', estado: [] }, { emitEvent: false });
    this.filtrar();
  }
  actualizarBusqueda(busqueda: string): void {
    this.filtros.controls.busqueda.setValue(busqueda);
  }
  actualizarEstados(estado: string[]): void {
    this.filtros.controls.estado.setValue(estado);
    this.filtrar();
  }
  actualizarTipo(tipo: string[]): void {
    this.filtros.controls.tipoProveedorId.setValue(tipo[0] ?? '');
    this.filtrar();
  }
  ordenar(campo: CampoOrdenableProveedor): void {
    this.asc = this.orden === campo ? !this.asc : true;
    this.orden = campo;
    this.cargar();
  }
  direccionOrden(campo: CampoOrdenableProveedor): 'ascending' | 'descending' | 'none' {
    return this.orden === campo ? (this.asc ? 'ascending' : 'descending') : 'none';
  }
  abrirCrear(): void {
    this.editando = null;
    this.form.reset({
      activo: true,
      nombreProveedor: '',
      idTipoProveedor: '',
      ruc: '',
      email: '',
      telefono: '',
      direccion: '',
    });
    this.modalAbierto = true;
  }
  abrirEditar(item: Proveedor): void {
    this.editando = item;
    this.form.reset({
      nombreProveedor: item.nombreproveedor,
      idTipoProveedor: item.idtipoproveedor?.toString() ?? '',
      ruc: item.ruc ?? '',
      email: item.email ?? '',
      telefono: item.telefono ?? '',
      direccion: item.direccion ?? '',
      activo: item.activo,
    });
    this.modalAbierto = true;
  }
  cerrar(): void {
    if (this.form.dirty && !confirm('¿Hay cambios sin guardar?')) return;
    this.modalAbierto = false;
  }
  guardar(): void {
    if (this.form.invalid || this.guardando) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando = true;
    const v = this.form.getRawValue();
    const limpiar = (valor: string | null): string | null => valor?.trim() || null;
    const body: ProveedorPayload = {
      nombreProveedor: v.nombreProveedor?.trim() ?? '',
      idTipoProveedor: v.idTipoProveedor ? +v.idTipoProveedor : null,
      ruc: limpiar(v.ruc),
      email: limpiar(v.email),
      telefono: limpiar(v.telefono),
      direccion: limpiar(v.direccion),
      activo: v.activo ?? true,
    };
    const request = this.editando
      ? this.proveedoresService.actualizar(this.editando.id, body)
      : this.proveedoresService.crear(body);
    request
      .pipe(
        finalize(() => (this.guardando = false)),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: () => {
          this.modalAbierto = false;
          void this.popup.showText(
            'check_circle',
            'Proveedor guardado',
            `El proveedor se ha ${this.editando ? 'actualizado' : 'registrado'} correctamente.`,
            true,
          );
          this.cargarResumen();
          this.cargar();
        },
        error: (error: HttpErrorResponse) => {
          void this.popup.showText(
            'error',
            'No se pudo guardar',
            this.mensajeError(error, 'Revise los datos e inténtelo nuevamente.'),
          );
        },
      });
  }
  async eliminar(item: Proveedor): Promise<void> {
    const r = await Swal.fire({
      title: '¿Desactivar proveedor?',
      text: item.nombreproveedor,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
    });
    if (!r.isConfirmed) return;
    this.proveedoresService
      .desactivar(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          void this.popup.showText(
            'check_circle',
            'Proveedor desactivado',
            'El proveedor ya no estará disponible para nuevas operaciones.',
            true,
          );
          this.cargarResumen();
          this.cargar();
        },
        error: (error: HttpErrorResponse) =>
          void this.popup.showText(
            'error',
            'No se puede desactivar',
            this.mensajeError(error, 'Ocurrió un error.'),
          ),
      });
  }
  ver(item: Proveedor): void {
    this.proveedoresService
      .obtenerDetalle(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ proveedor, facturasRelacionadas }) =>
          this.dialog.open(DetailModal, {
            data: {
              title: proveedor.nombreproveedor,
              subtitle: proveedor.activo ? 'Proveedor activo' : 'Proveedor inactivo',
              fields: [
                { label: 'Tipo', value: proveedor.tipoProveedor ?? 'Sin tipo' },
                { label: 'RUC', value: proveedor.ruc ?? '—' },
                { label: 'Correo', value: proveedor.email ?? '—' },
                { label: 'Teléfono', value: proveedor.telefono ?? '—' },
                { label: 'Facturas relacionadas', value: String(facturasRelacionadas) },
              ],
            },
            maxWidth: 'calc(100vw - 32px)',
          }),
        error: () => Swal.fire('Error', 'No fue posible obtener el detalle.', 'error'),
      });
  }
  accionesProveedor(item: Proveedor): ActionMenuItem[] {
    const accionesExistentes = this.accionesCache.get(item.id);
    if (accionesExistentes) return accionesExistentes;
    const acciones: ActionMenuItem[] = [
      { id: 'ver-mas', label: 'Ver más', action: () => this.ver(item) },
    ];
    if (this.puedeGestionar) {
      acciones.push(
        { id: 'editar', label: 'Editar', action: () => this.abrirEditar(item) },
        {
          id: 'eliminar',
          label: item.activo ? 'Desactivar' : 'Inactivo',
          danger: item.activo,
          disabled: !item.activo,
          action: () => this.eliminar(item),
        },
      );
    }
    this.accionesCache.set(item.id, acciones);
    return acciones;
  }
  async exportar(tipo: 'excel' | 'pdf'): Promise<void> {
    try {
      const resultado = await firstValueFrom(
        this.proveedoresService.listar({
          ...this.consultaActual(),
          pagina: 1,
          tamanoPagina: 10_000,
        }),
      );
      const filas = (resultado?.items ?? []).map((x) => [
        x.nombreproveedor,
        x.tipoProveedor ?? '—',
        x.ruc ?? '—',
        x.email ?? '—',
        x.telefono ?? '—',
        x.direccion ?? '—',
        x.activo ? 'Activo' : 'Inactivo',
      ]);
      const config = {
        titulo: `Reporte de Proveedores (${filas.length} registros)`,
        nombreArchivo: 'Proveedores',
        nombreHoja: 'Proveedores',
        columnas: ['Proveedor', 'Tipo', 'RUC', 'Correo', 'Teléfono', 'Dirección', 'Estado'].map(
          (encabezado) => ({ encabezado }),
        ),
        filas,
        columnaEstado: 6,
        orientacionPdf: 'landscape' as const,
        subtituloPdf: 'Datos según los filtros aplicados',
      };
      if (tipo === 'excel') await exportarReporteExcel(config);
      else await exportarReportePdf(config);
    } catch {
      Swal.fire(
        'No se pudo exportar',
        'No fue posible obtener los proveedores para el reporte.',
        'error',
      );
    }
  }
  cambiarPagina(p: number): void {
    this.pagina = p;
    this.cargar();
  }
  trackByProveedor(_index: number, proveedor: Proveedor): number {
    return proveedor.id;
  }

  private consultaActual() {
    const f = this.filtros.getRawValue();
    return {
      ...f,
      pagina: this.pagina,
      tamanoPagina: this.porPagina,
      ordenarPor: this.orden,
      ascendente: this.asc,
    };
  }

  private mensajeError(error: HttpErrorResponse, fallback: string): string {
    const detail = error.error?.detail;
    return typeof detail === 'string' && detail.trim() ? detail : fallback;
  }
}
