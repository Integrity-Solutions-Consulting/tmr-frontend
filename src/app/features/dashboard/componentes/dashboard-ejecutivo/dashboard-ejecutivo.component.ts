import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subscription, forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { exportarReporteExcelMultihoja, ReporteTabularConfig } from '../../../../shared/utils/reporte-export.utils';
import { DashboardEjecutivoService } from '../../servicios/dashboard-ejecutivo.service';
import { DashboardService } from '../../servicios/dashboard.service';
import {
  CategoriaProyecto,
  CumplimientoDetalle,
  DashboardEjecutivo,
  DashboardFiltros,
  DashboardFiltrosOpciones,
  DashboardHistorico,
  EstadoHistorico,
  HistoricoColaborador,
  Semaforo,
} from '../../modelos/dashboard-ejecutivo.model';
import {
  MESES,
  MESES_CORTOS,
  anchoBarra,
  claseSemaforo,
  etiquetaEstado,
  etiquetaMes,
  formatoFecha,
  formatoFechaHora,
  formatoHoras,
  formatoPorcentaje,
} from './dashboard-ejecutivo.utils';
import { BrechaColaborador, BrechaHistoricoComponent } from './brecha-historico/brecha-historico.component';
import { TarjetaResumenComponent } from '../../../../shared/components/tarjeta-resumen/tarjeta-resumen.component';

// sm - Columna de las tablas de detalle (panel lateral y descarga a Excel).
type TipoColumna = 'texto' | 'fecha' | 'horas' | 'porcentaje' | 'semaforo' | 'numero';
interface ColumnaDetalle {
  clave: string;
  titulo: string;
  tipo?: TipoColumna;
}

// sm - Detalle que respalda el valor de una tarjeta, barra o segmento (sección 6: todo abre su detalle).
interface DetalleAbierto {
  clave: string;
  titulo: string;
  definicion: string;
  columnas: ColumnaDetalle[];
  filas: any[];
  totalesHoras?: boolean;
  conCorreo?: boolean;
}

interface TarjetaIndicador {
  clave: string;
  titulo: string;
  valor: number;
  icono: string;
  // sm - Paleta corporativa: destacado (azul marino sólido), corporativo (acento azul), cian (acento cian),
  // peligro (rojo: solo vencidos y desvinculados, lo pide RF 04 / RF 08) y neutro (gris, alerta en cero).
  tono: 'destacado' | 'corporativo' | 'cian' | 'peligro' | 'neutro';
  definicion: string;
  grupo: 'colaboradores' | 'proyectos';
}

// sm - Segmento de la dona del portafolio. Los segmentos no se solapan: cada proyecto vigente cae en uno solo.
type SeleccionPortafolio = CategoriaProyecto | 'EnProgreso';

interface SegmentoPortafolio {
  categoria: SeleccionPortafolio;
  titulo: string;
  valor: number;
  color: string;
  dasharray: string;
  dashoffset: number;
}

// sm - Circunferencia de los círculos SVG (r = 42): medidor de cumplimiento y dona del portafolio.
const CIRCUNFERENCIA = 2 * Math.PI * 42;

// sm - BrechaColaborador (fila de "Brecha y recurrencia") ahora vive en brecha-historico.component.ts.

@Component({
  selector: 'app-dashboard-ejecutivo',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatTooltipModule, MatAutocompleteModule, HeaderComponent, BrechaHistoricoComponent, TarjetaResumenComponent],
  templateUrl: './dashboard-ejecutivo.component.html',
  styleUrls: ['./dashboard-ejecutivo.component.scss'],
})
export class DashboardEjecutivoComponent implements OnInit {
  private servicio = inject(DashboardEjecutivoService);
  private dashboardService = inject(DashboardService);
  private destroyRef = inject(DestroyRef);

  readonly meses = MESES;
  readonly formatoFecha = formatoFecha;
  readonly formatoFechaHora = formatoFechaHora;
  readonly formatoHoras = formatoHoras;
  readonly formatoPorcentaje = formatoPorcentaje;

  private readonly hoy = new Date();
  readonly anios = Array.from({ length: 5 }, (_, i) => this.hoy.getFullYear() - i);

  // ── Estado ──
  opciones = signal<DashboardFiltrosOpciones>({ clientes: [], proyectos: [], estados: [], colaboradores: [] });
  filtros = signal<DashboardFiltros>(this.filtrosIniciales());
  datos = signal<DashboardEjecutivo | null>(null);
  historico = signal<DashboardHistorico | null>(null);
  cargando = signal(false);
  cargandoHistorico = signal(false);
  error = signal<string | null>(null);

  mesesVentana = signal<6 | 12>(6);
  umbralRecurrencia = signal(3);

  // sm - Cliente y Proyecto ahora se escriben en vez de elegirse de una lista larga: el texto del input se guarda
  // aparte del filtro aplicado (igual que el filtro de cliente de Seguimiento) y filtra las opciones del
  // autocompletado; el filtro real (idCliente/idProyecto) solo cambia al elegir una opción.
  clienteTexto = signal('');
  proyectoTexto = signal('');

  detalle = signal<DetalleAbierto | null>(null);
  enviandoCorreo: Record<string, boolean> = {};
  resultadoCorreo: Record<string, 'ok' | 'error'> = {};

  // ── Derivados ──
  // sm - Proyectos del filtro en cascada: solo los del cliente y estado elegidos.
  proyectosFiltro = computed(() => {
    const f = this.filtros();
    return this.opciones().proyectos.filter(
      (p) => (!f.idCliente || p.idCliente === f.idCliente) && (!f.idEstado || p.idEstado === f.idEstado),
    );
  });

