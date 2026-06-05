import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
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

    // Datos que luego podrían venir de un AuthState o Servicio
    user = {
        name: 'Marlene Cañizares',
        email: 'marlene.cañizares@integritysolutions.com.ec'
    };

    onLogout(): void {
        console.log('Cerrando sesión...');
        this.store.dispatch(AuthActions.logout());
    }
}
