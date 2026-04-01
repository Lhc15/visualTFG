import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { environment } from '../../environments/environment';

export type RolToken = 'S' | 'O' | 'V' | 'ENM' | 'INT';
export type DerechoTipo = 'lista' | 'highlight' | 'reglas';
export type LayoutTipo = 'layout-a' | 'layout-b';

export interface Token { texto: string; rol: RolToken; }
export interface ReglaItem { texto: string; tipo: 'ok' | 'no'; }

export interface Diapositiva {
  tipo: LayoutTipo;
  titulo: string;
  tituloItalica?: string;
  lead: string;
  regla?: { label: string; texto: string };
  schema?: { tokens: Token[]; label?: string };
  textoExtra?: string;
  imagenIzq?: string;
  captionIzq?: string;
  subtituloIzq?: string;
  derechoTipo?: DerechoTipo;
  items?: ReglaItem[];
  highlight?: { titulo: string; texto: string };
  nota?: string;
  tip?: string;
}

export interface SubBloque {
  id: string;
  titulo: string;
  subtitulo: string;
  diapositivas: Diapositiva[];
}

export interface Bloque {
  id: string;
  numero: number;
  titulo: string;
  subtitulo: string;
  // Si tiene subBloques, muestra subíndice antes de las diapositivas
  subBloques?: SubBloque[];
  // Si no tiene subBloques, va directo a diapositivas
  diapositivas?: Diapositiva[];
}

@Component({
  selector: 'app-comunicacion',
  standalone: true,
  imports: [CommonModule, CanvasComponent, ToolMenuComponent],
  templateUrl: './comunicacion.component.html',
  styleUrls: ['./comunicacion.component.css']
})
export class ComunicacionComponent implements OnInit, AfterViewInit {

  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;

  // ── Navegación ──
  // 'indice' → 'subindice' (solo ENM/Preguntas) → 'bloque'
  vista: 'indice' | 'subindice' | 'bloque' = 'indice';
  bloqueActivo: Bloque | null = null;
  subBloqueActivo: SubBloque | null = null;
  diapositivaIdx = 0;

  // ── Avatar ──
  isPlaying = false;
  isLooping = false;
  showWebcam = false;
  currentPlaybackRate = 1;
  tokenActivo = -1;

