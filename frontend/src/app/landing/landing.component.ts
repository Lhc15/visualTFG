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
  private timeoutId!: any;

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
    clearInterval(this.timeoutId);
  }

  private async playHelloLoop() {
    if (!this.canvasRef) return;

    const url = `${environment.apiUrl}/gltf/animaciones/holaanimation.gltf`;
    console.log('[Landing] cargando modelo hello:', url);
    await this.canvasRef.loadSkinModel(url);

    const clips = this.canvasRef.availableClips;
    if (clips.length) {
      console.log('[Landing] reproduciendo clip', clips[0], 'sin bucle');
      this.canvasRef.playClip(clips[0], false);
      // ahora esperamos a que lance animationEnded…
    } else {
      console.error('[Landing] no hay clips para reproducir');
    }
  }

  /** llamado cuando CanvasComponent emite animationEnded */
  onHelloEnded() {
    console.log(`[Landing] hello terminó, esperando ${this.gapAfterHello}ms antes de repetir`);
    this.timeoutId = setTimeout(() => this.playHelloLoop(), this.gapAfterHello);
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
