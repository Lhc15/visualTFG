import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { HeaderComponent } from '../header/header.component';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';
import { AnimacionService } from '../services/animacion.service';
import { PalabrasService } from '../services/palabras.service';
import { UsuariosService } from '../services/usuarios.service';
import { ExploredWordsService } from '../services/explored_word.service';
import { StatsService } from '../services/stats.service';

import { environment } from '../../environments/environment';
import introJs from 'intro.js';

@Component({
  selector: 'app-modo-libre',
  standalone: true,
  imports: [CommonModule, CanvasComponent, HeaderComponent, FormsModule],
  templateUrl: './modo-libre.component.html',
  styleUrls: ['./modo-libre.component.css']
})
export class ModoLibreComponent implements OnInit, OnDestroy {
  // Referencia al CanvasComponent
  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;

  categorias: any[] = [];
  selectedCategory: any = null;
  palabrasDeCategoriaSeleccionada: any[] = [];

  //currentAnimationUrls: string[] = [];
  numeroPalabrasResumen = 2;

  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  showWebcam = false;

  isOpen = false;
  searchText: string = '';
  selectedCategoryIds: string[] = [];

  userId: string = '';
  currentStatsId: string | null = null;

  selectedWord: any = null;
  hasClickedWord = false;
  toolMenuOpen = false;

  // Controla si está en loop
  isLooping = false;
  currentCategorySessionId: string|null = null;

  public isPlaying = false;


  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private animacionService: AnimacionService,
    private palabrasService: PalabrasService,
    private usuariosService: UsuariosService,
    private exploredWordsService: ExploredWordsService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.cargarCategorias();

    // Obtener user y arrancar stats
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        const user = resp.usuario;

        this.userId = user.uid;

