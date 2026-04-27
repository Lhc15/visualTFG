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
import { HeaderComponent } from '../header/header.component';
import { ProgresoEjercicioService, RegistroEjercicio } from '../services/progreso-ejercicio.service';

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
  imports: [CommonModule, CanvasComponent, ToolMenuComponent, HeaderComponent],
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

  // ── Motor de priorización ─────────────────────────────────────
  // Cola de preguntas de la sesión (palabras ordenadas por prioridad)
  private cola: PalabraEjercicio[] = [];
  // Cuántas veces ha aparecido cada palabra en esta sesión
  private apariciones: Map<string, number> = new Map();
  // Total de preguntas de la sesión (palabras.length + fallos, máx +3)
  totalPreguntas = 0;
  private fallosExtra = 0;
  private historial: Map<string, RegistroEjercicio> = new Map();

  // Modo actual
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
    private statsService: StatsService,
    private progresoEjercicioService: ProgresoEjercicioService
  ) {}

  // Modo ejercicio forzado desde config global ('A'|'B'|'ambos'|null=aleatorio)
  modoForzado: 'A' | 'B' | 'ambos' | null = null;
  // IDs de categorías en modo global
  private catIds: string[] = [];

  ngOnInit(): void {
    this.categoriaId = this.route.snapshot.paramMap.get('categoriaId') ?? '';
    const queryModo = this.route.snapshot.queryParamMap.get('modo');
    this.modoForzado = (queryModo as any) ?? null;
    const queryCats = this.route.snapshot.queryParamMap.get('cats');
    this.catIds = queryCats ? queryCats.split(',') : [];

    this.usuariosService.getAuthenticatedUser().subscribe({
      next: resp => {
        this.userId = resp.usuario.uid;
        this.statsService.startMode(this.userId, 'practica-vocabulario').subscribe({
          next: r => { this.currentStatsId = r.statsId; }
        });
        if (this.categoriaId === 'global') {
          this.cargarGlobal();
        } else {
          Promise.all([
            this.progresoEjercicioService.obtenerProgreso(this.categoriaId).toPromise().catch(() => [] as RegistroEjercicio[]),
            this.categoriasService.obtenerPalabrasPorCategoria(this.categoriaId).toPromise().catch(() => [])
          ]).then(([registros, lista]) => {
            this.procesarCarga(registros ?? [], lista ?? []);
          });
        }
      },
      error: e => console.error(e)
    });
  }

  private cargarGlobal(): void {
    if (this.catIds.length === 0) { this.cargando = false; return; }
    this.categoriaNombre = 'Modo Global';

    Promise.all(
      this.catIds.map(id =>
        Promise.all([
          this.categoriasService.obtenerPalabrasPorCategoria(id).toPromise().catch(() => []),
          this.progresoEjercicioService.obtenerProgreso(id).toPromise().catch(() => [] as RegistroEjercicio[])
        ])
      )
    ).then(resultados => {
      let todasPalabras: any[] = [];
      let todosRegistros: RegistroEjercicio[] = [];

      resultados.forEach(([palabras, registros], idx) => {
        const catId = this.catIds[idx];
        // Calcular estrellas de la categoría para el multiplicador
        const regs = registros as RegistroEjercicio[];
        const estrellas = this.calcularEstrellasCat(regs);
        const multiplicador = estrellas === 0 ? 3 : estrellas === 1 ? 2 : 1;
        // Añadir palabras multiplicadas según rendimiento de categoría
        for (let i = 0; i < multiplicador; i++) {
          todasPalabras = todasPalabras.concat(palabras as any[]);
        }
        todosRegistros = todosRegistros.concat(regs);
      });

      // Deduplicar historial (tomar el peor registro por palabra)
      const histMap = new Map<string, RegistroEjercicio>();
      todosRegistros.forEach(r => {
        const ex = histMap.get(r.palabraId);
        if (!ex || r.vecesFallada > ex.vecesFallada) histMap.set(r.palabraId, r);
      });

      this.procesarCarga([...histMap.values()], todasPalabras);
    });
  }

  private calcularEstrellasCat(registros: RegistroEjercicio[]): number {
    if (!registros.length) return 0;
    const total = registros.reduce((s, r) => s + r.vecesAcertada + r.vecesFallada, 0);
    if (total === 0) return 0;
    const pct = registros.reduce((s, r) => s + r.vecesAcertada, 0) / total;
    if (pct >= 0.8) return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.4) return 1;
    return 0;
  }

  ngAfterViewInit(): void {
    // El canvas se inicializa una vez cargadas las palabras
  }

  ngOnDestroy(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe();
    }
  }

  private procesarCarga(registros: RegistroEjercicio[], resp: any): void {
    const lista = Array.isArray(resp) ? resp : resp.palabras ?? [];
    this.palabras = lista.map((p: any) => ({
      id: p._id,
      palabra: p.palabra,
      gltf: p.gltf ?? null,
      clipName: p.clipName ?? null
    }));
    this.categoriaNombre = lista[0]?.categoria?.nombre ?? this.categoriaId;

    // Construir mapa de historial indexado por palabraId
    this.historial = new Map(registros.map(r => [r.palabraId, r]));

    this.cargando = false;
    if (this.palabras.length >= 2) {
      this.construirCola();
      this.totalPreguntas = this.palabras.length;
      this.elegirModoYPregunta();
    }
  }

  // ── Motor de priorización ─────────────────────────────────────────────────
  // Prioridad: nunca vista (0) > más fallos (1+) > más aciertos (negativo score)
  private prioridadPalabra(p: PalabraEjercicio): number {
    const h = this.historial.get(p.id);
    if (!h) return -1000; // nunca vista → máxima prioridad (más negativo = antes)
    // Fallos suman prioridad (más fallos = número más negativo = antes)
    // Aciertos restan prioridad
    return h.vecesAcertada - h.vecesFallada * 2;
  }

  private construirCola(): void {
    // Agrupar por nivel de prioridad y mezclar dentro de cada grupo
    const ordenadas = [...this.palabras].sort((a, b) => {
      const pa = this.prioridadPalabra(a);
      const pb = this.prioridadPalabra(b);
      if (pa !== pb) return pa - pb;
      return Math.random() - 0.5; // mismo nivel → aleatorio
    });
    this.cola = ordenadas;
    this.apariciones = new Map();
  }

  private siguienteDeCola(): PalabraEjercicio | null {
    // Devuelve la primera palabra de la cola que no haya aparecido 2 veces
    const idx = this.cola.findIndex(p => (this.apariciones.get(p.id) ?? 0) < 2);
    if (idx === -1) return null;
    const p = this.cola.splice(idx, 1)[0];
    this.apariciones.set(p.id, (this.apariciones.get(p.id) ?? 0) + 1);
    return p;
  }

  private reencolar(p: PalabraEjercicio): void {
    // Solo reencola si no ha aparecido 2 veces y hay margen de +3
    if ((this.apariciones.get(p.id) ?? 0) >= 2) return;
    if (this.fallosExtra >= 3) return;
    this.fallosExtra++;
    this.totalPreguntas++;
    this.cola.push(p); // va al final
  }

  // ── Elegir modo aleatorio y generar pregunta ──────────────────────────────

  private elegirModoYPregunta(): void {
    if (this.modoForzado === 'A') {
      this.modo = 'A';
    } else if (this.modoForzado === 'B' && this.palabras.length >= 4) {
      this.modo = 'B';
    } else if (this.palabras.length < 4) {
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
    const siguiente = this.siguienteDeCola();
    if (!siguiente) { this.volver(); return; }
    this.palabraCorrecta = siguiente;

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
    if (!this.mainCanvasRef || !p.gltf) return;
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
    const acertada = p.id === this.palabraCorrecta?.id;
    if (acertada) {
      this.correctas++;
    } else {
      this.errores++;
      if (this.palabraCorrecta) this.reencolar(this.palabraCorrecta);
    }
    if (this.palabraCorrecta) {
      this.progresoEjercicioService.registrar(this.palabraCorrecta.id, this.categoriaId, acertada).subscribe();
    }
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
    const siguiente = this.siguienteDeCola();
    if (!siguiente) { this.volver(); return; }
    this.palabraPreguntaB = siguiente;

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
    const acertada = this.esCorrecto(cellIdx);
    if (acertada) {
      this.correctas++;
    } else {
      this.errores++;
      if (this.palabraPreguntaB) this.reencolar(this.palabraPreguntaB);
    }
    if (this.palabraPreguntaB) {
      this.progresoEjercicioService.registrar(this.palabraPreguntaB.id, this.categoriaId, acertada).subscribe();
    }
  }

  celdaEsCorrectaB(i: number): boolean { return this.seleccionB !== null && this.esCorrecto(i); }
  celdaEsIncorrectaB(i: number): boolean { return this.seleccionB === i && !this.esCorrecto(i); }
  colorManosB(cellIdx: number): string { return COLORES_B[this.ordenB[cellIdx]]; }
  get correctoEnCeldaB(): number { return this.ordenB.findIndex(v => v === 0); }

  // ── Siguiente pregunta (alterna modo) ─────────────────────────────────────

  siguiente(): void {
    if (this.preguntaNum >= this.totalPreguntas) {
      // Sesión completada — volver a vocabulario
      this.volver();
      return;
    }
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