  // sm - Opciones del autocompletado de Cliente/Proyecto: se filtran con el texto escrito (no con el filtro
  // aplicado), para que mientras se escribe se vean las coincidencias antes de elegir una.
  clientesFiltrados = computed(() => {
    const q = this.clienteTexto().toLowerCase().trim();
    if (!q) return this.opciones().clientes;
    return this.opciones().clientes.filter((c) => c.nombre.toLowerCase().includes(q));
  });

  proyectosFiltrados = computed(() => {
    const q = this.proyectoTexto().toLowerCase().trim();
    const base = this.proyectosFiltro();
    if (!q) return base;
    return base.filter((p) => `${p.codigo ?? ''} ${p.nombre}`.toLowerCase().includes(q));
  });

  tarjetas = computed<TarjetaIndicador[]>(() => {
    const d = this.datos();
    if (!d) return [];
    const t = d.tarjetas;
    // sm - Las alertas en cero se muestran en gris para que el color solo llame la atención cuando hay algo que gestionar.
    const alerta = (valor: number, tono: TarjetaIndicador['tono']) => (valor > 0 ? tono : 'neutro');
    return [
      {
        clave: 'sinProyecto', grupo: 'colaboradores', titulo: 'Activos sin proyecto', valor: t.colaboradoresSinProyecto,
        icono: 'person_off', tono: alerta(t.colaboradoresSinProyecto, 'corporativo'),
        definicion: 'Colaboradores activos a la fecha de corte sin asignación vigente a un proyecto no cerrado. Solo aplica el filtro de colaborador.',
      },
      {
        clave: 'ingresos', grupo: 'colaboradores', titulo: 'Ingresos del periodo', valor: t.ingresos, icono: 'person_add',
        tono: alerta(t.ingresos, 'corporativo'),
        definicion: 'Colaboradores cuya fecha de ingreso está dentro del mes seleccionado.',
      },
      {
        clave: 'salidas', grupo: 'colaboradores', titulo: 'Salidas del periodo', valor: t.salidas, icono: 'person_remove',
        tono: alerta(t.salidas, 'corporativo'),
        definicion: 'Colaboradores cuya fecha de salida está dentro del mes seleccionado.',
      },
      {
        clave: 'clientesActivos', grupo: 'proyectos', titulo: 'Clientes con proyectos activos', valor: t.clientesConProyectosActivos,
        icono: 'business', tono: 'destacado',
        definicion: `Cada cliente cuenta una sola vez si tiene al menos un proyecto activo (${d.parametros.estadosActivos}) vigente a la fecha de corte.`,
      },
      {
        // sm - RF 10 / CA 07: indicador corregido de proyectos activos (solo En progreso y vigentes).
        clave: 'Activo', grupo: 'proyectos', titulo: 'Proyectos activos', valor: t.proyectosActivos,
        icono: 'rocket_launch', tono: 'destacado',
        definicion: `Proyectos en estado ${d.parametros.estadosActivos} y vigentes a la fecha de corte. Excluye cerrados, cancelados, suspendidos y vencidos.`,
      },
      // sm - Vencidos, Próximos a terminar, Nuevos y Cerrados ya no son tarjetas: se repetían con el gráfico
      // "Estado del portafolio", que muestra esos mismos valores y abre el mismo detalle (pedido de la usuaria 2026-10-02).
      {
        clave: 'desvinculados', grupo: 'proyectos', titulo: 'Con colaboradores desvinculados', valor: t.proyectosConDesvinculados,
        icono: 'report', tono: alerta(t.proyectosConDesvinculados, 'peligro'),
        definicion: 'Proyectos no cerrados con asignaciones activas de personas cuya fecha de salida ya ocurrió. Deben regularizarse.',
      },
    ];
  });

  tarjetasColaboradores = computed(() => this.tarjetas().filter((t) => t.grupo === 'colaboradores'));
  tarjetasProyectos = computed(() => this.tarjetas().filter((t) => t.grupo === 'proyectos'));

  // sm - Medidor del cumplimiento general (arco SVG).
  medidor = computed(() => {
    const total = this.datos()?.cumplimientoTotal;
    const porcentaje = total ? this.anchoBarra(total.porcentaje) : 0;
    return { dasharray: `${(porcentaje / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}` };
  });

  // sm - Estado del portafolio (sección 7.3). La dona reparte los proyectos vigentes sin mezclar estados:
  // Vencidos, Próximos a terminar y En progreso (el resto de activos). Nuevos y Cerrados del periodo son
  // indicadores aparte porque se solapan con los anteriores.
  portafolio = computed(() => {
    const d = this.datos();
    if (!d) return { segmentos: [] as SegmentoPortafolio[], total: 0, nuevos: 0, cerrados: 0 };
    const vencidos = d.proyectos.filter((p) => p.categorias.includes('Vencido')).length;
    const proximos = d.proyectos.filter((p) => p.categorias.includes('Proximo')).length;
    const enProgreso = d.proyectos.filter(
      (p) => p.categorias.includes('Activo') && !p.categorias.includes('Proximo') && !p.categorias.includes('Vencido'),
    ).length;
    const base = [
      { categoria: 'EnProgreso' as SeleccionPortafolio, titulo: 'En progreso', valor: enProgreso, color: 'var(--primary-color)' },
      { categoria: 'Proximo' as SeleccionPortafolio, titulo: 'Próximos a terminar', valor: proximos, color: 'var(--accent-cian)' },
      { categoria: 'Vencido' as SeleccionPortafolio, titulo: 'Vencidos', valor: vencidos, color: 'var(--status-danger-bg-solid)' },
    ];
    const total = base.reduce((s, b) => s + b.valor, 0);
    let acumulado = 0;
    const segmentos = base.map((b) => {
      const largo = total > 0 ? (b.valor / total) * CIRCUNFERENCIA : 0;
      const segmento: SegmentoPortafolio = {
        ...b,
        dasharray: `${largo} ${CIRCUNFERENCIA - largo}`,
        dashoffset: -acumulado,
      };
      acumulado += largo;
      return segmento;
    });
    return { segmentos, total, nuevos: d.tarjetas.proyectosNuevos, cerrados: d.tarjetas.proyectosCerrados };
  });

