import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http'; 
import { forkJoin } from 'rxjs';
import { ModalLider } from './modal-lider/modal-lider';
import { environment } from '../../../../environments/environment';
import { ModalDetalleLider } from './modal-detalle-lider/modal-detalle-lider';
import { ModalDescargaComponent } from './modal-descarga/modal-descarga.component';
import { ModalConfirmacion } from './modal-confirmacion/modal-confirmacion';
import { ModalEliminarLiderComponent } from './modal-eliminar-lider/modal-eliminar-lider.component';

export interface ProyectoAsignado {
  id?: number;
  codigo: string;
  nombre: string;
  cliente: string;
  estado: string;
}

export interface Lider {
  id?: number;
  codigo: string;
  tipo: 'Interno' | 'Externo';
  nombre: string;
  cliente: string;
  correo: string;
  telefono: string;
  estado: 'Activo' | 'Inactivo';
  proyectos: ProyectoAsignado[];
}

@Component({
  selector: 'app-lideres',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    ModalLider,
    ModalDetalleLider,
    ModalDescargaComponent,
    ModalConfirmacion,
    ModalEliminarLiderComponent
  ],
  templateUrl: './lideres.component.html',
  styleUrls: ['./lideres.component.scss'],
})
export class LideresComponent implements OnInit {

  lideres: Lider[] = []; 
  lideresFiltrados: Lider[] = [];
  lideresPaginados: Lider[] = [];

  private apiUrl = `${environment.apiUrl}/lideres`;

  busqueda = '';
  tipoFiltro = '';
  estadoFiltro: 'Activo' | 'Inactivo' | '' = 'Activo';

  paginaActual = 1;
  porPagina = 10;
  totalPaginas = 1;
  paginas: number[] = [];

  mostrarFormulario = false;
  mostrarDetalle = false;
  mostrarDescarga = false;
  mostrarConfirmacion = false;
  mensajeConfirmacion = '';
  liderSeleccionado: any = null;
  liderParaEditar: any = null;
  modoEdicion = false;
  liderEditando: Lider | null = null;
  liderForm!: FormGroup;
  guardandoLider = false;
  mostrarEstadoDropdown = false;

