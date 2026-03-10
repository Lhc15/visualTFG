import { Component, EventEmitter, Output } from '@angular/core';
import { UsuariosService } from '../services/usuarios.service';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CanvasComponent, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  userLogin = { email: '', password: '' };
  rememberMe = false;
  passwordFieldType: string = 'password';
  errorMessage: string | null = null;

  // Nuevas propiedades para la recuperación de contraseña
  showForgotPassword: boolean = false;
  resetEmail: string = '';
  resetMessage: string | null = null;
  resetSuccess: boolean = false;
  generalErrorMessage: string | null = null;


  errorField: string | null = null;

  @Output() toggleRegister = new EventEmitter<void>();

  constructor(
    private usuariosService: UsuariosService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  loginUser() {
    this.errorField = null;
    this.errorMessage = null;
    this.generalErrorMessage = null;


    if (!this.userLogin.email.trim()) {
      this.errorField = 'email';
      this.errorMessage = 'El correo no es válido';
      return;
    }

    if (!this.userLogin.password.trim()) {
      this.errorField = 'password';
      this.errorMessage = 'La contraseña no es válida';
      return;
    }
    const loginPayload = {
      email: this.userLogin.email.trim(),
      password: this.userLogin.password.trim(),
      rememberMe: this.rememberMe,
    };

    console.log('[DEBUG] Payload enviado al login:', loginPayload);

    this.usuariosService.login(loginPayload).subscribe({
      next: (response) => {
        console.log('[DEBUG] Login exitoso, respuesta del servidor:', response);
        this.router.navigate(['/modos2']);
      },
      error: (error) => {
        this.errorField = 'general'; // Siempre marcamos general
        if (error.status === 401) {
          this.generalErrorMessage = 'El correo o la contraseña son incorrectos';
        } else if (error.status === 429) {
          this.generalErrorMessage = error.error?.error || 'Demasiados intentos, intenta más tarde.';
        } else {
          this.generalErrorMessage = 'Correo o contraseña incorrectos';
        }
      },
      
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType =
      this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  // Método para alternar entre formulario de login y recuperación de contraseña
  toggleForgotPassword(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.showForgotPassword = !this.showForgotPassword;
    this.resetMessage = null;

    // Si volvemos al login, resetear los campos de recuperación
    if (!this.showForgotPassword) {
      this.resetEmail = '';
      this.resetSuccess = false;
    }
  }

  // Método para enviar solicitud de recuperación de contraseña
  resetPassword(): void {
    if (!this.resetEmail) {
      this.resetMessage = 'Por favor, ingresa tu correo electrónico';
      this.resetSuccess = false;
      return;
    }

    this.resetMessage = 'Procesando solicitud...';

    // Llamar al servicio para resetear la contraseña
    this.usuariosService.requestPasswordReset(this.resetEmail).subscribe({
      next: (response) => {
        this.resetMessage =
          'Se han enviado instrucciones a tu correo electrónico';
        this.resetSuccess = true;
        // Opcional: volver al formulario de login después de unos segundos
        setTimeout(() => this.toggleForgotPassword(), 3000);
      },
      error: (error) => {
        console.error(
          '[ERROR] Error al solicitar recuperación de contraseña:',
          error
        );
        this.resetMessage =
          error.error?.message ||
          'No se pudo procesar la solicitud. Intenta más tarde.';
        this.resetSuccess = false;
      },
    });
  }
}