import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class AdminComponent {
  public sidebarMinimized = false;

  toggleMinimize(e: boolean) {
    this.sidebarMinimized = e;
  }
}