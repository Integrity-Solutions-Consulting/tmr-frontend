import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ActualizacionDatosService } from '../../../actualizacion-datos/actualizacion-datos.service';
import { ColaboradoresService } from '../../servicios/colaboradores.service';
import { UserModulesService } from '../../../auth/servicios/user-modules.service';
import { BadgeEstadoComponent } from '../../../../shared/components/badge-estado/badge-estado.component';
import { Boton } from '../../../../shared/components/boton/boton';
import { ProyectoAsignado } from '../../models/colaborador.model';

type Tab = 'general' | 'proyectos' | 'familia' | 'formacion' | 'certificaciones' | 'historial';

@Component({ selector: 'app-detalle-colaborador-page', standalone: true, imports: [CommonModule, Boton, BadgeEstadoComponent], templateUrl: './detalle-colaborador-page.component.html', styleUrl: './detalle-colaborador-page.component.scss' })
export class DetalleColaboradorPageComponent {
  private route = inject(ActivatedRoute); private router = inject(Router);
  private expedienteApi = inject(ActualizacionDatosService); private colaboradoresApi = inject(ColaboradoresService); private permissions = inject(UserModulesService);
  expediente: any; proyectos: ProyectoAsignado[] = []; tab: Tab = 'general'; loading = true; proyectosLoading = true; proyectosError = ''; error = ''; canReadRestricted = false; private id = 0; selectedRequest: any;

  ngOnInit(): void {
    this.canReadRestricted = this.permissions.hasPermission('COLABORADORES_DATOS_REVISAR');
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.route.queryParams.subscribe(params => { const requested = params['tab'] as Tab; this.tab = this.validTab(requested) && (requested === 'general' || requested === 'proyectos' || this.canReadRestricted) ? requested : 'general'; });
    if (!this.id) { this.error = 'El identificador del colaborador no es válido.'; this.loading = false; this.proyectosLoading = false; return; }
    this.cargarExpediente(); this.cargarProyectos();
  }
  private cargarExpediente(): void { this.loading = true; this.expedienteApi.getExpediente(this.id).subscribe({ next: value => { this.expediente = value; this.loading = false; }, error: err => { this.error = err.status === 403 ? 'No tienes permiso para consultar este expediente.' : 'No fue posible cargar el expediente.'; this.loading = false; } }); }
  cargarProyectos(): void { this.proyectosLoading = true; this.proyectosError = ''; this.colaboradoresApi.getColaboradorById(String(this.id)).subscribe({ next: value => { this.proyectos = value.proyectosAsignados ?? []; this.proyectosLoading = false; }, error: () => { this.proyectos = []; this.proyectosLoading = false; this.proyectosError = 'No fue posible cargar los proyectos.'; } }); }
  setTab(tab: Tab): void { if (tab !== 'general' && tab !== 'proyectos' && !this.canReadRestricted) return; this.tab = tab; this.router.navigate([], { relativeTo: this.route, queryParams: { tab }, queryParamsHandling: 'merge' }); }
  private validTab(tab: string): tab is Tab { return ['general', 'proyectos', 'familia', 'formacion', 'certificaciones', 'historial'].includes(tab); }
  volver(): void { this.router.navigate(['/colaboradores'], { queryParams: this.route.snapshot.queryParams }); }
  descargar(file: any): void { this.expedienteApi.downloadExpedienteFile(this.id, file.id).subscribe(blob => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.nombreOriginal; anchor.click(); URL.revokeObjectURL(url); }); }
  seleccionarSolicitud(request: any): void { if (!request.version) return; this.selectedRequest = undefined; this.expedienteApi.detail(request.id).subscribe({ next: value => this.selectedRequest = value, error: () => this.error = 'No fue posible cargar el historial.' }); }
  formatFecha(value?: string | null): string { if (!value) return '—'; const raw = String(value).slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) { const [y, m, d] = raw.split('-'); return `${d}/${m}/${y}`; } return String(value); }
}