  // ── Eliminar ───────────────────────────────────────────
  mostrarEliminar = false;
  liderAEliminar: Lider | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) { }

  ngOnInit(): void {
    this.liderForm = this.fb.group({
      codigo: ['', Validators.required],
      tipo: ['', Validators.required],
      nombre: ['', Validators.required],
      cliente: [''],
      correo: ['', [Validators.required, Validators.email]],
      telefono: [''],
      estado: ['Activo', Validators.required],
    });
    
    this.obtenerLideresDelBackend();
  }

  obtenerLideresDelBackend(): void {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (lideres) => {
        this.http.get<any[]>(`${environment.apiUrl}/proyectos`).subscribe({
          next: (proyectos) => {
            this.procesarLideres(lideres, proyectos);
          },
          error: () => {
            this.procesarLideres(lideres, []);
          }
        });
      },
      error: (err) => {
        console.error('❌ Error al traer líderes:', err);
      }
    });
  }

  private procesarLideres(lideres: any[], proyectos: any[]): void {
    const infoPorLider = new Map<number, { clientes: Set<string>; proyectos: Map<number, ProyectoAsignado> }>();

    proyectos.forEach((proyecto: any) => {
      const liderId = proyecto.idLider;
      if (liderId == null) return;

      const entrada = infoPorLider.get(liderId) ?? { clientes: new Set<string>(), proyectos: new Map<number, ProyectoAsignado>() };
      if (proyecto.cliente) entrada.clientes.add(proyecto.cliente);

      const proyectoId = proyecto.id ?? Math.random();
      entrada.proyectos.set(proyectoId, {
        id: proyecto.id,
        codigo: proyecto.codigo ?? '',
        nombre: proyecto.nombre ?? '',
        cliente: proyecto.cliente ?? '',
        estado: proyecto.estado ?? ''
      });

      infoPorLider.set(liderId, entrada);
    });

    this.lideres = lideres.map((l, i) => {
      const datos = infoPorLider.get(l.id) ?? { clientes: new Set<string>(), proyectos: new Map<number, ProyectoAsignado>() };
      return {
        ...l,
        id: l.id,
        idPersona: l.idPersona ?? l.idpersona ?? l.Idpersona ?? null,
        nombres: l.nombres,
        apellidos: l.apellidos,
        email: l.email,
        codigo: String(i + 1),
        nombre: `${l.nombres} ${l.apellidos}`,
        tipo: l.tipoNombre?.toLowerCase().includes('interno') ? 'Interno' : 'Externo',
        correo: l.email,
        telefono: l.telefono ?? '',
        cliente: Array.from(datos.clientes).join(', '),
        proyectos: Array.from(datos.proyectos.values()),
        estado: l.activo ? 'Activo' : 'Inactivo'
      };
    });

    this.aplicarFiltros();
  }

  get totalInternos(): number {
    return this.lideres.filter(l => l.tipo === 'Interno').length;
  }

  get totalExternos(): number {
    return this.lideres.filter(l => l.tipo === 'Externo').length;
  }

  get totalInactivos(): number {
    return this.lideres.filter(l => l.estado === 'Inactivo').length;
  }

  get totalActivos(): number {
    return this.lideres.filter(l => l.estado === 'Activo').length;
  }

  get rangoInicio(): number {
    return this.lideresFiltrados.length === 0 ? 0 : (this.paginaActual - 1) * this.porPagina + 1;
  }

  get rangoFin(): number {
    return Math.min(this.paginaActual * this.porPagina, this.lideresFiltrados.length);
  }

  filtrarPor(tipo: string): void {
    if (tipo === 'Inactivo') {
      this.estadoFiltro = this.estadoFiltro === 'Inactivo' ? 'Activo' : 'Inactivo';
      this.tipoFiltro = '';
    } else {
      if (this.tipoFiltro === tipo) {
        this.tipoFiltro = '';
        this.estadoFiltro = 'Activo';
      } else {
        this.tipoFiltro = tipo;
      }
    }
    this.aplicarFiltros();
  }

  filtrarEstado(estado: 'Activo' | 'Inactivo' | ''): void {
    this.estadoFiltro = estado === 'Activo' || estado === 'Inactivo' ? estado : 'Activo';
    this.aplicarFiltros();
  }

  toggleEstadoDropdown(event?: Event): void {
    event?.stopPropagation();
    this.mostrarEstadoDropdown = !this.mostrarEstadoDropdown;
  }

  seleccionarEstado(estado: 'Activo' | 'Inactivo' | ''): void {
    this.estadoFiltro = estado === 'Activo' || estado === 'Inactivo' ? estado : '';
    this.mostrarEstadoDropdown = false;
    this.aplicarFiltros();
  }

  cerrarDropdowns(): void {
    this.mostrarEstadoDropdown = false;
  }

  aplicarFiltros(): void {
    const texto = this.busqueda.toLowerCase();
    this.lideresFiltrados = this.lideres.filter(l => {
      const matchTexto = !texto ||
        (l.nombre && l.nombre.toLowerCase().includes(texto)) ||
        (l.codigo && l.codigo.toLowerCase().includes(texto)) ||
        (l.correo && l.correo.toLowerCase().includes(texto)) ||
        (l.cliente && l.cliente.toLowerCase().includes(texto));
      const matchTipo = !this.tipoFiltro || l.tipo === this.tipoFiltro;
      const matchEstado = !this.estadoFiltro || l.estado === this.estadoFiltro;
      return matchTexto && matchTipo && matchEstado;
    });
    this.totalPaginas = Math.max(1, Math.ceil(this.lideresFiltrados.length / this.porPagina));
    this.paginaActual = 1;
    this.calcularPaginas();
    this.actualizarPaginados();
  }

  calcularPaginas(): void {
    const max = Math.min(this.totalPaginas, 4);
    const inicio = Math.max(1, Math.min(this.paginaActual - 2, this.totalPaginas - max + 1));
    this.paginas = Array.from({ length: max }, (_, i) => inicio + i);
  }

  actualizarPaginados(): void {
    const inicio = (this.paginaActual - 1) * this.porPagina;
    this.lideresPaginados = this.lideresFiltrados.slice(inicio, inicio + this.porPagina);
  }

  irPagina(p: number): void {
    this.paginaActual = p;
    this.calcularPaginas();
    this.actualizarPaginados();
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) this.irPagina(this.paginaActual - 1);
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) this.irPagina(this.paginaActual + 1);
  }

  abrirFormulario(): void {
    this.mostrarDescarga = false;
    this.modoEdicion = false;
    this.liderEditando = null;
    this.liderParaEditar = null;
    this.guardandoLider = false;
    this.liderForm.reset({ estado: 'Activo' });
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.liderEditando = null;
    this.liderParaEditar = null;
    this.guardandoLider = false;
    this.liderForm.reset();
  }

  verLider(lider: Lider, numero: number): void {
    this.mostrarDescarga = false;
    this.liderSeleccionado = { ...lider, numero };
    if (!this.liderSeleccionado.proyectos) {
      this.liderSeleccionado.proyectos = [];
    }
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.liderSeleccionado = null;
  }

  editarLider(lider: Lider): void {
    this.mostrarDescarga = false;
    this.modoEdicion = true;
    this.liderEditando = lider;
    this.liderParaEditar = { ...lider };
    this.guardandoLider = false;
    this.mostrarFormulario = true;
  }

  guardarLider(payload: any): void {
    if (this.guardandoLider) return;

    if (!this.modoEdicion && this.liderYaExiste(payload)) {
      this.mensajeConfirmacion = 'Ya existe un líder con los mismos datos de contacto o colaborador asignado.';
      this.mostrarConfirmacion = true;
      setTimeout(() => this.mostrarConfirmacion = false, 3000);
      return;
    }

    this.guardandoLider = true;

    const solicitud = this.modoEdicion && this.liderParaEditar?.id
      ? {
          Idlider: Number(this.liderParaEditar.id),
          Idpersona: payload.personaId ? Number(payload.personaId) : null,
          Nombres: payload.nombres.trim(),
          Apellidos: payload.apellidos.trim(),
          Email: payload.correo ? payload.correo.trim() : null,
          Telefono: payload.telefono ? payload.telefono.trim() : null,
          Idtipo: payload.tipoId ? Number(payload.tipoId) : undefined,
          Activo: payload.estado === 'Activo',
          NumeroIdentificacion: payload.identificacion ? payload.identificacion.trim() : null,
          Usuariomodificacion: 'frontend',
          Ipmodificacion: '127.0.0.1'
        }
      : {
          Idpersona: payload.personaId ? Number(payload.personaId) : null,
          Idtipo: payload.tipoId ? Number(payload.tipoId) : undefined,
          Nombres: payload.nombres.trim(),    
          Apellidos: payload.apellidos.trim(), 
          Email: payload.correo ? payload.correo.trim() : null,        
          Telefono: payload.telefono ? payload.telefono.trim() : null,
          NumeroIdentificacion: payload.identificacion ? payload.identificacion.trim() : null,
          Usuariocreacion: 'frontend',
          Ipcreacion: '127.0.0.1'
        };

    const request$ = this.modoEdicion && this.liderParaEditar?.id
      ? this.http.put(`${this.apiUrl}/${this.liderParaEditar.id}`, solicitud)
      : this.http.post(this.apiUrl, solicitud);

    request$.subscribe({
      next: () => {
        this.guardandoLider = false;
        this.mensajeConfirmacion = this.modoEdicion
          ? 'Los cambios han sido<br>guardados exitosamente'
          : 'El nuevo líder ha sido<br>agregado exitosamente';
        this.mostrarConfirmacion = true;
        this.mostrarFormulario = false;
        this.liderEditando = null;
        this.obtenerLideresDelBackend(); 
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      },
      error: (err) => {
        this.guardandoLider = false;
        console.error('❌ Error al guardar líder en el servidor:', err);
        this.mensajeConfirmacion = 'No se pudo guardar el líder. Intente de nuevo.';
        this.mostrarConfirmacion = true;
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      }
    });
  }

  private liderYaExiste(payload: any): boolean {
    if (payload.personaId) {
      return this.lideres.some(lider => lider.id === Number(payload.personaId));
    }

    const correo = this.normalizarTexto(payload.correo);
    const telefono = this.normalizarTexto(payload.telefono);
    const nombreCompleto = this.normalizarTexto(`${payload.nombres ?? ''} ${payload.apellidos ?? ''}`);

    return this.lideres.some(lider =>
      (lider.correo && this.normalizarTexto(lider.correo) === correo)
      || (lider.telefono && this.normalizarTexto(lider.telefono) === telefono)
      || (lider.nombre && this.normalizarTexto(lider.nombre) === nombreCompleto)
    );
  }

  private normalizarTexto(valor: unknown): string {
    return String(valor ?? '').trim().toLowerCase();
  }

  abrirDescarga(): void {
    this.mostrarDescarga = true;
  }

  cerrarDescarga(): void {
    this.mostrarDescarga = false;
  }

  descargarPDF(): void {
    const doc = new jsPDF();
    doc.setTextColor(115, 115, 115);
    doc.text('Lista de Líderes', 14, 16);
    doc.setTextColor(0, 0, 0);
    autoTable(doc, {
      head: [['#', 'Tipo', 'Nombre', 'Cliente', 'Correo', 'Teléfono', 'Estado']],
      body: this.lideres.map((l, i) => [
        i + 1, l.tipo, l.nombre, l.cliente, l.correo, l.telefono, l.estado
      ]),
      startY: 22,
      headStyles: {
        fillColor: [22, 53, 114],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    doc.save('lideres.pdf');
    this.mostrarDescarga = false;
  }

  descargarExcel(): void {
    const datos = this.lideres.map((l, i) => ({
      '#': i + 1,
      'Tipo': l.tipo,
      'Nombre': l.nombre,
      'Cliente': l.cliente,
      'Correo': l.correo,
      'Teléfono': l.telefono,
      'Estado': l.estado
    }));
    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Líderes');
    XLSX.writeFile(wb, 'lideres.xlsx');
    this.mostrarDescarga = false;
  }

  toggleEstadoLider(lider: Lider): void {
    const nuevoEstado = lider.estado !== 'Activo';
    const nombres = (lider as any).nombres || '';
    const apellidos = (lider as any).apellidos || '';
    const email = (lider as any).email || (lider as any).correo || null;
    const telefono = (lider as any).telefono || null;
    const numeroIdentificacion = (lider as any).numeroIdentificacion || null;
    const idTipo = (lider as any).idtipo || null;

    const solicitud = {
      Nombres: nombres,
      Apellidos: apellidos,
      Email: email,
      Telefono: telefono,
      Idtipo: idTipo,
      Activo: nuevoEstado,
      NumeroIdentificacion: numeroIdentificacion,
      Usuariomodificacion: 'frontend',
      Ipmodificacion: '127.0.0.1'
    };

    this.http.put(`${this.apiUrl}/${lider.id}`, solicitud).subscribe({
      next: () => {
        this.mensajeConfirmacion = nuevoEstado
          ? 'El líder ha sido activado exitosamente'
          : 'El líder ha sido desactivado exitosamente';
        this.mostrarConfirmacion = true;
        this.obtenerLideresDelBackend();
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      },
      error: (err) => console.error('Error al cambiar estado del líder:', err)
    });
  }

  abrirEliminar(lider: Lider): void {
    this.liderAEliminar = lider;
    this.mostrarEliminar = true;
  }

  confirmarEliminarLider(): void {
    if (!this.liderAEliminar) return;
    const id = this.liderAEliminar.id ?? this.liderAEliminar.codigo;
    this.http.delete(`${this.apiUrl}/${id}`).subscribe({
      next: () => {
        this.mostrarEliminar = false;
        this.liderAEliminar = null;
        this.mensajeConfirmacion = 'El líder ha sido eliminado exitosamente';
        this.mostrarConfirmacion = true;
        this.obtenerLideresDelBackend();
        setTimeout(() => this.mostrarConfirmacion = false, 3000);
      },
      error: (err) => console.error('Error al eliminar líder:', err)
    });
  }
}