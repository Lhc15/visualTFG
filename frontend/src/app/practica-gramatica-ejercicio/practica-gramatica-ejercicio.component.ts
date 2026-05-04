import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { EnmOverlayComponent } from '../enm-overlay/enm-overlay.component';
import { EnmService } from '../services/enm.service';
import { EnmPackId } from '../services/enm.types';
import { StatsService } from '../services/stats.service';
import {
  BloqueEjercicios,
  Ejercicio,
  EjercicioFichas,
  EjercicioOpciones,
  Ficha,
  getEjerciciosPorBloque,
} from './ejercicios-gramatica.data';

export type EnmOpcion = EnmPackId | 'ninguna';

export const ENM_OPCIONES: { id: EnmOpcion; label: string }[] = [
  { id: 'ninguna',                label: 'Ninguna' },
  { id: 'pregunta-sin-particula', label: 'Pregunta sin partícula' },
  { id: 'pregunta-con-particula', label: 'Pregunta con partícula' },
  { id: 'negacion',               label: 'Negación' },
  { id: 'afirmacion',             label: 'Afirmación' },
];

@Component({
  selector: 'app-practica-gramatica-ejercicio',
  standalone: true,
  imports: [CommonModule, HeaderComponent, CanvasComponent, ToolMenuComponent, EnmOverlayComponent],
  templateUrl: './practica-gramatica-ejercicio.component.html',
  styles: [],
})
export class PracticaGramaticaEjercicioComponent implements OnInit, OnDestroy {

  bloqueId = '';
  bloque: BloqueEjercicios | null = null;
  ejerciciosBarajados: Ejercicio[] = [];

  preguntaIdx = 0;
  correctas = 0;
  confirmado = false;
  finalizado = false;

  zonaFichas: string[] = [];
  bancoBarajado: Ficha[] = [];

  opcionesBarajadas: string[] = [];
  opcionSeleccionada: string | null = null;

  readonly enmOpciones = ENM_OPCIONES;
  enmSeleccionado: EnmOpcion = 'ninguna';

  resultadoOrden: boolean | null = null;
  resultadoEnm: boolean | null = null;

