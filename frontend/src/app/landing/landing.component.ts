import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation, AfterViewInit, OnDestroy  } from '@angular/core';
import { LoginComponent } from '../login/login.component';
import { RegistroComponent } from '../registro/registro.component';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { AnimacionService } from '../services/animacion.service';
import { environment } from '../../environments/environment';
import { HeaderComponent } from '../header/header.component';

import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';


@Component({
  selector: 'app-landing',
   standalone: true,
   templateUrl: './landing.component.html',
   styleUrls: ['./landing.component.css'],
   encapsulation: ViewEncapsulation.None,  // Desactiva el encapsulamiento
  imports: [CommonModule, LoginComponent, RegistroComponent,CanvasComponent, HeaderComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;

  isRegisterVisible: boolean = false;
  private gapAfterHello = 3000;
  private gapBeforeWelcome = 2500;
  private isPlayingHello = true;
  private animationTimeout!: any;


  showRegister() {
    this.isRegisterVisible = true;
  }

  showLogin() {
    this.isRegisterVisible = false;
  }

  constructor(private animacionService: AnimacionService) {}

  

   ngAfterViewInit() {
    // tan pronto como el Canvas esté listo, arranca la animación de "hola"
    this.playHelloLoop();
  }

  ngOnDestroy() {
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }
  }

   private async playHelloLoop() {
    this.isPlayingHello = true;
    const url = `${environment.apiUrl}/gltf/animaciones/holaanimation.gltf`;
    await this.canvasRef.loadSkinModel(url);
    const clip = this.canvasRef.availableClips[0];
    if (!clip) return;

    console.log('Iniciando animación "hola"');
    // Arrancamos "hola" SIN loop
    this.canvasRef.playClip(clip, false);
    
    // No programamos timeout aquí - esperamos el evento animationEnded
  }

  private async playWelcome() {
    this.isPlayingHello = false;
    const url = `${environment.apiUrl}/gltf/animaciones/bienvenidoanimation.gltf`;
    await this.canvasRef.loadSkinModel(url);
    const clip = this.canvasRef.availableClips[0];
    if (!clip) return;

    console.log('Iniciando animación "bienvenido"');
    // Arrancamos "bienvenido" SIN loop
    this.canvasRef.playClip(clip, false);
    
    // No programamos timeout aquí - esperamos el evento animationEnded
  }


  /** llamado cuando CanvasComponent emite animationEnded */
  onHelloEnded() {
    console.log('Evento animationEnded recibido, isPlayingHello:', this.isPlayingHello);
    
    // Limpiar cualquier timeout previo
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
    }

    if (this.isPlayingHello) {
      // Acabó "hola", espera gapBeforeWelcome y lanza "bienvenido"
      console.log(`Programando "bienvenido" en ${this.gapBeforeWelcome}ms`);
      this.animationTimeout = setTimeout(() => {
        this.playWelcome();
      }, this.gapBeforeWelcome);
    } else {
      // Acabó "bienvenido", espera gapAfterHello y repite "hola"
      console.log(`Programando "hola" en ${this.gapAfterHello}ms`);
      this.animationTimeout = setTimeout(() => {
        this.playHelloLoop();
      }, this.gapAfterHello);
    }
  }



  private cargarAnimacionHola(): void {
    // 1er bloque
    const primerBloque = ['hola_0.gltf','hola_1.gltf','hola_2.gltf'];
  
    // 2do bloque
    const segundoBloque = Array.from({ length: 14 }, (_, i) => `hola_${i+3}.gltf`);
  
    // Combinar los dos arrays
    const bloquesCombinados = [...primerBloque, ...segundoBloque];
  
    // Generar URLs
    const urlsCombinadas = bloquesCombinados.map(a => `${environment.apiUrl}/gltf/animaciones/${a}`);
  
    // Enviar todo junto en una sola llamada
    this.animacionService.cargarAnimaciones(urlsCombinadas, true);
  }
}


// @Component({
//   selector: 'app-landing',
//   standalone: true,
//   templateUrl: './landing.component.html',
//   styleUrls: ['./landing.component.css'],
//   encapsulation: ViewEncapsulation.None,  // Desactiva el encapsulamiento
//   imports: [CommonModule, LoginComponent, RegistroComponent,CanvasComponent],
//   schemas: [CUSTOM_ELEMENTS_SCHEMA]
// })
// export class LandingComponent {
//   environment = environment;
//   isRegisterVisible: boolean = false; // Mostrar el login por defecto

//   @ViewChild('registerSection') registerSection!: ElementRef;
//   @ViewChild('loginSection') loginSection!: ElementRef;

//   // Mostrar la sección de registro y hacer scroll
//   showRegister(): void {
//     this.isRegisterVisible = true;
//     setTimeout(() => {
//       const container = document.getElementById('container-abajo');
//       if (container) {
//         container.scrollIntoView({ behavior: 'smooth' });
//       }
//     }, 100);
//   }

//   // Mostrar la sección de inicio de sesión y hacer scroll
//   showLogin(): void {
//     this.isRegisterVisible = false;
//     setTimeout(() => {
//       const container = document.getElementById('container-abajo');
//       if (container) {
//         container.scrollIntoView({ behavior: 'smooth' });
//       }
//     }, 100);
//   }

//   private scrollToSection(section: ElementRef): void {
//     if (section) {
//       section.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
//     }
//   }
// }
