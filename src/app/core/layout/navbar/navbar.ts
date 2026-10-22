import { Component, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { ProfilePopoverComponent } from '../../../shared/components/profile-popover/profile-popover.component';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../../features/auth/store/auth.actions';
import { AuthService } from '../../../features/auth/servicios/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { CambiarPasswordModalComponent } from '../../../features/auth/componentes/cambiar-password-modal/cambiar-password-modal.component';
import { DashboardService } from '../../../features/dashboard/servicios/dashboard.service';
import { UsuariosService } from '../../../features/configuracion/services/usuarios.service';
import { MiPerfilModalComponent, MiPerfilData } from '../../../shared/components/mi-perfil-modal/mi-perfil-modal.component';
import { ConfiguracionModalComponent } from '../../../shared/components/configuracion-modal/configuracion-modal.component';
import { CommonModule } from '@angular/common';
import { DropdownScrollLockService } from '../../../shared/services/dropdown-scroll-lock.service';
import { describirPeriodo, describirPeriodoCorte, formatoFechaHoraEcuador, ResumenCorteService } from '../../../shared/services/resumen-corte.service';
import { MisAvisosService } from '../../../shared/services/mis-avisos.service';
import { AvisoColaborador } from '../../../shared/services/notificaciones.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ProfilePopoverComponent, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit {
  private store = inject(Store);
  private authService = inject(AuthService);
  private usuariosService = inject(UsuariosService);
  private dialog = inject(MatDialog);
  private dashboardService = inject(DashboardService);
  private elementRef = inject(ElementRef);
  private dropdownScrollLock = inject(DropdownScrollLockService);
  // Resultado del corte de horas (SSE, solo Administrador y Líder): aviso en la campana además del popup
  protected readonly resumenCorte = inject(ResumenCorteService);
  protected readonly describirPeriodoCorte = describirPeriodoCorte;
  // Correos de horas faltantes que le llegaron al usuario (su líder o el corte): solo avisos, no llevan a ningún lado
  protected readonly misAvisos = inject(MisAvisosService);
  protected readonly formatoFechaHora = formatoFechaHoraEcuador;

  user = {
    name: 'Usuario',
    email: ''
  };

  // Estado de notificaciones de horas faltantes
  tieneNotificaciones = false;
  horasFaltantes = 0;

  // sm - perfilAbierto/notificacionesAbierto se asignan desde muchos sitios. En vez de tocar cada
  // punto, se exponen como accessors: cualquier asignación bloquea/libera sola el scroll de
  // fondo (DropdownScrollLockService), igual que mat-select ("Tipo de proyecto").
  private _perfilAbierto = false;
  get perfilAbierto(): boolean {
    return this._perfilAbierto;
  }
  set perfilAbierto(valor: boolean) {
    this._perfilAbierto = valor;
    this.actualizarLockDropdowns();
  }

  private _notificacionesAbierto = false;
  get notificacionesAbierto(): boolean {
    return this._notificacionesAbierto;
  }
  set notificacionesAbierto(valor: boolean) {
    this._notificacionesAbierto = valor;
    this.actualizarLockDropdowns();
  }

  private dropdownLockActivo = false;

  private actualizarLockDropdowns(): void {
    const hayAlguno = this._perfilAbierto || this._notificacionesAbierto;
    if (hayAlguno && !this.dropdownLockActivo) {
      this.dropdownScrollLock.lock();
      this.dropdownLockActivo = true;
    } else if (!hayAlguno && this.dropdownLockActivo) {
      this.dropdownScrollLock.unlock();
      this.dropdownLockActivo = false;
    }
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.user = {
        name: currentUser.name || 'Usuario',
        email: currentUser.email || ''
      };

      // Consultar dinámicamente horas incompletas del colaborador logueado
      this.consultarHorasIncompletas();
    }
  }

  consultarHorasIncompletas(): void {
    this.dashboardService.getMisHorasIncompletas('mes').subscribe({
      next: (res) => {
        if (res) {
          this.tieneNotificaciones = res.tieneFaltantes;
          this.horasFaltantes = res.horasFaltantes;
        }
      },
      error: () => {
        this.tieneNotificaciones = false;
        this.horasFaltantes = 0;
      }
    });
  }

  toggleNotificaciones(): void {
    this.notificacionesAbierto = !this.notificacionesAbierto;
    if (this.notificacionesAbierto) {
      this.perfilAbierto = false;
      this.consultarHorasIncompletas();
      this.resumenCorte.marcarCampanaVista();
      this.misAvisos.marcarVistos();
    }
  }

  /** Punto rojo de la campana: horas propias pendientes, un corte nuevo o un aviso nuevo. */
  get campanaConNovedades(): boolean {
    return this.tieneNotificaciones || this.resumenCorte.campanaPendiente() || this.misAvisos.pendiente();
  }

  tituloAviso(aviso: AvisoColaborador): string {
    return aviso.origen === 'Manual'
      ? 'Tu líder te recuerda registrar tus horas'
      : `Corte de horas ${describirPeriodo(aviso.inicioPeriodo, aviso.finPeriodo)}`;
  }

  descripcionAviso(aviso: AvisoColaborador): string {
    const horas = `${aviso.horasFaltantes.toLocaleString('es-EC', { maximumFractionDigits: 2 })} h pendientes`;
    if (aviso.origen === 'Manual') {
      const proyecto = aviso.proyecto ? ` en ${aviso.proyecto}` : '';
      return `${horas}${proyecto} · ${describirPeriodo(aviso.inicioPeriodo, aviso.finPeriodo)}`;
    }
    return aviso.detalle ? `${horas}: ${aviso.detalle}` : horas;
  }

  /** Clic en el aviso del corte: abre directo la lista de colaboradores con su resultado ("Ver más"). */
  abrirDetalleCorte(): void {
    this.notificacionesAbierto = false;
    this.resumenCorte.verDetalle();
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.notificacionesAbierto = false;
    }
  }

  togglePerfil(): void {
    this.perfilAbierto = !this.perfilAbierto;
    if (this.perfilAbierto) {
      this.notificacionesAbierto = false;
    }
  }

  cerrarPerfil(): void {
    this.perfilAbierto = false;
  }

  toggleSidebar(): void {
    document.body.classList.toggle('sidebar-open');
  }

  abrirMiPerfil(): void {
    this.perfilAbierto = false;
    const currentUser = this.authService.getCurrentUser() as any;

    const profileData: MiPerfilData = {
      nombre: currentUser?.name || currentUser?.nombres || this.user.name,
      correo: currentUser?.email || this.user.email,
      idEmpleado: currentUser?.idEmpleado || currentUser?.id || undefined,
      cargo: currentUser?.cargo || undefined,
      telefono: currentUser?.telefono || undefined,
      fechaCreacion: this.formatDate(currentUser?.fechaCreacion || currentUser?.creadoEn || currentUser?.createdAt)
    };

    if (currentUser?.idEmpleado) {
      this.usuariosService.obtenerColaboradorDetalle(currentUser.idEmpleado).subscribe({
        next: (colab) => {
          if (colab) {
            profileData.cargo = colab.cargo || profileData.cargo;
            if (colab.nombreCompleto) {
              profileData.nombre = colab.nombreCompleto;
            }
          }
          this.openMiPerfilDialog(profileData);
        },
        error: () => this.openMiPerfilDialog(profileData)
      });
    } else {
      this.openMiPerfilDialog(profileData);
    }
  }

  private openMiPerfilDialog(data: MiPerfilData): void {
    this.dialog.open(MiPerfilModalComponent, {
      data,
      panelClass: 'tmr-dialog-panel',
      disableClose: true
    });
  }

  abrirConfiguracion(): void {
    this.perfilAbierto = false;
    this.dialog.open(ConfiguracionModalComponent, {
      panelClass: 'tmr-dialog-panel',
      disableClose: true
    });
  }

  abrirCambiarPassword(): void {
    this.perfilAbierto = false;
    this.dialog.open(CambiarPasswordModalComponent, {
      panelClass: 'tmr-dialog-panel',
      disableClose: true
    });
  }

  cerrarSesion(): void {
    this.perfilAbierto = false;
    this.store.dispatch(AuthActions.logout());
  }

  private formatDate(dateStr?: string): string | undefined {
    if (!dateStr) return undefined;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return undefined;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return undefined;
    }
  }
}
