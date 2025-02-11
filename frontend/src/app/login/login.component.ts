import { Component, EventEmitter, Output } from '@angular/core';
import { UsuariosService } from '../services/usuarios.service';
import { FormsModule } from '@angular/forms';
import { RouterModule,Router  } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule,RouterModule, CanvasComponent,CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  userLogin = { email: '', password: '' }; 
  rememberMe = false; // Nueva propiedad para "Recuérdame"
  passwordFieldType: string = 'password'; // Controla si el campo es 'password' o 'text'
  errorMessage: string | null = null;
  @Output() toggleRegister = new EventEmitter<void>();  



  constructor(private usuariosService: UsuariosService, private router: Router, private toastr: ToastrService) {}

  loginUser() {
    this.errorMessage = null; // Resetear mensaje de error
    const loginPayload = {
      email: this.userLogin.email.trim(),
      password: this.userLogin.password.trim(),
      rememberMe: this.rememberMe,
    };
  
    console.log('[DEBUG] Payload enviado al login:', loginPayload);
  
    this.usuariosService.login(loginPayload).subscribe({
      next: (response) => {
        console.log('[DEBUG] Login exitoso, respuesta del servidor:', response);
  
        //this.toastr.success('Inicio de sesión exitoso', 'Éxito');
        this.router.navigate(['/guiado']);
      },
      error: (error) => {
        console.error('[ERROR] Error en el inicio de sesión:', error);
        this.errorMessage = 'Error en el inicio de sesión. Revisa tus credenciales.';
        this.toastr.error('Error en el inicio de sesión. Revisa tus credenciales.', 'Error');
      },
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }
  
  
  
  
}  
