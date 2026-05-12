import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CanvasComponent } from '../canvas/canvas.component';
import { ToolMenuComponent } from '../tool-menu/tool-menu.component';
import { environment } from '../../environments/environment';
import { StatsService } from '../services/stats.service';
import { UsuariosService } from '../services/usuarios.service';
import { EnmService } from '../services/enm.service';
import { EnmPackId } from '../services/enm.types';
import { DescripcionTooltipComponent } from '../descripcion-tooltip/descripcion-tooltip.component';
import { DescripcionService } from '../services/descripcion.service';
import { HeaderComponent } from '../header/header.component';

export type RolToken = 'S' | 'O' | 'V' | 'ENM' | 'INT' | 'ADV';
export type DerechoTipo = 'lista' | 'highlight' | 'reglas';
export type LayoutTipo = 'layout-a' | 'layout-b';

export interface Token { texto: string; rol: RolToken; }
export interface ReglaItem { texto: string; tipo: 'ok' | 'no'; }

export interface Diapositiva {
  tipo: LayoutTipo;
  titulo: string;
  tituloItalica?: string;
  lead: string;
  enm?: EnmPackId;
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
  imports: [CommonModule, CanvasComponent, ToolMenuComponent, DescripcionTooltipComponent, HeaderComponent],
  templateUrl: './comunicacion.component.html',
  styleUrls: ['./comunicacion.component.css']
})
export class ComunicacionComponent implements OnInit, AfterViewInit {

  @ViewChild(CanvasComponent) canvasRef!: CanvasComponent;
  @ViewChild('avatarPanel') avatarPanel!: ElementRef<HTMLElement>;
  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef;

  // ── Navegación ──
  // 'indice' → 'subindice'? → 'portada' → 'bloque'
  vista: 'indice' | 'subindice' | 'portada' | 'bloque' = 'indice';
  bloqueActivo: Bloque | null = null;
  subBloqueActivo: SubBloque | null = null;
  diapositivaIdx = 0;

