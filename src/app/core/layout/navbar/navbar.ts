import { Component, inject, OnInit } from '@angular/core';
import { ProfilePopoverComponent } from '../../../shared/components/profile-popover/profile-popover.component';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../../features/auth/store/auth.actions';
import { AuthService } from '../../../features/auth/servicios/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ProfilePopoverComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar implements OnInit {
  private store = inject(Store);
  private authService = inject(AuthService);
  
  perfilAbierto = false;
  user = {
    name: 'Usuario',
    email: ''
  };

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.user = {
        name: currentUser.name || 'Usuario',
        email: currentUser.email || ''
      };
    }
  }

  togglePerfil(): void {
    this.perfilAbierto = !this.perfilAbierto;
  }

  cerrarPerfil(): void {
    this.perfilAbierto = false;
  }

  cerrarSesion(): void {
    this.perfilAbierto = false;
    this.store.dispatch(AuthActions.logout());
  }
}
