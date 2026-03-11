import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { UsuariosService } from '../services/usuarios.service';
import { StatsService } from '../services/stats.service';
import { environment } from '../../environments/environment';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Pantalla = 'selector' | 'conversacion';
type EstadoTurno = 'avatar-signando' | 'esperando-respuesta' | 'correcto' | 'incorrecto' | 'fin';

export interface MensajeChat {
  de: 'avatar' | 'usuario' | 'correccion';
  texto: string;
  estado?: 'correcto' | 'incorrecto';
}

export interface Turno {
  avatarTexto: string;
  gltf: string;
  opciones: string[];
  correcta: number;
  respuestaTexto: string;
}

export interface Situacion {
  id: number;
  nombre: string;
  estado: 'completada' | 'disponible' | 'bloqueada';
  tags: string[];
  turnos: Turno[];
  precision?: number;
}

// ─── Datos de situaciones ─────────────────────────────────────────────────────

const SITUACIONES: Situacion[] = [
  {
    id: 1,
    nombre: 'Saludar',
    estado: 'disponible',
    tags: ['Hola', 'Buenos días', '¿Qué tal?', 'Bien'],
    turnos: [
      {
        avatarTexto: '¡Hola! Buenos días.',
        gltf: 'hola_lse.gltf',
        opciones: ['Buenos días', 'Hasta mañana', 'Tengo hambre'],
        correcta: 0,
        respuestaTexto: 'Buenos días'
      },
      {
        avatarTexto: '¿Qué tal estás hoy?',
        gltf: 'hola_lse.gltf',
        opciones: ['Adiós', 'Bien, gracias', 'No entiendo'],
        correcta: 1,
        respuestaTexto: 'Bien, gracias'
      },
      {
        avatarTexto: 'Me alegra oírlo. ¿Y tu familia?',
        gltf: 'hola_lse.gltf',
        opciones: ['También bien', 'No sé signar', 'Hasta luego'],
        correcta: 0,
        respuestaTexto: 'También bien'
      },
      {
        avatarTexto: 'Qué bien. ¡Hasta pronto!',
        gltf: 'hola_lse.gltf',
        opciones: ['Mucho gusto', 'Soy de Madrid', 'Hasta luego'],
        correcta: 2,
        respuestaTexto: 'Hasta luego'
      }
    ]
  },
  {
    id: 2,
    nombre: 'Presentarse',
    estado: 'disponible',
    tags: ['Me llamo', '¿De dónde eres?', 'Mucho gusto', 'Tengo X años'],
    turnos: [
      {
        avatarTexto: 'Hola, me llamo Ana. ¿Cómo te llamas tú?',
        gltf: 'hola_lse.gltf',
        opciones: ['Me llamo Luis', 'Adiós, hasta luego', 'No entiendo'],
        correcta: 0,
        respuestaTexto: 'Me llamo Luis'
      },
      {
        avatarTexto: '¿De dónde eres?',
        gltf: 'hola_lse.gltf',
        opciones: ['Tengo 24 años', 'Soy de Madrid', 'Mucho gusto'],
        correcta: 1,
        respuestaTexto: 'Soy de Madrid'
      },
      {
        avatarTexto: '¡Yo también! ¿Cuántos años tienes?',
        gltf: 'hola_lse.gltf',
        opciones: ['Soy de Barcelona', 'Tengo 24 años', 'Hasta mañana'],
        correcta: 1,
        respuestaTexto: 'Tengo 24 años'
      },
      {
        avatarTexto: 'Encantada de conocerte.',
        gltf: 'hola_lse.gltf',
        opciones: ['Mucho gusto', 'No sé', 'Adiós'],
        correcta: 0,
        respuestaTexto: 'Mucho gusto'
      },
      {
        avatarTexto: '¿Hablas lengua de signos?',
        gltf: 'hola_lse.gltf',
        opciones: ['Estoy aprendiendo', 'Me llamo Luis', 'Soy de Madrid'],
        correcta: 0,
        respuestaTexto: 'Estoy aprendiendo'
      }
    ]
  },
  {
    id: 3,
    nombre: 'Despedirse',
    estado: 'bloqueada',
    tags: ['Adiós', 'Hasta luego', 'Hasta mañana'],
    turnos: []
  }
];

