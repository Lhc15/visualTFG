import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

declare const confetti: any;
import { CategoriasService } from '../services/categorias.service';
import { UsuariosService } from '../services/usuarios.service';
import { environment } from '../../environments/environment';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { DescripcionTooltipComponent } from '../descripcion-tooltip/descripcion-tooltip.component';
import { DescripcionService } from '../services/descripcion.service';
import { ProgresoVocabularioService } from '../services/progreso-vocabulario.service';
import { HeaderComponent } from '../header/header.component';
import { DesbloqueoService } from '../services/desbloqueo.service';

// vista: 'selector' | 'vocabulario' | 'comunicacion'
type Vista = 'selector' | 'vocabulario' | 'comunicacion';

@Component({
  selector: 'app-aprende',
  standalone: true,
  imports: [CommonModule, CanvasComponent, FormsModule, ToolMenuComponent, DescripcionTooltipComponent, HeaderComponent],
  templateUrl: './aprende.component.html',
  styleUrls: ['./aprende.component.css']
})
export class AprendeComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;

  // ── Navegación interna ──
  vista: Vista = 'selector';

  // ── Vocabulario ──
  categorias: any[] = [];
  selectedCategory: any = null;
  palabrasDeCategoriaSeleccionada: any[] = [];
  numeroPalabrasResumen = 2;
  searchText = '';
  selectedCategoryIds: string[] = [];
  isOpen = false;

  // ── Palabra / avatar ──
  selectedWord: any = null;
  hasClickedWord = false;
  toolMenuOpen = false;
  isLooping = false;
  isPlaying = false;
  showWebcam = false;
  currentPlaybackRate = 1;
  selectedTool: string | null = null;

  userId = '';
  palabrasVistas = new Set<string>();
  categoriasCompletadas = new Set<string>();

  // ── Desbloqueo ──
  esAdmin = false;
  comunicacionDesbloqueada = false;

  // ── Chip de desbloqueo ──
  chipVisible = false;
  chipTexto = '';
  private chipTimer: any = null;

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private usuariosService: UsuariosService,
    private descripcionService: DescripcionService,
    private progresoVocabService: ProgresoVocabularioService,
    private desbloqueoService: DesbloqueoService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        this.userId = resp.usuario.uid;
        this.esAdmin = resp.usuario?.rol === 'ROL_ADMIN';
        this.progresoVocabService.obtenerProgreso('vocabulario').subscribe({
          next: (vistas) => {
            this.palabrasVistas = new Set(vistas);
            const guardadas = localStorage.getItem(`vv_cats_completadas_${resp.usuario.uid}`);
            if (guardadas) this.categoriasCompletadas = new Set(JSON.parse(guardadas));
          }
        });
        if (this.esAdmin) {
          this.comunicacionDesbloqueada = true;
        } else {
          this.desbloqueoService.obtenerEstado().subscribe({
            next: (estado) => {
              this.comunicacionDesbloqueada = estado.vocabularioCompleto;
            }
          });
        }
      },
      error: (err) => console.error('Error user:', err)
    });
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
    if (this.chipTimer) clearTimeout(this.chipTimer);
  }

  ngAfterViewInit(): void {
    this.waitForSkinAndResize();
  }

  private waitForSkinAndResize(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.canvasRef?.skinReady) {
      setTimeout(() => this.waitForSkinAndResize(attempts + 1), 100);
      return;
    }
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    if (!this.avatarPanel || !this.canvasRef) return;
    const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
    this.canvasRef.resizeToContainer(w, h);
  }

  // ── Navegación interna ────────────────────────────────────
  irAVocabulario(): void {
    this.vista = 'vocabulario';
    this.cargarCategorias();
  }

  irAComunicacion(): void {
    if (!this.comunicacionDesbloqueada) return;
    this.router.navigate(['/aprende/comunicacion']); return;
    this.vista = 'comunicacion';
  }

  irAModos(): void { this.router.navigate(['/modos']); }

  volverASelector(): void {
    this.vista = 'selector';
    this.selectedCategory = null;
    this.palabrasDeCategoriaSeleccionada = [];
    this.selectedWord = null;
    this.hasClickedWord = false;
    this.isPlaying = false;
    this.isLooping = false;
    // Comprobar si hay un unlock de Comunicación pendiente de mostrar
    if (this.userId) {
      const pendiente = localStorage.getItem(`vv_unlock_comunicacion_${this.userId}`);
      if (pendiente) {
        localStorage.removeItem(`vv_unlock_comunicacion_${this.userId}`);
        setTimeout(() => {
          this.lanzarConfeti();
          this.mostrarChip('🔓 Comunicación desbloqueada');
        }, 300);
      }
    }
  }

  volverAModos(): void {
    this.router.navigate(['/modos2']);
  }

  // ── Categorías ────────────────────────────────────────────
  cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data: any[]) => {
        this.categorias = data.filter((c: any) =>
          c.modulo === 'vocabulario' &&
          !c.nombre?.toLowerCase().includes('conversacion')
        );
        this.categorias.forEach(cat => {
          this.categoriasService.obtenerPalabrasPorCategoria(cat._id).subscribe({
            next: (palabras) => { cat.palabras = palabras; },
            error: (e) => console.error(e)
          });
        });
      },
      error: (err) => console.error('Error al cargar categorías:', err)
    });
  }

  onCategoryClick(cat: any): void {
    this.searchText = '';
    this.selectedCategory = cat;
    this.categoriasService.obtenerPalabrasPorCategoria(cat._id).subscribe({
      next: (palabras) => { this.palabrasDeCategoriaSeleccionada = palabras; },
      error: (e) => console.error(e)
    });
  }

  volverAListaCategorias(): void {
    this.searchText = '';
    this.selectedCategory = null;
    this.palabrasDeCategoriaSeleccionada = [];
    this.selectedWord = null;
    this.hasClickedWord = false;
    this.isPlaying = false;
    this.isLooping = false;
  }

  getPrimerasPalabras(cat: any): string {
    if (!cat.palabras?.length) return 'Sin palabras';
    return cat.palabras.slice(0, this.numeroPalabrasResumen).map((p: any) => p.palabra).join(', ');
  }

  getProgresoCat(cat: any): number {
    if (!cat.palabras?.length) return 0;
    const vistas = cat.palabras.filter((p: any) => this.palabrasVistas.has(p._id)).length;
    return Math.round((vistas / cat.palabras.length) * 100);
  }

  // ── Palabra seleccionada ──────────────────────────────────
  seleccionarPalabra(palabra: any): void {
    if (this.canvasRef) this.canvasRef.stopLoop(true);
    const playRadio = document.getElementById('play') as HTMLInputElement;
    if (playRadio) playRadio.checked = false;
    this.isLooping = false;
    const loopCb = document.getElementById('toggleLoop') as HTMLInputElement;
    if (loopCb) loopCb.checked = false;
    this.descripcionService.hide();
    this.selectedWord = palabra;
    if (!this.hasClickedWord) { this.toolMenuOpen = true; this.hasClickedWord = true; }
  }

  // ── Reproducción ──────────────────────────────────────────
  async reproducirAnimacion(loop: boolean): Promise<void> {
    if (!this.selectedWord?.gltf) return;
    const url = `${environment.apiUrl}/gltf/animaciones/${this.selectedWord.gltf}`;
    this.canvasRef.stopClip();
    if (this.canvasRef.currentModel !== url) await this.canvasRef.loadSkinModel(url);
    const clips = this.canvasRef.availableClips;
    if (!clips.length) { console.error('Sin clips'); return; }
    const clipName = this.selectedWord.clipName && clips.includes(this.selectedWord.clipName)
      ? this.selectedWord.clipName : clips[0];
    this.canvasRef.playClip(clipName, loop);
    this.isPlaying = !loop;
    this.isLooping = loop;
  }

  onPlayClicked(): void {
    this.isLooping = false;
    this.isPlaying = true;
    if (this.selectedWord?.usarDescripcion && this.selectedWord?.descripcion) {
      this.descripcionService.show(this.selectedWord.descripcion);
    }
    if (this.selectedWord?._id && !this.palabrasVistas.has(this.selectedWord._id)) {
      this.palabrasVistas.add(this.selectedWord._id);
      this.progresoVocabService.marcarVista(this.selectedWord._id, 'vocabulario').subscribe({
        next: () => { this.comprobarCompletadoCategoria(); }
      });
    }
    this.reproducirAnimacion(false);
  }

  private comprobarCompletadoCategoria(): void {
    if (!this.selectedCategory) return;
    const catId = this.selectedCategory._id;
    if (this.categoriasCompletadas.has(catId)) return;
    if (this.categoriaActualCompletada) {
      const eraVocabCompleto = this.comunicacionDesbloqueada;
      this.categoriasCompletadas.add(catId);
      if (this.userId) {
        localStorage.setItem(
          `vv_cats_completadas_${this.userId}`,
          JSON.stringify([...this.categoriasCompletadas])
        );
      }
      this.lanzarConfeti();
      // Recalcular estado de desbloqueo global
      if (!this.esAdmin) {
        this.desbloqueoService.obtenerEstado().subscribe({
          next: (estado) => {
            const recienDesbloqueado = !eraVocabCompleto && estado.vocabularioCompleto;
            this.comunicacionDesbloqueada = estado.vocabularioCompleto;
            if (recienDesbloqueado) {
              this.mostrarChip('🔓 Comunicación desbloqueada');
              // Guardar en localStorage para que el chip salga también al volver al selector
              localStorage.setItem(`vv_unlock_comunicacion_${this.userId}`, '1');
            }
          }
        });
      }
    }
  }

  private mostrarChip(texto: string): void {
    if (this.chipTimer) clearTimeout(this.chipTimer);
    this.chipTexto = texto;
    this.chipVisible = true;
    this.chipTimer = setTimeout(() => { this.chipVisible = false; }, 4500);
  }

  private lanzarConfeti(): void {
    if (typeof confetti === 'undefined') return;
    const colores = ['#E04A1A', '#F4A940', '#1C0E0A', '#F9F6F3', '#F0997B'];
    const base = {
      spread: 70,
      colors: colores,
      gravity: 1.1,
      scalar: 1.1,
      ticks: 350
    };
    // Salva inicial — dos cañones
    confetti({ ...base, particleCount: 120, angle: 60,  startVelocity: 60, origin: { x: 0, y: 0.65 } });
    confetti({ ...base, particleCount: 120, angle: 120, startVelocity: 60, origin: { x: 1, y: 0.65 } });
    // Segunda ráfaga a los 400ms
    setTimeout(() => {
      confetti({ ...base, particleCount: 80, angle: 70,  startVelocity: 50, origin: { x: 0, y: 0.7 } });
      confetti({ ...base, particleCount: 80, angle: 110, startVelocity: 50, origin: { x: 1, y: 0.7 } });
    }, 400);
    // Tercera ráfaga a los 900ms
    setTimeout(() => {
      confetti({ ...base, particleCount: 50, angle: 65,  startVelocity: 45, origin: { x: 0, y: 0.6 } });
      confetti({ ...base, particleCount: 50, angle: 115, startVelocity: 45, origin: { x: 1, y: 0.6 } });
    }, 900);
  }
  onAnimationEnded(): void { this.isPlaying = false; }
  setPlaybackRate(rate: number): void { this.currentPlaybackRate = rate; this.canvasRef?.setPlaybackRate(rate); }

  handleLoop(checked: boolean): void {
    this.isLooping = checked;
    if (checked) { this.isPlaying = false; this.reproducirAnimacion(true); }
    else { this.canvasRef.stopClip(); this.isPlaying = false; }
  }

  // ── Webcam ────────────────────────────────────────────────
  toggleWebcam(): void {
    this.showWebcam ? this.stopWebcam() : this.startWebcam();
    this.showWebcam = !this.showWebcam;
  }

  startWebcam(): void {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      this.videoElement.nativeElement.srcObject = stream;
      this.videoElement.nativeElement.play();
    }).catch(err => console.error('Error webcam:', err));
  }

  stopWebcam(): void {
    const video = this.videoElement.nativeElement;
    (video.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }

  // ── Búsqueda ──────────────────────────────────────────────
  get filteredCategorias(): any[] {
    const s = this.searchText.trim().toLowerCase();
    if (!s) return this.categorias;
    return this.categorias.filter(c => {
      // Coincide con el nombre de la categoría
      if (c.nombre.toLowerCase().includes(s)) return true;
      // O con alguna palabra dentro de la categoría
      if (c.palabras?.some((p: any) => {
        const nombre = typeof p === 'string' ? p : p.palabra ?? '';
        return nombre.toLowerCase().includes(s);
      })) return true;
      return false;
    });
  }

  get filteredWordsInSelectedCategory(): any[] {
    if (!this.searchText.trim()) return this.palabrasDeCategoriaSeleccionada;
    const s = this.searchText.toLowerCase();
    return this.palabrasDeCategoriaSeleccionada.filter(p => p.palabra.toLowerCase().includes(s));
  }

  get categoriaActualCompletada(): boolean {
    if (!this.selectedCategory || this.palabrasDeCategoriaSeleccionada.length === 0) return false;
    return this.palabrasDeCategoriaSeleccionada.every(p => this.palabrasVistas.has(p._id));
  }

  handleClickOutside(): void { if (this.isOpen) this.isOpen = false; }

  // ── Breadcrumb dinámico ───────────────────────────────────
  get breadcrumbBack(): string {
    if (this.selectedCategory) return 'Vocabulario';
    if (this.vista === 'vocabulario') return 'Aprende';
    if (this.vista === 'comunicacion') return 'Aprende';
    return 'Inicio';
  }

  onBackClick(): void {
    if (this.selectedCategory) { this.volverAListaCategorias(); return; }
    if (this.vista !== 'selector') { this.volverASelector(); return; }
    this.volverAModos();
  }
}