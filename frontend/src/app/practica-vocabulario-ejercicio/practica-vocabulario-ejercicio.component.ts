import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ViewChildren, QueryList, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { CategoriasService } from '../services/categorias.service';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';
import { environment } from '../../environments/environment';

export interface PalabraEjercicio {
  id: string;
  palabra: string;
  gltf: string;
  clipName?: string;
}

type ModoEjercicio = 'A' | 'B'; // A = adivina la palabra, B = encuentra el signo

const COLORES_B = ['#F4A940', '#E04A1A', '#2A7A4A', '#8B00A8'];

@Component({
  selector: 'app-practica-vocabulario-ejercicio',
  standalone: true,
  imports: [CommonModule, CanvasComponent, ToolMenuComponent],
  templateUrl: './practica-vocabulario-ejercicio.component.html',
  styleUrl: './practica-vocabulario-ejercicio.component.css'
})
export class PracticaVocabularioEjercicioComponent implements OnInit, OnDestroy, AfterViewInit {

  // Canvas modo A
  @ViewChild('mainCanvas') mainCanvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;

  // Canvas modo B (4 celdas)
  @ViewChildren('quizBCanvas') quizBCanvases!: QueryList<CanvasComponent>;
  @ViewChildren('quizBCell') quizBCells!: QueryList<ElementRef<HTMLElement>>;

  categoriaId = '';
  categoriaNombre = '';
  palabras: PalabraEjercicio[] = [];
  cargando = true;

  // Modo actual (alterna aleatoriamente)
  modo: ModoEjercicio = 'A';

  // Estado modo A
  palabraCorrecta: PalabraEjercicio | null = null;
  opcionesA: PalabraEjercicio[] = [];
  seleccionA: string | null = null;

  // Estado modo B
  palabraPreguntaB: PalabraEjercicio | null = null;
  ordenB: number[] = [0, 1, 2, 3];
  distractoresB: PalabraEjercicio[] = [];
  seleccionB: number | null = null;
  readonly coloresB = COLORES_B;

  // Stats generales
  correctas = 0;
  errores = 0;
  preguntaNum = 1;

  // Tool menu
  isPlaying = false;
  isLooping = false;
  currentPlaybackRate = 1;
  showWebcam = false;

  userId = '';
  currentStatsId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoriasService: CategoriasService,
    private usuariosService: UsuariosService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.categoriaId = this.route.snapshot.paramMap.get('categoriaId') ?? '';
    this.cargarPalabras();

