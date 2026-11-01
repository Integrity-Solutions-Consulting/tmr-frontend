import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TipoPermisoOficial =
  | 'VACACIONES'
  | 'LICENCIA_ENFERMEDAD'
  | 'CITAS_MEDICAS'
  | 'MATRIMONIO'
  | 'NACIMIENTO_HIJO'
  | 'OTROS'
  | 'MATERNIDAD'
  | 'FALLECIMIENTO_FAMILIAR';

export type HorarioPermisoOficial = 'MANANA' | 'TARDE' | 'COMPLETA' | 'OTROS';

export interface DatosFormularioOficial {
  idPermiso?: number;
  folio?: string;
  diaSolicitud: string;
  mesSolicitud: string;
  anioSolicitud: string;
  apellidosNombres: string;
  numeroCedula: string;
  cargo: string;
  cliente: string;
  jefeInmediato: string;
  tipoPermiso: TipoPermisoOficial;
  motivos: string;
  evidenciaNombre?: string;
  evidenciaUrl?: string;
  evidenciaUrlDescarga?: string;
  fechaInicio: string;
  fechaFinalizacion: string;
  fechaRegreso: string;
  fechaAprobacion: string;
  diasSolicitados: string | number;
  horario: HorarioPermisoOficial;
  detalleHorario?: string;
  horasSolicitadas: string | number;
  aprobacionLider?: {
    aprobado: boolean;
    responsable: string;
    metodo: string;
    fecha?: string;
  };
  aprobacionTalentoHumano?: {
    aprobado: boolean;
    responsable: string;
    fecha?: string;
  };
  comentarios?: string;
}

@Component({
  selector: 'app-formulario-permiso-oficial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './formulario-permiso-oficial.html',
  styleUrl: './formulario-permiso-oficial.scss',
})
export class FormularioPermisoOficialComponent {
  @Input({ required: true }) datos!: DatosFormularioOficial;

  esTipo(tipo: TipoPermisoOficial): boolean {
    return this.datos?.tipoPermiso === tipo;
  }

  esHorario(horario: HorarioPermisoOficial): boolean {
    return this.datos?.horario === horario;
  }
}
