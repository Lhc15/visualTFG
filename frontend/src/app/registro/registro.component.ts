import { Component } from '@angular/core';
import { UsuariosService } from '../services/usuarios.service';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router'; 
import {EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';


@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule,RouterModule,CommonModule],
  templateUrl: './registro.component.html',
  styleUrls: ['./registro.component.css'],
})
export class RegistroComponent {
  user = { email: '', password: '', repeatPassword: ''};
  passwordFieldType: string = 'password'; // Controla si el campo es 'password' o 'text'
  passwordMismatch: boolean = false; // Variable para indicar que las contraseñas no coinciden
  showPasswordHint: boolean = false; // Controla la visibilidad del hint
  emailAlreadyExists: boolean = false; // Añadimos esta variable
  errorField: string | null = null;  // indica qué campo está en error
errorMessage: string | null = null; // mensaje general de error


  @Output() toggleLogin = new EventEmitter<void>();  


  constructor(private usuariosService: UsuariosService, private router: Router,private toastr: ToastrService) {}
 
  checkPasswordMatch(): void {
    this.passwordMismatch = (this.user.password !== this.user.repeatPassword);
  }

  registerUser() {
    // Reiniciar estados de error
    this.passwordMismatch = false;
    this.emailAlreadyExists = false;
    this.errorField = null;
    this.errorMessage = null;
  
    if (!this.user.email.trim()) {
      this.errorField = 'email';
      this.errorMessage = 'El correo no es válido';
      return;
    }
  
    if (!this.isPasswordValid()) {
      this.errorField = 'password';
      this.errorMessage = 'La contraseña no cumple los requisitos';
      return;
    }
  
    if (this.user.password !== this.user.repeatPassword) {
      this.errorField = 'repeatPassword';
      this.passwordMismatch = true;
      return;
    }
  
    console.log('Datos enviados:', this.user); // Log para verificar los datos
    this.usuariosService.register(this.user).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.toastr.success('Usuario registrado con éxito', 'Éxito');
        this.router.navigate(['/modos2']); // Redirigir a la página 'home'
      },
      error: (error) => {
        console.log('Error en registro:', error); // Añade este log para depuración
        
        // Corregimos la condición para detectar correctamente el mensaje de error
        if (error.error && error.error.msg === 'El correo ya está registrado') {
          this.emailAlreadyExists = true;
        } else {
          
        }
      },
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }

  isPasswordValid(): boolean {
    const pwd = this.user.password;
    // Requisitos: 8-12 caracteres, al menos una mayúscula, una minúscula, un dígito y un carácter especial
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()]).{8,12}$/;
    return regex.test(pwd);
  }

  onPasswordFocus(): void {
    this.showPasswordHint = true;
    if (this.errorField === 'password') {
      this.errorField = null;
      this.errorMessage = null;
    }
  }
  


}