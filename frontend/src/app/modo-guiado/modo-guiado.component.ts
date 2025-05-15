import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { CardComponent } from '../card/card.component';

import { Router } from '@angular/router';
import { AnimacionService } from '../services/animacion.service';
import { CategoriasService } from '../services/categorias.service';
import { PalabrasService } from '../services/palabras.service';
import { UsuariosService } from '../services/usuarios.service';

import { environment } from '../../environments/environment';
import { StatsService } from '../services/stats.service';
import { ExploredWordsService } from '../services/explored_word.service';
import { Subscription } from 'rxjs';

import introJs from 'intro.js';

@Component({
  selector: 'app-modo-guiado',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    // FooterComponent,
    CanvasComponent,
    CardComponent,
  ],
  templateUrl: './modo-guiado.component.html',
  styleUrls: ['./modo-guiado.component.css'],
})
export class ModoGuiadoComponent implements OnInit {

  @ViewChild(CanvasComponent, { static: false })
  canvasRef?: CanvasComponent;      //  mejor que usar “!”

  // Propiedades específicas del modo guiado
  words: any[] = [];
  currentIndex = 0;
  maxWords = 4;
  nivelActual = 1;
  maxUnlockedLevel = 1;
  availableLevels = [1, 2, 3];
  totalLevels: number = 4;

  // Usuario, estadisticas, etc.
  userId: string = '';
  currentStatsId: string | null = null; // ID para stats

  // Control de pantallas
  showWelcome = true;
  showChooseLevel = false;

  // Variables generales (opcionalmente se pueden quitar si no las usas aquí)
  categorias: any[] = [];
  palabras: any[] = [];
  currentCategoryId: string | null = null;
  currentAnimationUrls: string[] = [];
  modo: string = 'guiado';

  isLoading = false; //Para el estado de carga

  // Cámara
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  showWebcam = false;

  constructor(
    private router: Router,
    private animacionService: AnimacionService,
    private categoriasService: CategoriasService,
    private palabrasService: PalabrasService,
    private usuariosService: UsuariosService,
    private statsService: StatsService,
    private exploredWordsService: ExploredWordsService
  ) {}

