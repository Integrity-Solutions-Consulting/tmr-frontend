import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of, Subject, switchMap, takeUntil } from 'rxjs';
import { exportarReporteExcelMultihoja, exportarReportePdf } from '../../../../shared/utils/reporte-export.utils';
import { ColaboradoresService }             from '../../servicios/colaboradores.service';
import { CatalogosService, CargoItem, CatalogoItem } from '../../servicios/catalogos.service';
import {
  Colaborador,
  FiltrosColaborador,
  CrearColaboradorDto,
  EditarColaboradorDto,
  Notificacion,
} from '../../models/colaborador.model';

import { CardsMetricasComponent }           from '../cards-metricas/cards-metricas.component';
import { FiltrosColaboradoresComponent }    from '../filtros-colaboradores/filtros-colaboradores.component';
import { DescargarMenuComponent }           from '../descargar-menu/descargar-menu.component';
import { TablaColaboradoresComponent }      from '../tabla-colaboradores/tabla-colaboradores.component';
import { PaginacionComponent }             from '../../../../shared/components/paginacion/paginacion.component';
import { ModalDetalleColaboradorComponent } from '../modal-detalle-colaborador/modal-detalle-colaborador.component';
import { ModalCrearColaboradorComponent }   from '../modal-crear-colaborador/modal-crear-colaborador.component';
import { ModalEditarColaboradorComponent }  from '../modal-editar-colaborador/modal-editar-colaborador.component';
import { ModalRegistrarSalidaComponent }    from '../modal-registrar-salida/modal-registrar-salida.component';  // ← NUEVO
import { NotificacionColaboradorComponent } from '../notificacion/notificacion.component';

@Component({
  selector: 'app-colaboradores-page',
  standalone: true,
  imports: [
    CommonModule,
    CardsMetricasComponent,
    FiltrosColaboradoresComponent,
    DescargarMenuComponent,
    TablaColaboradoresComponent,
    PaginacionComponent,
    ModalDetalleColaboradorComponent,
    ModalCrearColaboradorComponent,
    ModalEditarColaboradorComponent,
    ModalRegistrarSalidaComponent,  // ← NUEVO
    NotificacionColaboradorComponent,
  ],
  templateUrl: './colaboradores-page.component.html',
  styleUrl:    './colaboradores-page.component.scss',
})
export class ColaboradoresPageComponent implements OnInit, OnDestroy {

  // ── Tabla ────────────────────────────────────────────────
  colaboradores: Colaborador[] = [];
  cargando      = false;
  total         = 0;
  totalPaginas  = 0;

  // ── Paginación ───────────────────────────────────────────
  paginaActual = 1;
  porPagina    = 10;

  // ── Filtros ──────────────────────────────────────────────
  filtros: FiltrosColaborador = { busqueda: '', estado: 'Todos' };

  // ── Métricas reactivas ───────────────────────────────────
  get noAsignados(): number { return this.svc.getMetricas().noAsignados(); }
  get asignados():   number { return this.svc.getMetricas().asignados();   }
  get inactivos():   number { return this.svc.getMetricas().inactivos();   }
  get activos():     number { return this.svc.getMetricas().activos();     }
  get totalColaboradores(): number { return this.activos + this.inactivos; }

  // ── Modales ──────────────────────────────────────────────
  modalDetalle: Colaborador | null = null;
  modalCrear   = false;
  modalEditar: Colaborador | null = null;
  modalRegistrarSalida: Colaborador | null = null;  

  // ── Notificación ─────────────────────────────────────────────────────
  notificacion: Notificacion | null = null;