  // ── Contenido ──
  readonly bloques: Bloque[] = [
    {
      id: 'enm', numero: 1,
      titulo: 'ENM — Expresión no manual',
      subtitulo: 'Cómo comunicarte con una persona sorda',
      subBloques: [
        {
          id: 'enm-contacto', titulo: 'Contacto visual', subtitulo: 'La base de toda comunicación',
          diapositivas: [
            {
              tipo: 'layout-b',
              titulo: 'El contacto', tituloItalica: 'visual',
              lead: 'Mirar a la otra persona no es solo educación — es parte del propio lenguaje. Sin contacto visual la comunicación se interrumpe.',
              imagenIzq: '', captionIzq: 'Contacto visual directo', subtituloIzq: 'La base de toda comunicación en LSE',
              derechoTipo: 'reglas',
              items: [
                { texto: 'Mantén la mirada durante toda la conversación', tipo: 'ok' },
                { texto: 'Asiente ligeramente para indicar que sigues', tipo: 'ok' },
                { texto: 'No apartes la vista — indica que has terminado', tipo: 'no' },
                { texto: 'No mires al suelo ni a los lados mientras firman', tipo: 'no' }
              ]
            }
          ]
        },
        {
          id: 'enm-cuerpo', titulo: 'Posición del cuerpo', subtitulo: 'El cuerpo como herramienta comunicativa',
          diapositivas: [
            {
              tipo: 'layout-b',
              titulo: 'La posición', tituloItalica: 'del cuerpo',
              lead: 'El cuerpo también habla. Inclinarse hacia delante activa la comunicación y forma parte de la gramática.',
              imagenIzq: '', captionIzq: 'Posición correcta e incorrecta', subtituloIzq: 'El cuerpo como herramienta comunicativa',
              derechoTipo: 'highlight',
              highlight: { titulo: 'En preguntas', texto: 'Inclina el cuerpo ligeramente hacia delante cuando hagas una pregunta — es parte de la gramática, no solo postura.' },
              nota: 'Recostarse o alejarse indica desinterés o que la conversación ha terminado.',
              tip: 'La inclinación hacia delante en preguntas es equivalente a levantar la entonación en español.'
            }
          ]
        },
        {
          id: 'enm-atencion', titulo: 'Llamar la atención', subtitulo: 'Antes de empezar a signar',
          diapositivas: [
            {
              tipo: 'layout-b',
              titulo: 'Llamar la', tituloItalica: 'atención',
              lead: 'Antes de empezar a signar debes asegurarte de que la persona sorda te está mirando.',
              imagenIzq: '', captionIzq: 'Formas de llamar la atención', subtituloIzq: 'Siempre antes de empezar a signar',
              derechoTipo: 'lista',
              items: [
                { texto: 'Agitar la mano en su campo visual', tipo: 'ok' },
                { texto: 'Tocar suavemente el hombro o el brazo', tipo: 'ok' },
                { texto: 'Golpear la mesa o el suelo para generar vibración', tipo: 'ok' },
                { texto: 'Nunca gritar — no tiene ningún efecto', tipo: 'no' }
              ]
            }
          ]
        },
        {
          id: 'enm-presentar', titulo: 'Cómo presentarte', subtitulo: 'Signo personal + nombre deletreado',
          diapositivas: [
            {
              tipo: 'layout-b',
              titulo: 'Cómo', tituloItalica: 'presentarte',
              lead: 'Al presentarte a una persona sorda por primera vez sigue siempre este orden: signo personal primero, luego nombre deletreado.',
              imagenIzq: '', captionIzq: 'Presentación en LSE', subtituloIzq: 'Signo personal + nombre deletreado',
              derechoTipo: 'highlight',
              highlight: { titulo: 'Orden obligatorio', texto: 'Primero dices tu signo personal (la seña que te identifica), y después deletreas tu nombre con el abecedario dactilológico.' },
              nota: 'El signo personal es único para cada persona — lo asigna la comunidad sorda.',
              tip: 'Si todavía no tienes signo personal, deletrea directamente tu nombre.'
            }
          ]
        }
      ]
    },
    {
      id: 'sov', numero: 2,
      titulo: 'Orden SOV',
      subtitulo: 'Sujeto · Objeto · Verbo',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'El orden', tituloItalica: 'S · O · V',
          lead: 'En LSE el verbo siempre va al final. A diferencia del español, el objeto aparece antes del verbo.',
          regla: { label: 'Regla principal', texto: 'La estructura básica es Sujeto → Objeto → Verbo. El verbo nunca va en el centro de la frase.' },
          schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'PUERTA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }], label: 'Ejemplo · dale al play para verlo firmado' },
          textoExtra: 'En español dirías "Tú compras una puerta" — en LSE el orden es completamente distinto.'
        },
        {
          tipo: 'layout-a',
          titulo: 'Más', tituloItalica: 'ejemplos',
          lead: 'Practica el orden SOV con distintas combinaciones.',
          schema: { tokens: [{ texto: 'YO', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'VIVIR', rol: 'V' }], label: 'Ejemplo 2' },
          textoExtra: 'El patrón es siempre el mismo independientemente de los elementos que uses.'
        }
      ]
    },
    {
      id: 'preguntas', numero: 3,
      titulo: 'Preguntas',
      subtitulo: 'Con y sin partícula interrogativa',
      subBloques: [
        {
          id: 'preguntas-sin', titulo: 'Sin partícula interrogativa', subtitulo: 'Preguntas de sí o no',
          diapositivas: [
            {
              tipo: 'layout-a',
              titulo: 'Preguntas sin', tituloItalica: 'partícula',
              lead: 'Para preguntas de sí/no se usa el mismo orden SOV. Lo que cambia es la expresión facial: cejas altas y hombros hacia delante.',
              regla: { label: 'Expresión facial obligatoria', texto: 'Cejas levantadas + hombros ligeramente inclinados hacia delante. Sin esta expresión, la frase no es una pregunta.' },
              schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'COMER', rol: 'V' }, { texto: 'ENM', rol: 'ENM' }], label: '¿Comes?' },
              textoExtra: 'La ENM (expresión no manual) sustituye al signo de interrogación.'
            }
          ]
        },
        {
          id: 'preguntas-con', titulo: 'Con partícula interrogativa', subtitulo: 'Qué, quién, dónde, cómo...',
          diapositivas: [
            {
              tipo: 'layout-a',
              titulo: 'Preguntas con', tituloItalica: 'partícula',
              lead: 'Cuando hay partícula interrogativa (qué, quién, dónde...) esta va siempre al final. La expresión facial cambia: cejas juntas y nariz arrugada.',
              regla: { label: 'Posición de la partícula', texto: 'La partícula interrogativa va SIEMPRE al final de la frase, nunca al principio como en español.' },
              schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'VIVIR', rol: 'V' }, { texto: 'DÓNDE', rol: 'INT' }], label: '¿Dónde vives?' },
              textoExtra: 'Cejas juntas + nariz arrugada + inclinación hacia delante.'
            }
          ]
        }
      ]
    },
    {
      id: 'adverbios', numero: 4,
      titulo: 'Sí y No',
      subtitulo: 'Adverbios de afirmación y negación',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'Los adverbios', tituloItalica: 'Sí y No',
          lead: 'El sí y el no tienen signos propios en LSE, pero también se refuerzan con expresión facial y movimiento de cabeza.',
          regla: { label: 'Refuerzo no manual', texto: 'Asentir con la cabeza refuerza el SÍ. Negar con la cabeza refuerza el NO. La expresión facial amplifica el significado.' },
          schema: { tokens: [{ texto: 'SÍ', rol: 'V' }], label: 'Signo de SÍ' },
          textoExtra: 'El movimiento de cabeza es tan importante como el signo en sí.'
        }
      ]
    },
    {
      id: 'genero', numero: 5,
      titulo: 'Género',
      subtitulo: 'Cómo se expresa en la LSE',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'El género en', tituloItalica: 'LSE',
          lead: 'La LSE no tiene morfema de género — los signos no cambian de forma según el sexo. Para especificarlo se añade HOMBRE o MUJER después del sustantivo.',
          regla: { label: 'Regla de género', texto: 'Añade HOMBRE o MUJER después del sustantivo solo cuando sea necesario. MADRE y PADRE tienen signo propio.' },
          schema: { tokens: [{ texto: 'AMIGO', rol: 'O' }, { texto: 'HOMBRE', rol: 'O' }], label: 'Especificar género masculino' },
          textoExtra: 'Si no hay ambigüedad no es necesario añadir el clasificador de género.'
        }
      ]
    }
  ];

  constructor(private router: Router) {}
  ngOnInit(): void {}
  ngAfterViewInit(): void { this.waitForSkinAndResize(); }

  private waitForSkinAndResize(attempts = 0): void {
    if (attempts > 50) return;
    if (!this.canvasRef?.skinReady) { setTimeout(() => this.waitForSkinAndResize(attempts + 1), 100); return; }
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    if (!this.avatarPanel || !this.canvasRef) return;
    const { clientWidth: w, clientHeight: h } = this.avatarPanel.nativeElement;
    this.canvasRef.resizeToContainer(w, h);
  }

  // ── Getters ──────────────────────────────────────────────
  get diapositivasActivas(): Diapositiva[] {
    if (this.subBloqueActivo) return this.subBloqueActivo.diapositivas;
    return this.bloqueActivo?.diapositivas ?? [];
  }

  get diapositiva(): Diapositiva | null {
    return this.diapositivasActivas[this.diapositivaIdx] ?? null;
  }

  get totalDiapositivas(): number { return this.diapositivasActivas.length; }
  get esUltimaDiapositiva(): boolean { return this.diapositivaIdx === this.totalDiapositivas - 1; }
  get esPrimeraDiapositiva(): boolean { return this.diapositivaIdx === 0; }

  get bloqueActualIdx(): number { return this.bloques.findIndex(b => b.id === this.bloqueActivo?.id); }
  get siguienteBloque(): Bloque | null {
    const idx = this.bloqueActualIdx;
    return idx < this.bloques.length - 1 ? this.bloques[idx + 1] : null;
  }

  // ── Navegación ───────────────────────────────────────────
  abrirBloque(bloque: Bloque): void {
    this.bloqueActivo = bloque;
    this.subBloqueActivo = null;
    this.diapositivaIdx = 0;
    this.resetAvatar();
    // Si tiene subBloques → subíndice, si no → directo a diapositivas
    this.vista = bloque.subBloques?.length ? 'subindice' : 'bloque';
  }

  abrirSubBloque(sub: SubBloque): void {
    this.subBloqueActivo = sub;
    this.diapositivaIdx = 0;
    this.vista = 'bloque';
    this.resetAvatar();
  }

  volverAIndice(): void {
    this.vista = 'indice';
    this.bloqueActivo = null;
    this.subBloqueActivo = null;
    this.diapositivaIdx = 0;
    this.resetAvatar();
  }

  volverASubIndice(): void {
    this.vista = 'subindice';
    this.subBloqueActivo = null;
    this.diapositivaIdx = 0;
    this.resetAvatar();
  }

  siguiente(): void {
    if (this.diapositivaIdx < this.totalDiapositivas - 1) { this.diapositivaIdx++; this.resetAvatar(); }
  }

  anterior(): void {
    if (this.diapositivaIdx > 0) { this.diapositivaIdx--; this.resetAvatar(); }
  }

  irASiguienteBloque(): void {
    const sig = this.siguienteBloque;
    if (sig) this.abrirBloque(sig);
  }

  volver(): void {
    if (this.vista === 'bloque' && this.bloqueActivo?.subBloques?.length) { this.volverASubIndice(); return; }
    if (this.vista === 'bloque' || this.vista === 'subindice') { this.volverAIndice(); return; }
    this.router.navigate(['/aprende']);
  }

  // ── Avatar ───────────────────────────────────────────────
  resetAvatar(): void { this.isPlaying = false; this.isLooping = false; this.tokenActivo = -1; this.canvasRef?.stopLoop(true); }
  onPlayClicked(): void { this.isLooping = false; this.isPlaying = true; this.reproducirSchema(); }
  onAnimationEnded(): void { this.isPlaying = false; this.tokenActivo = -1; }
  setPlaybackRate(r: number): void { this.currentPlaybackRate = r; this.canvasRef?.setPlaybackRate(r); }
  handleLoop(checked: boolean): void {
    this.isLooping = checked;
    if (checked) { this.isPlaying = false; this.reproducirSchema(true); }
    else { this.canvasRef?.stopClip(); this.isPlaying = false; }
  }

  async reproducirSchema(loop = false): Promise<void> {
    if (!this.diapositiva?.schema) return;
    const tokens = this.diapositiva.schema.tokens;
    for (let i = 0; i < tokens.length; i++) { this.tokenActivo = i; await new Promise(r => setTimeout(r, 800)); }
    this.tokenActivo = -1;
    this.isPlaying = false;
  }

  toggleWebcam(): void { this.showWebcam ? this.stopWebcam() : this.startWebcam(); this.showWebcam = !this.showWebcam; }
  startWebcam(): void {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
      this.videoElement.nativeElement.srcObject = stream;
      this.videoElement.nativeElement.play();
    }).catch(err => console.error(err));
  }
  stopWebcam(): void {
    const video = this.videoElement?.nativeElement;
    if (!video) return;
    (video.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }

  get breadcrumbBack(): string {
    if (this.vista === 'bloque') return this.bloqueActivo?.subBloques?.length ? this.bloqueActivo.titulo : 'Comunicación';
    if (this.vista === 'subindice') return 'Comunicación';
    return 'Aprende';
  }
}