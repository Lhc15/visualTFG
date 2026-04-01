import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from '../canvas/canvas.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CategoriasService } from '../services/categorias.service';
import { UsuariosService } from '../services/usuarios.service';
import { environment } from '../../environments/environment';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';

// vista: 'selector' | 'vocabulario' | 'comunicacion'
type Vista = 'selector' | 'vocabulario' | 'comunicacion';

@Component({
  selector: 'app-aprende',
  standalone: true,
  imports: [CommonModule, CanvasComponent, FormsModule, ToolMenuComponent],
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

  constructor(
    private router: Router,
    private categoriasService: CategoriasService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => { this.userId = resp.usuario.uid; },
      error: (err) => console.error('Error user:', err)
    });
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleClickOutside.bind(this));
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
    this.router.navigate(['/aprende/comunicacion']); return;
    this.vista = 'comunicacion';
  }

  volverASelector(): void {
    this.vista = 'selector';
    this.selectedCategory = null;
    this.palabrasDeCategoriaSeleccionada = [];
    this.selectedWord = null;
    this.hasClickedWord = false;
    this.isPlaying = false;
    this.isLooping = false;
  }

  volverAModos(): void {
    this.router.navigate(['/modos2']);
  }

  // ── Categorías ────────────────────────────────────────────
  cargarCategorias(): void {
    this.categoriasService.obtenerCategorias().subscribe({
      next: (data: any[]) => {
        this.categorias = data.filter((c: any) => c.modulo === 'vocabulario');
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
    this.selectedCategory = cat;
    this.categoriasService.obtenerPalabrasPorCategoria(cat._id).subscribe({
      next: (palabras) => { this.palabrasDeCategoriaSeleccionada = palabras; },
      error: (e) => console.error(e)
    });
  }

  volverAListaCategorias(): void {
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

  // ── Palabra seleccionada ──────────────────────────────────
  seleccionarPalabra(palabra: any): void {
    if (this.canvasRef) this.canvasRef.stopLoop(true);
    const playRadio = document.getElementById('play') as HTMLInputElement;
    if (playRadio) playRadio.checked = false;
    this.isLooping = false;
    const loopCb = document.getElementById('toggleLoop') as HTMLInputElement;
    if (loopCb) loopCb.checked = false;
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

  onPlayClicked(): void { this.isLooping = false; this.isPlaying = true; this.reproducirAnimacion(false); }
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
  get filteredWordsInSelectedCategory(): any[] {
    if (!this.searchText.trim()) return this.palabrasDeCategoriaSeleccionada;
    const s = this.searchText.toLowerCase();
    return this.palabrasDeCategoriaSeleccionada.filter(p => p.palabra.toLowerCase().includes(s));
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