  totalFueraDeAsignacion = computed(() =>
    redondear((this.datos()?.fueraDeAsignacion ?? []).reduce((s, r) => s + r.horas, 0)),
  );


  colaboradoresConPendientes = computed(
    () => new Set((this.datos()?.cumplimientoDetalle ?? []).filter((f) => f.pendientes > 0).map((f) => f.idEmpleado)).size,
  );

  brechaColaboradores = computed<BrechaColaborador[]>(() => {
    const d = this.datos();
    if (!d) return [];
    const historicoPorEmpleado = new Map<number, HistoricoColaborador>(
      (this.historico()?.colaboradores ?? []).map((c) => [c.idEmpleado, c]),
    );
    const mesesHistorico = this.historico()?.meses ?? [];

    const porEmpleado = new Map<number, BrechaColaborador>();
    for (const fila of d.cumplimientoDetalle) {
      let item = porEmpleado.get(fila.idEmpleado);
      if (!item) {
        item = {
          idEmpleado: fila.idEmpleado, colaborador: fila.colaborador, esperadas: 0, reportadas: 0, pendientes: 0,
          porcentaje: 100, semaforo: 'Verde', ocasionesConAtraso: 0, detalleAtrasos: '', recurrente: false, historial: [],
        };
        porEmpleado.set(fila.idEmpleado, item);
      }
      item.esperadas += fila.esperadas;
      item.reportadas += fila.reportadas;
      item.pendientes += fila.pendientes;
    }

    // sm - Colaboradores con atrasos en la ventana pero sin horas esperadas en el periodo (ej. su asignación terminó
    // el mes anterior). Antes no aparecían en la tabla aunque fueran recurrentes; se agregan sin brecha actual.
    for (const h of historicoPorEmpleado.values()) {
      if (h.ocasionesConAtraso === 0 || porEmpleado.has(h.idEmpleado)) continue;
      porEmpleado.set(h.idEmpleado, {
        idEmpleado: h.idEmpleado, colaborador: h.colaborador, esperadas: 0, reportadas: 0, pendientes: 0,
        porcentaje: 100, semaforo: 'Verde', ocasionesConAtraso: 0, detalleAtrasos: '', recurrente: false, historial: [],
        sinHorasPeriodo: true,
      });
    }

    const lista = [...porEmpleado.values()].map((item) => {
      const esperadas = redondear(item.esperadas);
      const reportadas = redondear(item.reportadas);
      const porcentaje = esperadas > 0 ? Math.trunc((reportadas / esperadas) * 10000) / 100 : 100;
      const h = historicoPorEmpleado.get(item.idEmpleado);
      return {
        ...item,
        esperadas,
        reportadas,
        pendientes: redondear(item.pendientes),
        porcentaje,
        semaforo: semaforoDe(porcentaje),
        ocasionesConAtraso: h?.ocasionesConAtraso ?? 0,
        detalleAtrasos: (h?.cortes ?? [])
          .filter((c) => c.conAtraso)
          .map((c) => `${c.quincena === 1 ? '1-15' : '16-fin'} ${MESES_CORTOS[c.mes - 1]} ${c.anio}: ${c.diasIncompletos} días incompletos`)
          .join(' · '),
        // sm - El umbral se aplica aquí (no en el backend): cambiarlo es instantáneo, sin recalcular el histórico.
        recurrente: (h?.ocasionesConAtraso ?? 0) >= this.umbralRecurrencia(),
        historial: mesesHistorico.map((m) => {
          const estadoMes = h?.meses.find((x) => x.anio === m.anio && x.mes === m.mes);
          return {
            etiqueta: `${MESES_CORTOS[m.mes - 1]} ${m.anio}`,
            estado: estadoMes?.estado ?? ('SinDatos' as const),
            porcentaje: estadoMes?.porcentaje ?? null,
          };
        }),
      };
    });

    // sm - Prioridad de seguimiento: recurrentes primero, luego mayor brecha actual.
    return lista
      .filter((c) => c.pendientes > 0 || c.ocasionesConAtraso > 0)
      .sort((a, b) => Number(b.recurrente) - Number(a.recurrente) || b.pendientes - a.pendientes);
  });


  hayFiltrosOpcionales = computed(() => {
    const f = this.filtros();
    return !!(f.idCliente || f.idProyecto || f.idEstado || f.idEmpleado);
  });

