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

  currentAnimationUrls: string[] = [];
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

  selectedTool: string | null = null;
velocSliderVisible: boolean = false;
currentPlaybackRate: number = 1;
lastSelectedRadio: string | null = null;



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
  const input = event.target as HTMLInputElement;
  const value = input.value;

  if (!this.selectedWord && value !== 'webcam') {
    alert('Primero selecciona una palabra.');
    input.checked = false;
    return;
  }

  // 👉 Si clican en "veloc" y ya era el seleccionado => toggle OFF
  if (value === 'veloc' && this.lastSelectedRadio === 'veloc') {
    this.velocSliderVisible = false;
    this.selectedTool = null;
    input.checked = false; // desmarca el botón
    this.lastSelectedRadio = null;
    return;
  }

  // 👉 Si clican en "webcam" => cerrar barra
  if (value === 'webcam') {
    this.selectedTool = 'webcam';
    this.velocSliderVisible = false;
    this.lastSelectedRadio = 'webcam';
    return;
  }

  // 👉 Si clican en "veloc" por primera vez => abrir
  if (value === 'veloc') {
    this.velocSliderVisible = true;
    this.selectedTool = 'veloc';
    this.lastSelectedRadio = 'veloc';
    return;
  }

  // 👉 Otros botones
  this.selectedTool = value;
  this.lastSelectedRadio = value;

  if (value === 'play') {
    this.reproducirAnimacion(false);
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
      this.isLooping = false;
      if (this.canvasRef) {
        this.canvasRef.stopLoop(true);
      }
    }
  }

  private reproducirAnimacion(loop: boolean) {
    if (!this.selectedWord) return;

    this.statsService.recordWordEntry(this.selectedWord._id)
    .subscribe({
      next: () => console.log('Palabra registrada en stats'),
      error: e => console.error('Error al registrar palabra', e)
    });


    if (this.selectedWord.animaciones?.length > 0) {
      const animacionesUrls = this.selectedWord.animaciones.map((anim: any) =>
        `${environment.apiUrl}/gltf/animaciones/${anim.filename}`
      );

      // Llamamos a animacionService con loop
      this.animacionService.cargarAnimaciones(animacionesUrls, true, loop);

      // ----------------------------------------------------
      // Si NO es loop, deseleccionamos "play" al terminar
      // (Asumiendo que tu CanvasComponent o animacionService
      //  tengan alguna forma de avisar cuando la animación
      //  acaba, por ejemplo "canvasRef.animationEnded.subscribe"
      //  o un callback. Ajusta a tu caso real.)
      // ----------------------------------------------------
      if (!loop && this.canvasRef && this.canvasRef.animationEnded) {
        this.canvasRef.animationEnded.subscribe(() => {
          const playRadio = document.getElementById('play') as HTMLInputElement;
          if (playRadio) {
            playRadio.checked = false;
          }
        });
      }

      // Registrar exploración
      this.usuariosService.explorarPalabraLibre(this.userId, this.selectedWord._id).subscribe({
        next: (resp) => {
          console.log('Palabra explorada. totalExploradas:', resp.totalExploradas);
          this.exploredWordsService.setExploredCount(resp.totalExploradas);
        },
        error: (err) => console.error('Error al marcar explorada:', err)
      });
    } else {
      console.warn('No hay animaciones en la palabra seleccionada');
    }
  }

  private cambiarVelocidad() {
    console.log('Cambiar velocidad (demo)');
  }

  //velocidad
  setPlaybackRate(rate: number) {
  this.currentPlaybackRate = rate;
  if (this.canvasRef) {
    this.canvasRef.setPlaybackRate(rate);
  }
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
