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
  user = { email: '', password: '', nombre: '', apellidos: '' };
  passwordFieldType: string = 'password'; // Controla si el campo es 'password' o 'text'
  @Output() toggleLogin = new EventEmitter<void>();  


  constructor(private usuariosService: UsuariosService, private router: Router,private toastr: ToastrService) {}

  registerUser() {
    console.log('Datos enviados:', this.user); // Log para verificar los datos
    this.usuariosService.register(this.user).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);
        this.toastr.success('Usuario registrado con éxito', 'Éxito');
        this.router.navigate(['/guiado']); // Redirigir a la página 'home'
      },
      error: (error) => {
        console.error('Error en el registro:', error);
        this.toastr.error('Error al registrar usuario', 'Error');
      },
    });
  }

  togglePasswordVisibility(): void {
    this.passwordFieldType = this.passwordFieldType === 'password' ? 'text' : 'password';
  }
}
