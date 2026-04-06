import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
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
    // ── BLOQUE 1: ENM ──────────────────────────────────────────────────────────
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
              lead: 'El contacto visual es la base de la comunicación en LSE. Mirar a la otra persona no es solo educación — es parte del propio lenguaje. Sin contacto visual, la comunicación no puede ocurrir.',
              imagenIzq: '', captionIzq: 'Contacto visual directo', subtituloIzq: 'Imprescindible para comunicarse',
              derechoTipo: 'lista',
              items: [
                { texto: 'Mantén la mirada a los ojos durante toda la conversación', tipo: 'ok' },
                { texto: 'Asiente con la cabeza para indicar que sigues y comprendes', tipo: 'ok' },
                { texto: 'Apartar la vista indica que la conversación ha terminado', tipo: 'no' },
                { texto: 'No mires al suelo ni a los lados mientras te están signando', tipo: 'no' }
              ],
              tip: 'Para una persona sorda, mirar a los ojos es equivalente a "estar escuchando" en la comunicación oral.'
            }
          ]
        },
        {
          id: 'enm-cuerpo', titulo: 'Posición del cuerpo', subtitulo: 'El cuerpo como parte de la gramática',
          diapositivas: [
            {
              tipo: 'layout-b',
              titulo: 'La posición', tituloItalica: 'del cuerpo',
              lead: 'La postura corporal forma parte activa de la gramática en LSE. No es solo postura — es información lingüística. Inclinarse hacia delante activa la pregunta igual que lo hace la entonación en español.',
              imagenIzq: '', captionIzq: 'Cuerpo inclinado = pregunta', subtituloIzq: 'Postura corporal como marcador gramatical',
              derechoTipo: 'highlight',
              highlight: { titulo: 'En preguntas', texto: 'Inclina el cuerpo ligeramente hacia delante cuando hagas una pregunta — es parte de la gramática, no solo postura.' },
              nota: 'Recostarse o alejarse indica desinterés o que la conversación ha terminado.',
              tip: 'La inclinación hacia delante en preguntas es equivalente a subir la entonación al final de una pregunta en español.'
            }
          ]
        },
        {
          id: 'enm-llamar', titulo: 'Llamar la atención', subtitulo: 'Antes de empezar a signar',
          diapositivas: [
            {
              tipo: 'layout-b',
              titulo: 'Llamar la', tituloItalica: 'atención',
              lead: 'Antes de empezar a signar debes asegurarte de que la persona sorda te está mirando. Sin ese contacto visual previo, todo lo que signes pasará desapercibido.',
              imagenIzq: '', captionIzq: 'Formas correctas de llamar la atención', subtituloIzq: 'Siempre antes de empezar a signar',
              derechoTipo: 'lista',
              items: [
                { texto: 'Agitar la mano en su campo visual', tipo: 'ok' },
                { texto: 'Tocar suavemente el hombro o el brazo', tipo: 'ok' },
                { texto: 'Golpear la mesa o el suelo para generar vibración', tipo: 'ok' },
                { texto: 'Gritar o hablar más alto — no tiene ningún efecto', tipo: 'no' }
              ]
            }
          ]
        }
      ]
    },

    // ── BLOQUE 2: SOV ──────────────────────────────────────────────────────────
    {
      id: 'sov', numero: 2,
      titulo: 'Orden SOV',
      subtitulo: 'Sujeto · Objeto · Verbo',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'El orden', tituloItalica: 'S · O · V',
          lead: 'En español las frases siguen el orden Sujeto → Verbo → Objeto. En LSE el orden es distinto: el verbo siempre va al final, después del objeto.',
          regla: { label: 'Regla fundamental', texto: 'SUJETO + OBJETO + VERBO. El verbo nunca va en el centro — siempre al final de la frase.' },
          schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'PUERTA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }], label: '"Tú compras una puerta" en LSE' },
          textoExtra: 'En español: "Tú compras una puerta" (S-V-O). En LSE: TÚ PUERTA COMPRAR (S-O-V). El verbo siempre al final.'
        },
        {
          tipo: 'layout-a',
          titulo: 'Más', tituloItalica: 'ejemplos SOV',
          lead: 'El patrón es siempre el mismo, independientemente de los signos que uses. Practica con estas combinaciones.',
          schema: { tokens: [{ texto: 'YO', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'VIVIR', rol: 'V' }], label: '"Yo vivo en una casa" en LSE' },
          textoExtra: 'También: ÉL/ELLA HABITACIÓN DORMIR → "Él/ella duerme en la habitación".',
          highlight: { titulo: 'Recuerda', texto: 'En LSE no hay artículos ni preposiciones. TÚ PUERTA COMPRAR equivale a "Tú compras una puerta" — los artículos y preposiciones no se signan.' }
        }
      ]
    },

    // ── BLOQUE 3: PREGUNTAS ────────────────────────────────────────────────────
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
              lead: 'Las preguntas de sí o no mantienen exactamente el mismo orden de frase que las afirmaciones (S-O-V). Lo único que cambia es la expresión facial.',
              regla: { label: 'Expresión facial obligatoria', texto: 'Cejas levantadas + hombros ligeramente inclinados hacia delante. Sin esta expresión, la frase es una afirmación, no una pregunta.' },
              schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'COMER', rol: 'V' }, { texto: 'ENM', rol: 'ENM' }], label: '"¿Comes?" en LSE' },
              textoExtra: 'Misma frase, distinta expresión: TÚ COMER con cejas altas = "¿Comes?". TÚ COMER con expresión neutra = "Tú comes".'
            }
          ]
        },
        {
          id: 'preguntas-con', titulo: 'Con partícula interrogativa', subtitulo: 'Qué, quién, dónde, cómo...',
          diapositivas: [
            {
              tipo: 'layout-a',
              titulo: 'Preguntas con', tituloItalica: 'partícula',
              lead: 'Cuando la pregunta incluye una palabra interrogativa (qué, quién, dónde, cómo, cuántos...) esa palabra va siempre al final de la frase. La expresión facial también cambia.',
              regla: { label: 'Posición de la partícula', texto: 'La partícula interrogativa va SIEMPRE al final. En español decimos "¿Dónde vives?" — en LSE es TÚ VIVIR DÓNDE.' },
              schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'VIVIR', rol: 'V' }, { texto: 'DÓNDE', rol: 'INT' }], label: '"¿Dónde vives?" en LSE' },
              textoExtra: 'La expresión facial es diferente: cejas juntas y nariz ligeramente arrugada (diferente a las preguntas sin partícula, que llevan cejas altas).',
              tip: 'Más ejemplos: TÚ LLAMARSE CÓMO ("¿Cómo te llamas?") · TÚ COMER QUÉ ("¿Qué comes?") · CASA HABITACIÓN CUÁNTAS ("¿Cuántas habitaciones tiene?")'
            }
          ]
        }
      ]
    },

    // ── BLOQUE 4: GÉNERO ───────────────────────────────────────────────────────
    {
      id: 'genero', numero: 4,
      titulo: 'Género gramatical',
      subtitulo: 'Cómo se expresa en la LSE',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'El género en', tituloItalica: 'LSE',
          lead: 'En LSE los signos no cambian de forma según el género — no hay morfema de género como en español. Si necesitas especificar el sexo, añades el signo HOMBRE o MUJER después del sustantivo.',
          regla: { label: 'Regla general', texto: 'Sustantivo + HOMBRE o Sustantivo + MUJER cuando sea necesario especificar. Si no hay ambigüedad, no hace falta añadirlo.' },
          schema: { tokens: [{ texto: 'AMIGO', rol: 'O' }, { texto: 'HOMBRE', rol: 'O' }], label: '"Amigo" (varón) en LSE' },
          textoExtra: 'AMIGO sin más = genérico. AMIGO + HOMBRE = amigo varón. AMIGO + MUJER = amiga.'
        },
        {
          tipo: 'layout-a',
          titulo: 'Excepciones con', tituloItalica: 'signo propio',
          lead: 'Hay sustantivos que tienen su propio signo diferenciado para cada género, sin necesidad de añadir HOMBRE o MUJER.',
          regla: { label: 'Excepciones conocidas', texto: 'MADRE y PADRE tienen cada uno su propio signo. No se dice "PROGENITOR + MUJER" para madre — se signa directamente MADRE.' },
          schema: { tokens: [{ texto: 'MADRE', rol: 'O' }], label: 'MADRE — signo propio, sin necesidad de clasificador' },
          textoExtra: 'Lo mismo con PADRE. Estos son los dos casos más comunes con signo propio en el vocabulario básico.',
          nota: 'En niveles más avanzados encontrarás más sustantivos con signo propio de género.'
        }
      ]
    },

    // ── BLOQUE 5: PRESENTACIONES ───────────────────────────────────────────────
    {
      id: 'presentaciones', numero: 5,
      titulo: 'Presentaciones',
      subtitulo: 'Cómo presentarse en LSE',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'El signo', tituloItalica: 'personal',
          lead: 'En la comunidad sorda, cada persona tiene un "signo personal" — una seña única que la identifica, normalmente relacionada con un rasgo físico o de personalidad. Es como un apodo visual.',
          regla: { label: 'El orden de presentación', texto: 'Primero el signo personal, luego el nombre deletreado letra a letra con el abecedario dactilológico. Siempre en ese orden.' },
          schema: { tokens: [{ texto: 'YO', rol: 'S' }, { texto: 'PRESENTAR', rol: 'V' }, { texto: 'MI SIGNO', rol: 'O' }, { texto: 'NOMBRE', rol: 'O' }], label: 'Estructura de una presentación' },
          textoExtra: 'Ejemplo real: YO · PRESENTAR · MI-SIGNO "BARBA" · LLAMARSE P-E-D-R-O.'
        },
        {
          tipo: 'layout-a',
          titulo: 'Deletrear el', tituloItalica: 'nombre',
          lead: 'Si todavía no tienes un signo personal asignado por la comunidad sorda, deletreas directamente tu nombre con el abecedario dactilológico. Una letra a la vez, con fluidez.',
          regla: { label: 'Cuándo usar el abecedario', texto: 'El abecedario dactilológico se usa para nombres propios, apellidos y cualquier palabra que no tenga signo propio en LSE.' },
          schema: { tokens: [{ texto: 'LLAMARSE', rol: 'V' }, { texto: 'A-N-A', rol: 'O' }], label: 'Deletrear el nombre' },
          highlight: { titulo: 'Sin signo personal', texto: 'Si no tienes signo personal todavía, preséntate directamente con LLAMARSE + deletreo. La comunidad te asignará tu signo personal con el tiempo.' },
          tip: 'Practica el abecedario dactilológico en la sección Abecedario antes de usarlo en una presentación real.'
        }
      ]
    }
  ];

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}
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

  // Sub-bloque siguiente dentro del mismo bloque (ENM y Preguntas)
  get siguienteSubBloque(): SubBloque | null {
    if (!this.bloqueActivo?.subBloques?.length || !this.subBloqueActivo) return null;
    const subs = this.bloqueActivo.subBloques;
    const idx = subs.findIndex(s => s.id === this.subBloqueActivo!.id);
    return idx < subs.length - 1 ? subs[idx + 1] : null;
  }

  // Número (1-based) del siguiente sub-bloque dentro del bloque activo
  get siguienteSubBloqueNum(): number | null {
    if (!this.bloqueActivo?.subBloques?.length || !this.subBloqueActivo) return null;
    const subs = this.bloqueActivo.subBloques;
    const idx = subs.findIndex(s => s.id === this.subBloqueActivo!.id);
    return idx < subs.length - 1 ? idx + 2 : null; // +2: idx es 0-based, queremos el siguiente
  }

  // True cuando estamos en el último sub-bloque del bloque (o en un bloque sin sub-bloques)
  get esUltimoSubBloque(): boolean {
    if (!this.bloqueActivo?.subBloques?.length) return true;
    if (!this.subBloqueActivo) return false;
    const subs = this.bloqueActivo.subBloques;
    return subs[subs.length - 1].id === this.subBloqueActivo.id;
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

  irASiguienteSubBloque(): void {
    const sig = this.siguienteSubBloque;
    if (sig) this.abrirSubBloque(sig);
  }

  volver(): void {
    if (this.vista === 'bloque' && this.bloqueActivo?.subBloques?.length) { this.volverASubIndice(); return; }
    if (this.vista === 'bloque' || this.vista === 'subindice') { this.volverAIndice(); return; }
    this.router.navigate(['/aprende']);
  }

  // ── Avatar ───────────────────────────────────────────────
  resetAvatar(): void {
    this.isPlaying = false; this.isLooping = false; this.tokenActivo = -1; this.canvasRef?.stopLoop(true);
    this.cdr.detectChanges();
    setTimeout(() => this.waitForSkinAndResize(), 50);
  }
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