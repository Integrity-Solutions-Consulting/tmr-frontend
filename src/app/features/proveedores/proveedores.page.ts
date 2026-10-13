import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { TokenService } from '../../features/auth/servicios/token.service';
import Swal from 'sweetalert2';
import { environment } from '../../../environments/environment';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { PaginacionComponent } from '../../shared/components/paginacion/paginacion.component';
import { exportarReporteExcel, exportarReportePdf } from '../../shared/utils/reporte-export.utils';
import { rucEcuatorianoValidator } from '../../shared/validators/form-validators';

interface TipoProveedor { id: number; nombre: string; }
interface Proveedor { id: number; nombreproveedor: string; ruc?: string; email?: string; telefono?: string; direccion?: string; activo: boolean; idtipoproveedor?: number; tipoProveedor?: string; fechacreacion: string; }
interface ProveedoresPaginados { items: Proveedor[]; total: number; pagina: number; tamanoPagina: number; }

@Component({
  selector: 'app-proveedores-page', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent, PaginacionComponent],
  templateUrl: './proveedores.page.html', styleUrl: './proveedores.page.scss',
})
export class ProveedoresPage implements OnInit {
  private http = inject(HttpClient); private fb = inject(FormBuilder); private tokenService = inject(TokenService);
  private readonly url = `${environment.apiUrl}/proveedores`;
  proveedores: Proveedor[] = []; tipos: TipoProveedor[] = []; cargando = false; error = ''; pagina = 1; porPagina = 10; total = 0;
  orden = 'nombreproveedor'; asc = true; editando: Proveedor | null = null; modalAbierto = false; guardando = false;
  get puedeGestionar(): boolean { return this.tokenService.canManageProveedores(); }
  filtros = this.fb.nonNullable.group({ busqueda: '', tipoProveedorId: '', estado: '' });
  form = this.fb.group({ nombreProveedor: ['', [Validators.required, Validators.maxLength(150)]], idTipoProveedor: ['', Validators.required], ruc: ['', [Validators.maxLength(13), rucEcuatorianoValidator()]], email: ['', [Validators.email, Validators.maxLength(100)]], telefono: ['', Validators.maxLength(20)], direccion: ['', Validators.maxLength(255)], activo: [true] });