  // ── Toasts (Removidos) ───────────────────────────────────────────────
  toasts: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private svc:         ColaboradoresService,
    private catalogosSvc: CatalogosService,
  ) {}

  ngOnInit(): void {
    this.cargarMetricas();
    this.cargarDatos();
  }

  // ── Carga ────────────────────────────────────────────────
  cargarDatos(): void {
    this.cargando = true;
    this.svc
      .getColaboradores(this.filtros, this.paginaActual, this.porPagina)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.colaboradores = res.data;
          this.total         = res.total;
          this.totalPaginas  = res.totalPaginas;
          this.cargando      = false;
        },
        error: () => {
          this.cargando = false;
          console.error('Error al cargar los colaboradores');
        },
      });
  }

  cargarMetricas(): void {
    this.svc
      .getMetricasGenerales()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: () => console.error('Error al cargar las métricas de colaboradores'),
      });
  }

  // ── Filtros ──────────────────────────────────────────────
  onFiltrosCambian(filtros: FiltrosColaborador): void {
    this.filtros = { ...filtros };
    this.paginaActual = 1;
    this.cargarDatos();
  }

  // ── Paginación ───────────────────────────────────────────
  onPaginaCambia(pagina: number): void {
    this.paginaActual = pagina;
    this.cargarDatos();
  }

  // ── Modales abrir ────────────────────────────────────────
  abrirDetalle(col: Colaborador): void {
    this.svc.getColaboradorById(col.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detalle => this.modalDetalle = detalle,
        error: () => console.error('Error al cargar el detalle'),
      });
  }
  abrirCrear():                   void { this.modalCrear   = true; }
  abrirEditar(col: Colaborador): void {
      this.modalDetalle = null;
      this.svc.getColaboradorById(col.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: detalle => this.modalEditar = detalle,
          error: () => console.error('Error al cargar el colaborador para editar'),
        });
    }

  // ================================================================
  // NUEVO: Registrar salida
  // ================================================================
  abrirRegistrarSalida(col: Colaborador): void {
    this.svc.getColaboradorById(col.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: detalle => {
          this.modalRegistrarSalida = detalle;
        },
        error: () => console.error('Error al cargar el colaborador para registrar salida'),
      });
  }

  // ── Modales cerrar ───────────────────────────────────────
  cerrarDetalle(): void { this.modalDetalle = null;  }
  cerrarCrear():   void { this.modalCrear   = false; }
  cerrarEditar():  void { this.modalEditar  = null;  }
  cerrarRegistrarSalida(): void { this.modalRegistrarSalida = null; }  // ← NUEVO

  // ── CRUD ─────────────────────────────────────────────────
  onCrear(request: any): void {
    this.svc.crearColaborador(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cerrarCrear();
          this.paginaActual = 1;
          this.cargarDatos();
          this.cargarMetricas();
          this.notificacion = { tipo: 'exito', mensaje: 'El nuevo colaborador ha sido agregado exitosamente' };
        },
        error: (err) => {
          console.error('Error al crear el colaborador', err);
          const mensaje = err?.error?.detail || 'Error al crear el colaborador';
          this.notificacion = { tipo: 'error', mensaje };
        },
      });
  }

  onEditar(request: any): void {
      if (!this.modalEditar) return;
      this.svc.editarColaborador(this.modalEditar.id, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cerrarEditar();
            this.cargarDatos();
            this.cargarMetricas();
            this.notificacion = { tipo: 'exito', mensaje: 'El colaborador ha sido actualizado exitosamente' };
          },
          error: (err) => {
            const mensaje = err?.error?.detail || 'Error al actualizar el colaborador';
            this.notificacion = { tipo: 'error', mensaje };
          },
        });
    }

  // ================================================================
  // NUEVO: Callback cuando se registra la salida
  // ================================================================
  onSalidaRegistrada(): void {
    this.cerrarRegistrarSalida();
    this.paginaActual = 1;
    this.cargarDatos();
    this.cargarMetricas();
    this.notificacion = { tipo: 'exito', mensaje: 'La salida del colaborador ha sido registrada exitosamente' };
  }

  cerrarNotificacion(): void { this.notificacion = null; }

  onCambiarEstado(col: Colaborador): void {
    const nuevoActivo = col.estado !== 'Activo';

    if (!nuevoActivo) {
      this.svc.eliminarColaborador(col.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.cargarDatos();
            this.cargarMetricas();
            this.notificacion = {
              tipo: 'exito',
              mensaje: 'El colaborador ha sido desactivado exitosamente',
            };
          },
          error: (err) => {
            const mensaje = err?.error?.detail || 'Error al actualizar el estado del colaborador';
            this.notificacion = { tipo: 'error', mensaje };
          },
        });
      return;
    }

    forkJoin({
      detalle: this.svc.getColaboradorById(col.id),
      empresas: this.catalogosSvc.getCatalogo('EMP'),
      tiposContrato: this.catalogosSvc.getCatalogo('TCT'),
      departamentos: this.catalogosSvc.getCatalogo('DEP'),
      modalidades: this.catalogosSvc.getCatalogo('MDT'),
      categorias: this.catalogosSvc.getCatalogo('CAT'),
    }).pipe(
      switchMap(({ detalle, empresas, tiposContrato, departamentos, modalidades, categorias }) => {
        const idDepartamento = this.resolverIdCatalogo(
          departamentos,
          (detalle as any).idDepartamento,
          detalle.departamento
        );

        const cargos$ = idDepartamento
          ? this.catalogosSvc.getCargosPorDepartamento(idDepartamento)
          : of([] as CargoItem[]);

        return cargos$.pipe(
          switchMap(cargos => {
            const request = this.crearRequestCambioEstadoColaborador(
              detalle,
              nuevoActivo,
              empresas,
              tiposContrato,
              departamentos,
              modalidades,
              categorias,
              cargos
            );

            return this.svc.editarColaborador(detalle.id, request);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.cargarDatos();
        this.cargarMetricas();
        this.notificacion = {
          tipo: 'exito',
          mensaje: `El colaborador ha sido ${nuevoActivo ? 'activado' : 'desactivado'} exitosamente`,
        };
      },
      error: (err) => {
        const mensaje = err?.error?.detail || err?.message || 'Error al actualizar el estado del colaborador';
        this.notificacion = { tipo: 'error', mensaje };
      },
    });
  }

  private crearRequestCambioEstadoColaborador(
    colaborador: Colaborador,
    activo: boolean,
    empresas: CatalogoItem[],
    tiposContrato: CatalogoItem[],
    departamentos: CatalogoItem[],
    modalidades: CatalogoItem[],
    categorias: CatalogoItem[],
    cargos: CargoItem[]
  ): any {
    const anyColaborador = colaborador as any;
    const idDepartamento = this.resolverIdCatalogo(
      departamentos,
      anyColaborador.idDepartamento,
      colaborador.departamento
    );

    const idCargo = anyColaborador.idCargo
      ? Number(anyColaborador.idCargo)
      : this.buscarIdCargo(cargos, colaborador.cargo);

    const idTipoContrato = this.resolverIdCatalogo(
      tiposContrato,
      colaborador.idTipoContrato,
      colaborador.tipoContrato
    );

    const idModoTrabajo = this.resolverIdCatalogo(
      modalidades,
      colaborador.idModoTrabajo,
      colaborador.modalidad
    );

    const idCategoriaEmpleado = this.resolverIdCatalogo(
      categorias,
      colaborador.idCategoriaEmpleado,
      colaborador.categoria
    );

    this.validarIdRequerido(idTipoContrato, 'tipo de contrato');
    this.validarIdRequerido(idDepartamento, 'departamento');
    this.validarIdRequerido(idCargo, 'cargo');


    return {
      tipoPersona: colaborador.tipoPersona ?? 'NATURAL',
      idTipoIdentificacion: colaborador.tipoPersona === 'JURIDICA'
        ? null
        : (colaborador.idTipoIdentificacion ? Number(colaborador.idTipoIdentificacion) : null),
      numeroIdentificacion: colaborador.numeroIdentificacion ?? colaborador.identificacion,
      nombres: colaborador.nombres ?? null,
      apellidos: colaborador.apellidos ?? null,
      fechaNacimiento: this.normalizarFechaInput(colaborador.fechaNacimiento) || null,
      idGenero: colaborador.idGenero ? Number(colaborador.idGenero) : null,
      idNacionalidad: colaborador.idNacionalidad ? Number(colaborador.idNacionalidad) : null,
      email: colaborador.correoElectronico ? String(colaborador.correoElectronico).trim() : null,
      telefono: colaborador.telefono ? String(colaborador.telefono).trim() : null,
      direccion: colaborador.direccion ? String(colaborador.direccion).trim() : null,
      idEmpresaCatalogo: this.resolverIdCatalogo(
        empresas,
        colaborador.idEmpresaCatalogo,
        colaborador.asociacion ?? colaborador.tipoIdentificacion
      ),
      idTipoContrato,
      activo,
      idDepartamento,
      fechaIngreso: this.normalizarFechaInput(colaborador.fechaContratacion) || null,
      idCargo,
      aniosExperiencia: this.normalizarNumeroOpcional(colaborador.aniosExperiencia),
      idModoTrabajo,
      idCategoriaEmpleado,
    };
  }

  private resolverIdCatalogo(lista: CatalogoItem[], id?: number | null, valor?: string | null): number | null {
    if (id) return Number(id);
    if (!valor) return null;

    return lista.find(item =>
      this.normalizarTexto(item.valor) === this.normalizarTexto(valor)
    )?.id ?? null;
  }

  private buscarIdCargo(cargos: CargoItem[], nombre?: string | null): number | null {
    if (!nombre) return null;

    return cargos.find(cargo => {
      const cargoAny = cargo as any;
      const nombreCargo = cargo.nombreCargo ?? cargoAny.nombre ?? cargoAny.valor;
      return this.normalizarTexto(nombreCargo) === this.normalizarTexto(nombre);
    }
    )?.id ?? null;
  }

  private validarIdRequerido(id: number | null, campo: string): void {
    if (!id || id <= 0) {
      throw new Error(`No se pudo activar el colaborador porque falta resolver el ${campo}.`);
    }
  }

  private normalizarNumeroOpcional(valor: number | string | null | undefined): number | null {
    if (valor === null || valor === undefined || valor === '') return null;

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }

  private normalizarTexto(valor?: string | null): string {
    return (valor ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // ── Descargar ────────────────────────────────────────────
  private normalizarFechaInput(fecha?: string | Date | null): string {
    if (!fecha) return '';

    if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
      const y = fecha.getFullYear();
      const m = String(fecha.getMonth() + 1).padStart(2, '0');
      const d = String(fecha.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const valor = String(fecha).trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      return valor.substring(0, 10);
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
      const [d, m, y] = valor.split('/');
      return `${y}-${m}-${d}`;
    }

    if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
      const [d, m, y] = valor.split('-');
      return `${y}-${m}-${d}`;
    }

    return '';
  }

  onDescargarPDF(): void {
    this.obtenerColaboradoresParaExportar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: colaboradores => {
          void exportarReportePdf({
            titulo: 'Reporte de Colaboradores',
            nombreArchivo: 'Colaboradores',
            nombreHoja: 'Colaboradores',
            columnas: [
              { encabezado: 'Empresa / Asociación', anchoPdf: 22 },
              { encabezado: 'Contrato', anchoPdf: 18 },
              { encabezado: 'Estado', anchoPdf: 16 },
              { encabezado: 'Núm. ID', anchoPdf: 20 },
              { encabezado: 'Nombres', anchoPdf: 22 },
              { encabezado: 'Apellidos', anchoPdf: 22 },
              { encabezado: 'Nacimiento', anchoPdf: 17 },
              { encabezado: 'Género', anchoPdf: 14 },
              { encabezado: 'Departamento', anchoPdf: 20 },
              { encabezado: 'Ingreso', anchoPdf: 17 },
              { encabezado: 'Cargo', anchoPdf: 22 },
              { encabezado: 'Modalidad', anchoPdf: 16 },
              { encabezado: 'Categoría', anchoPdf: 17 },
              { encabezado: 'Correo', anchoPdf: 28 },
              { encabezado: 'Teléfono', anchoPdf: 17 },
              { encabezado: 'Dirección', anchoPdf: 28 },
              { encabezado: 'Proyectos asignados', anchoPdf: 36 },
            ],
            filas: colaboradores.map((colaborador) => [
              colaborador.asociacion ?? '-',
              colaborador.tipoContrato ?? '-',
              colaborador.estado ?? '-',
              colaborador.numeroIdentificacion ?? colaborador.identificacion ?? '-',
              colaborador.nombres ?? '-',
              colaborador.apellidos ?? '-',
              this.formatearFechaValor(colaborador.fechaNacimiento),
              colaborador.genero ?? '-',
              colaborador.departamento ?? '-',
              this.formatearFechaValor(colaborador.fechaContratacion),
              colaborador.cargo ?? '-',
              colaborador.modalidad ?? '-',
              colaborador.categoria ?? '-',
              colaborador.correoElectronico ?? '-',
              colaborador.telefono ?? '-',
              colaborador.direccion ?? '-',
              this.formatearProyectosColaborador(colaborador),
            ]),
            columnaEstado: 2,
            orientacionPdf: 'landscape',
            formatoPdf: 'a3',
          });
          console.log('PDF generado correctamente');
        },
        error: () => console.error('Error al generar el PDF'),
      });
  }

  onDescargarExcel(): void {
    this.obtenerColaboradoresParaExportar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: colaboradores => {
          const activosCount = colaboradores.filter(c => c.estado === 'Activo').length;
          const inactivosCount = colaboradores.filter(c => c.estado === 'Inactivo').length;
          const noAsignadosCount = colaboradores.filter(c => (!c.proyectosAsignados || c.proyectosAsignados.length === 0) && c.estado === 'Activo').length;
          const asignadosCount = colaboradores.filter(c => c.proyectosAsignados && c.proyectosAsignados.length > 0 && c.estado === 'Activo').length;

          void exportarReporteExcelMultihoja(
            [
              {
                titulo: 'Reporte de Colaboradores',
                nombreArchivo: 'Colaboradores',
                nombreHoja: 'Colaboradores',
                columnas: [
                  { encabezado: 'Empresa / Asociación', anchoExcel: 24 },
                  { encabezado: 'Tipo de contrato', anchoExcel: 20 },
                  { encabezado: 'Estado', anchoExcel: 14 },
                  { encabezado: 'Número de identificación', anchoExcel: 24 },
                  { encabezado: 'Nombres', anchoExcel: 24 },
                  { encabezado: 'Apellidos', anchoExcel: 24 },
                  { encabezado: 'Fecha de nacimiento', anchoExcel: 18 },
                  { encabezado: 'Género', anchoExcel: 16 },
                  { encabezado: 'Departamento', anchoExcel: 22 },
                  { encabezado: 'Fecha de ingreso', anchoExcel: 18 },
                  { encabezado: 'Cargo', anchoExcel: 26 },
                  { encabezado: 'Modalidad', anchoExcel: 16 },
                  { encabezado: 'Categoría', anchoExcel: 18 },
                  { encabezado: 'Correo electrónico', anchoExcel: 34 },
                  { encabezado: 'Teléfono', anchoExcel: 16 },
                  { encabezado: 'Dirección', anchoExcel: 36 },
                  { encabezado: 'Proyectos asignados', anchoExcel: 54 },
                ],
                filas: colaboradores.map(c => [
                  c.asociacion ?? '-',
                  c.tipoContrato ?? '-',
                  c.estado ?? '-',
                  c.numeroIdentificacion ?? c.identificacion ?? '-',
                  c.nombres ?? '-',
                  c.apellidos ?? '-',
                  this.formatearFechaValor(c.fechaNacimiento),
                  c.genero ?? '-',
                  c.departamento ?? '-',
                  this.formatearFechaValor(c.fechaContratacion),
                  c.cargo ?? '-',
                  c.modalidad ?? '-',
                  c.categoria ?? '-',
                  c.correoElectronico ?? '-',
                  c.telefono ?? '-',
                  c.direccion ?? '-',
                  this.formatearProyectosColaborador(c),
                ]),
                columnaEstado: 2,
              },
              {
                titulo: 'Resumen de Colaboradores',
                nombreArchivo: 'Resumen',
                nombreHoja: 'Resumen',
                columnas: [
                  { encabezado: 'Métrica', anchoExcel: 30 },
                  { encabezado: 'Total', anchoExcel: 12 },
                ],
                filas: [
                  ['Total colaboradores', colaboradores.length],
                  ['Activos', activosCount],
                  ['Inactivos', inactivosCount],
                  ['No asignados (0 proyectos)', noAsignadosCount],
                  ['Asignados (1+ proyectos)', asignadosCount],
                ],
                columnaEstado: 2,
              }
            ],
            'Colaboradores'
          );
          console.log('Excel generado correctamente');
        },
        error: () => console.error('Error al generar el Excel'),
      });
  }

  private formatearFechaValor(fecha?: string | null): string {
    if (!fecha) return '-';
    const valor = String(fecha).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(valor)) {
      const [y, m, d] = valor.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return valor;
  }

  private formatearProyectosColaborador(colaborador: Colaborador): string {
    const proyectos = colaborador.proyectosAsignados ?? [];
    if (!proyectos.length) return '-';
    return proyectos.map(p => `${p.nombre} - ${p.cliente} - ${p.estado}`).join('; ');
  }
  // ── Toast ────────────────────────────────────────────────
private obtenerColaboradoresParaExportar() {
  return this.svc.getColaboradores(this.filtros, 1, 9999).pipe(
    switchMap(res => {
      const colaboradores = res.data ?? [];
      if (!colaboradores.length) return of([]);
      return forkJoin(colaboradores.map(col => this.svc.getColaboradorById(col.id)));
    })
  );
}

  onToastCerrado(id: number): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}