  // ── Portada de transición ──
  portadaNumero: number | null = null;
  portadaTitulo = '';
  portadaSubtitulo = '';
  portadaEsSubBloque = false;
  portadaKey = 0; // incrementa cada vez para relanzar la animación CSS
  private _portadaBloquePendiente: Bloque | null = null;
  private _portadaSubBloquePendiente: SubBloque | null = null;

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
              enm: 'pregunta-sin-particula',
              titulo: 'Preguntas sin', tituloItalica: 'partícula',
              lead: 'Las preguntas de sí o no mantienen exactamente el mismo orden de frase que las afirmaciones (S-O-V). Lo único que cambia es la expresión facial.',
              regla: { label: 'Expresión facial obligatoria', texto: 'Cejas levantadas + inclinación de cabeza y hombros hacia delante. Sin esta expresión, la frase es una afirmación, no una pregunta. Los signos son idénticos — solo cambia la cara.' },
              schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'DORMIR', rol: 'V' }], label: '"¿Duermes?" en LSE — misma estructura que la afirmación' },
              textoExtra: 'TÚ DORMIR con cejas levantadas y cabeza inclinada = "¿Duermes?". TÚ DORMIR con expresión neutra = "Tú duermes". Los signos son exactamente los mismos — solo cambia la cara.'
            }
          ]
        },
        {
          id: 'preguntas-con', titulo: 'Con partícula interrogativa', subtitulo: 'Qué, quién, dónde, cómo...',
          diapositivas: [
            {
              tipo: 'layout-a',
              enm: 'pregunta-con-particula',
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
          schema: { tokens: [{ texto: 'YO', rol: 'S' }, { texto: 'PRESENTAR', rol: 'V' }, { texto: 'MI SIGNO', rol: 'O' }, { texto: 'LLAMARSE', rol: 'V' }], label: 'Estructura de una presentación en LSE' },
          textoExtra: 'Ejemplo real del material: YO PRESENTAR-yo-a-ti · MI SIGNO "BARBA" · LLAMARSE P-E-D-R-O. El verbo PRESENTAR es direccional (yo hacia ti).'
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
    },

    // ── BLOQUE 6: VERBOS ───────────────────────────────────────────────────────
    {
      id: 'verbos', numero: 6,
      titulo: 'Los verbos',
      subtitulo: 'Cómo funcionan en LSE',
      subBloques: [
        {
          id: 'verbos-ser-estar', titulo: 'Sin SER ni ESTAR', subtitulo: 'Los verbos que desaparecen',
          diapositivas: [
            {
              tipo: 'layout-a',
              titulo: 'Sin SER,', tituloItalica: 'ESTAR ni HACER',
              lead: 'Una de las primeras sorpresas del LSE: los verbos "ser", "estar" y "hacer" (tiempo atmosférico) no tienen signo. Se omiten porque el contexto y el orden de la frase ya transmiten esa información.',
              regla: { label: 'Regla de omisión', texto: 'Cuando en español usarías "es", "está" o "hace (frío/calor...)", en LSE simplemente no lo signas. El adjetivo o el lugar ocupa su posición y ya es suficiente.' },
              schema: { tokens: [{ texto: 'TU HIJO', rol: 'S' }, { texto: 'GUAPO', rol: 'ENM' }], label: '"Tu hijo es guapo" en LSE — GUAPO ocupa el lugar del verbo omitido' },
              textoExtra: 'Más ejemplos: TU HIJO ALTO ("Tu hijo es alto") · MADRE BIEN ("Tu madre está bien") · YO CERCA ("Estoy cerca") · TU HERMANO ALLÍ ("Tu hermano está allí"). En todos los casos el adjetivo o adverbio ocupa la posición final, donde iría el verbo.'
            },
            {
              tipo: 'layout-a',
              titulo: 'La estructura', tituloItalica: 'sin verbo',
              lead: 'Cuando hay un adjetivo, un adverbio o un lugar donde en español iría "ser" o "estar", el orden es siempre: sujeto → complemento. Sin verbo intermedio.',
              schema: { tokens: [{ texto: 'PADRE', rol: 'S' }, { texto: 'ALTO', rol: 'ENM' }], label: '"Tu padre es alto" en LSE — adjetivo en posición predicativa' },
              highlight: { titulo: 'También con HABER/TENER', texto: 'HABER y TENER sí tienen signo, pero pueden omitirse cuando hay un signo de cantidad en la frase: TÚ HIJO TRES = "Tienes tres hijos" (TENER omitido).' },
              tip: 'Recuerda: la ausencia del verbo no es un error — es la gramática correcta del LSE.'
            }
          ]
        },
        {
          id: 'verbos-posicion', titulo: 'Posición del verbo', subtitulo: 'Siempre al final',
          diapositivas: [
            {
              tipo: 'layout-a',
              titulo: 'El verbo', tituloItalica: 'al final',
              lead: 'En LSE el verbo se coloca siempre después del sujeto y del objeto. Nunca en el centro de la frase como en español. Esto es coherente con el orden SOV que ya conoces.',
              regla: { label: 'Posición fija', texto: 'Sujeto + Objeto/Lugar + Verbo. El verbo siempre cierra la frase.' },
              schema: { tokens: [{ texto: 'YO', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'VIVIR', rol: 'V' }], label: '"Yo vivo en casa" en LSE' },
              textoExtra: 'El verbo siempre cierra la frase: YO CASA VIVIR, TÚ PUERTA COMPRAR. Excepción con QUERER intenso: el verbo va antes del objeto pero con expresión facial específica (boca cerrada, labios hacia fuera): YO QUERER VACACIONES.'
            },
            {
              tipo: 'layout-a',
              titulo: 'Dos verbos', tituloItalica: 'juntos',
              lead: 'Cuando hay dos verbos en la frase (como "debo ir", "me apetece ver", "me gusta hacer"), el verbo modal o de sentimiento va al final, después del verbo principal.',
              regla: { label: 'Orden con dos verbos', texto: 'Objeto + Verbo principal + Verbo modal/sentimiento. El verbo que en español va primero, en LSE va al final.' },
              schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'PUERTA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }], label: '"Tú compras una puerta" en LSE — posición final del verbo' },
              textoExtra: 'Más ejemplos: YO CASA COMPRAR ("Compro una casa") · NOSOTROS HABITACIÓN DORMIR ("Dormimos en la habitación") · YO ESTRELLA VER GUSTAR ("Me gusta ver estrellas").'
            }
          ]
        },
        {
          id: 'verbos-direccionales', titulo: 'Verbos direccionales', subtitulo: 'El movimiento indica quién hace qué',
          diapositivas: [
            {
              tipo: 'layout-a',
              titulo: 'Verbos', tituloItalica: 'direccionales',
              lead: 'Algunos verbos pueden modificar su movimiento para indicar quién es el sujeto y quién es el receptor, sin necesidad de añadir pronombres. El inicio del movimiento indica quién realiza la acción y el final indica a quién va dirigida.',
              regla: { label: 'Cómo funcionan', texto: 'El movimiento empieza desde el espacio del sujeto y termina en el espacio del receptor. Si el verbo va de mí hacia ti: "yo a ti". Si va de ti hacia mí: "tú a mí".' },
              schema: { tokens: [{ texto: 'CUIDAR', rol: 'V' }, { texto: 'yo-a-ti', rol: 'ENM' }], label: '"Te cuido" — movimiento de mí hacia ti' },
              textoExtra: 'El mismo signo con distinto movimiento cambia el significado: CUIDAR yo-a-ti = "Te cuido". CUIDAR tú-a-mí = "Me cuidas". CUIDAR yo-a-él = "Le cuido".'
            },
            {
              tipo: 'layout-a',
              titulo: 'Verbos direccionales', tituloItalica: 'más comunes',
              lead: 'Estos son algunos de los verbos direccionales más habituales en LSE. Todos funcionan con el mismo principio: el movimiento indica la dirección de la acción.',
              derechoTipo: 'lista',
              items: [
                { texto: 'Aconsejar · Avisar · Ayudar · Burlarse · Contar', tipo: 'ok' },
                { texto: 'Contestar · Cuidar · Dar · Decir · Elegir', tipo: 'ok' },
                { texto: 'Enseñar · Entender · Llamar · Perseguir · Pillar', tipo: 'ok' },
                { texto: 'Preguntar · Presentar · Regalar · Regañar · Ver', tipo: 'ok' }
              ],
              nota: 'Excepción: el verbo INVITAR va en dirección contraria — empieza desde el receptor y termina en el sujeto.',
              tip: 'Cuando un verbo no es direccional y necesitas indicar el receptor, añade el pronombre antes del verbo: YO-A-TI, TÚ-A-MÍ, ÉL-A-TI...'
            }
          ]
        }
      ]
    },

    // ── BLOQUE 7: TIEMPOS VERBALES ─────────────────────────────────────────────
    {
      id: 'tiempos', numero: 7,
      titulo: 'Tiempos verbales',
      subtitulo: 'Pasado, presente y futuro en LSE',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'Sin', tituloItalica: 'conjugación',
          lead: 'En LSE los verbos no se conjugan. El mismo signo vale para presente, pasado y futuro. Para indicar el tiempo, se añade un marcador temporal al principio de la frase.',
          regla: { label: 'Estructura temporal', texto: 'Marcador temporal + Sujeto + Objeto + Verbo. El marcador temporal siempre al principio, antes de todo lo demás.' },
          schema: { tokens: [{ texto: 'ANTES', rol: 'ADV' }, { texto: 'YO', rol: 'S' }, { texto: 'DORMIR', rol: 'V' }], label: '"Antes dormía (mucho)" en LSE — marcador temporal al inicio' },
          textoExtra: 'Otros marcadores: PRÓXIMO (futuro próximo) · ESTE MES / ESTA SEMANA · AYER · MAÑANA · AÑO PASADO · AÑO 2000...'
        },
        {
          tipo: 'layout-a',
          titulo: 'Varios', tituloItalica: 'marcadores',
          lead: 'Cuando hay más de un marcador temporal (como "dentro de un mes", "la semana pasada"), primero se coloca el más general y después el más concreto.',
          regla: { label: 'Orden de marcadores', texto: 'General → Concreto. Primero el marco más amplio (PASADO, FUTURO), luego el detalle (SEMANA, MES, DÍA).' },
          schema: { tokens: [{ texto: 'AYER', rol: 'ADV' }, { texto: 'NOSOTROS', rol: 'S' }, { texto: 'COMPRAR', rol: 'V' }], label: '"Ayer compramos" en LSE — AYER al inicio marca el tiempo' },
          textoExtra: 'Más ejemplos: MAÑANA TÚ CASA COMPRAR ("Mañana compras la casa") · ANTES TÚ VIVIR DÓNDE ("¿Dónde vivías antes?")") · AYER TODO-EL-DÍA YO TRABAJAR ("Ayer trabajé todo el día").'
        }
      ]
    },

    // ── BLOQUE 8: NEGACIÓN ─────────────────────────────────────────────────────
    {
      id: 'negacion', numero: 8,
      titulo: 'La negación',
      subtitulo: 'Cómo negar en LSE',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'NO va', tituloItalica: 'al final',
          lead: 'En LSE el signo NO se coloca después del verbo o de la palabra que niega — nunca antes. Es la diferencia más llamativa respecto al español, donde el "no" va siempre delante del verbo.',
          regla: { label: 'Posición de la negación', texto: 'Sujeto + Objeto + Verbo + NO. El NO cierra la frase, igual que el verbo en una afirmación.' },
          schema: { tokens: [{ texto: 'NOSOTROS', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }, { texto: 'NO', rol: 'ENM' }], label: '"No compramos la casa" en LSE — NO al final' },
          textoExtra: 'Más ejemplos: YO DORMIR NO ("No duermo") · TÚ PUERTA COMPRAR NO ("No compras la puerta") · YO ALTO NO ("No soy alto") · TU PIZZA COMER MÁS NO ("No comes más pizza").',
          nota: 'Además del signo NO, es importante mover la cabeza de lado a lado simultáneamente para reforzar la negación.'
        },
        {
          tipo: 'layout-a',
          titulo: 'Verbos con negación', tituloItalica: 'incorporada',
          lead: 'Algunos verbos en LSE incluyen la negación directamente en su propio signo. No necesitan el NO separado — el gesto ya niega por sí solo.',
          derechoTipo: 'lista',
          items: [
            { texto: 'No apetecer — signo propio con negación incorporada', tipo: 'ok' },
            { texto: 'No conocer — signo propio con negación incorporada', tipo: 'ok' },
            { texto: 'No entender — signo propio con negación incorporada', tipo: 'ok' },
            { texto: 'No gustar — signo propio con negación incorporada', tipo: 'ok' },
            { texto: 'No haber · No poder · No querer · No saber', tipo: 'ok' }
          ],
          highlight: { titulo: 'No pasa nada', texto: '"No pasa nada" tiene su propio signo único en LSE — no se construye con NO + PASAR.' }
        }
      ]
    },

    // ── BLOQUE 9: SINGULAR Y PLURAL ────────────────────────────────────────────
    {
      id: 'plural', numero: 9,
      titulo: 'Singular y plural',
      subtitulo: 'Cómo se indica el número',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'El contexto', tituloItalica: 'lo aclara',
          lead: 'En LSE la mayoría de signos son idénticos en singular y en plural. No existe un morfema de número como en español. El contexto, los cuantificadores y el orden de la frase indican si se habla de uno o de varios.',
          regla: { label: 'Cuándo el plural es automático', texto: 'Si la frase ya incluye un número o un cuantificador (TRES, TODOS, MUCHO, POCO...), el plural queda claro sin modificar el signo.' },
          schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'HIJO', rol: 'O' }, { texto: 'TRES', rol: 'O' }], label: '"Tienes tres hijos" — plural implícito por el número' },
          textoExtra: 'Ejemplo singular vs plural con contexto: JUGUETE TODO SUCIO ("Todos los juguetes están sucios") vs MI HABITACIÓN SILLA MARRÓN ("La silla de mi habitación es marrón").'
        },
        {
          tipo: 'layout-a',
          titulo: 'Repetir el signo', tituloItalica: 'para el plural',
          lead: 'Algunos signos pueden repetirse para indicar explícitamente que se habla de plural. Al repetirse, el movimiento se desplaza hacia la derecha (diestros) o la izquierda (zurdos).',
          regla: { label: 'El símbolo ++', texto: 'En la notación LSE, ++ indica que el signo se repite con desplazamiento para indicar plural. Por ejemplo: NIÑO++ = varios niños, SILLA++ = varias sillas.' },
          schema: { tokens: [{ texto: 'NIÑO++', rol: 'O' }], label: '"Niños" — signo repetido con desplazamiento' },
          textoExtra: 'No todos los signos admiten este mecanismo. Para los que no lo admiten, el plural se infiere siempre por contexto.',
          tip: 'En la práctica cotidiana, la repetición del signo es menos frecuente que el uso de cuantificadores para indicar plural.'
        }
      ]
    },

    // ── BLOQUE 10: ADVERBIOS ───────────────────────────────────────────────────
    {
      id: 'adverbios', numero: 10,
      titulo: 'Los adverbios',
      subtitulo: 'Cómo y dónde se colocan',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'Adverbios de', tituloItalica: 'modo y cantidad',
          lead: 'Los adverbios acompañan a verbos o adjetivos para añadir significado (cómo, cuánto, dónde...). En LSE se colocan justo después del verbo o del adjetivo al que acompañan.',
          regla: { label: 'Posición general', texto: 'Verbo/Adjetivo + Adverbio. Si el verbo es "ser", "estar" o "tener/haber", el adverbio va después del sujeto.' },
          schema: { tokens: [{ texto: 'TÚ', rol: 'S' }, { texto: 'VIVIR', rol: 'V' }, { texto: 'REGULAR', rol: 'ADV' }], label: '"Vives regular" en LSE — adverbio después del verbo' },
          textoExtra: 'Más ejemplos: ÉL/ELLA COMER BIEN ("Come bien") · YO DORMIR REGULAR ("Duermo regular") · YO TRABAJAR PRONTO ("Empiezo a trabajar pronto").'
        },
        {
          tipo: 'layout-a',
          titulo: 'Adverbios de', tituloItalica: 'tiempo y lugar',
          lead: 'Los adverbios de tiempo y lugar tienen una posición flexible: van al principio si afectan a toda la oración, y al final si solo afectan a una parte concreta.',
          regla: { label: 'Inicio vs final', texto: 'Al principio: cuando el tiempo o lugar enmarca toda la frase (contexto global). Al final: cuando solo afecta al elemento que precede.' },
          schema: { tokens: [{ texto: 'AYER', rol: 'ADV' }, { texto: 'YO', rol: 'S' }, { texto: 'COMPRAR', rol: 'V' }], label: '"Ayer compré" en LSE — adverbio temporal al inicio' },
          textoExtra: 'Mismo principio con tiempo: AYER YO DORMIR BIEN = "Ayer dormí bien". El marcador temporal al inicio enmarca toda la frase. AQUÍ GENTE MUCHO TRABAJAR = "Aquí trabaja mucha gente" (lugar al inicio, contexto global). YO TRABAJAR EMPEZAR PRONTO = "Empiezo a trabajar pronto" (adverbio al final, afecta solo al verbo).'
        }
      ]
    },

    // ── BLOQUE 11: INTENSIDAD Y ÉNFASIS ───────────────────────────────────────
    {
      id: 'intensidad', numero: 11,
      titulo: 'Intensidad y énfasis',
      subtitulo: 'Graduar el significado con la cara y el cuerpo',
      diapositivas: [
        {
          tipo: 'layout-a',
          titulo: 'Más intensidad,', tituloItalica: 'más expresión',
          lead: 'En LSE la intensidad de un signo no se cambia con palabras adicionales — se cambia con la expresión facial, la amplitud del movimiento y la repetición. La cara es el regulador de la intensidad.',
          regla: { label: 'Mecanismos de intensidad', texto: 'Para más intensidad: expresión facial marcada + movimiento más amplio o repetido. Para menos intensidad: labios arqueados + ligera inclinación de cabeza.' },
          schema: { tokens: [{ texto: 'ÉL/ELLA', rol: 'S' }, { texto: 'COMER-MUCHÍSIMO', rol: 'V' }], label: '"Se harta de comer" — signo COMER con intensidad máxima incorporada' },
          textoExtra: 'Ejemplo de escala con COMER: COMER un poco → COMER normal → COMER-MUCHÍSIMO. Lo mismo con DORMIR: DORMIR-MUCHÍSIMO = "Duerme muchísimo". El movimiento amplifica la intensidad. COMER un poco (labios arqueados + cabeza ladeada) → COMER normal → COMER-MUCHO (expresión + amplitud) → COMER-MUCHÍSIMO (repetición + expresión máxima). La intensidad se incorpora al propio signo.'
        },
        {
          tipo: 'layout-a',
          titulo: 'Énfasis', tituloItalica: 'positivo y negativo',
          lead: 'La expresión facial varía según si el énfasis tiene connotación positiva o negativa. No es la misma expresión para "guapísimo" que para "aburridísimo".',
          derechoTipo: 'lista',
          items: [
            { texto: 'Énfasis positivo: apretar los dientes y cerrar un poco los ojos (guapísimo, riquísimo, muy rápido)', tipo: 'ok' },
            { texto: 'Énfasis negativo: inflar los carrillos y hacer un pequeño soplido (muy aburrido, mucho calor, muy cansado)', tipo: 'ok' },
            { texto: 'Intensidad máxima en algunos signos: sacar un poco la lengua (muy pequeño, muy lento, muy poco)', tipo: 'ok' }
          ],
          nota: 'El mecanismo de inflar carrillos no se aplica a todos los signos — solo a algunos con connotación claramente negativa.',
          tip: 'Recuerda: estas expresiones no son opcionales. Sin la expresión correcta, el énfasis no existe en LSE — es gramática, no actuación.'
        }
      ]
    }
  ];

  // ── Progreso y rol ──
  esAdmin = false;
  bloquesCompletados = new Set<string>();
  private _uid = '';

  // ── Chip de desbloqueo ──
  chipVisible = false;
  chipTexto = '';
  private chipTimer: any = null;

  constructor(private router: Router, private cdr: ChangeDetectorRef,
              private statsService: StatsService,
              private usuariosService: UsuariosService,
              private enmService: EnmService,
              private descripcionService: DescripcionService) {}

  ngOnInit(): void {
    this.cargarUsuarioYProgreso();
  }
  ngOnDestroy(): void {
    this.enmService.hide();
    if (this.chipTimer) clearTimeout(this.chipTimer);
  }
  ngAfterViewInit(): void { this.waitForSkinAndResize(); }

  private cargarUsuarioYProgreso(): void {
    this.usuariosService.getAuthenticatedUser().subscribe({
      next: (resp) => {
        this.esAdmin = resp.usuario?.rol === 'ROL_ADMIN';
        this._uid = resp.usuario.uid;
        if (!this.esAdmin) {
          this.statsService.getProgresoComunicacion().subscribe({
            next: (completados) => {
              this.bloquesCompletados = new Set(completados.map(c => c.bloqueId));
              // Mostrar chips pendientes si el usuario llega al índice (incluye refresco y reapertura)
              setTimeout(() => this.alVerIndice(), 600);
            },
            error: (e) => console.error('Error cargando progreso comunicación:', e)
          });
        }
      },
      error: (e) => console.error('Error cargando usuario:', e)
    });
  }

  // Llamado desde el HTML cuando la vista cambia a 'indice'
  alVerIndice(): void {
    if (this.vista !== 'indice') return;
    if (this.esAdmin || !this._uid) return;
    const keyPendientes = `vv_comun_chips_pendientes_${this._uid}`;
    const raw = localStorage.getItem(keyPendientes);
    if (!raw) return;
    const pendientes: string[] = JSON.parse(raw);
    if (!pendientes.length) return;
    localStorage.removeItem(keyPendientes);
    this.lanzarConfeti();
    this.mostrarChipsEnCola(pendientes);
  }

  private mostrarChipsEnCola(textos: string[], idx = 0): void {
    if (idx >= textos.length) return;
    this.mostrarChip(textos[idx]);
    // Cada chip dura 4.5s; encadenamos el siguiente tras 5s
    setTimeout(() => this.mostrarChipsEnCola(textos, idx + 1), 5000);
  }

  mostrarChip(texto: string): void {
    if (this.chipTimer) clearTimeout(this.chipTimer);
    this.chipTexto = texto;
    this.chipVisible = true;
    this.chipTimer = setTimeout(() => { this.chipVisible = false; }, 4500);
  }

  private lanzarConfeti(): void {
    if (typeof (window as any).confetti === 'undefined') return;
    const confetti = (window as any).confetti;
    const colores = ['#E04A1A', '#F4A940', '#1C0E0A', '#F9F6F3', '#F0997B'];
    const base = { spread: 70, colors: colores, gravity: 1.1, scalar: 1.1, ticks: 350 };
    confetti({ ...base, particleCount: 100, angle: 60,  startVelocity: 55, origin: { x: 0, y: 0.65 } });
    confetti({ ...base, particleCount: 100, angle: 120, startVelocity: 55, origin: { x: 1, y: 0.65 } });
    setTimeout(() => {
      confetti({ ...base, particleCount: 60, angle: 70, startVelocity: 45, origin: { x: 0, y: 0.7 } });
      confetti({ ...base, particleCount: 60, angle: 110, startVelocity: 45, origin: { x: 1, y: 0.7 } });
    }, 500);
  }

  // Devuelve true si el bloque/subBloque está desbloqueado para el usuario actual
  estaDesbloqueado(bloqueId: string): boolean {
    if (this.esAdmin) return true;
    const idx = this.bloques.findIndex(b => b.id === bloqueId);
    if (idx === 0) return true; // El primer bloque siempre abierto
    const anterior = this.bloques[idx - 1];
    return this.bloquesCompletados.has(anterior.id);
  }

  // Guarda el bloque actual como completado y luego muestra la portada del siguiente
  private guardarYMostrarPortada(
    bloqueIdCompletado: string,
    accionDespues: () => void
  ): void {
    this.statsService.completarBloqueComun(bloqueIdCompletado).subscribe({
      next: () => {
        this.bloquesCompletados.add(bloqueIdCompletado);
        this.registrarChipPendienteSiProcede(bloqueIdCompletado);
        accionDespues();
      },
      error: (e) => {
        console.warn('completarBloqueComun error (puede ser duplicado):', e);
        this.bloquesCompletados.add(bloqueIdCompletado);
        this.registrarChipPendienteSiProcede(bloqueIdCompletado);
        accionDespues();
      }
    });
  }

  private registrarChipPendienteSiProcede(bloqueIdCompletado: string): void {
    if (!this._uid) return;
    // El bloque completado acaba de desbloquear su nodo de práctica (mismo id)
    const bloqueCompletado = this.bloques.find(b => b.id === bloqueIdCompletado);
    // El bloque siguiente al recién completado se desbloquea en teoría
    const idxCompletado = this.bloques.findIndex(b => b.id === bloqueIdCompletado);
    const siguienteBloque = this.bloques[idxCompletado + 1];

    // Chip para el índice de Comunicación (siguiente bloque teórico)
    if (siguienteBloque) {
      const keyComun = `vv_comun_chips_pendientes_${this._uid}`;
      const rawComun = localStorage.getItem(keyComun);
      const pendientesComun: string[] = rawComun ? JSON.parse(rawComun) : [];
      const textoComun = `🔓 ${siguienteBloque.titulo} desbloqueado`;
      if (!pendientesComun.includes(textoComun)) {
        pendientesComun.push(textoComun);
        localStorage.setItem(keyComun, JSON.stringify(pendientesComun));
      }
    }

    // Chip para practica-gramatica (el bloque que acaba de completarse desbloquea su nodo de práctica)
    if (bloqueCompletado) {
      const keyGram = `vv_gram_chips_pendientes_${this._uid}`;
      const rawGram = localStorage.getItem(keyGram);
      const pendientesGram: string[] = rawGram ? JSON.parse(rawGram) : [];
      const textoGram = `🔓 Ejercicios de ${bloqueCompletado.titulo} desbloqueados`;
      if (!pendientesGram.includes(textoGram)) {
        pendientesGram.push(textoGram);
        localStorage.setItem(keyGram, JSON.stringify(pendientesGram));
      }
    }
    // Chip para modos2: si era el último bloque, se desbloquea Conversamos
    if (!siguienteBloque) {
      const keyConv = `vv_conv_chip_pendiente_${this._uid}`;
      localStorage.setItem(keyConv, '1');
    }
  }

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
    if (!this.estaDesbloqueado(bloque.id)) return;
    this.bloqueActivo = bloque;
    this.subBloqueActivo = null;
    this.diapositivaIdx = 0;
    this.resetAvatar();
    this.descripcionService.hide();
    this.vista = bloque.subBloques?.length ? 'subindice' : 'bloque';
    if (!bloque.subBloques?.length) this.syncEnm();
  }

  abrirSubBloque(sub: SubBloque): void {
    this.subBloqueActivo = sub;
    this.diapositivaIdx = 0;
    this.vista = 'bloque';
    this.resetAvatar();
    this.syncEnm();
  }

  volverAIndice(): void {
    this.vista = 'indice';
    this.bloqueActivo = null;
    this.subBloqueActivo = null;
    this.diapositivaIdx = 0;
    this.resetAvatar();
    this.enmService.hide();
    setTimeout(() => this.alVerIndice(), 400);
  }

  volverASubIndice(): void {
    this.vista = 'subindice';
    this.subBloqueActivo = null;
    this.diapositivaIdx = 0;
    this.resetAvatar();
    this.enmService.hide();
  }

  siguiente(): void {
    if (this.diapositivaIdx < this.totalDiapositivas - 1) { this.diapositivaIdx++; this.resetAvatar(); this.syncEnm(); }
  }

  anterior(): void {
    if (this.diapositivaIdx > 0) { this.diapositivaIdx--; this.resetAvatar(); this.syncEnm(); }
  }

  private syncEnm(): void {
    const enm = this.diapositiva?.enm;
    if (enm) { this.enmService.show(enm); }
    else { this.enmService.hide(); }
  }

  irASiguienteBloque(): void {
    const sig = this.siguienteBloque;
    if (!sig) return;
    // El bloque que se acaba de completar es el activo actual
    const bloqueCompletadoId = this.subBloqueActivo
      ? this.bloqueActivo!.id  // si estábamos en un subbloque, el bloque padre se completa
      : this.bloqueActivo!.id;

    const mostrarPortada = () => {
      this._portadaBloquePendiente = sig;
      this._portadaSubBloquePendiente = null;
      this.portadaNumero = sig.numero;
      this.portadaTitulo = sig.titulo;
      this.portadaSubtitulo = sig.subtitulo;
      this.portadaEsSubBloque = false;
      this.portadaKey++;
      this.vista = 'portada';
      this.resetAvatar();
      this.enmService.hide();
    };

    this.guardarYMostrarPortada(bloqueCompletadoId, mostrarPortada);
  }

  irASiguienteSubBloque(): void {
    const sig = this.siguienteSubBloque;
    const num = this.siguienteSubBloqueNum;
    if (!sig) return;
    // El subbloque completado tiene su propio id compuesto para distinguirlo
    const subBloqueCompletadoId = this.subBloqueActivo!.id;

    const mostrarPortada = () => {
      this._portadaBloquePendiente = null;
      this._portadaSubBloquePendiente = sig;
      this.portadaNumero = num;
      this.portadaTitulo = sig.titulo;
      this.portadaSubtitulo = sig.subtitulo;
      this.portadaEsSubBloque = true;
      this.portadaKey++;
      this.vista = 'portada';
      this.resetAvatar();
      this.enmService.hide();
    };

    this.guardarYMostrarPortada(subBloqueCompletadoId, mostrarPortada);
  }

  empezarDesdePortada(): void {
    if (this._portadaBloquePendiente) {
      this.abrirBloque(this._portadaBloquePendiente);
    } else if (this._portadaSubBloquePendiente) {
      this.abrirSubBloque(this._portadaSubBloquePendiente);
    }
    this._portadaBloquePendiente = null;
    this._portadaSubBloquePendiente = null;
  }

  volver(): void {
    if (this.vista === 'portada') { this.volverAIndice(); return; }
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
    if (this.vista === 'portada') return 'Comunicación';
    if (this.vista === 'bloque') return this.bloqueActivo?.subBloques?.length ? this.bloqueActivo.titulo : 'Comunicación';
    if (this.vista === 'subindice') return 'Comunicación';
    return 'Aprende';
  }
}