// ─── Componente ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-conversamos',
  standalone: true,
  imports: [CommonModule, CanvasComponent],
  templateUrl: './conversamos.component.html',
  styleUrl: './conversamos.component.css'
})
export class ConversamosComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('mainCanvas') mainCanvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;
  @ViewChild('chatScroll') chatScroll!: ElementRef<HTMLElement>;

  // ── Estado de navegación ──
  pantalla: Pantalla = 'selector';
  situaciones = SITUACIONES;
  situacionActiva: Situacion | null = null;

  // ── Estado de la conversación ──
  turnoIdx = 0;
  estado: EstadoTurno = 'avatar-signando';
  chat: MensajeChat[] = [];
  opcionSeleccionada: number | null = null;
  isAvatarSignando = false;

  aciertos = 0;
  errores = 0;

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
        this.statsService.startMode(this.userId, 'conversamos').subscribe({
          next: r => { this.currentStatsId = r.statsId; },
          error: e => console.error(e)
        });
      },
      error: e => console.error(e)
    });
  }

  ngAfterViewInit(): void {
    this.waitForCanvas();
  }

  ngOnDestroy(): void {
    if (this.currentStatsId) {
      this.statsService.endMode(this.currentStatsId).subscribe();
    }
  }

  // ── Canvas ────────────────────────────────────────────────────────────────

  private waitForCanvas(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.mainCanvasRef?.skinReady) {
      setTimeout(() => this.waitForCanvas(attempts + 1), 100);
      return;
    }
    this.resizeCanvas();
    // En el selector no iniciamos turno todavía
  }

  private resizeCanvas(): void {
    if (!this.avatarPanel || !this.mainCanvasRef) return;
    const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
    this.mainCanvasRef.resizeToContainer(w, h);
  }

  // ── Navegación selector → conversación ───────────────────────────────────

  iniciarSituacion(sit: Situacion): void {
    if (sit.estado === 'bloqueada') return;
    this.situacionActiva = sit;
    this.turnoIdx = 0;
    this.estado = 'avatar-signando';
    this.chat = [];
    this.opcionSeleccionada = null;
    this.isAvatarSignando = false;
    this.aciertos = 0;
    this.errores = 0;
    this.pantalla = 'conversacion';
    setTimeout(() => {
      this.resizeCanvas();
      this.iniciarTurno();
    }, 80);
  }

  volverAlSelector(): void {
    this.pantalla = 'selector';
    this.situacionActiva = null;
    this.isAvatarSignando = false;
  }

  // ── Lógica de conversación ────────────────────────────────────────────────

  private async iniciarTurno(): Promise<void> {
    if (!this.situacionActiva) return;
    if (this.turnoIdx >= this.situacionActiva.turnos.length) {
      this.estado = 'fin';
      return;
    }
    const turno = this.situacionActiva.turnos[this.turnoIdx];
    this.estado = 'avatar-signando';
    this.opcionSeleccionada = null;
    this.isAvatarSignando = true;

    await this.reproducirGltf(turno.gltf);
    this.isAvatarSignando = false;

    this.chat.push({ de: 'avatar', texto: turno.avatarTexto });
    this.scrollChat();
    this.estado = 'esperando-respuesta';
  }

  elegirOpcion(idx: number): void {
    if (this.estado !== 'esperando-respuesta' || !this.situacionActiva) return;
    this.opcionSeleccionada = idx;
    const turno = this.situacionActiva.turnos[this.turnoIdx];
    const esCorrecta = idx === turno.correcta;

    if (esCorrecta) {
      this.aciertos++;
      this.estado = 'correcto';
      this.chat.push({ de: 'usuario', texto: turno.respuestaTexto, estado: 'correcto' });
    } else {
      this.errores++;
      this.estado = 'incorrecto';
      this.chat.push({ de: 'usuario', texto: turno.opciones[idx], estado: 'incorrecto' });
    }
    this.scrollChat();
  }

  async siguienteTurno(): Promise<void> {
    if (!this.situacionActiva) return;
    if (this.estado === 'incorrecto') {
      const turno = this.situacionActiva.turnos[this.turnoIdx];
      this.chat.push({ de: 'correccion', texto: turno.respuestaTexto });
      this.scrollChat();
    }
    this.turnoIdx++;
    await this.iniciarTurno();
  }

  reiniciarConversacion(): void {
    if (!this.situacionActiva) return;
    this.turnoIdx = 0;
    this.estado = 'avatar-signando';
    this.chat = [];
    this.opcionSeleccionada = null;
    this.aciertos = 0;
    this.errores = 0;
    setTimeout(() => this.iniciarTurno(), 100);
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

  // ── Avatar ────────────────────────────────────────────────────────────────

  private async reproducirGltf(gltf: string): Promise<void> {
    return new Promise(async resolve => {
      if (!this.mainCanvasRef) { resolve(); return; }
      const url = `${environment.apiUrl}/gltf/animaciones/${gltf}`;
      this.mainCanvasRef.stopClip();
      if (this.mainCanvasRef.currentModel !== url) {
        await this.mainCanvasRef.loadSkinModel(url);
      }
      const clips = this.mainCanvasRef.availableClips;
      if (!clips.length) { resolve(); return; }
      const sub = this.mainCanvasRef.animationEnded.subscribe(() => {
        sub.unsubscribe();
        resolve();
      });
      this.mainCanvasRef.playClip(clips[0], false);
    });
  }

  private scrollChat(): void {
    setTimeout(() => {
      const el = this.chatScroll?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }

  // ── Getters para la plantilla ─────────────────────────────────────────────

  get turnoActual(): Turno | null {
    return this.situacionActiva?.turnos[this.turnoIdx] ?? null;
  }

  get subtituloVisible(): boolean {
    return this.isAvatarSignando && !!this.turnoActual;
  }

  get subtituloTexto(): string {
    return this.turnoActual?.avatarTexto ?? '';
  }

  get preguntaActual(): number {
    if (!this.situacionActiva) return 0;
    return Math.min(this.turnoIdx + 1, this.situacionActiva.turnos.length);
  }

  get totalPreguntas(): number {
    return this.situacionActiva?.turnos.length ?? 0;
  }

  get progresoPorc(): number {
    if (!this.totalPreguntas) return 0;
    return ((this.turnoIdx) / this.totalPreguntas) * 100;
  }

  get precision(): number {
    const total = this.aciertos + this.errores;
    if (total === 0) return 0;
    return Math.round((this.aciertos / total) * 100);
  }

  get totalSituacionesCompletadas(): number {
    return this.situaciones.filter(s => s.estado === 'completada').length;
  }

  esOpcionCorrecta(idx: number): boolean {
    return this.opcionSeleccionada !== null && idx === this.turnoActual?.correcta;
  }

  esOpcionIncorrecta(idx: number): boolean {
    return this.opcionSeleccionada === idx && idx !== this.turnoActual?.correcta;
  }

  trackByIdx(i: number): number { return i; }
}