import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ViewChildren, QueryList, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';
import { environment } from '../../environments/environment';

type Pantalla = 'aprende' | 'nombre' | 'practica' | 'quizA' | 'quizB';

interface LetraInfo {
  letra: string;
  gltf: string;
}

const LETRAS: LetraInfo[] = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('').map(l => ({
  letra: l,
  gltf: `${l.toLowerCase()}_lse.gltf`
}));

const QUIZ_B_COLORS = ['#00B4D8', '#E04A1A', '#2A7A4A', '#D4A017'];

@Component({
  selector: 'app-abecedario',
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasComponent, ToolMenuComponent],
  templateUrl: './abecedario.component.html',
  styleUrl: './abecedario.component.css'
})
export class AbecedarioComponent implements OnInit, OnDestroy, AfterViewInit {

  // Canvas principal (aprende / nombre / quizA)
  @ViewChild('mainCanvas') mainCanvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;

  // 4 canvas para Quiz B
  @ViewChildren('quizBCanvas') quizBCanvases!: QueryList<CanvasComponent>;
  @ViewChildren('quizBCell') quizBCells!: QueryList<ElementRef<HTMLElement>>;

  // Estado general
  pantalla: Pantalla = 'aprende';
  readonly letras = LETRAS;
  letrasvistas = new Set<string>();
  letraActiva: LetraInfo | null = null;

  // Tool-menu
  isPlaying = false;
  isLooping = false;
  showWebcam = false;
  currentPlaybackRate = 1;
  velocSliderVisible = false;

  // Signa tu nombre
  nombreInput = '';
  letrasNombre: string[] = [];
  letraSignandoIdx = -1;
  signandoNombre = false;
  private nombreTimeout: any;

  // Quiz A
  quizALetraCorrecta: LetraInfo | null = null;
  quizAOpciones: LetraInfo[] = [];
  quizASeleccion: string | null = null;
  quizACorrectas = 0;
  quizAErrores = 0;
  quizAPreguntaNum = 1;

  // Quiz B
  quizBLetraPregunta: LetraInfo | null = null;
  quizBOrden: number[] = [0, 1, 2, 3];  // quizBOrden[cellIdx] === 0 → correcto
  quizBSeleccion: number | null = null;
  quizBCorrectas = 0;
  quizBErrores = 0;
  quizBPreguntaNum = 1;
  readonly quizBColors = QUIZ_B_COLORS;
  // Distractores: letras de los 3 celdas incorrectas
  quizBDistractores: LetraInfo[] = [];

  // Stats
  userId = '';
  currentStatsId: string | null = null;

  private lseInterval: any;