    this.usuariosService.getAuthenticatedUser().subscribe({
      next: resp => {
        this.userId = resp.usuario.uid;
        this.statsService.startMode(this.userId, 'practica-vocabulario').subscribe({
          next: r => { this.currentStatsId = r.statsId; },
          error: e => console.error(e)
        });
      },
      error: e => console.error(e)
    });
  }

  ngAfterViewInit(): void {
    // El canvas se inicializa una vez cargadas las palabras
  }

  ngOnDestroy(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe();
    }
  }

  private cargarPalabras(): void {
    this.categoriasService.obtenerPalabrasPorCategoria(this.categoriaId).subscribe({
      next: (resp: any) => {
        const lista = Array.isArray(resp) ? resp : resp.palabras ?? [];
        this.palabras = lista
          .filter((p: any) => p.gltf) // solo palabras con animación
          .map((p: any) => ({
            id: p._id,
            palabra: p.palabra,
            gltf: p.gltf,
            clipName: p.clipName
          }));
        this.categoriaNombre = lista[0]?.categoria?.nombre ?? '';
        this.cargando = false;

        if (this.palabras.length >= 2) {
          this.iniciarEjercicio();
        }
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  private iniciarEjercicio(): void {
    this.elegirModoYPregunta();
  }

  // ── Elegir modo aleatorio y generar pregunta ──────────────────────────────

  private elegirModoYPregunta(): void {
    // Con menos de 4 palabras solo podemos hacer modo A
    if (this.palabras.length < 4) {
      this.modo = 'A';
    } else {
      this.modo = Math.random() < 0.5 ? 'A' : 'B';
    }

    if (this.modo === 'A') {
      this.nuevaPreguntaA();
    } else {
      this.nuevaPreguntaB();
      setTimeout(() => this.waitForCanvasesB(), 100);
    }
  }

  // ── MODO A ────────────────────────────────────────────────────────────────

  nuevaPreguntaA(): void {
    this.seleccionA = null;
    const idx = Math.floor(Math.random() * this.palabras.length);
    this.palabraCorrecta = this.palabras[idx];

    const pool = this.palabras.filter(p => p.id !== this.palabraCorrecta!.id);
    const distractores = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    this.opcionesA = [...distractores, this.palabraCorrecta].sort(() => Math.random() - 0.5);

    setTimeout(() => this.waitForCanvasA(), 50);
  }

  private waitForCanvasA(attempts = 0): void {
    if (attempts > 60) return;
    if (!this.mainCanvasRef?.skinReady) {
      setTimeout(() => this.waitForCanvasA(attempts + 1), 100);
      return;
    }
    if (this.avatarPanel) {
      const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
      this.mainCanvasRef.resizeToContainer(w, h);
    }
    if (this.palabraCorrecta) this.reproducirA(this.palabraCorrecta, false);
  }

  private async reproducirA(p: PalabraEjercicio, loop: boolean): Promise<void> {
    if (!this.mainCanvasRef) return;
    this.mainCanvasRef.stopClip();
    const url = `${environment.apiUrl}/gltf/animaciones/${p.gltf}`;
    if (this.mainCanvasRef.currentModel !== url) await this.mainCanvasRef.loadSkinModel(url);
    const clips = this.mainCanvasRef.availableClips;
    if (!clips.length) return;
    const clip = p.clipName && clips.includes(p.clipName) ? p.clipName : clips[0];
    this.mainCanvasRef.playClip(clip, loop);
    this.isPlaying = !loop;
    this.isLooping = loop;
  }

  elegirOpcionA(p: PalabraEjercicio): void {
    if (this.seleccionA !== null) return;
    this.seleccionA = p.id;
    if (p.id === this.palabraCorrecta?.id) this.correctas++;
    else this.errores++;
  }

  esCorrectaA(p: PalabraEjercicio): boolean {
    return this.seleccionA !== null && p.id === this.palabraCorrecta?.id;
  }
  esIncorrectaA(p: PalabraEjercicio): boolean {
    return this.seleccionA === p.id && p.id !== this.palabraCorrecta?.id;
  }

  onPlayClicked(): void { if (this.palabraCorrecta) this.reproducirA(this.palabraCorrecta, false); }
  handleLoop(checked: boolean): void {
    if (!this.palabraCorrecta) return;
    if (checked) this.reproducirA(this.palabraCorrecta, true);
    else { this.mainCanvasRef?.stopClip(); this.isLooping = false; this.isPlaying = false; }
  }
  setPlaybackRate(rate: number): void {
    this.currentPlaybackRate = rate;
    this.mainCanvasRef?.setPlaybackRate(rate);
  }
  toggleWebcam(): void { this.showWebcam = !this.showWebcam; }
  onAnimationEnded(): void { this.isPlaying = false; }

  // ── MODO B ────────────────────────────────────────────────────────────────

  nuevaPreguntaB(): void {
    this.seleccionB = null;
    const idx = Math.floor(Math.random() * this.palabras.length);
    this.palabraPreguntaB = this.palabras[idx];

    const pool = this.palabras.filter(p => p.id !== this.palabraPreguntaB!.id);
    this.distractoresB = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    this.ordenB = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  }

  private waitForCanvasesB(attempts = 0): void {
    if (attempts > 60) return;
    const canvases = this.quizBCanvases?.toArray() ?? [];
    const cells = this.quizBCells?.toArray() ?? [];
    if (canvases.length < 4 || !canvases.every(c => c.skinReady)) {
      setTimeout(() => this.waitForCanvasesB(attempts + 1), 100);
      return;
    }
    canvases.forEach((canvas, i) => {
      if (cells[i]) {
        const { clientWidth: w, clientHeight: h } = cells[i].nativeElement;
        canvas.resizeToContainer(w, h);
      }
    });
    this.loadAnimationsB();
  }

  private async loadAnimationsB(): Promise<void> {
    const canvases = this.quizBCanvases?.toArray() ?? [];
    if (canvases.length < 4 || !this.palabraPreguntaB) return;

    const cuatro: PalabraEjercicio[] = new Array(4);
    for (let i = 0; i < 4; i++) {
      cuatro[i] = this.ordenB[i] === 0
        ? this.palabraPreguntaB
        : this.distractoresB[this.ordenB[i] - 1];
    }

    for (let i = 0; i < 4; i++) {
      const canvas = canvases[i];
      const p = cuatro[i];
      canvas.stopClip();
      const url = `${environment.apiUrl}/gltf/animaciones/${p.gltf}`;
      if (canvas.currentModel !== url) await canvas.loadSkinModel(url);
      const clips = canvas.availableClips;
      if (!clips.length) continue;
      const clip = p.clipName && clips.includes(p.clipName) ? p.clipName : clips[0];
      canvas.playClip(clip, true);
    }
  }

  esCorrecto(cellIdx: number): boolean { return this.ordenB[cellIdx] === 0; }

  elegirCeldaB(cellIdx: number): void {
    if (this.seleccionB !== null) return;
    this.seleccionB = cellIdx;
    if (this.esCorrecto(cellIdx)) this.correctas++;
    else this.errores++;
  }

  celdaEsCorrectaB(i: number): boolean { return this.seleccionB !== null && this.esCorrecto(i); }
  celdaEsIncorrectaB(i: number): boolean { return this.seleccionB === i && !this.esCorrecto(i); }
  colorManosB(cellIdx: number): string { return COLORES_B[this.ordenB[cellIdx]]; }
  get correctoEnCeldaB(): number { return this.ordenB.findIndex(v => v === 0); }

  // ── Siguiente pregunta (alterna modo) ─────────────────────────────────────

  siguiente(): void {
    this.preguntaNum++;
    this.elegirModoYPregunta();
  }

  // ── Navegación ────────────────────────────────────────────────────────────

  volver(): void { this.router.navigate(['/practica/vocabulario']); }

  get tituloModo(): string {
    return this.modo === 'A' ? 'Adivina la palabra' : 'Encuentra el signo';
  }

  get badgeModo(): string {
    return this.modo === 'A' ? 'Modo A · Adivina' : 'Modo B · Identifica';
  }
}