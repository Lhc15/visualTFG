import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ajustes',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent, FormsModule],
  templateUrl: './ajustes.component.html',
  styleUrl: './ajustes.component.css'
})

export class AjustesComponent {
  // Datos simulados del usuario
  userData = {
    username: 'UsuarioDemo',
    fullname: 'Nombre Completo Demo',
    email: 'demo@email.com',
    password: 'password123',
  };

  // Rastrea qué campos están en modo edición
  isEditing: { [key: string]: boolean } = {
    username: false,
    fullname: false,
    email: false,
    password: false,
  };

  toggleEdit(field: keyof typeof this.userData): void {
    // Cambia el estado de edición
    if (this.isEditing[field]) {
      // Lógica para guardar los datos (puedes enviar eventos al backend aquí)
      console.log(`Guardando ${field}:`, this.userData[field]);
    }
    this.isEditing[field] = !this.isEditing[field];
  }
  
  constructor(private router: Router) {}
  closePanel(): void {
    console.log('Cerrando panel de ajustes');
    this.router.navigate(['/guiado']); // Redirige a la ruta guiado
  }
}
