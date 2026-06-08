import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { AuthService } from '../../features/auth/servicios/auth.service';
import * as AuthActions from '../../features/auth/store/auth.actions';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [
        CommonModule,
        MatMenuModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './navbar.html',
    styleUrls: ['./navbar.scss']
})
export class Navbar {
    private store = inject(Store);
    private authService = inject(AuthService);

    user = {
        name: 'Usuario',
        email: ''
    };

    constructor() {
        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
            this.user = {
                name: currentUser.name || 'Usuario',
                email: currentUser.email
            };
        }
    }

    onLogout(): void {
        console.log('Cerrando sesión...');
        this.store.dispatch(AuthActions.logout());
    }
}