  constructor(
    private router: Router,
    private usuariosService: UsuariosService,
    private statsService: StatsService
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: resp => {
        this.userId = resp.usuario.uid;
        this.statsService.startMode(this.userId, 'abecedario').subscribe({
          next: r => { this.currentStatsId = r.statsId; },
          error: e => console.error(e)
        });
      },
      error: e => console.error(e)
    });
  }

  ngAfterViewInit(): void {
    this.waitForMainCanvas();
  }

  ngOnDestroy(): void {
    clearInterval(this.lseInterval);
    clearTimeout(this.nombreTimeout);
    this.stopWebcamStream();
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Canvas resize
  // ══════════════════════════════════════════════════════════════════════════

  private waitForMainCanvas(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.mainCanvasRef?.skinReady) {
      setTimeout(() => this.waitForMainCanvas(attempts + 1), 100);
      return;
    }
    this.resizeMainCanvas();
  }

  private resizeMainCanvas(): void {
    if (!this.avatarPanel || !this.mainCanvasRef) return;
    const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
    this.mainCanvasRef.resizeToContainer(w, h);
  }

  private waitForQuizBCanvases(attempts = 0): void {
    if (attempts > 60) return;
    const canvases = this.quizBCanvases?.toArray() ?? [];
    const cells = this.quizBCells?.toArray() ?? [];
    if (canvases.length < 4 || !canvases.every(c => c.skinReady)) {
      setTimeout(() => this.waitForQuizBCanvases(attempts + 1), 100);
      return;
    }
    canvases.forEach((canvas, i) => {
      if (cells[i]) {
        const { clientWidth: w, clientHeight: h } = cells[i].nativeElement;
        canvas.resizeToContainer(w, h);
      }
    });
    // Cargar la animación correcta en cada celda
    this.loadQuizBAnimations();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Letras flotantes
  // ══════════════════════════════════════════════════════════════════════════

  respawnLetrasFlotantes(): void {
    clearInterval(this.lseInterval);
    const bg = document.getElementById('lseBgAbc');
    if (!bg) return;
    bg.innerHTML = '';
    const letra = this.letraActiva?.letra ?? '';
    if (!letra) return;

    const spawn = (prePositioned = false) => {
      const el = document.createElement('span');
      el.className = 'lse-letter';
      el.textContent = letra;
      const size = 48 + Math.random() * 100;
      el.style.fontSize = size + 'px';
      el.style.left = (Math.random() * 90) + '%';
      el.style.setProperty('--rot', (Math.random() * 40 - 20) + 'deg');
      const dur = 8 + Math.random() * 10;
      el.style.animationDuration = dur + 's';
      if (prePositioned) {
        const p = 0.1 + Math.random() * 0.8;
        el.style.bottom = (p * 110) + 'vh';
        el.style.animationDelay = -(p * dur) + 's';
      } else {
        el.style.bottom = '-150px';
        el.style.animationDelay = '0s';
      }
      bg.appendChild(el);
      const lifetime = (dur + Math.abs(parseFloat(el.style.animationDelay))) * 1000 + 500;
      setTimeout(() => el.remove(), lifetime);
    };

    for (let i = 0; i < 12; i++) spawn(true);
    this.lseInterval = setInterval(() => spawn(false), 600);
  }

  private stopLetrasFlotantes(): void {
    clearInterval(this.lseInterval);
    const bg = document.getElementById('lseBgAbc');
    if (bg) bg.innerHTML = '';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Navegación entre pantallas
  // ══════════════════════════════════════════════════════════════════════════

  irA(p: Pantalla): void {
    this.pantalla = p;
    this.stopCurrentAnim();

    if (p === 'aprende') {
      setTimeout(() => {
        this.waitForMainCanvas();
        this.respawnLetrasFlotantes();
      }, 50);
    } else {
      this.stopLetrasFlotantes();
    }

    if (p === 'quizA') {
      setTimeout(() => { this.waitForMainCanvas(); this.nuevaPreguntaQuizA(); }, 50);
    }
    if (p === 'quizB') {
      this.nuevaPreguntaQuizB();
      // Esperar a que el DOM renderice los 4 canvas
      setTimeout(() => this.waitForQuizBCanvases(), 100);
    }
    if (p === 'nombre') {
      setTimeout(() => this.waitForMainCanvas(), 50);
    }
    if (p === 'practica') {
      setTimeout(() => this.waitForMainCanvas(), 50);
    }
  }

  volverAModos(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe({
        next: () => this.router.navigate(['/modos2']),
        error: () => this.router.navigate(['/modos2'])
      });
    } else {
      this.router.navigate(['/modos2']);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PANTALLA 1 — Aprende
  // ══════════════════════════════════════════════════════════════════════════

  seleccionarLetra(info: LetraInfo): void {
    this.letraActiva = info;
    this.letrasvistas.add(info.letra);
    this.stopCurrentAnim();
    this.isLooping = false;
    this.isPlaying = false;
    this.respawnLetrasFlotantes();
  }

  get letraActivaTexto(): string { return this.letraActiva?.letra ?? ''; }
  get progresoLetrasPct(): number {
    return Math.round((this.letrasvistas.size / this.letras.length) * 100);
  }

  onPlayClicked(): void {
    if (!this.letraActiva) return;
    this.isLooping = false;
    this.isPlaying = true;
    this.reproducirLetra(this.letraActiva, false);
  }

  handleLoop(checked: boolean): void {
    if (!this.letraActiva) return;
    this.isLooping = checked;
    if (checked) {
      this.isPlaying = false;
      this.reproducirLetra(this.letraActiva, true);
    } else {
      this.mainCanvasRef?.stopClip();
      this.isPlaying = false;
    }
  }

  setPlaybackRate(rate: number): void {
    this.currentPlaybackRate = rate;
    this.mainCanvasRef?.setPlaybackRate(rate);
  }

  toggleWebcam(): void {
    if (!this.showWebcam) this.startWebcamStream();
    else this.stopWebcamStream();
    this.showWebcam = !this.showWebcam;
  }

  onAnimationEnded(): void { this.isPlaying = false; }

  private async reproducirLetra(info: LetraInfo, loop: boolean, canvas?: CanvasComponent): Promise<void> {
    const c = canvas ?? this.mainCanvasRef;
    if (!c) return;
    c.stopClip();
    const url = `${environment.apiUrl}/gltf/animaciones/${info.gltf}`;
    if (c.currentModel !== url) await c.loadSkinModel(url);
    const clips = c.availableClips;
    if (!clips.length) return;
    c.playClip(clips[0], loop);
    if (!canvas) {
      this.isPlaying = !loop;
      this.isLooping = loop;
    }
  }

  private stopCurrentAnim(): void {
    this.mainCanvasRef?.stopLoop(false);
    this.isPlaying = false;
    this.isLooping = false;
  }

  private startWebcamStream(): void {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      const v: HTMLVideoElement = this.videoElement?.nativeElement;
      if (v) { v.srcObject = stream; v.play(); }
    }).catch(e => console.error(e));
  }

  private stopWebcamStream(): void {
    const v: HTMLVideoElement = this.videoElement?.nativeElement;
    if (!v) return;
    const stream = v.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    v.srcObject = null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PANTALLA 2 — Signa tu nombre
  // ══════════════════════════════════════════════════════════════════════════

  iniciarSignadoNombre(): void {
    const nombre = this.nombreInput.toUpperCase().replace(/[^A-ZÑÁÉÍÓÚ]/g, '');
    if (!nombre) return;
    this.letrasNombre = nombre.split('').filter(l => this.letras.some(li => li.letra === l));
    if (!this.letrasNombre.length) return;
    this.signandoNombre = true;
    this.letraSignandoIdx = -1;
    this.signarSiguienteLetraNombre();
  }

  private signarSiguienteLetraNombre(): void {
    const idx = this.letraSignandoIdx + 1;
    if (idx >= this.letrasNombre.length) {
      this.signandoNombre = false;
      this.letraSignandoIdx = -1;
      return;
    }
    this.letraSignandoIdx = idx;
    const info = this.letras.find(l => l.letra === this.letrasNombre[idx]);
    if (!info) { this.signarSiguienteLetraNombre(); return; }
    this.reproducirLetraNombre(info).then(() => {
      this.nombreTimeout = setTimeout(() => this.signarSiguienteLetraNombre(), 400);
    });
  }

  private async reproducirLetraNombre(info: LetraInfo): Promise<void> {
    return new Promise(async resolve => {
      if (!this.mainCanvasRef) { resolve(); return; }
      this.mainCanvasRef.stopClip();
      const url = `${environment.apiUrl}/gltf/animaciones/${info.gltf}`;
      if (this.mainCanvasRef.currentModel !== url) await this.mainCanvasRef.loadSkinModel(url);
      const clips = this.mainCanvasRef.availableClips;
      if (!clips.length) { resolve(); return; }
      const sub = this.mainCanvasRef.animationEnded.subscribe(() => { sub.unsubscribe(); resolve(); });
      this.mainCanvasRef.playClip(clips[0], false);
    });
  }

  pararSignadoNombre(): void {
    clearTimeout(this.nombreTimeout);
    this.signandoNombre = false;
    this.letraSignandoIdx = -1;
    this.stopCurrentAnim();
  }

  get nombreParaMostrar(): string {
    return this.nombreInput.toUpperCase().replace(/[^A-ZÑÁÉÍÓÚ]/g, '');
  }

  get letrasNombreValidas(): string[] {
    return this.nombreParaMostrar.split('').filter(l => this.letras.some(li => li.letra === l));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PANTALLA 3 — Quiz A
  // ══════════════════════════════════════════════════════════════════════════

  nuevaPreguntaQuizA(): void {
    this.quizASeleccion = null;
    const idx = Math.floor(Math.random() * this.letras.length);
    this.quizALetraCorrecta = this.letras[idx];
    const pool = this.letras.filter(l => l.letra !== this.quizALetraCorrecta!.letra);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    this.quizAOpciones = [...shuffled, this.quizALetraCorrecta].sort(() => Math.random() - 0.5);
    this.reproducirLetra(this.quizALetraCorrecta, false);
  }

  elegirLetraQuizA(letra: LetraInfo): void {
    if (this.quizASeleccion !== null) return;
    this.quizASeleccion = letra.letra;
    if (letra.letra === this.quizALetraCorrecta?.letra) this.quizACorrectas++;
    else this.quizAErrores++;
  }

  quizAEsCorrecta(l: LetraInfo): boolean {
    return this.quizASeleccion !== null && l.letra === this.quizALetraCorrecta?.letra;
  }
  quizAEsIncorrecta(l: LetraInfo): boolean {
    return this.quizASeleccion === l.letra && l.letra !== this.quizALetraCorrecta?.letra;
  }
  siguientePreguntaQuizA(): void { this.quizAPreguntaNum++; this.nuevaPreguntaQuizA(); }

  // ══════════════════════════════════════════════════════════════════════════
  // PANTALLA 4 — Quiz B (4 canvas reales)
  // ══════════════════════════════════════════════════════════════════════════

  nuevaPreguntaQuizB(): void {
    this.quizBSeleccion = null;
    // Letra correcta
    const idx = Math.floor(Math.random() * this.letras.length);
    this.quizBLetraPregunta = this.letras[idx];
    // 3 distractores
    const pool = this.letras.filter(l => l.letra !== this.quizBLetraPregunta!.letra);
    this.quizBDistractores = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    // Permutación: posición 0 en el array = índice de la celda correcta
    this.quizBOrden = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  }

  /** Carga la animación correcta en cada uno de los 4 canvas */
  private async loadQuizBAnimations(): Promise<void> {
    const canvases = this.quizBCanvases?.toArray() ?? [];
    if (canvases.length < 4 || !this.quizBLetraPregunta) return;

    // Construir array de 4 letras: la correcta en la posición quizBOrden.indexOf(0)
    const cuatroLetras: LetraInfo[] = new Array(4);
    for (let cellIdx = 0; cellIdx < 4; cellIdx++) {
      if (this.quizBOrden[cellIdx] === 0) {
        cuatroLetras[cellIdx] = this.quizBLetraPregunta;
      } else {
        // quizBOrden[cellIdx] es 1, 2 o 3 → distractor en ese orden
        cuatroLetras[cellIdx] = this.quizBDistractores[this.quizBOrden[cellIdx] - 1];
      }
    }

    // Cargar y reproducir en bucle en cada canvas
    for (let i = 0; i < 4; i++) {
      this.reproducirLetra(cuatroLetras[i], true, canvases[i]);
    }
  }

  quizBEsCorrecto(cellIdx: number): boolean { return this.quizBOrden[cellIdx] === 0; }

  elegirCeldaQuizB(cellIdx: number): void {
    if (this.quizBSeleccion !== null) return;
    this.quizBSeleccion = cellIdx;
    if (this.quizBEsCorrecto(cellIdx)) this.quizBCorrectas++;
    else this.quizBErrores++;
  }

  quizBCeldaEsCorrecta(i: number): boolean { return this.quizBSeleccion !== null && this.quizBEsCorrecto(i); }
  quizBCeldaEsIncorrecta(i: number): boolean { return this.quizBSeleccion === i && !this.quizBEsCorrecto(i); }
  quizBColorManos(cellIdx: number): string { return QUIZ_B_COLORS[this.quizBOrden[cellIdx]]; }
  get quizBCorrectoEnCelda(): number { return this.quizBOrden.findIndex(v => v === 0); }

  siguientePreguntaQuizB(): void {
    this.quizBPreguntaNum++;
    this.nuevaPreguntaQuizB();
    setTimeout(() => this.waitForQuizBCanvases(), 50);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════════════════

  navigateTo(dest: string): void { this.router.navigate([`/${dest}`]); }
  trackByLetra(_: number, l: LetraInfo): string { return l.letra; }
}