import { Component, inject, OnInit, HostListener, ElementRef } from '@angular/core';
import { ProfilePopoverComponent } from '../../../shared/components/profile-popover/profile-popover.component';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../../features/auth/store/auth.actions';
import { AuthService } from '../../../features/auth/servicios/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { CambiarPasswordModalComponent } from '../../../features/auth/componentes/cambiar-password-modal/cambiar-password-modal.component';
import { DashboardService } from '../../../features/dashboard/servicios/dashboard.service';
import { CommonModule } from '@angular/common';

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
  private dialog = inject(MatDialog);
  private dashboardService = inject(DashboardService);
  private elementRef = inject(ElementRef);
  
  perfilAbierto = false;
  user = {
    name: 'Usuario',
    email: ''
  };

  // Estado de notificaciones de horas faltantes
  tieneNotificaciones = false;
  horasFaltantes = 0;
  notificacionesAbierto = false;

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
    }
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
}
