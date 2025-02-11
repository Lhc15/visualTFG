import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-miperfil',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent],
  templateUrl: './miperfil.component.html',
  styleUrl: './miperfil.component.css'
})
export class MiperfilComponent {
  constructor(private router: Router) {}
  closePanel(): void {
    console.log('Cerrando panel de ajustes');
    this.router.navigate(['/guiado']); // Redirige a la ruta guiado
  }
  // Datos simulados del usuario
  userData = {
    username: 'UsuarioDemo',
    fullname: 'Nombre Completo Demo',
    email: 'demo@email.com',
  };

  // Imagen del perfil
  profileImage: string | null = 'assets/default-profile.png';

  // Método para manejar la selección de archivo
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        // Asegúrate de que el resultado no sea null y conviértelo a string
        this.profileImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
}
