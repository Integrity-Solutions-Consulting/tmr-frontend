import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ProfilePopoverComponent } from '../../../shared/components/profile-popover/profile-popover.component';
import * as AuthActions from '../../../features/auth/store/auth.actions';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ProfilePopoverComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  private store = inject(Store);
  perfilAbierto = false;

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