        // Iniciar la sesión en modo libre:
        this.statsService.startMode(user.uid, 'libre').subscribe({
          next: (resp) => {
            this.currentStatsId = resp.statsId;
            console.log('Sesión modo libre iniciada. statsId:', this.currentStatsId);
          },
          error: (err) => console.error('Error al iniciar modo libre:', err)
        });
      },
      error: (err) => console.error('Error user:', err)
    });

    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe({
        next: (resp) => {
          console.log('Sesión modo libre cerrada. Duración:', resp.durationMs);
        },
        error: (err) => console.error('Error al cerrar sesión modo libre:', err)
      });
    }
  }

  // **************************************
  // CAMBIO DE PALABRA => DETENER ANIMACIÓN, POSE INICIAL
  // **************************************
  seleccionarPalabra(palabra: any): void {
    // 1) Parar lo que esté corriendo y volver a la pose inicial
    if (this.canvasRef) {
      this.canvasRef.stopLoop(true); // revertToDefault = true
    }

    // Desmarcar el radio de Play y el checkbox de Loop
    const playRadio = document.getElementById('play') as HTMLInputElement;
    if (playRadio) {
      playRadio.checked = false;
    }
    this.isLooping = false;
    const loopCheckbox = document.getElementById('toggleLoop') as HTMLInputElement;
    if (loopCheckbox) {
      loopCheckbox.checked = false;
    }

    // 2) Guardar la palabra
    this.selectedWord = palabra;

    // 3) Si es la primera vez que clican, abrimos menú
    if (!this.hasClickedWord) {
      this.toolMenuOpen = true;
      this.hasClickedWord = true;
    }
  }

  // **************************************
  // RADIOS: Play / Webcam / Veloc
  // **************************************
  onRadioChange(event: Event) {
    const valor = (event.target as HTMLInputElement).value;

    // Si no hay palabra seleccionada, solo permitimos la webcam
    if (!this.selectedWord && valor !== 'webcam') {
      alert('Primero selecciona una palabra.');
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

  // **************************************
  // Toggle loop/play-bucle
  // **************************************
  onToggleLoop(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedWord) {
        alert('Primero selecciona una palabra');
        (event.target as HTMLInputElement).checked = false;
        return;
      }
      this.isLooping = true;
      this.reproducirAnimacion(true);
    } else {
        // desactivas bucle → PARAR SkinEngine
        this.isLooping = false;
        //  ↓ En lugar de stopLoop(), llamamos a stopClip()
        this.canvasRef.stopClip();
        // opcional: si también ligas isPlaying con ngModel
        this.isPlaying = false;
      }
  }

  // Modified version of the reproducirAnimacion function in modo-libre.component.ts
  private async reproducirAnimacion(loop: boolean) {
    if (!this.selectedWord?.gltf) return;

    const url = `${environment.apiUrl}/gltf/animaciones/${this.selectedWord.gltf}`;

    /* 1 ▸ Detenemos solo el clip que estuviera sonando */
    this.canvasRef.stopClip();

    /* 2 ▸ Si el modelo cambia, lo cargamos; si es el mismo, lo dejamos */
    if (this.canvasRef.currentModel !== url) {
      await this.canvasRef.loadSkinModel(url);
    }

    /* 3 ▸ Elegimos clip y lo lanzamos */
    const clips = this.canvasRef.availableClips;
    if (!clips.length) { console.error('Sin clips'); return; }

    const clipName = this.selectedWord.clipName && clips.includes(this.selectedWord.clipName)
                  ? this.selectedWord.clipName
                  : clips[0];

    this.canvasRef.playClip(clipName, loop);
    this.isPlaying = true;

    /* (Opcional) registrar palabra explorada ─ lo que ya tenías */
    this.usuariosService.explorarPalabraLibre(this.userId, this.selectedWord._id)
        .subscribe({ next: resp => this.exploredWordsService.setExploredCount(resp.totalExploradas) });
  }

  private cambiarVelocidad() {
    console.log('Cambiar velocidad (demo)');
  }

  // **************************************
  // WEBCAM => se puede usar a la vez
  // **************************************
  toggleWebcam() {
    // No bloqueamos el menú => se puede reproducir con la webcam activa
    if (!this.showWebcam) {
      this.startWebcam();
    } else {
      this.stopWebcam();
    }
    this.showWebcam = !this.showWebcam;
  }

  startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        const video: HTMLVideoElement = this.videoElement.nativeElement;
        video.srcObject = stream;
        video.play();
      })
      .catch((err) => console.error('Error webcam:', err));
  }

  stopWebcam() {
    const video: HTMLVideoElement = this.videoElement.nativeElement;
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    video.srcObject = null;
  }

  // **************************************
  // CATEGORÍAS
  // **************************************
  cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data) => {
        this.categorias = data;
        // Cargar las palabras
        this.categorias.forEach(cat => {
          this.categoriasService.obtenerPalabrasPorCategoria(cat._id).subscribe({
            next: (palabras) => {
              cat.palabras = palabras;
            },
            error: (e) => console.error(e)
          });
        });
      },
      error: (error) => console.error('Error al cargar cat:', error),
    });
  }

  onCategoryClick(cat: any): void {
    this.selectedCategory = cat;
    this.categoriasService.obtenerPalabrasPorCategoria(cat._id).subscribe({
      next: (palabras) => {
        this.palabrasDeCategoriaSeleccionada = palabras;
      },
      error: (e) => console.error(e)
    });

    this.statsService.recordCategoryEntry(cat._id).subscribe({
      next: () => console.log('Categoría registrada en stats'),
      error: (e) => console.error('Error al registrar categoría', e)
    });

    this.statsService.startCategorySession(cat._id)
    .subscribe(resp => this.currentCategorySessionId = resp.sessionId);

  }

  volverAListaCategorias(): void {
    if (this.currentCategorySessionId) {
      this.statsService.endCategorySession(this.currentCategorySessionId)
        .subscribe();
      this.currentCategorySessionId = null;
    }
    this.selectedCategory = null;
    this.palabrasDeCategoriaSeleccionada = [];
    this.toolMenuOpen = false;
    this.selectedWord = null;
    this.hasClickedWord = false;
  }

  getPrimerasPalabras(cat: any): string {
    if (!cat.palabras || cat.palabras.length === 0) {
      return 'Sin palabras';
    }
    const primeras = cat.palabras.slice(0, this.numeroPalabrasResumen).map((p: any) => p.palabra);
    return primeras.join(', ');
  }

  // **************************************
  // FILTRO / BÚSQUEDA
  // **************************************
  get filteredCategoriesBySearch(): any[] {
    if (!this.searchText) return this.categorias;
  
    const lowerSearch = this.searchText.toLowerCase();
  
    // Si estamos en vista 2 (hay categoría seleccionada)
    if (this.selectedCategory) {
      return this.selectedCategory.palabras.filter((p: any) =>
        p.palabra.toLowerCase().includes(lowerSearch)
      );
    }
    
    
    // Si estamos en vista 1 (no hay categoría seleccionada)
    const categoriasFiltradas = this.categorias.filter(cat => {
      const catMatch = cat.nombre.toLowerCase().includes(lowerSearch);
      const palabraMatch = cat.palabras?.some((p: any) =>
        p.palabra.toLowerCase().includes(lowerSearch)
      );
      return catMatch || palabraMatch;
    });
  
    return categoriasFiltradas;
  }
  

  onSearchInput(): void {}
  onInputFocus(): void {
    this.isOpen = true;
  }
  performSearch(): void {}

  get filteredCategories(): any[] {
    if (this.selectedCategoryIds.length === 0) return this.categorias;
    return this.categorias.filter(cat => this.selectedCategoryIds.includes(cat._id));
  }

  onCheckboxChange(event: Event, cat: any) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      if (!this.selectedCategoryIds.includes(cat._id)) {
        this.selectedCategoryIds.push(cat._id);
      }
    } else {
      this.selectedCategoryIds = this.selectedCategoryIds.filter(id => id !== cat._id);
    }
  }

  // **************************************
  // DROPDOWN
  // **************************************
  handleClickOutside(): void {
    if (this.isOpen) {
      this.isOpen = false;
    }
  }
  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  // **************************************
  // NAVEGACIÓN
  // **************************************
  navigateTo(destination: string) {
    if (destination === 'admin') {
      this.router.navigate(['/admin']);
    } else if (destination === 'ajustes') {
      this.router.navigate(['/ajustes']);
    } else if (destination === 'perfil') {
      this.router.navigate(['/perfil']);
    }
  }

  volverAModos(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe({
        next: (resp) => {
          console.log('Sesión libre cerrada. Duración(ms):', resp.durationMs);
          this.router.navigate(['/modos']);
        },
        error: (err) => {
          console.error('Error al cerrar sesion libre:', err);
          this.router.navigate(['/modos']);
        }
      });
    } else {
      this.router.navigate(['/modos']);
    }
  }

  // **************************************
  // TUTORIAL
  // **************************************
  iniciarTutorial() {
    const intro = introJs();
    intro.setOptions({
      steps: [
        {
          element: '#mode-selector',
          intro: 'Aquí puedes elegir el modo: Libre, Guiado o Examen.',
          position: 'right'
        },
        {
          element: '#modo-libre-container',
          intro: 'En Modo Libre verás categorías y palabras para animar el avatar.',
          position: 'top'
        },
        {
          element: '#avatar-element',
          intro: 'Este es tu avatar 3D. ¡Puedes interactuar con él!',
          position: 'left'
        }
      ],
      showProgress: true,
      showBullets: false,
      nextLabel: 'Siguiente',
      prevLabel: 'Anterior',
      skipLabel: 'Saltar',
      doneLabel: 'Finalizar'
    });
    intro.start();
  }

  // **************************************
  // LOGOUT
  // **************************************
  logout(): void {
    console.log('Cerrando sesión modo libre...');
    this.usuariosService.logout().subscribe({
      next: (resp) => {
        console.log('Logout ok:', resp);
        this.router.navigate(['/landing']);
      },
      error: (error) => {
        console.error('Error logout:', error);
        alert('Error al cerrar sesión.');
      },
    });
  }
  get filteredWordsInSelectedCategory(): any[] {
    if (!this.searchText || this.searchText.trim() === '') {
      return this.palabrasDeCategoriaSeleccionada;
    }
  
    const lowerSearch = this.searchText.toLowerCase();
    return this.palabrasDeCategoriaSeleccionada.filter(p =>
      p.palabra.toLowerCase().includes(lowerSearch)
    );
  }
}
