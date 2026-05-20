import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Asegúrate de que estas rutas apunten a las carpetas que creaste
import { Navbar } from '../navbar/navbar';
import { Sidebar } from '../sidebar/sidebar';


@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        Navbar,
        Sidebar,

    ],
    templateUrl: './layout.html',
    styleUrls: ['./layout.scss']
})
export class layout {
    // Aquí puedes manejar lógica global, como estados de colapso del sidebar
}