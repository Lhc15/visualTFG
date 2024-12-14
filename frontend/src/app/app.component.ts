import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common'; // Importa CommonModule para tener acceso a directivas como *ngIf y *ngFor
import { UsuariosComponent } from './usuarios/usuarios.component'; // Importar UsuariosComponent
import { RouterModule, Router } from '@angular/router';
import { HeaderComponent } from "./header/header.component"; // Importar RouterModule para router-outlet
import { UsuariosService } from './services/usuarios.service'; 

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, UsuariosComponent, RouterModule, HeaderComponent]
})
export class AppComponent implements OnInit {
  title = 'frontend';
  response: any;
  usuario: any = null;

  constructor(private apiService: ApiService, private usuariosService: UsuariosService, private router: Router) {}

  ngOnInit() {
    this.apiService.getHelloWorld().subscribe({
      next: (data) => {
        this.response = data;
        console.log('Respuesta de la API:', this.response);
      },
      error: (error) => {
        console.error('Error al obtener datos:', error);
      },
    });
  
    // Llamar solo una vez a cargar autenticación y redirección inicial
    this.cargarUsuarioAutenticado();
    this.redirigirSiAutenticado(); 
  }
  

  redirigirSiAutenticado(): void {
    const currentRoute = this.router.url;
  
    console.log('[DEBUG] Ruta actual:', currentRoute);
  
    // Lista de rutas permitidas sin autenticación
    const allowedRoutes = ['/test-upload', '/landing'];
  
    // Si la ruta actual está permitida, no redirigir
    if (allowedRoutes.includes(currentRoute)) {
      console.log('[DEBUG] Ruta actual permitida sin autenticación:', currentRoute);
      return;
    }
  
    // Verifica con el backend si el usuario está autenticado
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (response) => {
        console.log('[DEBUG] Usuario autenticado, redirigiendo si es necesario:', response);
        if (currentRoute === '/landing') {
          this.router.navigate(['/home']);
        }
      },
      error: (error) => {
        console.error('[ERROR] No autenticado o token inválido:', error);
  
        // Redirige a /landing solo si no es una ruta permitida
        if (!allowedRoutes.includes(currentRoute)) {
          console.log('[DEBUG] Redirigiendo a /landing debido a falta de autenticación');
          this.router.navigate(['/landing']);
        }
      },
    });
  }
  
  
  cargarUsuarioAutenticado(): void {
    console.log('[DEBUG] Verificando autenticación mediante el backend...');

    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (response) => {
        console.log('[DEBUG] Respuesta de la API /login/usuario:', response);

        this.usuario = response.usuario; // Guardar el usuario autenticado
        console.log('[DEBUG] Usuario autenticado cargado:', this.usuario);
      },
      error: (error) => {
        console.error('[ERROR] No autenticado o token inválido:', error);
        console.log('[DEBUG] Respuesta completa del error:', error);
        this.usuario = null;
      },
    });
  }

  getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }
  
}
