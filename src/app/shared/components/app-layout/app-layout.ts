import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { SidebarComponent } from '../sidebar/sidebar';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    Navbar
  ],
  templateUrl: './app-layout.html',
  styleUrls: ['./app-layout.scss']
})
export class AppLayout {

}