  isPlaying = false;
  isLooping = false;
  currentPlaybackRate = 1;
  showWebcam = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private enmService: EnmService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    this.bloqueId = this.route.snapshot.paramMap.get('bloqueId') ?? '';
    this.bloque = getEjerciciosPorBloque(this.bloqueId) ?? null;
    if (!this.bloque) { this.router.navigate(['/practica/gramatica']); return; }
    this.ejerciciosBarajados = [...this.bloque.ejercicios].sort(() => Math.random() - 0.5);
    this.prepararEjercicio();
  }

  ngOnDestroy(): void { this.enmService.hide(); }

  get ejercicioActual(): Ejercicio | null { return this.ejerciciosBarajados[this.preguntaIdx] ?? null; }
  get esFichas(): boolean { return this.ejercicioActual?.tipo === 'fichas'; }
  get esOpciones(): boolean { return this.ejercicioActual?.tipo === 'opciones'; }
  get esFrase(): boolean {
    return this.ejercicioActual?.tipo === 'opciones' &&
           !!(this.ejercicioActual as EjercicioOpciones).fichasSig?.length;
  }
  get comoFichas(): EjercicioFichas { return this.ejercicioActual as EjercicioFichas; }
  get comoOpciones(): EjercicioOpciones { return this.ejercicioActual as EjercicioOpciones; }
  get totalPreguntas(): number { return this.ejerciciosBarajados.length; }
  get progresoPct(): number { return Math.round((this.preguntaIdx / this.totalPreguntas) * 100); }

  private prepararEjercicio(): void {
    this.zonaFichas = [];
    this.opcionSeleccionada = null;
    this.enmSeleccionado = 'ninguna';
    this.confirmado = false;
    this.resultadoOrden = null;
    this.resultadoEnm = null;
    this.enmService.hide();

    const ej = this.ejercicioActual;
    if (!ej) return;

    if (ej.tipo === 'fichas') {
      this.bancoBarajado = [...ej.fichas, ...ej.distractores].sort(() => Math.random() - 0.5);
    }

    if (ej.tipo === 'opciones') {
      const correcta = ej.opciones[0];
      const resto = ej.opciones.slice(1).sort(() => Math.random() - 0.5);
      this.opcionesBarajadas = [correcta, ...resto].sort(() => Math.random() - 0.5);
      if (ej.enmAbreAvatar) {
        setTimeout(() => this.enmService.show(ej.enmAbreAvatar!), 200);
      }
    }
  }

  get fichasEnBanco(): Ficha[] {
    return this.bancoBarajado.filter(f => !this.zonaFichas.includes(f.texto));
  }

  addFicha(texto: string): void {
    if (!this.confirmado && !this.zonaFichas.includes(texto)) {
      this.zonaFichas = [...this.zonaFichas, texto];
    }
  }

  quitarFicha(texto: string): void {
    if (!this.confirmado) {
      this.zonaFichas = this.zonaFichas.filter(t => t !== texto);
    }
  }

  getRolFicha(texto: string): string {
    if (!this.esFichas) return '';
    const todas = [...this.comoFichas.fichas, ...this.comoFichas.distractores];
    return todas.find(x => x.texto === texto)?.rol ?? '';
  }

  elegirOpcion(opcion: string): void {
    if (!this.confirmado) this.opcionSeleccionada = opcion;
  }

  claseOpcion(opcion: string): string {
    if (!this.confirmado) return this.opcionSeleccionada === opcion ? 'vv-choice-selected' : '';
    if (!this.esOpciones) return '';
    const correcta = this.comoOpciones.opciones[0];
    if (opcion === correcta) return 'vv-choice-correct';
    if (opcion === this.opcionSeleccionada) return 'vv-choice-wrong';
    return '';
  }

  seleccionarEnm(id: EnmOpcion): void {
    if (this.confirmado) return;
    this.enmSeleccionado = id;
    if (id !== 'ninguna') {
      this.enmService.show(id as EnmPackId);
    } else {
      const ej = this.ejercicioActual;
      if (ej?.tipo === 'opciones' && ej.enmAbreAvatar) return;
      this.enmService.hide();
    }
  }

  get puedeConfirmar(): boolean {
    if (this.confirmado) return false;
    const ej = this.ejercicioActual;
    if (!ej) return false;
    if (ej.tipo === 'fichas') return this.zonaFichas.length === ej.fichas.length;
    return this.opcionSeleccionada !== null;
  }

  confirmar(): void {
    if (!this.puedeConfirmar) return;
    this.confirmado = true;
    const ej = this.ejercicioActual!;

    if (ej.tipo === 'fichas') {
      this.resultadoOrden = JSON.stringify(this.zonaFichas) === JSON.stringify(ej.ordenCorrecto);
      this.resultadoEnm = ej.conEnm
        ? (this.enmSeleccionado === (ej.enmCorrecto ?? 'ninguna'))
        : true;
    } else {
      this.resultadoOrden = this.opcionSeleccionada === ej.opciones[0];
      this.resultadoEnm = ej.conEnm
        ? (this.enmSeleccionado === ej.enmCorrecto)
        : true;
    }

    if (this.resultadoOrden && this.resultadoEnm) this.correctas++;
  }

  get todoCorrecto(): boolean { return this.resultadoOrden === true && this.resultadoEnm === true; }

  get mensajeFeedback(): string {
    if (!this.confirmado) return '';
    if (this.todoCorrecto) return '¡Correcto!';
    if (this.resultadoOrden && !this.resultadoEnm)
      return this.esFichas
        ? 'Orden correcto, pero la expresión no manual no era la indicada.'
        : 'Respuesta correcta, pero la expresión no manual no era la indicada.';
    if (!this.resultadoOrden && this.esFichas) return 'El orden no es correcto. Recuerda la regla del bloque.';
    return 'No es correcto.';
  }

  siguiente(): void {
    this.enmService.hide();
    if (this.preguntaIdx + 1 >= this.totalPreguntas) {
      this.finalizar();
    } else {
      this.preguntaIdx++;
      this.prepararEjercicio();
    }
  }

  private finalizar(): void {
    this.finalizado = true;
    this.enmService.hide();
    if (this.correctas / this.totalPreguntas >= 0.6) {
      this.statsService.completarBloqueComun(this.bloqueId).subscribe();
    }
  }

  get estrellas(): number {
    const pct = this.correctas / this.totalPreguntas;
    if (pct >= 1) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.4) return 1;
    return 0;
  }

  get estrellasArray(): number[] { return Array(this.estrellas).fill(0); }
  get estrellasVaciasArray(): number[] { return Array(3 - this.estrellas).fill(0); }

  volverAGramatica(): void { this.router.navigate(['/practica/gramatica']); }

  repetir(): void {
    this.preguntaIdx = 0;
    this.correctas = 0;
    this.finalizado = false;
    this.ejerciciosBarajados = [...(this.bloque?.ejercicios ?? [])].sort(() => Math.random() - 0.5);
    this.prepararEjercicio();
  }

  onPlayClicked(): void { this.isPlaying = true; }
  onAnimationEnded(): void { this.isPlaying = false; }
  setPlaybackRate(r: number): void { this.currentPlaybackRate = r; }
  handleLoop(c: boolean): void { this.isLooping = c; }
  toggleWebcam(): void { this.showWebcam = !this.showWebcam; }
}