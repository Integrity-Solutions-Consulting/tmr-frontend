import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ActualizacionDatosService } from '../../../actualizacion-datos/actualizacion-datos.service';
import { UserModulesService } from '../../../auth/servicios/user-modules.service';
import { Boton } from '../../../../shared/components/boton/boton';

@Component({ selector: 'app-detalle-colaborador-page', standalone: true, imports: [CommonModule, Boton], templateUrl: './detalle-colaborador-page.component.html', styleUrl: './detalle-colaborador-page.component.scss' })
export class DetalleColaboradorPageComponent {
  private route = inject(ActivatedRoute); private router = inject(Router); private api = inject(ActualizacionDatosService); private permissions = inject(UserModulesService);
  expediente: any; tab: 'general' | 'familia' | 'formacion' | 'certificaciones' | 'historial' = 'general'; loading = true; error = ''; canReadRestricted = false; private id = 0; selectedRequest: any;
  ngOnInit(): void { this.canReadRestricted = this.permissions.hasPermission('COLABORADORES_DATOS_REVISAR'); this.id = Number(this.route.snapshot.paramMap.get('id')); if (!this.id) { this.error = 'El identificador del colaborador no es válido.'; this.loading = false; return; } this.api.getExpediente(this.id).subscribe({ next: value => { this.expediente = value; this.loading = false; }, error: err => { this.error = err.status === 403 ? 'No tienes permiso para consultar este expediente.' : 'No fue posible cargar el expediente.'; this.loading = false; } }); }
  volver(): void { this.router.navigate(['/colaboradores'], { queryParams: this.route.snapshot.queryParams }); }
  descargar(file: any): void { this.api.downloadExpedienteFile(this.id, file.id).subscribe(blob => { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.nombreOriginal; anchor.click(); URL.revokeObjectURL(url); }); }
  seleccionarSolicitud(request: any): void { if (!request.version) return; this.selectedRequest = undefined; this.api.detail(request.id).subscribe({ next: value => this.selectedRequest = value, error: () => this.error = 'No fue posible cargar el historial.' }); }
}