  ngOnInit(): void { this.cargarTipos(); this.cargar(); }
  get totalPaginas(): number { return Math.max(1, Math.ceil(this.total / this.porPagina)); }
  cargar(): void {
    this.cargando = true; this.error = '';
    const params = this.parametrosConsulta(this.pagina, this.porPagina);
    this.http.get<ProveedoresPaginados>(this.url, { params, withCredentials: true }).subscribe({ next: r => { this.proveedores = r.items; this.total = r.total; this.cargando = false; this.ajustarPagina(); }, error: () => { this.error = 'No fue posible cargar los proveedores.'; this.cargando = false; } });
  }
  cargarTipos(): void { this.http.get<TipoProveedor[]>(`${this.url}/tipos`, { withCredentials: true }).subscribe({ next: r => this.tipos = r, error: () => this.tipos = [] }); }
  filtrar(): void { this.pagina = 1; this.cargar(); }
  limpiar(): void { this.filtros.reset({ busqueda: '', tipoProveedorId: '', estado: '' }); this.pagina = 1; this.cargar(); }
  ordenar(campo: string): void { this.asc = this.orden === campo ? !this.asc : true; this.orden = campo; this.cargar(); }
  abrirCrear(): void { this.editando = null; this.form.reset({ activo: true, nombreProveedor: '', idTipoProveedor: '', ruc: '', email: '', telefono: '', direccion: '' }); this.modalAbierto = true; }
  abrirEditar(item: Proveedor): void { this.editando = item; this.form.reset({ nombreProveedor: item.nombreproveedor, idTipoProveedor: item.idtipoproveedor?.toString() ?? '', ruc: item.ruc ?? '', email: item.email ?? '', telefono: item.telefono ?? '', direccion: item.direccion ?? '', activo: item.activo }); this.modalAbierto = true; }
  cerrar(): void { if (this.form.dirty && !confirm('Hay cambios sin guardar. ¿Desea descartarlos?')) return; this.modalAbierto = false; }
  guardar(): void {
    if (this.form.invalid || this.guardando) { this.form.markAllAsTouched(); return; }
    this.guardando = true; const v = this.form.getRawValue(); const body = { ...v, idTipoProveedor: v.idTipoProveedor ? +v.idTipoProveedor : null };
    const request = this.editando ? this.http.put(`${this.url}/${this.editando.id}`, body, { withCredentials: true }) : this.http.post(this.url, body, { withCredentials: true });
    request.subscribe({ next: () => { this.guardando = false; this.modalAbierto = false; Swal.fire('Guardado', `Proveedor ${this.editando ? 'actualizado' : 'registrado'} correctamente.`, 'success'); this.cargar(); }, error: e => { this.guardando = false; Swal.fire('No se pudo guardar', e.error?.detail ?? 'Revise los datos e inténtelo nuevamente.', 'error'); } });
  }
  async eliminar(item: Proveedor): Promise<void> { const r = await Swal.fire({ title: '¿Desactivar proveedor?', text: item.nombreproveedor, icon: 'warning', showCancelButton: true, confirmButtonText: 'Desactivar', cancelButtonText: 'Cancelar' }); if (!r.isConfirmed) return; this.http.delete(`${this.url}/${item.id}`, { withCredentials: true }).subscribe({ next: () => { Swal.fire('Proveedor desactivado', '', 'success'); this.cargar(); }, error: e => Swal.fire('No se puede eliminar', e.error?.detail ?? 'Ocurrió un error.', 'error') }); }
  ver(item: Proveedor): void { this.http.get<any>(`${this.url}/${item.id}`, { withCredentials: true }).subscribe({ next: r => Swal.fire({ title: r.proveedor.nombreproveedor, html: `<p><b>Tipo:</b> ${r.proveedor.tipoProveedor ?? 'Sin tipo'}</p><p><b>RUC:</b> ${r.proveedor.ruc ?? '—'}</p><p><b>Correo:</b> ${r.proveedor.email ?? '—'}</p><p><b>Teléfono:</b> ${r.proveedor.telefono ?? '—'}</p><p><b>Facturas relacionadas:</b> ${r.facturasRelacionadas}</p>`, confirmButtonText: 'Cerrar' }), error: () => Swal.fire('Error', 'No fue posible obtener el detalle.', 'error') }); }
  async exportar(tipo: 'excel' | 'pdf'): Promise<void> { try { const resultado = await this.http.get<ProveedoresPaginados>(this.url, { params: this.parametrosConsulta(1, 10_000), withCredentials: true }).toPromise(); const filas = (resultado?.items ?? []).map(x => [x.nombreproveedor, x.tipoProveedor ?? '—', x.ruc ?? '—', x.email ?? '—', x.telefono ?? '—', x.direccion ?? '—', x.activo ? 'Activo' : 'Inactivo']); const config = { titulo: `Reporte de Proveedores (${filas.length} registros)`, nombreArchivo: 'Proveedores', nombreHoja: 'Proveedores', columnas: ['Proveedor', 'Tipo', 'RUC', 'Correo', 'Teléfono', 'Dirección', 'Estado'].map(encabezado => ({ encabezado })), filas, columnaEstado: 6, orientacionPdf: 'landscape' as const, subtituloPdf: 'Datos según los filtros aplicados' }; if (tipo === 'excel') await exportarReporteExcel(config); else await exportarReportePdf(config); } catch { Swal.fire('No se pudo exportar', 'No fue posible obtener los proveedores para el reporte.', 'error'); } }
  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }
  private ajustarPagina(): void { if (this.pagina > this.totalPaginas) this.pagina = this.totalPaginas; }
  private parametrosConsulta(pagina: number, tamanoPagina: number): HttpParams {
    const f = this.filtros.getRawValue();
    let params = new HttpParams().set('pagina', pagina).set('tamanoPagina', tamanoPagina).set('ordenarPor', this.orden === 'tipoProveedor' ? 'tipo' : this.orden === 'activo' ? 'estado' : this.orden).set('ascendente', this.asc);
    if (f.busqueda.trim()) params = params.set('busqueda', f.busqueda.trim());
    if (f.tipoProveedorId) params = params.set('tipoProveedorId', f.tipoProveedorId);
    if (f.estado) params = params.set('activo', f.estado);
    return params;
  }
}
