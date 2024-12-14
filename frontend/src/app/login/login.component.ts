import { Component, EventEmitter, Output } from '@angular/core';
import { UsuariosService } from '../services/usuarios.service';
import { FormsModule } from '@angular/forms';
import { RouterModule,Router  } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';




@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule,RouterModule, CanvasComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  userLogin = { email: '', password: '' }; 
  rememberMe = false; // Nueva propiedad para "Recuérdame"
  @Output() toggleRegister = new EventEmitter<void>();  



  constructor(private usuariosService: UsuariosService, private router: Router) {}

  loginUser() {
    const loginPayload = {
      email: this.userLogin.email.trim(),
      password: this.userLogin.password.trim(),
      rememberMe: this.rememberMe,
    };
  
    console.log('[DEBUG] Payload enviado al login:', loginPayload);
  
    this.usuariosService.login(loginPayload).subscribe({
      next: (response) => {
        console.log('[DEBUG] Login exitoso, respuesta del servidor:', response);
  
        alert('Inicio de sesión exitoso');
        this.router.navigate(['/home']);
      },
      error: (error) => {
        console.error('[ERROR] Error en el inicio de sesión:', error);
        alert('Error en el inicio de sesión. Revisa tus credenciales.');
      },
    });
  }
  
  
}  
