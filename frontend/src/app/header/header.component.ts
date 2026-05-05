import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { UsuariosService } from '../services/usuarios.service';

@Component({
  standalone: true,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  imports: [CommonModule, RouterModule]
})
export class HeaderComponent implements OnInit {
  inicialesUsuario = 'U';
  menuAbierto = false;

  constructor(private router: Router, private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        const nombre: string = resp.usuario?.nombre ?? '';
        this.inicialesUsuario = nombre.charAt(0).toUpperCase() || 'U';
      },
      error: () => {}
    });
  }

  irA(ruta: string): void { this.router.navigate([ruta]); }

  toggleMenu(): void { this.menuAbierto = !this.menuAbierto; }

  cerrarMenu(): void { this.menuAbierto = false; }

  cerrarSesion(): void {
    this.menuAbierto = false;
    // Eliminar cookie/token y redirigir al landing
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    this.router.navigate(['/landing']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.vv-avatar-wrap')) {
      this.menuAbierto = false;
    }
  }
}