import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { LoginComponent } from '../login/login.component';
import { RegistroComponent } from '../registro/registro.component';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { environment } from '../../environments/environment';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  encapsulation: ViewEncapsulation.None,  // Desactiva el encapsulamiento
  imports: [CommonModule, LoginComponent, RegistroComponent,CanvasComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LandingComponent {
  environment = environment;
  isRegisterVisible: boolean = false; // Mostrar el login por defecto

  @ViewChild('registerSection') registerSection!: ElementRef;
  @ViewChild('loginSection') loginSection!: ElementRef;

  // Mostrar la sección de registro y hacer scroll
  showRegister(): void {
    this.isRegisterVisible = true;
    setTimeout(() => {
      const container = document.getElementById('container-abajo');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  // Mostrar la sección de inicio de sesión y hacer scroll
  showLogin(): void {
    this.isRegisterVisible = false;
    setTimeout(() => {
      const container = document.getElementById('container-abajo');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  private scrollToSection(section: ElementRef): void {
    if (section) {
      section.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