  ngOnInit(): void {
    // 1) Cargar categoría si lo necesitas en guiado (no siempre es necesario)
    this.cargarCategorias();

    // 2) Obtener usuario, nivelActual e índice actual
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        console.log('USUARIO COMPLETO OBTENIDO:', resp.usuario);
        this.userId = resp.usuario.uid || resp.usuario._id;
        this.nivelActual = resp.usuario.currentLevel || 1;
        this.maxUnlockedLevel = resp.usuario.maxUnlockedLevel || 1;
        this.currentIndex = resp.usuario.currentWordIndex || 0;

        console.log(`VALORES INICIALES - Nivel actual: ${this.nivelActual}, Nivel máximo: ${this.maxUnlockedLevel}`);

        this.availableLevels = Array.from({ length: this.totalLevels }, (_, i) => i + 1);

        // Cargar las palabras de este nivel
        this.cargarPalabrasPorNivel(this.nivelActual);
      },
      error: (err) => {
        console.error('Error obteniendo usuario autenticado:', err);
        // Fallback si no hay usuario
        this.nivelActual = 1;
        this.currentIndex = 0;
        this.cargarPalabrasPorNivel(1);
      },
    });
  }

  navigateTo(destination: string) {
    if (destination === 'perfil') {
      this.router.navigate(['/perfil']);
    }
  }

  // -----------------------------------------
  // Métodos específicos de Modo Guiado
  // -----------------------------------------

  cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        if (this.categorias.length > 0) {
          this.selectCategory(this.categorias[0]._id);
        }
      },
      error: (error) => {
        console.error('Error al cargar las categorías:', error);
      },
    });
  }

  selectCategory(categoriaId: string): void {
    this.currentCategoryId = categoriaId;
    this.categoriasService.obtenerPalabrasPorCategoria(categoriaId).subscribe({
      next: (data) => {
        this.palabras = data;
      },
      error: (error) => {
        console.error('Error al cargar las palabras:', error);
      },
    });
  }

  seleccionarPalabra(palabra: any): void {
    if (palabra.gltf) {
    const url = `${environment.apiUrl}/gltf/animaciones/${palabra.gltf}`;
    this.animacionService.cargarAnimaciones([ url ], true);
    } else {
      console.warn('No hay GLTF asignado para esta palabra');
    }
  }

  // -----------------------------------------
  // MÉTODOS QUE VIENEN DE MODO GUIADO
  // -----------------------------------------

  // 1. Cargar palabras por nivel
  cargarPalabrasPorNivel(nivel: number): void {
    this.isLoading = true; // Activar carga al inicio
    this.palabrasService.obtenerPalabrasPorNivel(nivel).subscribe({
      next: (data) => {
        this.words = data.slice(0, this.maxWords);
        console.log('Palabras del nivel', nivel, this.words);
        this.isLoading = false; // Desactivar carga al terminar
      },
      error: (error) => {
        console.error('Error al cargar las palabras:', error);
        this.isLoading = false; // También desactivar en caso de error
      },
    });
  }

  // 2. Continuar donde iba
  continuar(): void {
    this.showWelcome = false;

    // Si quieres recargar las palabras para garantizar que no falten cambios
    this.cargarPalabrasPorNivel(this.nivelActual);

    // Cerrar stats anterior si existía
    if (this.currentStatsId) {
      this.statsService.endLevel(this.currentStatsId).subscribe({
        next: () => console.log('Stats anterior cerrado'),
        error: (err) => console.error('Error cerrando stats anterior', err),
      });
      this.currentStatsId = null;
    }

    // Iniciar nueva sesión de stats para este nivel
    this.statsService.startLevel(this.userId, this.nivelActual, 'guiado').subscribe({
      next: (resp) => {
        this.currentStatsId = resp.statsId;
        console.log('Stats iniciado, ID:', this.currentStatsId);
      },
      error: (err) => console.error('Error iniciando stats:', err),
    });
  }

  // 3. Empezar desde la primera
  empezarDesdePrimera(): void {
    this.showWelcome = false;
    this.currentIndex = 0;

    // Guardar el índice en BD
    this.usuariosService.updateUserWordIndex(this.userId, 0).subscribe({
      next: () => console.log('Reinicio a la primera palabra'),
      error: (err: any) => console.error('Error reiniciando índice:', err),
    });

    this.cargarPalabrasPorNivel(this.nivelActual);
  }

  // 4. Getters de palabra y explicación actual
  get currentWord() {
    return this.words[this.currentIndex]?.palabra || 'Cargando...';
  }

  get currentExplanation() {
    return (
      this.words[this.currentIndex]?.explicacion || 'Sin explicación disponible'
    );
  }

  // 5. Al hacer clic en la palabra → reproducir animación
  handleWordClick() {
    const w = this.words[this.currentIndex];
    if (!w || !w.gltf) return console.warn('Sin animación para esta palabra');
    const url = `${environment.apiUrl}/gltf/animaciones/${w.gltf}`;
    console.log('Cargando animación:', url);
    this.animacionService.cargarAnimaciones([ url ], true);
  }

  // 6. Repetir la animación
  handleRepeatClick() {
    this.handleWordClick();
    console.log(`Repetir acción para: ${this.currentWord}`);
  }

  // 7. Navegar a la palabra anterior
  prevWord() {
    // Parar animación actual
this.canvasRef?.stopLoop(true);

// Desmarcar Play y Loop
const playRadio = document.getElementById('play') as HTMLInputElement;
if (playRadio) playRadio.checked = false;
this.isLooping = false;
const loopCheckbox = document.getElementById('toggleLoop') as HTMLInputElement;
if (loopCheckbox) loopCheckbox.checked = false;

    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.usuariosService
        .updateUserWordIndex(this.userId, this.currentIndex)
        .subscribe({
          next: (resp: any) => {
            console.log(
              'Índice actualizado en BD:',
              resp.usuario?.currentWordIndex
            );
          },
          error: (err: any) => console.error('Error actualizando índice:', err),
        });
    }
  }

  // 8. Navegar a la siguiente palabra
  nextWord() {
    // Parar animación actual
this.canvasRef?.stopLoop(true);

// Desmarcar Play y Loop
const playRadio = document.getElementById('play') as HTMLInputElement;
if (playRadio) playRadio.checked = false;
this.isLooping = false;
const loopCheckbox = document.getElementById('toggleLoop') as HTMLInputElement;
if (loopCheckbox) loopCheckbox.checked = false;

    // Si NO estamos en la última palabra
    if (this.currentIndex < this.words.length - 1) {
      this.currentIndex++;
      // Actualizamos el índice en la BD
      this.usuariosService
        .updateUserWordIndex(this.userId, this.currentIndex)
        .subscribe({
          next: (resp: any) => {
            console.log(
              'Índice actualizado en BD:',
              resp.usuario?.currentWordIndex
            );

            // Actualizar lastWordLearned 
            const lastLearned = this.words[this.currentIndex - 1].palabra; 
            this.usuariosService
              .updateUserLastWordLearned(this.userId, lastLearned)
              .subscribe({
                next: () =>
                  console.log('Última palabra actualizada en el usuario'),
                error: (err: any) =>
                  console.error('Error actualizando última palabra:', err),
              });
          },
          error: (err: any) => console.error('Error actualizando índice:', err),
        });
    }
  }

  // 9. Saber si estamos en la última palabra
  isLastWord(): boolean {
    return this.currentIndex === this.words.length - 1;
  }

  // 10. Avanzar de nivel
  advanceLevel() {
    if (this.words.length > 0) {
      const ultimaPalabraDelNivel = this.words[this.words.length - 1].palabra;
      this.usuariosService
        .updateUserLastWordLearned(this.userId, ultimaPalabraDelNivel)
        .subscribe({
          next: () => console.log('Última palabra del nivel anterior guardada'),
          error: (err: any) =>
            console.error('Error guardando la última palabra:', err),
        });
    }

    const newLevel = this.nivelActual + 1;

    // Cerrar la sesión de stats actual (ya existente)
    if (this.currentStatsId) {
      this.statsService.endLevel(this.currentStatsId).subscribe({
        next: (resp) => {
          console.log('Sesión de nivel cerrada. Duración:', resp.durationMs);
        },
        error: (err) => console.error('Error al cerrar sesión de nivel:', err),
      });
      this.currentStatsId = null;
    }

    // Guardamos el valor actual de maxUnlockedLevel antes de la actualización
    const currentMaxLevel = this.maxUnlockedLevel;

    // Actualizar nivel en la base de datos
    this.usuariosService.updateUserLevel(this.userId, newLevel).subscribe({
      next: (resp) => {
        console.log('Respuesta completa del servidor:', resp);
        console.log('Nivel actualizado en el servidor:', resp.usuario.currentLevel);
        console.log('Nivel máximo del servidor:', resp.usuario.maxUnlockedLevel);

        // Actualizamos nivel actual
        this.nivelActual = resp.usuario.currentLevel;

        // IMPORTANTE: Siempre mantenemos el valor más alto entre lo que teníamos y lo que viene del servidor
        this.maxUnlockedLevel = Math.max(currentMaxLevel, resp.usuario.maxUnlockedLevel || 1);
        console.log(`Nivel máximo final: ${this.maxUnlockedLevel}`);

        // También aseguramos que el maxUnlockedLevel sea al menos igual al nivel actual
        this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel, this.nivelActual);
        console.log(`Nivel máximo ajustado: ${this.maxUnlockedLevel}`);

        this.availableLevels = Array.from({ length: this.totalLevels }, (_, i) => i + 1);
        console.log('Niveles disponibles actualizados:', this.availableLevels);

        // Resetear índice a 0 y actualizar palabras
        this.currentIndex = 0;
        this.usuariosService.updateUserWordIndex(this.userId, 0).subscribe({
          next: () => console.log('Índice reseteado a 0'),
          error: (err) => console.error('Error reseteando índice:', err),
        });

        // Mostrar pantalla de bienvenida y recargar palabras
        this.showWelcome = true;
        this.showChooseLevel = false;
        this.cargarPalabrasPorNivel(this.nivelActual);

        // Iniciar nueva sesión de stats para el nuevo nivel
        this.statsService.startLevel(this.userId, this.nivelActual, 'guiado').subscribe({
          next: (resp2) => {
            this.currentStatsId = resp2.statsId;
            console.log('Nueva sesión para el nivel actual:', this.currentStatsId);
          },
          error: (err) => console.error('Error iniciando nueva sesión de stats:', err),
        });
      },
      error: (err) => {
        console.error('Error al actualizar nivel:', err);
      },
    });
  }

  // 11. Elegir nivel manualmente
  openChooseLevel(): void {
    this.showChooseLevel = true;
  }

  volverANiveles(): void {
    // Aquí defines la navegación para volver a la vista de niveles
    this.showWelcome = true; // Esto oculta la card y muestra la pantalla de selección de niveles
  }
  

  onLevelSelected(level: number) {
    const cardElement = document.querySelector('.modo-guiado app-card');
    if (cardElement) {
      cardElement.classList.remove('fade-in', 'fade-out');
      void (cardElement as HTMLElement).offsetWidth;
      cardElement.classList.add('fade-out');
    }

    setTimeout(() => {
      if (this.currentStatsId) {
        this.statsService.endLevel(this.currentStatsId).subscribe({
          next: () => console.log('Sesión anterior cerrada'),
          error: (err) => console.error('Error al cerrar sesión anterior', err),
        });
        this.currentStatsId = null;
      }

      this.nivelActual = level;
      this.usuariosService.updateUserLevel(this.userId, level).subscribe({
        next: (resp) => {
          console.log('Nivel actualizado en el servidor:', resp.usuario.currentLevel);
          this.nivelActual = resp.usuario.currentLevel;
          this.maxUnlockedLevel = resp.usuario.maxUnlockedLevel;
          this.availableLevels = Array.from({ length: this.totalLevels }, (_, i) => i + 1);
        },
        error: (err) => console.error('Error actualizando nivel:', err),
      });
      this.currentIndex = 0;
      this.usuariosService.updateUserWordIndex(this.userId, 0).subscribe({
        next: () => console.log('Reinicio a la primera palabra'),
        error: (err) => console.error('Error reiniciando índice:', err),
      });

      this.cargarPalabrasPorNivel(level);

      this.statsService.startLevel(this.userId, level, 'guiado').subscribe({
        next: (resp) => {
          this.currentStatsId = resp.statsId;
          console.log('Sesión iniciada para el nuevo nivel:', resp.statsId);
          if (cardElement) {
            cardElement.classList.remove('fade-out');
            void (cardElement as HTMLElement).offsetWidth;
            cardElement.classList.add('fade-in');
          }
        },
        error: (err) => console.error('Error iniciando stats:', err),
      });

      this.showWelcome = false;
      this.showChooseLevel = false;
    }, 300);
  }

  // Getter opcional para el porcentaje de avance
  get progressPercent(): number {
    if (!this.words || this.words.length === 0) return 0;
    const progreso = ((this.currentIndex + 1) / this.words.length) * 100;
    return Math.floor(progreso);
  }

  // Tutorial
  iniciarTutorial() {
    const intro = introJs();
    intro.setOptions({
      steps: [
        {
          element: '#avatar-element',
          intro: 'Este es tu avatar 3D. ¡Puedes interactuar con él!',
          position: 'left',
        },
      ],
      showProgress: true,
      showBullets: false,
      nextLabel: 'Siguiente',
      prevLabel: 'Anterior',
      skipLabel: 'Saltar',
      doneLabel: 'Finalizar',
    });

    intro.start();
  }

  // ----------------------
  // Control de cámara
  // ----------------------
  toggleWebcam() {
    this.showWebcam = !this.showWebcam;

    // Esperar a que Angular actualice la vista antes de manipular el DOM
    setTimeout(() => {
      if (this.showWebcam) {
        this.startWebcam();
      } else {
        this.stopWebcam();
      }
    }, 0);
  }

  startWebcam() {
    if (!this.videoElement) {
      console.error('Elemento de video no encontrado');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        const video: HTMLVideoElement = this.videoElement.nativeElement;
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => {
        console.error('Error accediendo a la cámara: ', err);
        this.showWebcam = false; // Revertir estado si hay error
      });
  }

  stopWebcam() {
    if (!this.videoElement || !this.videoElement.nativeElement) {
      return;
    }

    const video: HTMLVideoElement = this.videoElement.nativeElement;
    const stream = video.srcObject as MediaStream;
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
    }
    video.srcObject = null;
  }

  //cerrar sesion
  logout(): void {
    console.log('[DEBUG] Cerrando sesión desde Modo Libre...');
    this.usuariosService.logout().subscribe({
      next: (response) => {
        console.log('[DEBUG] Respuesta del logout:', response);
        this.router.navigate(['/landing']);
      },
      error: (error) => {
        console.error('[ERROR] Error al cerrar sesión:', error);
        alert('Error al cerrar sesión.');
      },
    });
  }

  volverAModos(): void {
    this.router.navigate(['/modos']);
  }

  /* =======================================================
     NUEVAS PROPIEDADES Y MÉTODOS PARA LA BARRA DE HERRAMIENTAS
     ======================================================= */
  // Controla si estamos en loop
  isLooping = false;

  // Controla si el menú de herramientas se abre
  toolMenuOpen = false;

  // onRadioChange = se dispara al hacer clic en play/webcam/veloc
  onRadioChange(event: Event) {
    const valor = (event.target as HTMLInputElement).value;

    // Si no hay palabra en la posición actual, solo permitimos la webcam
    if (!this.words[this.currentIndex] && valor !== 'webcam') {
      alert('Primero asegúrate de tener una palabra en pantalla.');
      return;
    }

    switch (valor) {
      case 'play':
        // Reproducir 1 sola vez
        this.reproducirAnimacion(false);
        break;
      
      case 'veloc':
        this.cambiarVelocidad();
        break;
    }
  }

  // Toggle loop (bucle)
  onToggleLoop(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (!this.words[this.currentIndex]) {
      alert('No hay palabra para animar. Selecciona una palabra primero.');
      (event.target as HTMLInputElement).checked = false;
      return;
    }

    if (checked) {
      this.isLooping = true;
      this.reproducirAnimacion(true);
    } else {
      this.isLooping = false;
      if (this.animacionService) {
        // Parar la animación (y volver a pose inicial)
        this.canvasRef?.stopLoop(true);
      }
    }
  }

  
  private _playSub?: Subscription;

  async handlePlay(loop = false) {
  const word   = this.words[this.currentIndex];
  const file   = word.gltf;
  const clip   = word.clipName;       // o word.clips[x].name

  const url = `${environment.apiUrl}/gltf/animaciones/${file}`;

  // 1) carga el modelo si hace falta
  await this.canvasRef?.loadSkinModel(url);

  // 2) dispara el clip
  this.canvasRef?.playClip(clip, loop);
}


  // 6. Al hacer toggle loop
  handleLoopToggle(loop: boolean) {
    if (this.showWebcam) {
      alert('Desactiva la webcam para reproducir la animación.');
      // desmarcar checkbox
      (document.getElementById('toggleLoop') as HTMLInputElement).checked = false;
      return;
    }
    const clipName = this.words[this.currentIndex].clipName;
    if (loop) {
      this.canvasRef?.playClip(clipName, true);
    } else {
      this.canvasRef?.stopClip();
    }
  }

  // Reproducir animación: adaptamos la “palabra actual”
  private reproducirAnimacion(loop: boolean) {
    const w = this.words[this.currentIndex];
    if (!w || !w.gltf) {
      console.warn('No hay GLTF asignado para esta palabra');
      return;
    }
    const url = `${environment.apiUrl}/gltf/animaciones/${w.gltf}`;

      // Llamamos a animacionService
    this.animacionService.cargarAnimaciones([ url ], true, loop);

      // (opcional) Marcar como explorada
        this.usuariosService.explorarPalabraLibre(this.userId, w._id).subscribe({
        next: (resp) => {
          console.log('Palabra explorada (modo guiado). totalExploradas:', resp.totalExploradas);
          this.exploredWordsService.setExploredCount(resp.totalExploradas);
        },
        error: (err) => console.error('Error al marcar explorada:', err),
      });

      if (!loop && this.canvasRef?.animationEnded) {
        this.canvasRef.animationEnded.subscribe(() => {
          const playRadio = document.getElementById('play') as HTMLInputElement;
          if (playRadio) playRadio.checked = false;
        });
      }
    }

  private cambiarVelocidad() {
    console.log('[DEBUG] cambiarVelocidad en modo guiado (demo).');
  }
}
