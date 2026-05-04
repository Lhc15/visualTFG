import {
  Component, OnInit, OnDestroy, AfterViewInit, AfterViewChecked,
  ViewChild, ElementRef, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { EnmOverlayComponent } from '../enm-overlay/enm-overlay.component';
import { EnmService } from '../services/enm.service';
import { EnmPackId } from '../services/enm.types';
import { StatsService } from '../services/stats.service';
import { CombinacionMotorService, EjercicioMotor } from '../services/combinacion-motor.service';
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
  styleUrls: ['./practica-gramatica-ejercicio.component.css'],
})
export class PracticaGramaticaEjercicioComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('mainCanvas', { static: false }) mainCanvasRef?: CanvasComponent;
  @ViewChild('avatarPanel', { static: false }) avatarPanel?: ElementRef<HTMLElement>;

  private canvasResized = false;

  bloqueId = '';
  bloque: BloqueEjercicios | null = null;
  ejerciciosBarajados: Ejercicio[] = [];

  preguntaIdx = 0;
  correctas = 0;
  confirmado = false;
  finalizado = false;

  zonaFichas: string[] = [];
  bancoBarajado: Ficha[] = [];
  fichasEnBancoActual: Ficha[] = [];

  opcionesBarajadas: string[] = [];
  opcionSeleccionada: string | null = null;

  readonly enmOpciones = ENM_OPCIONES;
  enmSeleccionado: EnmOpcion = 'ninguna';

  resultadoOrden: boolean | null = null;
  resultadoEnm: boolean | null = null;
  todoCorrecto = false;
  puedeConfirmarActual = false;
  mensajeFeedbackActual = '';

  esFichasActual = false;
  esOpcionesActual = false;
  esFraseActual = false;

  isPlaying = false;
  isLooping = false;
  currentPlaybackRate = 1;
  showWebcam = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private enmService: EnmService,
    private statsService: StatsService,
    private motorService: CombinacionMotorService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.bloqueId = this.route.snapshot.paramMap.get('bloqueId') ?? '';
    this.bloque = getEjerciciosPorBloque(this.bloqueId) ?? null;
    if (!this.bloque) { this.router.navigate(['/practica/gramatica']); return; }

    // Intentar cargar ejercicios procedurales del motor; combinar con los estáticos
    this.motorService.generarEjercicios(this.bloqueId).subscribe({
      next: (resp) => {
        const ejerciciosMotor: Ejercicio[] = resp.ejercicios.map(e => this.motorAEjercicio(e));
        const estaticos = this.bloque!.ejercicios;
        // Motor primero, estáticos después (sin duplicar fichas)
        const ejerciciosFinales = [...ejerciciosMotor, ...estaticos];
        this.ejerciciosBarajados = ejerciciosFinales.sort(() => Math.random() - 0.5);
        this.prepararEjercicio();
        this.cdr.detectChanges();
      },
      error: () => {
        // Si falla el backend, usar solo los estáticos
        this.ejerciciosBarajados = [...this.bloque!.ejercicios].sort(() => Math.random() - 0.5);
        this.prepararEjercicio();
        this.cdr.detectChanges();
      }
    });
  }

  /** Convierte un EjercicioMotor (backend) al tipo Ejercicio del frontend */
  private motorAEjercicio(e: EjercicioMotor): Ejercicio {
    // Generar distractores del mismo tipo que las fichas correctas
    const distractores: Ficha[] = [];

    return {
      tipo: 'fichas',
      pregunta: e.pregunta,
      fichas: e.fichas.map(f => ({ texto: f.texto, rol: f.rol as any })),
      distractores,
      ordenCorrecto: e.ordenCorrecto,
      conEnm: e.conEnm,
      enmCorrecto: e.enmCorrecto as any,
      enmAbreAvatar: null,
    } as EjercicioFichas;
  }

  ngAfterViewChecked(): void {
    if (!this.canvasResized && this.mainCanvasRef && this.avatarPanel) {
      const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
      if (w > 0 && h > 0) {
        try {
          this.mainCanvasRef.resizeToContainer(w, h);
        } catch (_) { /* canvas aún no inicializado */ }
        this.canvasResized = true;
      }
    }
  }

  ngOnDestroy(): void { this.enmService.hide(); }

  // ── Acceso tipado al ejercicio actual ─────────────────────
  get ejercicioActual(): Ejercicio | null { return this.ejerciciosBarajados[this.preguntaIdx] ?? null; }
  get comoFichas(): EjercicioFichas { return this.ejercicioActual as EjercicioFichas; }
  get comoOpciones(): EjercicioOpciones { return this.ejercicioActual as EjercicioOpciones; }
  get totalPreguntas(): number { return this.ejerciciosBarajados.length; }
  get progresoPct(): number { return Math.round((this.preguntaIdx / this.totalPreguntas) * 100); }
  get estrellasArray(): number[] { return Array(this.estrellas).fill(0); }
  get estrellasVaciasArray(): number[] { return Array(3 - this.estrellas).fill(0); }
  get estrellas(): number {
    const pct = this.correctas / this.totalPreguntas;
    if (pct >= 1) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.4) return 1;
    return 0;
  }

  // ── Preparar ejercicio ────────────────────────────────────
  private prepararEjercicio(): void {
    this.zonaFichas = [];
    this.opcionSeleccionada = null;
    this.enmSeleccionado = 'ninguna';
    this.confirmado = false;
    this.resultadoOrden = null;
    this.resultadoEnm = null;
    this.todoCorrecto = false;
    this.mensajeFeedbackActual = '';
    this.enmService.hide();

    const ej = this.ejercicioActual;
    if (!ej) return;

    this.esFichasActual = ej.tipo === 'fichas';
    this.esOpcionesActual = ej.tipo === 'opciones';
    this.esFraseActual = ej.tipo === 'opciones' && !!((ej as EjercicioOpciones).fichasSig?.length);

    if (ej.tipo === 'fichas') {
      this.bancoBarajado = [...ej.fichas, ...ej.distractores].sort(() => Math.random() - 0.5);
      this.fichasEnBancoActual = [...this.bancoBarajado];
    }

    if (ej.tipo === 'opciones') {
      const correcta = ej.opciones[0];
      const resto = ej.opciones.slice(1).sort(() => Math.random() - 0.5);
      this.opcionesBarajadas = [correcta, ...resto].sort(() => Math.random() - 0.5);
      if (ej.enmAbreAvatar) {
        setTimeout(() => { this.enmService.show(ej.enmAbreAvatar!); this.cdr.detectChanges(); }, 200);
      }
    }

    this.recalcular();
    this.cdr.detectChanges();
  }

  private recalcular(): void {
    const ej = this.ejercicioActual;
    if (!ej) { this.puedeConfirmarActual = false; return; }

    // puedeConfirmar
    if (this.confirmado) {
      this.puedeConfirmarActual = false;
    } else if (ej.tipo === 'fichas') {
      this.puedeConfirmarActual = this.zonaFichas.length === ej.fichas.length;
    } else {
      this.puedeConfirmarActual = this.opcionSeleccionada !== null;
    }

    // fichasEnBanco
    if (ej.tipo === 'fichas') {
      this.fichasEnBancoActual = this.bancoBarajado.filter(f => !this.zonaFichas.includes(f.texto));
    }
  }

  // ── Fichas ────────────────────────────────────────────────
  addFicha(texto: string): void {
    if (this.confirmado || this.zonaFichas.includes(texto)) return;
    this.zonaFichas = [...this.zonaFichas, texto];
    this.recalcular();
    this.cdr.detectChanges();
  }

  quitarFicha(texto: string): void {
    if (this.confirmado) return;
    this.zonaFichas = this.zonaFichas.filter(t => t !== texto);
    this.recalcular();
    this.cdr.detectChanges();
  }

  getRolFicha(texto: string): string {
    if (!this.esFichasActual) return '';
    const todas = [...this.comoFichas.fichas, ...this.comoFichas.distractores];
    return todas.find(x => x.texto === texto)?.rol ?? '';
  }

  // ── Opciones ──────────────────────────────────────────────
  elegirOpcion(opcion: string): void {
    if (this.confirmado) return;
    this.opcionSeleccionada = opcion;
    this.recalcular();
    this.cdr.detectChanges();
  }

  claseOpcion(opcion: string): string {
    if (!this.confirmado) {
      return this.opcionSeleccionada === opcion ? 'vv-choice-selected' : '';
    }
    const correcta = this.comoOpciones.opciones[0];
    if (opcion === correcta) return 'vv-choice-correct';
    if (opcion === this.opcionSeleccionada) return 'vv-choice-wrong';
    return '';
  }

  // ── ENM ───────────────────────────────────────────────────
  seleccionarEnm(id: EnmOpcion): void {
    if (this.confirmado) return;
    this.enmSeleccionado = id;
    if (id !== 'ninguna') {
      this.enmService.show(id as EnmPackId);
    } else {
      const ej = this.ejercicioActual;
      if (ej?.tipo === 'opciones' && ej.enmAbreAvatar) { /* no cerrar */ } else {
        this.enmService.hide();
      }
    }
    this.cdr.detectChanges();
  }

  // ── Confirmar ─────────────────────────────────────────────
  confirmar(): void {
    if (!this.puedeConfirmarActual) return;
    this.confirmado = true;
    const ej = this.ejercicioActual!;

    if (ej.tipo === 'fichas') {
      this.resultadoOrden = JSON.stringify(this.zonaFichas) === JSON.stringify(ej.ordenCorrecto);
      this.resultadoEnm = ej.conEnm
        ? (this.enmSeleccionado === ((ej.enmCorrecto as any) ?? 'ninguna'))
        : true;
    } else {
      this.resultadoOrden = this.opcionSeleccionada === ej.opciones[0];
      this.resultadoEnm = ej.conEnm
        ? (this.enmSeleccionado === (ej.enmCorrecto as any))
        : true;
    }

    this.todoCorrecto = this.resultadoOrden === true && this.resultadoEnm === true;
    if (this.todoCorrecto) this.correctas++;

    // Mensaje feedback
    if (this.todoCorrecto) {
      this.mensajeFeedbackActual = '¡Correcto!';
    } else if (this.resultadoOrden && !this.resultadoEnm) {
      this.mensajeFeedbackActual = this.esFichasActual
        ? 'Orden correcto, pero la expresión no manual no era la indicada.'
        : 'Respuesta correcta, pero la expresión no manual no era la indicada.';
    } else if (!this.resultadoOrden && this.esFichasActual) {
      this.mensajeFeedbackActual = 'El orden no es correcto. Recuerda la regla del bloque.';
    } else {
      this.mensajeFeedbackActual = 'No es correcto.';
    }

    this.puedeConfirmarActual = false;
    this.cdr.detectChanges();
  }

  // ── Siguiente / Finalizar ─────────────────────────────────
  siguiente(): void {
    this.enmService.hide();
    this.canvasResized = false;
    if (this.preguntaIdx + 1 >= this.totalPreguntas) {
      this.finalizado = true;
      this.enmService.hide();
      if (this.correctas / this.totalPreguntas >= 0.6) {
        this.statsService.completarBloqueComun(this.bloqueId).subscribe();
      }
    } else {
      this.preguntaIdx++;
      this.prepararEjercicio();
    }
    this.cdr.detectChanges();
  }

  volverAGramatica(): void { this.router.navigate(['/practica/gramatica']); }

  repetir(): void {
    this.preguntaIdx = 0;
    this.correctas = 0;
    this.finalizado = false;
    this.canvasResized = false;
    this.ejerciciosBarajados = [...(this.bloque?.ejercicios ?? [])].sort(() => Math.random() - 0.5);
    this.prepararEjercicio();
  }

  onPlayClicked(): void { this.isPlaying = true; this.cdr.detectChanges(); }
  onAnimationEnded(): void { this.isPlaying = false; this.cdr.detectChanges(); }
  setPlaybackRate(r: number): void { this.currentPlaybackRate = r; }
  handleLoop(c: boolean): void { this.isLooping = c; }
  toggleWebcam(): void { this.showWebcam = !this.showWebcam; }
}