  ngOnInit(): void {
    this.servicio
      .getFiltros()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (o) => this.opciones.set(o) });
    this.cargar();
  }

  // =====================================================================
  // Carga
  // =====================================================================
  // sm - Petición en curso del dashboard y del histórico. Cada carga cancela la anterior: tardan varios segundos y,
  // si el usuario cambiaba dos filtros seguidos, la respuesta vieja podía llegar al final y mostrar datos de otro filtro.
  private subDashboard?: Subscription;
  private subHistorico?: Subscription;

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.subDashboard?.unsubscribe();
    this.subDashboard = this.servicio
      .getDashboard(this.filtros())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (d) => {
          this.datos.set(d);
          this.cargando.set(false);
          this.refrescarDetalleAbierto();
        },
        error: () => {
          this.cargando.set(false);
          this.error.set('No se pudo cargar el dashboard. Intenta nuevamente.');
        },
      });
    this.cargarHistorico();
  }

  cargarHistorico(): void {
    this.cargandoHistorico.set(true);
    this.subHistorico?.unsubscribe();
    this.subHistorico = this.servicio
      .getHistorico(this.filtros(), this.mesesVentana(), this.umbralRecurrencia())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (h) => {
          this.historico.set(h);
          // this.umbralRecurrencia.set(h.umbralRecurrencia); // sm - el umbral ya se ajusta en pantalla; si se
          // tomara de la respuesta, un cambio hecho mientras cargaba volvería al valor anterior.
          this.cargandoHistorico.set(false);
        },
        error: () => {
          this.historico.set(null);
          this.cargandoHistorico.set(false);
        },
      });
  }

  // =====================================================================
  // Filtros (RF 01)
  // =====================================================================
  mesDeshabilitado(mes: number): boolean {
    const f = this.filtros();
    return f.anio === this.hoy.getFullYear() && mes > this.hoy.getMonth() + 1;
  }

  actualizarFiltro<K extends keyof DashboardFiltros>(clave: K, valor: DashboardFiltros[K]): void {
    const siguiente = { ...this.filtros(), [clave]: valor };
    // sm - No se permiten periodos futuros: si el año es el actual, el mes no puede pasar del mes en curso.
    if (siguiente.anio === this.hoy.getFullYear() && siguiente.mes > this.hoy.getMonth() + 1) {
      siguiente.mes = this.hoy.getMonth() + 1;
    }
    // sm - Si el proyecto elegido ya no pertenece al cliente/estado elegido, se limpia (y su texto también).
    if (clave === 'idCliente' || clave === 'idEstado') {
      const proyecto = this.opciones().proyectos.find((p) => p.id === siguiente.idProyecto);
      if (
        proyecto &&
        ((siguiente.idCliente && proyecto.idCliente !== siguiente.idCliente) ||
          (siguiente.idEstado && proyecto.idEstado !== siguiente.idEstado))
      ) {
        siguiente.idProyecto = null;
        this.proyectoTexto.set('');
      }
    }
    if (clave === 'horizonte') {
      const n = Math.round(Number(valor));
      siguiente.horizonte = Number.isFinite(n) ? Math.min(365, Math.max(1, n)) : 30;
    }
    this.filtros.set(siguiente);
    this.cargar();
  }

  aNumero(valor: string): number | null {
    return valor ? Number(valor) : null;
  }

  // sm - Cliente: mientras se escribe solo se filtran las opciones del autocompletado (clientesFiltrados);
  // el filtro real cambia solo al elegir una opción o al borrar el campo (vuelve a "todos los clientes").
  onClienteTextoChange(valor: string): void {
    this.clienteTexto.set(valor);
    if (!valor.trim() && this.filtros().idCliente != null) {
      this.actualizarFiltro('idCliente', null);
    }
  }

  seleccionarCliente(event: MatAutocompleteSelectedEvent): void {
    const id = event.option.value as number | null;
    const nombre = id == null ? '' : (this.opciones().clientes.find((c) => c.id === id)?.nombre ?? '');
    this.clienteTexto.set(nombre);
    this.actualizarFiltro('idCliente', id);
  }

  // sm - Al cerrar el autocompletado sin elegir una opción, el campo vuelve a mostrar el cliente realmente aplicado.
  onClientePanelCerrado(): void {
    const id = this.filtros().idCliente;
    this.clienteTexto.set(id == null ? '' : (this.opciones().clientes.find((c) => c.id === id)?.nombre ?? ''));
  }

  private etiquetaProyecto(p: { codigo: string; nombre: string }): string {
    return p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre;
  }

  // sm - Mismo criterio que Cliente: el texto solo filtra el autocompletado hasta que se elige una opción.
  onProyectoTextoChange(valor: string): void {
    this.proyectoTexto.set(valor);
    if (!valor.trim() && this.filtros().idProyecto != null) {
      this.actualizarFiltro('idProyecto', null);
    }
  }

  seleccionarProyecto(event: MatAutocompleteSelectedEvent): void {
    const id = event.option.value as number | null;
    const proyecto = id == null ? null : this.opciones().proyectos.find((p) => p.id === id);
    this.proyectoTexto.set(proyecto ? this.etiquetaProyecto(proyecto) : '');
    this.actualizarFiltro('idProyecto', id);
  }

  onProyectoPanelCerrado(): void {
    const id = this.filtros().idProyecto;
    const proyecto = id == null ? null : this.opciones().proyectos.find((p) => p.id === id);
    this.proyectoTexto.set(proyecto ? this.etiquetaProyecto(proyecto) : '');
  }

  // sm - Limpiar filtros restablece el periodo vigente (RF 01).
  limpiarFiltros(): void {
    this.filtros.set(this.filtrosIniciales());
    this.clienteTexto.set('');
    this.proyectoTexto.set('');
    this.cerrarDetalle();
    this.cargar();
  }

  cambiarVentana(meses: 6 | 12): void {
    if (this.mesesVentana() === meses) return;
    this.mesesVentana.set(meses);
    // sm - Con menos meses hay menos cortes posibles (2 por mes): el umbral no puede superarlos.
    this.umbralRecurrencia.set(Math.min(meses * 2, this.umbralRecurrencia()));
    this.cargarHistorico();
  }

  cambiarUmbral(valor: string): void {
    const n = Math.round(Number(valor));
    if (!Number.isFinite(n)) return;
    // sm - Umbral en ocasiones (cortes): hay dos cortes por mes en la ventana.
    this.umbralRecurrencia.set(Math.min(this.mesesVentana() * 2, Math.max(1, n)));
    // this.cargarHistorico(); // sm - ya no hace falta: "recurrente" se recalcula en pantalla con el nuevo umbral.
  }

  // sm - Seleccionar un mes del histórico lo convierte en el periodo del dashboard.
  seleccionarMesHistorico(anio: number, mes: number): void {
    this.filtros.set({ ...this.filtros(), anio, mes });
    this.cerrarDetalle();
    this.cargar();
  }

  private filtrosIniciales(): DashboardFiltros {
    return {
      anio: this.hoy.getFullYear(),
      mes: this.hoy.getMonth() + 1,
      idCliente: null,
      idProyecto: null,
      idEstado: null,
      idEmpleado: null,
      horizonte: 30,
    };
  }

  // =====================================================================
  // Detalles (cada tarjeta, barra y segmento abre el detalle que respalda su valor)
  // =====================================================================
  abrirTarjeta(clave: string): void {
    const d = this.datos();
    if (!d) return;
    const tarjeta = this.tarjetas().find((t) => t.clave === clave);
    const definicion = tarjeta?.definicion ?? '';

    switch (clave) {
      case 'sinProyecto':
        this.abrirDetalle({
          clave, titulo: 'Colaboradores activos sin proyecto', definicion,
          columnas: [
            { clave: 'colaborador', titulo: 'Colaborador' },
            { clave: 'identificacion', titulo: 'Identificación' },
            { clave: 'cargo', titulo: 'Cargo' },
            { clave: 'responsable', titulo: 'Responsable' },
            { clave: 'fechaIngreso', titulo: 'Fecha de ingreso', tipo: 'fecha' },
            { clave: 'ultimoProyecto', titulo: 'Último proyecto' },
            { clave: 'diasSinAsignacion', titulo: 'Días sin asignación', tipo: 'numero' },
          ],
          filas: d.colaboradoresSinProyecto,
        });
        break;
      case 'ingresos':
      case 'salidas':
        this.abrirDetalle({
          clave, titulo: clave === 'ingresos' ? 'Ingresos del periodo' : 'Salidas del periodo', definicion,
          columnas: [
            { clave: 'colaborador', titulo: 'Colaborador' },
            { clave: 'identificacion', titulo: 'Identificación' },
            { clave: 'cargo', titulo: 'Cargo' },
            { clave: 'fecha', titulo: clave === 'ingresos' ? 'Fecha de ingreso' : 'Fecha de salida', tipo: 'fecha' },
            { clave: 'proyectos', titulo: 'Proyectos' },
          ],
          filas: clave === 'ingresos' ? d.ingresos : d.salidas,
        });
        break;
      case 'clientesActivos': {
        const activos = d.proyectos.filter((p) => p.categorias.includes('Activo') && p.idCliente);
        const porCliente = new Map<string, string[]>();
        activos.forEach((p) => porCliente.set(p.cliente, [...(porCliente.get(p.cliente) ?? []), p.nombre]));
        this.abrirDetalle({
          clave, titulo: 'Clientes con proyectos activos', definicion,
          columnas: [
            { clave: 'cliente', titulo: 'Cliente' },
            { clave: 'cantidad', titulo: 'Proyectos activos', tipo: 'numero' },
            { clave: 'proyectos', titulo: 'Proyectos' },
          ],
          filas: [...porCliente.entries()]
            .map(([cliente, proyectos]) => ({ cliente, cantidad: proyectos.length, proyectos: proyectos.join(', ') }))
            .sort((a, b) => b.cantidad - a.cantidad),
        });
        break;
      }
      case 'desvinculados':
        this.abrirDetalle({
          clave, titulo: 'Proyectos con colaboradores desvinculados', definicion,
          columnas: [
            { clave: 'codigoProyecto', titulo: 'Código' },
            { clave: 'proyecto', titulo: 'Proyecto' },
            { clave: 'cliente', titulo: 'Cliente' },
            { clave: 'colaborador', titulo: 'Colaborador' },
            { clave: 'fechaSalida', titulo: 'Fecha de salida', tipo: 'fecha' },
            { clave: 'fechaAsignacion', titulo: 'Asignado desde', tipo: 'fecha' },
            { clave: 'fechaFinAsignacion', titulo: 'Asignado hasta', tipo: 'fecha' },
            { clave: 'rol', titulo: 'Rol' },
          ],
          filas: d.desvinculados,
        });
        break;
      default:
        this.abrirPortafolio(clave as SeleccionPortafolio);
    }
  }

  abrirPortafolio(seleccion: SeleccionPortafolio): void {
    const d = this.datos();
    if (!d) return;
    const categoria: CategoriaProyecto = seleccion === 'EnProgreso' ? 'Activo' : seleccion;
    const titulos: Record<SeleccionPortafolio, string> = {
      Activo: 'Proyectos activos',
      EnProgreso: 'Proyectos en progreso',
      Vencido: 'Proyectos vencidos',
      Proximo: `Proyectos próximos a terminar (${d.parametros.horizonteDias} días)`,
      Nuevo: 'Proyectos nuevos en el periodo',
      Cerrado: 'Proyectos cerrados en el periodo',
    };
    const columnas: ColumnaDetalle[] = [
      { clave: 'codigo', titulo: 'Código' },
      { clave: 'nombre', titulo: 'Proyecto' },
      { clave: 'cliente', titulo: 'Cliente' },
      { clave: 'responsable', titulo: 'Responsable' },
      { clave: 'estado', titulo: 'Estado' },
      { clave: 'fechaInicio', titulo: 'Inicio', tipo: 'fecha' },
      { clave: 'fechaTermino', titulo: 'Término', tipo: 'fecha' },
    ];
    if (categoria === 'Vencido') columnas.push({ clave: 'diasAtraso', titulo: 'Días de atraso', tipo: 'numero' });
    if (categoria === 'Proximo') columnas.push({ clave: 'diasParaTerminar', titulo: 'Días para terminar', tipo: 'numero' });
    if (categoria === 'Cerrado') columnas.push({ clave: 'fechaCierre', titulo: 'Fecha de cierre', tipo: 'fecha' });

    let filas = d.proyectos.filter((p) => p.categorias.includes(categoria));
    // sm - "En progreso" de la dona excluye los que ya están en Próximos o Vencidos (no se mezclan estados).
    if (seleccion === 'EnProgreso') {
      filas = filas.filter((p) => !p.categorias.includes('Proximo') && !p.categorias.includes('Vencido'));
    }
    if (categoria === 'Vencido') filas = [...filas].sort((a, b) => (b.diasAtraso ?? 0) - (a.diasAtraso ?? 0));

    this.abrirDetalle({
      clave: seleccion,
      titulo: titulos[seleccion],
      definicion: this.definicionPortafolio(seleccion),
      columnas,
      filas,
    });
  }

  // sm - Tooltip con la definición de cada segmento de la dona (6.3).
  // sm - Las definiciones viven aquí desde que se quitaron las tarjetas repetidas de Vencidos, Próximos, Nuevos y Cerrados.
  definicionPortafolio(seleccion: SeleccionPortafolio): string {
    const p = this.datos()?.parametros;
    if (!p) return '';
    switch (seleccion) {
      case 'EnProgreso':
        return `Proyectos en estado ${p.estadosActivos}, vigentes a la fecha de corte, que no están vencidos ni próximos a terminar.`;
      case 'Vencido':
        return `Proyectos no cerrados (${p.estadosCerrados}) con fecha de término anterior a la fecha de corte.`;
      case 'Proximo':
        return `Proyectos no cerrados cuya fecha de término está entre la fecha de corte y los siguientes ${p.horizonteDias} días.`;
      case 'Nuevo':
        return 'Proyectos cuya fecha de inicio (real o planeada) está dentro del mes seleccionado.';
      case 'Cerrado':
        return 'Proyectos Completados o Cancelados con fecha efectiva de cierre (fecha fin real) dentro del mes.';
      default:
        return this.tarjetas().find((t) => t.clave === seleccion)?.definicion ?? '';
    }
  }

  // sm - RF 13 / CA 05: al elegir un cliente se muestran solo sus colaboradores incompletos.
  abrirCliente(idCliente: number, nombre: string): void {
    const d = this.datos();
    if (!d) return;
    this.abrirDetalle({
      clave: `cliente:${idCliente}`,
      titulo: `Colaboradores con horas pendientes · ${nombre}`,
      definicion: 'Colaboradores que no completaron sus horas esperadas en los proyectos del cliente durante el periodo.',
      columnas: this.columnasCumplimiento(),
      filas: d.cumplimientoDetalle.filter((f) => f.idCliente === idCliente && f.pendientes > 0),
      totalesHoras: true,
      conCorreo: true,
    });
  }

  abrirColaborador(idEmpleado: number, nombre: string): void {
    const d = this.datos();
    if (!d) return;
    this.abrirDetalle({
      clave: `colaborador:${idEmpleado}`,
      titulo: `Cumplimiento por proyecto · ${nombre}`,
      definicion: 'Horas esperadas, reportadas y pendientes del colaborador en cada proyecto asignado durante el periodo.',
      columnas: this.columnasCumplimiento(),
      filas: d.cumplimientoDetalle.filter((f) => f.idEmpleado === idEmpleado),
      totalesHoras: true,
      conCorreo: true,
    });
  }

  abrirTodoIncumplimiento(): void {
    const d = this.datos();
    if (!d) return;
    this.abrirDetalle({
      clave: 'incumplimiento',
      titulo: 'Detalle de incumplimiento',
      definicion: 'Todos los colaboradores con horas pendientes en el periodo, ordenados por mayor brecha.',
      columnas: this.columnasCumplimiento(),
      filas: d.cumplimientoDetalle.filter((f) => f.pendientes > 0),
      totalesHoras: true,
      conCorreo: true,
    });
  }

  // sm - Horas registradas que no suman al cumplimiento: explica diferencias con Seguimiento.
  abrirFueraDeAsignacion(): void {
    const d = this.datos();
    if (!d) return;
    this.abrirDetalle({
      clave: 'fueraAsignacion',
      titulo: 'Horas registradas fuera de asignación',
      definicion:
        'Horas del periodo registradas en proyectos donde el colaborador no tiene una asignación vigente (o sin proyecto). ' +
        'No suman al cumplimiento: para que cuenten, hay que asignar a la persona al proyecto con sus fechas.',
      columnas: [
        { clave: 'colaborador', titulo: 'Colaborador' },
        { clave: 'proyecto', titulo: 'Proyecto' },
        { clave: 'cliente', titulo: 'Cliente' },
        { clave: 'horas', titulo: 'Horas', tipo: 'horas' },
        { clave: 'ultimoRegistro', titulo: 'Último registro', tipo: 'fecha' },
      ],
      filas: d.fueraDeAsignacion,
    });
  }

  private columnasCumplimiento(): ColumnaDetalle[] {
    return [
      { clave: 'colaborador', titulo: 'Colaborador' },
      { clave: 'proyecto', titulo: 'Proyecto' },
      { clave: 'cliente', titulo: 'Cliente' },
      { clave: 'vigenciaDesde', titulo: 'Vigencia desde', tipo: 'fecha' },
      { clave: 'vigenciaHasta', titulo: 'Vigencia hasta', tipo: 'fecha' },
      { clave: 'esperadas', titulo: 'Esperadas', tipo: 'horas' },
      { clave: 'reportadas', titulo: 'Reportadas', tipo: 'horas' },
      { clave: 'pendientes', titulo: 'Pendientes', tipo: 'horas' },
      { clave: 'porcentaje', titulo: 'Cumplimiento', tipo: 'porcentaje' },
      { clave: 'semaforo', titulo: 'Semáforo', tipo: 'semaforo' },
      { clave: 'ultimoRegistro', titulo: 'Último registro', tipo: 'fecha' },
      { clave: 'estado', titulo: 'Estado' },
    ];
  }

  private abrirDetalle(detalle: DetalleAbierto): void {
    this.detalle.set(detalle);
  }

  // sm - Al cambiar filtros con un detalle abierto se vuelve a armar con los datos nuevos (la selección se conserva).
  private refrescarDetalleAbierto(): void {
    const actual = this.detalle();
    if (!actual) return;
    const [tipo, id] = actual.clave.split(':');
    if (tipo === 'cliente') {
      const cliente = this.datos()?.cumplimientoClientes.find((c) => c.idCliente === +id);
      cliente ? this.abrirCliente(cliente.idCliente, cliente.cliente) : this.cerrarDetalle();
    } else if (tipo === 'colaborador') {
      this.abrirColaborador(+id, actual.titulo.split(' · ')[1] ?? '');
    } else if (tipo === 'incumplimiento') {
      this.abrirTodoIncumplimiento();
    } else if (tipo === 'fueraAsignacion') {
      this.abrirFueraDeAsignacion();
    } else {
      this.abrirTarjeta(actual.clave);
    }
  }

  cerrarDetalle(): void {
    this.detalle.set(null);
  }

  esSeleccionado(clave: string): boolean {
    return this.detalle()?.clave === clave;
  }

  totalDetalle(clave: string): number {
    return redondear((this.detalle()?.filas ?? []).reduce((suma, f) => suma + (Number(f[clave]) || 0), 0));
  }

  valorCelda(fila: any, columna: ColumnaDetalle): string {
    const valor = fila[columna.clave];
    switch (columna.tipo) {
      case 'fecha': return formatoFecha(valor);
      case 'horas': return formatoHoras(valor);
      case 'porcentaje': return formatoPorcentaje(valor);
      case 'numero': return valor === null || valor === undefined ? '—' : String(valor);
      default: return valor === null || valor === undefined || valor === '' ? '—' : String(valor);
    }
  }

  // =====================================================================
  // Correo de recordatorio (funcionalidad existente, se conserva en el detalle)
  // =====================================================================
  enviarCorreo(fila: CumplimientoDetalle): void {
    const clave = `${fila.idEmpleado}-${fila.idProyecto}`;
    if (this.enviandoCorreo[clave]) return;
    this.enviandoCorreo[clave] = true;
    delete this.resultadoCorreo[clave];
    this.dashboardService
      .enviarNotificacionEmail(fila.idEmpleado, fila.colaborador, fila.proyecto, fila.pendientes)
      .subscribe({
        next: () => {
          this.enviandoCorreo[clave] = false;
          this.resultadoCorreo[clave] = 'ok';
        },
        error: () => {
          this.enviandoCorreo[clave] = false;
          this.resultadoCorreo[clave] = 'error';
        },
      });
  }

  claveCorreo(fila: CumplimientoDetalle): string {
    return `${fila.idEmpleado}-${fila.idProyecto}`;
  }

  // =====================================================================
  // Descargas (RF 14 / CA 12): filtros, fecha de corte, fecha de generación y totales reconciliables
  // =====================================================================
  async descargarDetalle(): Promise<void> {
    const detalle = this.detalle();
    const d = this.datos();
    if (!detalle || !d) return;

    const filas = detalle.filas.map((f) => detalle.columnas.map((c) => this.valorExcel(f, c)));
    if (detalle.totalesHoras && filas.length > 0) {
      filas.push(detalle.columnas.map((c, i) => {
        if (i === 0) return 'TOTAL';
        if (c.tipo === 'horas') return this.totalDetalle(c.clave);
        if (c.clave === 'porcentaje') {
          const esperadas = this.totalDetalle('esperadas');
          return esperadas > 0 ? Math.trunc((this.totalDetalle('reportadas') / esperadas) * 10000) / 100 : 100;
        }
        return '';
      }));
    }

    await exportarReporteExcelMultihoja(
      [
        {
          titulo: detalle.titulo,
          nombreArchivo: '',
          nombreHoja: 'Detalle',
          columnas: detalle.columnas.map((c) => ({
            encabezado: c.tipo === 'horas' ? `${c.titulo} (h)` : c.tipo === 'porcentaje' ? `${c.titulo} (%)` : c.titulo,
            alineacion: ['horas', 'porcentaje', 'numero'].includes(c.tipo ?? '') ? 'right' : 'left',
          })),
          filas,
        },
        this.hojaParametros(detalle.definicion),
      ],
      `Dashboard_${this.nombreArchivo(detalle.titulo)}`,
    );
  }

  // sm - Descarga general: todo el conjunto filtrado del dashboard, en varias hojas.
  async descargarTodo(): Promise<void> {
    const d = this.datos();
    if (!d) return;
    const columnasCumplimiento = this.columnasCumplimiento();

    const hojas: ReporteTabularConfig[] = [
      {
        titulo: 'Cumplimiento por cliente',
        nombreArchivo: '',
        nombreHoja: 'Clientes',
        columnas: [
          { encabezado: 'Cliente' },
          { encabezado: 'Esperadas (h)', alineacion: 'right' },
          { encabezado: 'Reportadas (h)', alineacion: 'right' },
          { encabezado: 'Pendientes (h)', alineacion: 'right' },
          { encabezado: 'Cumplimiento (%)', alineacion: 'right' },
          { encabezado: 'Semáforo' },
          { encabezado: 'Colaboradores', alineacion: 'right' },
          { encabezado: 'Incompletos', alineacion: 'right' },
        ],
        filas: [
          ...d.cumplimientoClientes.map((c) => [
            c.cliente, c.esperadas, c.reportadas, c.pendientes, c.porcentaje, c.semaforo,
            c.colaboradores, c.colaboradoresIncompletos,
          ]),
          ['TOTAL', d.cumplimientoTotal.esperadas, d.cumplimientoTotal.reportadas, d.cumplimientoTotal.pendientes,
            d.cumplimientoTotal.porcentaje, d.cumplimientoTotal.semaforo, '', ''],
        ],
      },
      {
        titulo: 'Detalle de cumplimiento',
        nombreArchivo: '',
        nombreHoja: 'Detalle cumplimiento',
        columnas: columnasCumplimiento.map((c) => ({
          encabezado: c.tipo === 'horas' ? `${c.titulo} (h)` : c.tipo === 'porcentaje' ? `${c.titulo} (%)` : c.titulo,
          alineacion: ['horas', 'porcentaje'].includes(c.tipo ?? '') ? 'right' : 'left',
        })),
        filas: d.cumplimientoDetalle.map((f) => columnasCumplimiento.map((c) => this.valorExcel(f, c))),
      },
      {
        titulo: 'Proyectos del periodo',
        nombreArchivo: '',
        nombreHoja: 'Proyectos',
        columnas: [
          { encabezado: 'Código' }, { encabezado: 'Proyecto' }, { encabezado: 'Cliente' }, { encabezado: 'Responsable' },
          { encabezado: 'Estado' }, { encabezado: 'Inicio' }, { encabezado: 'Término' }, { encabezado: 'Cierre' },
          { encabezado: 'Categorías' },
        ],
        filas: d.proyectos.map((p) => [
          p.codigo, p.nombre, p.cliente, p.responsable, p.estado, formatoFecha(p.fechaInicio),
          formatoFecha(p.fechaTermino), formatoFecha(p.fechaCierre), p.categorias.map(nombreCategoria).join(', '),
        ]),
      },
      this.hojaParametros('Dashboard Time Report: conjunto completo con los filtros aplicados.'),
    ];

    await exportarReporteExcelMultihoja(hojas, `Dashboard_${MESES[d.periodo.mes - 1]}_${d.periodo.anio}`);
  }

  private hojaParametros(definicion: string): ReporteTabularConfig {
    const d = this.datos()!;
    const f = this.filtros();
    const nombre = (lista: { id: number; nombre: string }[], id: number | null) =>
      id ? lista.find((x) => x.id === id)?.nombre ?? String(id) : 'Todos';
    const o = this.opciones();

    return {
      titulo: 'Filtros y parámetros',
      nombreArchivo: '',
      nombreHoja: 'Parámetros',
      columnas: [{ encabezado: 'Dato', anchoExcel: 32 }, { encabezado: 'Valor', anchoExcel: 90 }],
      filas: [
        ['Indicador', definicion],
        ['Periodo', `${MESES[d.periodo.mes - 1]} ${d.periodo.anio}`],
        ['Fecha de corte', formatoFecha(d.periodo.fechaCorte)],
        ['Fecha de generación', formatoFechaHora(d.periodo.fechaGeneracion)],
        ['Último registro de actividades', formatoFechaHora(d.periodo.ultimoRegistroActividad)],
        ['Cliente', nombre(o.clientes, f.idCliente)],
        ['Proyecto', nombre(o.proyectos, f.idProyecto)],
        ['Estado de proyecto', nombre(o.estados, f.idEstado)],
        ['Colaborador', nombre(o.colaboradores, f.idEmpleado)],
        ['Horizonte próximos a terminar', `${d.parametros.horizonteDias} días`],
        ['Semáforo', `Verde ≥ ${d.parametros.umbralVerde} %, Amarillo ≥ ${d.parametros.umbralAmarillo} %, Rojo < ${d.parametros.umbralAmarillo} %`],
        ['Estados activos', d.parametros.estadosActivos],
        ['Estados cerrados', d.parametros.estadosCerrados],
        ['Horas esperadas', d.parametros.reglaJornada],
        ['Reparto entre proyectos', d.parametros.reglaReparto],
        ['Vacaciones y permisos', d.parametros.fuenteNovedades],
        // sm - RF 16: también la regla de recurrencia y de cierre de mes que se aplicaron.
        ['Recurrencia', `${this.umbralRecurrencia()} o más ocasiones con atraso en los últimos ${this.mesesVentana()} meses. ` +
          (this.historico()?.reglaRecurrencia ?? '')],
        ['Cierre de mes', this.historico()?.reglaCierre ?? '—'],
        ['Fuente', 'TMR: actividades diarias, asignaciones de proyectos, colaboradores y feriados'],
      ],
    };
  }

  private valorExcel(fila: any, columna: ColumnaDetalle): string | number {
    const valor = fila[columna.clave];
    if (columna.tipo === 'horas' || columna.tipo === 'porcentaje' || columna.tipo === 'numero') {
      return valor === null || valor === undefined ? '' : Number(valor);
    }
    if (columna.tipo === 'fecha') return valor ? formatoFecha(valor) : '';
    return valor ?? '';
  }

  private nombreArchivo(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').replace(/_+$/, '');
  }

  // =====================================================================
  // Apoyo para la vista
  // =====================================================================
  // sm - Las funciones de apoyo se movieron a dashboard-ejecutivo.utils.ts (las comparte brecha-historico).
  claseSemaforo(semaforo: Semaforo | string): string {
    return claseSemaforo(semaforo);
  }

  etiquetaEstado(estado: EstadoHistorico | 'SinDatos'): string {
    return etiquetaEstado(estado);
  }

  etiquetaMes(anio: number, mes: number): string {
    return etiquetaMes(anio, mes);
  }

  anchoBarra(porcentaje: number): number {
    return anchoBarra(porcentaje);
  }
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function semaforoDe(porcentaje: number): Semaforo {
  return porcentaje >= 100 ? 'Verde' : porcentaje >= 80 ? 'Amarillo' : 'Rojo';
}

function nombreCategoria(categoria: CategoriaProyecto): string {
  return {
    Activo: 'En progreso',
    Vencido: 'Vencido',
    Proximo: 'Próximo a terminar',
    Nuevo: 'Nuevo',
    Cerrado: 'Cerrado',
  }[categoria];
}
