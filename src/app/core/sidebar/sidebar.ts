import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './sidebar.html',
    styleUrls: ['./sidebar.scss']
})
export class Sidebar {
    timeReportExpanded = true;

    toggleTimeReport(): void {
        this.timeReportExpanded = !this.timeReportExpanded;
    }
}