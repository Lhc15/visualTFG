import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common'; // Importa CommonModule para tener acceso a directivas como *ngIf y *ngFor
import { UsuariosComponent } from './usuarios/usuarios.component'; // Importar UsuariosComponent
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HeaderComponent } from "./header/header.component"; // Importar RouterModule para router-outlet
import { UsuariosService } from './services/usuarios.service'; 
import { AnimacionService } from './services/animacion.service';

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

  constructor(private apiService: ApiService, private usuariosService: UsuariosService, private router: Router,private animacionService: AnimacionService) {}

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
  
    // Solo cargar el usuario autenticado
    this.cargarUsuarioAutenticado();
    
    // Suscribirse a los cambios de ruta
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        console.log('[DEBUG] Ruta cambiada, limpiando animaciones.');
        this.animacionService.limpiarAnimaciones(); // Limpia las animaciones al cambiar de ruta
        this.redirigirSiAutenticado();
        
        // Permitir nuevas animaciones después de un breve retraso
        setTimeout(() => {
          this.animacionService.finalizarCambioPagina();
        }, 500);
      }
    });
  }

  redirigirSiAutenticado(): void {
    const currentRoute = this.router.url;
    console.log('[DEBUG] Ruta actual:', currentRoute);
  
    // Si la ruta es test-upload, permitir acceso sin importar autenticación
    if (currentRoute === '/test-upload') {
      console.log('[DEBUG] Accediendo a /test-upload - acceso permitido');
      return;
    }
  
    // Lista de rutas permitidas sin autenticación
    const allowedRoutes = ['/landing', '/guiado'];
  
    // Si la ruta actual está permitida, no hacer nada
    if (allowedRoutes.includes(currentRoute)) {
      console.log('[DEBUG] Ruta actual permitida sin autenticación:', currentRoute);
      return;
    }
  
    // Verifica si el usuario está autenticado
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (response) => {
        console.log('[DEBUG] Usuario autenticado:', response);
  
        // Si el usuario está en `/landing` o `/`, redirigir a `/home`
        if (currentRoute === '/landing' || currentRoute === '/') {
          console.log('[DEBUG] Redirigiendo a /home para usuario autenticado');
          this.router.navigate(['/guiado']);
        }
      },
      error: (error) => {
        console.error('[ERROR] No autenticado o token inválido:', error);
  
        // Si no está autenticado y la ruta no es permitida, redirigir a `/landing`
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
