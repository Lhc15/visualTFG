import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';
import { environment } from '../../environments/environment';
import { DescripcionTooltipComponent } from '../descripcion-tooltip/descripcion-tooltip.component';
import { DescripcionService } from '../services/descripcion.service';
import { ProgresoVocabularioService } from '../services/progreso-vocabulario.service';
import { HttpClient } from '@angular/common/http';
import { HeaderComponent } from '../header/header.component';

type Pantalla = 'aprende' | 'nombre';

interface LetraInfo {
  letra: string;
  gltf: string;
  _id?: string;
}

const LETRAS_FALLBACK: LetraInfo[] = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('').map(l => ({
  letra: l,
  gltf: `${l.toLowerCase()}_lse.gltf`
}));

@Component({
  selector: 'app-abecedario',
  standalone: true,
  imports: [CommonModule, FormsModule, CanvasComponent, ToolMenuComponent, DescripcionTooltipComponent, HeaderComponent],
  templateUrl: './abecedario.component.html',
  styleUrl: './abecedario.component.css'
})
export class AbecedarioComponent implements OnInit, OnDestroy, AfterViewInit {

  // Canvas principal
  @ViewChild('mainCanvas') mainCanvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;
  @ViewChild('letterGrid') letterGrid!: ElementRef<HTMLElement>;

  // 4 canvas para Quiz B
  // Estado general
  pantalla: Pantalla = 'aprende';
  letras: LetraInfo[] = LETRAS_FALLBACK;
  palabrasVistas = new Set<string>(); // IDs de letras reproducidas
  letrasvistas = new Set<string>();
  letraActiva: LetraInfo | null = null;
  cellSize = 0; // tamaño cuadrado calculado para cada celda de letra
  private gridRo?: ResizeObserver;

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

  // Stats
  userId = '';
  currentStatsId: string | null = null;

  private lseInterval: any;

  constructor(
    private router: Router,
    private usuariosService: UsuariosService,
    private statsService: StatsService,
    private descripcionService: DescripcionService,
    private progresoVocabService: ProgresoVocabularioService,
    private http: HttpClient
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ══════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    // Cargar letras desde backend para obtener _id real
    this.http.get<{ ok: boolean; palabras: any[] }>(
      `${environment.apiUrl}/palabras/por-modulo?modulo=abecedario`,
      { withCredentials: true }
    ).subscribe({
      next: (res) => {
        if (res.ok && res.palabras.length > 0) {
          // Mapear a LetraInfo enriquecido con _id
          this.letras = res.palabras.map((p: any) => ({
            letra: p.palabra,
            gltf: p.gltf || `${p.palabra.toLowerCase()}_lse.gltf`,
            _id: p._id
          }));
        }
      }
    });

    this.usuariosService.getAuthenticatedUser().subscribe({
      next: resp => {
        this.userId = resp.usuario.uid;
        this.statsService.startMode(this.userId, 'abecedario').subscribe({
          next: r => { this.currentStatsId = r.statsId; },
          error: e => console.error(e)
        });
        this.progresoVocabService.obtenerProgreso('abecedario').subscribe({
          next: (vistas) => { this.palabrasVistas = new Set(vistas); }
        });
      },
      error: e => console.error(e)
    });
  }

  ngAfterViewInit(): void {
    this.waitForMainCanvas();
    // Calcular tamaño de celda cuadrada al montar y al redimensionar
    setTimeout(() => this.calcCellSize(), 50);
    this.gridRo = new ResizeObserver(() => this.calcCellSize());
    // Observamos el action-panel (padre del grid)
    const panel = this.letterGrid?.nativeElement?.closest('.vv-action-panel') as HTMLElement;
    if (panel) this.gridRo.observe(panel);
  }

  ngOnDestroy(): void {
    clearInterval(this.lseInterval);
    clearTimeout(this.nombreTimeout);
    this.stopWebcamStream();
    this.gridRo?.disconnect();
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Canvas resize
  // ══════════════════════════════════════════════════════════════════════════

  private calcCellSize(): void {
    const grid = this.letterGrid?.nativeElement;
    if (!grid) return;
    const size = 77;
    grid.style.setProperty('--cell-size', `${size}px`);
    const fs = Math.max(12, Math.round(size * 0.42));
    grid.style.setProperty('--cell-fs', `${fs}px`);
  }

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

    if (p === 'nombre') {
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
    this.descripcionService.hide();
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
    if (this.letraActiva._id && !this.palabrasVistas.has(this.letraActiva._id)) {
      this.palabrasVistas.add(this.letraActiva._id);
      this.progresoVocabService.marcarVista(this.letraActiva._id, 'abecedario').subscribe();
    }
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
  // Helpers
  // ══════════════════════════════════════════════════════════════════════════

  navigateTo(dest: string): void { this.router.navigate([`/${dest}`]); }
  trackByLetra(_: number, l: LetraInfo): string { return l.letra; }
}