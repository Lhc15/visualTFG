import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChildren, QueryList, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';
import { environment } from '../../environments/environment';
import { HeaderComponent } from '../header/header.component';

interface LetraInfo {
  letra: string;
  gltf: string;
}

const LETRAS: LetraInfo[] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
  letra: l,
  gltf: `${l.toLowerCase()}_lse.gltf`
}));

const QUIZ_B_COLORS = ['#00B4D8', '#E04A1A', '#2A7A4A', '#D4A017'];

@Component({
  selector: 'app-practica-abecedario-modo-b',
  standalone: true,
  imports: [CommonModule, CanvasComponent, HeaderComponent],
  templateUrl: './practica-abecedario-modo-b.component.html',
  styleUrl: './practica-abecedario-modo-b.component.css'
})
export class PracticaAbecedarioModoBComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChildren('quizBCanvas') quizBCanvases!: QueryList<CanvasComponent>;
  @ViewChildren('quizBCell') quizBCells!: QueryList<ElementRef<HTMLElement>>;

  readonly letras = LETRAS;
  readonly quizBColors = QUIZ_B_COLORS;

  letraPregunta: LetraInfo | null = null;
  orden: number[] = [0, 1, 2, 3];
  seleccion: number | null = null;
  correctas = 0;
  errores = 0;
  preguntaNum = 1;
  distractores: LetraInfo[] = [];

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
        this.statsService.startMode(this.userId, 'practica-abecedario-b').subscribe({
          next: r => { this.currentStatsId = r.statsId; },
          error: e => console.error(e)
        });
      },
      error: e => console.error(e)
    });
  }

  ngAfterViewInit(): void {
    this.nuevaPregunta();
    setTimeout(() => this.waitForCanvases(), 100);
  }

  ngOnDestroy(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe();
    }
  }

  nuevaPregunta(): void {
    this.seleccion = null;
    const idx = Math.floor(Math.random() * this.letras.length);
    this.letraPregunta = this.letras[idx];
    const pool = this.letras.filter(l => l.letra !== this.letraPregunta!.letra);
    this.distractores = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    this.orden = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  }

  private waitForCanvases(attempts = 0): void {
    if (attempts > 60) return;
    const canvases = this.quizBCanvases?.toArray() ?? [];
    const cells = this.quizBCells?.toArray() ?? [];
    if (canvases.length < 4 || !canvases.every(c => c.skinReady)) {
      setTimeout(() => this.waitForCanvases(attempts + 1), 100);
      return;
    }
    canvases.forEach((canvas, i) => {
      if (cells[i]) {
        const { clientWidth: w, clientHeight: h } = cells[i].nativeElement;
        canvas.resizeToContainer(w, h);
      }
    });
    this.loadAnimations();
  }

  private async loadAnimations(): Promise<void> {
    const canvases = this.quizBCanvases?.toArray() ?? [];
    if (canvases.length < 4 || !this.letraPregunta) return;

    const cuatroLetras: LetraInfo[] = new Array(4);
    for (let cellIdx = 0; cellIdx < 4; cellIdx++) {
      if (this.orden[cellIdx] === 0) {
        cuatroLetras[cellIdx] = this.letraPregunta;
      } else {
        cuatroLetras[cellIdx] = this.distractores[this.orden[cellIdx] - 1];
      }
    }

    for (let i = 0; i < 4; i++) {
      const canvas = canvases[i];
      const info = cuatroLetras[i];
      canvas.stopClip();
      const url = `${environment.apiUrl}/gltf/animaciones/${info.gltf}`;
      if (canvas.currentModel !== url) await canvas.loadSkinModel(url);
      const clips = canvas.availableClips;
      if (clips.length) canvas.playClip(clips[0], true);
    }
  }

  esCorrecto(cellIdx: number): boolean { return this.orden[cellIdx] === 0; }

  elegirCelda(cellIdx: number): void {
    if (this.seleccion !== null) return;
    this.seleccion = cellIdx;
    if (this.esCorrecto(cellIdx)) this.correctas++;
    else this.errores++;
  }

  celdaEsCorrecta(i: number): boolean { return this.seleccion !== null && this.esCorrecto(i); }
  celdaEsIncorrecta(i: number): boolean { return this.seleccion === i && !this.esCorrecto(i); }
  colorManos(cellIdx: number): string { return QUIZ_B_COLORS[this.orden[cellIdx]]; }
  get correctoEnCelda(): number { return this.orden.findIndex(v => v === 0); }

  siguiente(): void {
    this.preguntaNum++;
    this.nuevaPregunta();
    setTimeout(() => this.waitForCanvases(), 50);
  }

  volver(): void { this.router.navigate(['/practica/abecedario']); }
  irAModoA(): void { this.router.navigate(['/practica/abecedario/modo-a']); }
}