import { Component, OnInit } from '@angular/core';
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
}