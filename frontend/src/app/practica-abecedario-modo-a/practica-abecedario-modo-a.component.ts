import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';
import { environment } from '../../environments/environment';

interface LetraInfo {
  letra: string;
  gltf: string;
}

const LETRAS: LetraInfo[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
  letra: l,
  gltf: `${l.toLowerCase()}_lse.gltf`
}));

@Component({
  selector: 'app-practica-abecedario-modo-a',
  standalone: true,
  imports: [CommonModule, CanvasComponent, ToolMenuComponent],
  templateUrl: './practica-abecedario-modo-a.component.html',
  styleUrl: './practica-abecedario-modo-a.component.css'
})
export class PracticaAbecedarioModoAComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('mainCanvas') mainCanvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;

  readonly letras = LETRAS;

  isPlaying = false;
  isLooping = false;
  currentPlaybackRate = 1;
  showWebcam = false;

  letraCorrecta: LetraInfo | null = null;
  opciones: LetraInfo[] = [];
  seleccion: string | null = null;
  correctas = 0;
  errores = 0;
  preguntaNum = 1;

  userId = '';
  currentStatsId: string | null = null;

  constructor(
    private router: Router,
    private usuariosService: UsuariosService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: resp => {
        this.userId = resp.usuario.uid;
        this.statsService.startMode(this.userId, 'practica-abecedario-a').subscribe({
          next: r => { this.currentStatsId = r.statsId; },
          error: e => console.error(e)
        });
      },
      error: e => console.error(e)
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.waitForCanvas(), 50);
  }

  ngOnDestroy(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe();
    }
  }

  private waitForCanvas(attempts = 0): void {
    if (attempts > 60) return;
    if (!this.mainCanvasRef?.skinReady) {
      setTimeout(() => this.waitForCanvas(attempts + 1), 100);
      return;
    }
    this.resizeCanvas();
    this.nuevaPregunta();
  }

  private resizeCanvas(): void {
    if (!this.avatarPanel || !this.mainCanvasRef) return;
    const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
    this.mainCanvasRef.resizeToContainer(w, h);
  }

  nuevaPregunta(): void {
    this.seleccion = null;
    const idx = Math.floor(Math.random() * this.letras.length);
    this.letraCorrecta = this.letras[idx];
    const pool = this.letras.filter(l => l.letra !== this.letraCorrecta!.letra);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    this.opciones = [...shuffled, this.letraCorrecta].sort(() => Math.random() - 0.5);
    this.reproducir(this.letraCorrecta, false);
  }

  elegirLetra(letra: LetraInfo): void {
    if (this.seleccion !== null) return;
    this.seleccion = letra.letra;
    if (letra.letra === this.letraCorrecta?.letra) this.correctas++;
    else this.errores++;
  }

  esCorrecta(l: LetraInfo): boolean {
    return this.seleccion !== null && l.letra === this.letraCorrecta?.letra;
  }

  esIncorrecta(l: LetraInfo): boolean {
    return this.seleccion === l.letra && l.letra !== this.letraCorrecta?.letra;
  }

  siguiente(): void {
    this.preguntaNum++;
    this.nuevaPregunta();
  }

  private async reproducir(info: LetraInfo, loop: boolean): Promise<void> {
    if (!this.mainCanvasRef) return;
    this.mainCanvasRef.stopClip();
    const url = `${environment.apiUrl}/gltf/animaciones/${info.gltf}`;
    if (this.mainCanvasRef.currentModel !== url) await this.mainCanvasRef.loadSkinModel(url);
    const clips = this.mainCanvasRef.availableClips;
    if (!clips.length) return;
    this.mainCanvasRef.playClip(clips[0], loop);
    this.isPlaying = !loop;
    this.isLooping = loop;
  }

  onPlayClicked(): void {
    if (this.letraCorrecta) this.reproducir(this.letraCorrecta, false);
  }

  handleLoop(checked: boolean): void {
    if (!this.letraCorrecta) return;
    if (checked) this.reproducir(this.letraCorrecta, true);
    else { this.mainCanvasRef?.stopClip(); this.isLooping = false; this.isPlaying = false; }
  }

  setPlaybackRate(rate: number): void {
    this.currentPlaybackRate = rate;
    this.mainCanvasRef?.setPlaybackRate(rate);
  }

  toggleWebcam(): void { this.showWebcam = !this.showWebcam; }
  onAnimationEnded(): void { this.isPlaying = false; }

  volver(): void { this.router.navigate(['/practica/abecedario']); }
  irAModoB(): void { this.router.navigate(['/practica/abecedario/modo-b']); }
}