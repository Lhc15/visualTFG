import { EnmPackId } from '../services/enm.types';

// ─────────────────────────────────────────────────────────────
//  TIPOS
// ─────────────────────────────────────────────────────────────

export interface Ficha {
  texto: string;
  rol: 'S' | 'O' | 'V' | 'ADJ' | 'INT' | 'FX' | 'ADV' | 'NEG';
}

/** Formato B: el usuario ordena fichas para construir la frase en LSE */
export interface EjercicioFichas {
  tipo: 'fichas';
  pregunta: string;           // frase en español a construir
  fichas: Ficha[];            // fichas de la solución correcta (en orden correcto)
  distractores: Ficha[];      // fichas falsas para el banco
  ordenCorrecto: string[];    // textos de fichas en orden correcto
  conEnm: boolean;
  enmCorrecto: EnmPackId | null;
  enmAbreAvatar: EnmPackId | null;
}

/** Formato A: el usuario elige entre 4 opciones */
export interface EjercicioOpciones {
  tipo: 'opciones';
  pregunta: string;           // pregunta o instrucción
  fichasSig?: Ficha[];        // si el avatar "signa" algo, se muestran estas fichas
  opciones: string[];         // opciones[0] siempre es la correcta (se barajan al renderizar)
  conEnm: boolean;
  enmCorrecto: EnmPackId | null;
  enmAbreAvatar: EnmPackId | null;
}

export type Ejercicio = EjercicioFichas | EjercicioOpciones;

export interface BloqueEjercicios {
  bloqueId: string;
  nombre: string;
  accentColor: string;
  ejercicios: Ejercicio[];
}

// ─────────────────────────────────────────────────────────────
//  DATOS
// ─────────────────────────────────────────────────────────────

export const EJERCICIOS_GRAMATICA: BloqueEjercicios[] = [

  // ══════════════════════════════════════════════════════════
  // BLOQUE 1 — ENM (Expresión No Manual)
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'enm',
    nombre: 'ENM',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Qué función tiene el contacto visual en LSE?',
        opciones: [
          'Es parte del lenguaje: sin contacto visual la comunicación no puede ocurrir.',
          'Es solo una cuestión de educación, no afecta a la comprensión.',
          'Solo es necesario cuando se signan preguntas.',
          'Se usa para indicar el final de una frase.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuál de estas formas es correcta para llamar la atención de una persona sorda?',
        opciones: [
          'Agitar la mano en su campo visual.',
          'Gritar más alto de lo normal.',
          'Dar palmas fuertes lejos de ella.',
          'Lanzar un objeto para que lo vea.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: 'El avatar signa una pregunta de sí o no. ¿Qué ENM debe acompañar a la frase?',
        fichasSig: [{ texto: 'TÚ', rol: 'S' }, { texto: 'DORMIR', rol: 'V' }],
        opciones: [
          'Cejas levantadas + cabeza e inclinación hacia delante.',
          'Cejas fruncidas + nariz arrugada.',
          'Cabeza de lado a lado.',
          'Sin expresión facial adicional.',
        ],
        conEnm: true, enmCorrecto: 'pregunta-sin-particula', enmAbreAvatar: 'pregunta-sin-particula',
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué indica apartar la vista durante una conversación en LSE?',
        opciones: [
          'Que la conversación ha terminado o que no se quiere continuar.',
          'Que se está pensando en la respuesta.',
          'Que se va a hacer una pregunta.',
          'Que el signo anterior no se ha entendido.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué papel tiene la inclinación del cuerpo hacia delante en una pregunta en LSE?',
        opciones: [
          'Forma parte de la gramática, equivale a la entonación ascendente en español.',
          'Es solo un gesto de cortesía sin valor gramatical.',
          'Indica que la frase va a ser larga.',
          'Se usa exclusivamente con preguntas con partícula.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuál de estas afirmaciones sobre el ENM en LSE es correcta?',
        opciones: [
          'El ENM forma parte de la gramática, no es un añadido opcional.',
          'El ENM solo se usa en contextos emocionales, no gramaticales.',
          'El ENM puede omitirse si los signos son claros.',
          'El ENM solo incluye movimientos de las cejas.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 2 — SOV
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'sov',
    nombre: 'Orden S·O·V',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'fichas',
        pregunta: 'Yo compro una puerta.',
        fichas: [{ texto: 'YO', rol: 'S' }, { texto: 'PUERTA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }],
        distractores: [{ texto: 'COMER', rol: 'V' }],
        ordenCorrecto: ['YO', 'PUERTA', 'COMPRAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Tú vives en una casa.',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'VIVIR', rol: 'V' }],
        distractores: [{ texto: 'YO', rol: 'S' }],
        ordenCorrecto: ['TÚ', 'CASA', 'VIVIR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuál es la traducción correcta de TÚ PUERTA COMPRAR en LSE?',
        opciones: [
          'Tú compras una puerta.',
          'Compras la puerta tú.',
          'La puerta te compra.',
          'Tú eres la puerta.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿En qué posición va siempre el verbo en LSE?',
        opciones: [
          'Al final de la frase, después del objeto.',
          'Al principio de la frase, antes del sujeto.',
          'En el centro, entre el sujeto y el objeto.',
          'Puede ir en cualquier posición según el contexto.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Yo como pizza.',
        fichas: [{ texto: 'YO', rol: 'S' }, { texto: 'PIZZA', rol: 'O' }, { texto: 'COMER', rol: 'V' }],
        distractores: [{ texto: 'COMPRAR', rol: 'V' }],
        ordenCorrecto: ['YO', 'PIZZA', 'COMER'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué diferencia hay entre el orden en español y en LSE?',
        opciones: [
          'En español S-V-O; en LSE S-O-V. El verbo pasa del centro al final.',
          'En español S-O-V; en LSE S-V-O. El verbo pasa del final al centro.',
          'No hay diferencia de orden entre español y LSE.',
          'En LSE el sujeto siempre va al final.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Se signan los artículos y preposiciones en LSE?',
        opciones: [
          'No. TÚ PUERTA COMPRAR equivale a "Tú compras una puerta" — los artículos se omiten.',
          'Sí, igual que en español.',
          'Solo las preposiciones, no los artículos.',
          'Solo en frases formales.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Nosotros compramos una casa.',
        fichas: [{ texto: 'NOSOTROS', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }],
        distractores: [{ texto: 'VIVIR', rol: 'V' }],
        ordenCorrecto: ['NOSOTROS', 'CASA', 'COMPRAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Tú comes pizza.',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'PIZZA', rol: 'O' }, { texto: 'COMER', rol: 'V' }],
        distractores: [{ texto: 'YO', rol: 'S' }],
        ordenCorrecto: ['TÚ', 'PIZZA', 'COMER'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Él/ella duerme.',
        fichas: [{ texto: 'ÉL/ELLA', rol: 'S' }, { texto: 'DORMIR', rol: 'V' }],
        distractores: [{ texto: 'COMER', rol: 'V' }, { texto: 'VIVIR', rol: 'V' }],
        ordenCorrecto: ['ÉL/ELLA', 'DORMIR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 3 — PREGUNTAS
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'preguntas',
    nombre: 'Preguntas',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Cuál es la diferencia de expresión facial entre los dos tipos de pregunta en LSE?',
        opciones: [
          'Pregunta s/p: cejas altas + cabeza adelante. Pregunta c/p: cejas fruncidas + nariz arrugada.',
          'Ambos tipos usan las cejas altas.',
          'No hay diferencia de expresión facial entre los dos tipos.',
          'Pregunta s/p: boca abierta. Pregunta c/p: labios apretados.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: '¿Dónde vives?',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'VIVIR', rol: 'V' }, { texto: 'DÓNDE', rol: 'INT' }],
        distractores: [{ texto: 'DÓNDE', rol: 'INT' }],
        ordenCorrecto: ['TÚ', 'VIVIR', 'DÓNDE'],
        conEnm: true, enmCorrecto: 'pregunta-con-particula', enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: 'El avatar signa esta secuencia. ¿Qué significa?',
        fichasSig: [{ texto: 'TÚ', rol: 'S' }, { texto: 'DORMIR', rol: 'V' }],
        opciones: [
          '¿Duermes?',
          'Tú duermes.',
          '¿Cuándo duermes?',
          'No duermes.',
        ],
        conEnm: true, enmCorrecto: 'pregunta-sin-particula', enmAbreAvatar: 'pregunta-sin-particula',
      },
      {
        tipo: 'opciones',
        pregunta: '¿Dónde va la partícula interrogativa en una pregunta con partícula en LSE?',
        opciones: [
          'Al final de la frase, siempre.',
          'Al principio, antes del sujeto.',
          'Justo después del sujeto.',
          'En el centro, entre sujeto y verbo.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: '¿Cómo te llamas?',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'LLAMARSE', rol: 'V' }, { texto: 'CÓMO', rol: 'INT' }],
        distractores: [{ texto: 'DÓNDE', rol: 'INT' }],
        ordenCorrecto: ['TÚ', 'LLAMARSE', 'CÓMO'],
        conEnm: true, enmCorrecto: 'pregunta-con-particula', enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: 'El avatar signa esta secuencia. ¿Qué significa?',
        fichasSig: [{ texto: 'TÚ', rol: 'S' }, { texto: 'LLAMARSE', rol: 'V' }, { texto: 'CÓMO', rol: 'INT' }],
        opciones: [
          '¿Cómo te llamas?',
          'Te llamas así.',
          '¿Quién te llama?',
          'Tú te llamas bien.',
        ],
        conEnm: true, enmCorrecto: 'pregunta-con-particula', enmAbreAvatar: 'pregunta-con-particula',
      },
      {
        tipo: 'fichas',
        pregunta: '¿Comes pizza?',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'PIZZA', rol: 'O' }, { texto: 'COMER', rol: 'V' }],
        distractores: [{ texto: 'COMPRAR', rol: 'V' }],
        ordenCorrecto: ['TÚ', 'PIZZA', 'COMER'],
        conEnm: true, enmCorrecto: 'pregunta-sin-particula', enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: 'En una pregunta de sí/no, ¿en qué se diferencia la frase de su afirmación equivalente?',
        opciones: [
          'Solo en la expresión facial: los signos son idénticos.',
          'En el orden de los signos, que se invierte.',
          'En que se añade el signo SÍ al final.',
          'En que el verbo pasa al principio.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 4 — GÉNERO
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'genero',
    nombre: 'Género',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Cómo se expresa el género masculino en LSE para la palabra "amigo"?',
        opciones: [
          'AMIGO + HOMBRE',
          'AMIGO con un giro de muñeca',
          'El signo cambia de forma según el género',
          'AMIGO es siempre masculino en LSE',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Mi amiga (mujer).',
        fichas: [{ texto: 'AMIGO', rol: 'O' }, { texto: 'MUJER', rol: 'O' }],
        distractores: [{ texto: 'HOMBRE', rol: 'O' }],
        ordenCorrecto: ['AMIGO', 'MUJER'],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuál de estas palabras tiene signo propio diferenciado por género en LSE?',
        opciones: [
          'MADRE y PADRE — cada uno tiene su propio signo.',
          'AMIGO y AMIGA — tienen signos completamente distintos.',
          'HIJO e HIJA — se signan de forma diferente.',
          'Todos los sustantivos tienen signo propio por género.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuándo es necesario añadir HOMBRE o MUJER después de un sustantivo en LSE?',
        opciones: [
          'Solo cuando puede haber ambigüedad o se quiere especificar el sexo.',
          'Siempre, en cada sustantivo de la frase.',
          'Nunca, el género no se expresa en LSE.',
          'Solo cuando el sustantivo va al principio de la frase.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Mi amigo (varón).',
        fichas: [{ texto: 'AMIGO', rol: 'O' }, { texto: 'HOMBRE', rol: 'O' }],
        distractores: [{ texto: 'MUJER', rol: 'O' }],
        ordenCorrecto: ['AMIGO', 'HOMBRE'],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cómo se signa "madre" en LSE?',
        opciones: [
          'Con el signo propio MADRE — no se dice PROGENITOR + MUJER.',
          'Con el signo MUJER + HIJO.',
          'Con el signo genérico de progenitor más MUJER.',
          'Igual que PADRE pero con la mano izquierda.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 5 — PRESENTACIONES
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'presentaciones',
    nombre: 'Presentaciones',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Qué es el "signo personal" en LSE?',
        opciones: [
          'Una seña única que identifica a cada persona, normalmente relacionada con un rasgo físico.',
          'El deletreo del nombre propio letra a letra.',
          'El signo de presentación que se usa al conocer a alguien.',
          'Un apodo que solo usan los intérpretes.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Estructura de presentación: "Yo me presento, mi signo es…"',
        fichas: [
          { texto: 'YO', rol: 'S' },
          { texto: 'PRESENTAR', rol: 'V' },
          { texto: 'MI SIGNO', rol: 'O' },
          { texto: 'LLAMARSE', rol: 'V' },
        ],
        distractores: [{ texto: 'COMER', rol: 'V' }],
        ordenCorrecto: ['YO', 'PRESENTAR', 'MI SIGNO', 'LLAMARSE'],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿En qué orden se presentan el signo personal y el nombre en LSE?',
        opciones: [
          'Primero el signo personal, luego el nombre deletreado.',
          'Primero el nombre deletreado, luego el signo personal.',
          'Solo se usa el signo personal, nunca el deletreo.',
          'Solo se deletrea, el signo personal es opcional.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué se hace si aún no tienes signo personal asignado?',
        opciones: [
          'Deletrear directamente el nombre con el abecedario dactilológico.',
          'Usar el signo de otra persona similar.',
          'Esperar a que la comunidad sorda te asigne uno antes de presentarte.',
          'Usar el signo genérico de "persona".',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Me llamo Ana (sin signo personal).',
        fichas: [{ texto: 'LLAMARSE', rol: 'V' }, { texto: 'A-N-A', rol: 'O' }],
        distractores: [{ texto: 'YO', rol: 'S' }],
        ordenCorrecto: ['LLAMARSE', 'A-N-A'],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Para qué se usa el abecedario dactilológico en una presentación?',
        opciones: [
          'Para deletrear el nombre propio letra a letra cuando no hay signo propio.',
          'Solo para apellidos compuestos.',
          'Para indicar que es una persona oyente.',
          'Es un recurso de emergencia que no se usa en contextos formales.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 6 — VERBOS
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'verbos',
    nombre: 'Los verbos',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Cómo se dice "Tu hijo es guapo" en LSE?',
        opciones: [
          'TU HIJO GUAPO — sin verbo, el adjetivo ocupa su posición.',
          'TU HIJO SER GUAPO — se mantiene el verbo ser.',
          'GUAPO TU HIJO — el adjetivo va al principio.',
          'TU HIJO ESTAR GUAPO — se usa ESTAR en lugar de SER.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Yo como pizza.',
        fichas: [{ texto: 'YO', rol: 'S' }, { texto: 'PIZZA', rol: 'O' }, { texto: 'COMER', rol: 'V' }],
        distractores: [{ texto: 'COMPRAR', rol: 'V' }],
        ordenCorrecto: ['YO', 'PIZZA', 'COMER'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué verbos se omiten en LSE porque no tienen signo propio?',
        opciones: [
          'SER, ESTAR y HACER (tiempo atmosférico).',
          'TENER, HABER y DAR.',
          'QUERER, PODER y DEBER.',
          'Ninguno: todos los verbos tienen signo en LSE.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cómo funcionan los verbos direccionales en LSE?',
        opciones: [
          'El inicio del movimiento indica el sujeto y el final indica el receptor.',
          'Se colocan al principio de la frase para indicar la acción principal.',
          'Se repiten dos veces para indicar que la acción va de una persona a otra.',
          'No pueden usarse con sujetos en primera persona.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Tú compras una puerta.',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'PUERTA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }],
        distractores: [{ texto: 'COMER', rol: 'V' }],
        ordenCorrecto: ['TÚ', 'PUERTA', 'COMPRAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: 'El avatar signa CUIDAR con movimiento de sí mismo hacia ti. ¿Qué significa?',
        fichasSig: [{ texto: 'CUIDAR', rol: 'V' }, { texto: 'yo→ti', rol: 'ADJ' }],
        opciones: [
          'Te cuido.',
          'Me cuidas.',
          'Te cuidas.',
          'Me cuido.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuándo puede TENER/HABER omitirse en LSE?',
        opciones: [
          'Cuando ya hay un signo de cantidad en la frase: TÚ HIJO TRES = "Tienes tres hijos".',
          'Nunca, TENER y HABER siempre se signan.',
          'Solo cuando el sujeto es "yo".',
          'Solo en frases negativas.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Nosotros compramos una casa.',
        fichas: [{ texto: 'NOSOTROS', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }],
        distractores: [{ texto: 'VIVIR', rol: 'V' }],
        ordenCorrecto: ['NOSOTROS', 'CASA', 'COMPRAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 7 — TIEMPOS VERBALES
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'tiempos',
    nombre: 'Tiempos verbales',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Cómo se indica el tiempo verbal en LSE?',
        opciones: [
          'Con un marcador temporal al principio de la frase. Los verbos no se conjugan.',
          'Cambiando la forma del signo del verbo.',
          'Añadiendo un signo de tiempo al final de la frase.',
          'El tiempo se infiere siempre del contexto sin necesidad de marcarlo.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Antes dormía mucho.',
        fichas: [{ texto: 'ANTES', rol: 'ADV' }, { texto: 'YO', rol: 'S' }, { texto: 'DORMIR', rol: 'V' }],
        distractores: [{ texto: 'MAÑANA', rol: 'ADV' }],
        ordenCorrecto: ['ANTES', 'YO', 'DORMIR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Ayer compramos.',
        fichas: [{ texto: 'AYER', rol: 'ADV' }, { texto: 'NOSOTROS', rol: 'S' }, { texto: 'COMPRAR', rol: 'V' }],
        distractores: [{ texto: 'MAÑANA', rol: 'ADV' }],
        ordenCorrecto: ['AYER', 'NOSOTROS', 'COMPRAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Dónde se coloca el marcador temporal en la frase LSE?',
        opciones: [
          'Al principio, antes del sujeto y del verbo.',
          'Al final de la frase.',
          'Justo antes del verbo.',
          'Después del sujeto y antes del objeto.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Mañana tú compras la casa.',
        fichas: [{ texto: 'MAÑANA', rol: 'ADV' }, { texto: 'TÚ', rol: 'S' }, { texto: 'CASA', rol: 'O' }, { texto: 'COMPRAR', rol: 'V' }],
        distractores: [{ texto: 'AYER', rol: 'ADV' }],
        ordenCorrecto: ['MAÑANA', 'TÚ', 'CASA', 'COMPRAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: 'Cuando hay varios marcadores temporales, ¿en qué orden van?',
        opciones: [
          'Primero el más general y luego el más concreto.',
          'Primero el más concreto y luego el más general.',
          'Siempre en el orden en que ocurrieron los hechos.',
          'No importa el orden, son intercambiables.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 8 — NEGACIÓN
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'negacion',
    nombre: 'La negación',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'fichas',
        pregunta: 'No compramos la casa.',
        fichas: [
          { texto: 'NOSOTROS', rol: 'S' },
          { texto: 'CASA', rol: 'O' },
          { texto: 'COMPRAR', rol: 'V' },
          { texto: 'NO', rol: 'NEG' },
        ],
        distractores: [{ texto: 'VIVIR', rol: 'V' }],
        ordenCorrecto: ['NOSOTROS', 'CASA', 'COMPRAR', 'NO'],
        conEnm: true, enmCorrecto: 'negacion', enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Dónde va el signo NO en LSE?',
        opciones: [
          'Después del verbo, al final de la frase.',
          'Antes del verbo, igual que en español.',
          'Al principio de la frase.',
          'Puede ir en cualquier posición.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'No duermo.',
        fichas: [{ texto: 'YO', rol: 'S' }, { texto: 'DORMIR', rol: 'V' }, { texto: 'NO', rol: 'NEG' }],
        distractores: [{ texto: 'COMER', rol: 'V' }],
        ordenCorrecto: ['YO', 'DORMIR', 'NO'],
        conEnm: true, enmCorrecto: 'negacion', enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué ENM acompaña siempre a la negación en LSE?',
        opciones: [
          'Cabeza moviéndose de lado a lado.',
          'Cejas levantadas.',
          'Boca abierta.',
          'Inclinación de cabeza hacia delante.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuál de estos verbos tiene la negación incorporada en su propio signo?',
        opciones: [
          'No entender — el signo ya incluye la negación.',
          'No comer — se signa con NO + COMER.',
          'No vivir — el signo ya incluye la negación.',
          'No comprar — se signa con NO + COMPRAR.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Tú no compras la puerta.',
        fichas: [
          { texto: 'TÚ', rol: 'S' },
          { texto: 'PUERTA', rol: 'O' },
          { texto: 'COMPRAR', rol: 'V' },
          { texto: 'NO', rol: 'NEG' },
        ],
        distractores: [{ texto: 'COMER', rol: 'V' }],
        ordenCorrecto: ['TÚ', 'PUERTA', 'COMPRAR', 'NO'],
        conEnm: true, enmCorrecto: 'negacion', enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 9 — SINGULAR Y PLURAL
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'plural',
    nombre: 'Singular y plural',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Cómo indica el plural LSE cuando no hay cuantificador?',
        opciones: [
          'Por contexto — el signo es idéntico en singular y plural.',
          'Cambiando la posición de la mano dominante.',
          'Añadiendo el signo VARIOS antes del sustantivo.',
          'Repitiendo siempre el signo dos veces.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Tienes tres hijos.',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'HIJO', rol: 'O' }, { texto: 'TRES', rol: 'O' }],
        distractores: [{ texto: 'CINCO', rol: 'O' }],
        ordenCorrecto: ['TÚ', 'HIJO', 'TRES'],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué significa el símbolo ++ en la notación LSE?',
        opciones: [
          'El signo se repite con desplazamiento para indicar plural.',
          'El signo se hace con ambas manos simultáneamente.',
          'El signo se ejecuta con más intensidad.',
          'El signo tiene una variante dialectal.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuándo queda claro el plural sin modificar el signo?',
        opciones: [
          'Cuando la frase ya incluye un número o un cuantificador como TRES, TODOS, MUCHO.',
          'Siempre, el contexto siempre es suficiente.',
          'Solo cuando el sujeto es plural (NOSOTROS, ELLOS).',
          'Solo cuando se usa el mecanismo de repetición ++.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 10 — ADVERBIOS
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'adverbios',
    nombre: 'Los adverbios',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'fichas',
        pregunta: 'Vives regular.',
        fichas: [{ texto: 'TÚ', rol: 'S' }, { texto: 'VIVIR', rol: 'V' }, { texto: 'REGULAR', rol: 'ADV' }],
        distractores: [{ texto: 'BIEN', rol: 'ADV' }],
        ordenCorrecto: ['TÚ', 'VIVIR', 'REGULAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Dónde se coloca el adverbio de modo en LSE?',
        opciones: [
          'Justo después del verbo o adjetivo al que acompaña.',
          'Al principio de la frase, siempre.',
          'Antes del verbo.',
          'Al final de la frase, siempre.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Ayer yo compré.',
        fichas: [{ texto: 'AYER', rol: 'ADV' }, { texto: 'YO', rol: 'S' }, { texto: 'COMPRAR', rol: 'V' }],
        distractores: [{ texto: 'REGULAR', rol: 'ADV' }],
        ordenCorrecto: ['AYER', 'YO', 'COMPRAR'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cuándo va el adverbio de tiempo o lugar al principio de la frase?',
        opciones: [
          'Cuando enmarca toda la oración (contexto global).',
          'Cuando solo afecta al verbo.',
          'Siempre va al principio sin excepción.',
          'Cuando hay más de un adverbio en la frase.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'fichas',
        pregunta: 'Él/ella come bien.',
        fichas: [{ texto: 'ÉL/ELLA', rol: 'S' }, { texto: 'COMER', rol: 'V' }, { texto: 'BIEN', rol: 'ADV' }],
        distractores: [{ texto: 'REGULAR', rol: 'ADV' }],
        ordenCorrecto: ['ÉL/ELLA', 'COMER', 'BIEN'],
        conEnm: true, enmCorrecto: 'ninguna' as any, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: 'El avatar signa esta secuencia. ¿Qué significa?',
        fichasSig: [{ texto: 'ÉL/ELLA', rol: 'S' }, { texto: 'COMER', rol: 'V' }, { texto: 'BIEN', rol: 'ADV' }],
        opciones: [
          'Él/ella come bien.',
          'Él/ella está bien.',
          'Le gusta comer.',
          'Come regular.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // BLOQUE 11 — INTENSIDAD Y ÉNFASIS
  // ══════════════════════════════════════════════════════════
  {
    bloqueId: 'intensidad',
    nombre: 'Intensidad y énfasis',
    accentColor: '#E04A1A',
    ejercicios: [
      {
        tipo: 'opciones',
        pregunta: '¿Cómo se aumenta la intensidad de un signo en LSE?',
        opciones: [
          'Con expresión facial marcada + movimiento más amplio o repetido.',
          'Añadiendo el signo MUCHO antes del verbo.',
          'Cambiando la mano dominante.',
          'Repitiendo exactamente el signo sin cambiar nada.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué expresión facial indica énfasis positivo (algo muy bueno o bonito)?',
        opciones: [
          'Dientes apretados + ojos algo entrecerrados.',
          'Carrillo inflados + cejas altas.',
          'Boca muy abierta + cejas fruncidas.',
          'Labios fruncidos + cabeza inclinada.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Cómo se gradúa hacia abajo la intensidad (algo poco, suave)?',
        opciones: [
          'Labios arqueados hacia abajo + ligera inclinación de cabeza.',
          'Cejas levantadas + boca abierta.',
          'Movimiento más rápido del signo.',
          'El signo se hace con la mano no dominante.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué mecanismo no verbal sirve para marcar el énfasis en LSE?',
        opciones: [
          'La expresión facial y la amplitud del movimiento — no palabras adicionales.',
          'Añadir el signo MUY o BASTANTE.',
          'Levantar el brazo más alto al ejecutar el signo.',
          'Hacer el signo con ambas manos simultáneamente.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿Qué expresión facial indica énfasis negativo (algo horrible o excesivo)?',
        opciones: [
          'Carrillos inflados + cejas ligeramente bajas.',
          'Dientes apretados + ojos entrecerrados.',
          'Boca abierta + cejas altas.',
          'Labios fruncidos + cabeza hacia atrás.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
      {
        tipo: 'opciones',
        pregunta: '¿En qué se diferencia el énfasis en LSE del énfasis en español?',
        opciones: [
          'En LSE el énfasis es no verbal (cara + cuerpo); en español se usan palabras como "muy", "bastante".',
          'En LSE se añaden signos especiales de énfasis; en español es la entonación.',
          'No hay diferencia: ambos idiomas usan los mismos mecanismos.',
          'En LSE solo se puede enfatizar con la velocidad del movimiento.',
        ],
        conEnm: false, enmCorrecto: null, enmAbreAvatar: null,
      },
    ],
  },
];

export function getEjerciciosPorBloque(bloqueId: string): BloqueEjercicios | undefined {
  return EJERCICIOS_GRAMATICA.find(b => b.bloqueId === bloqueId);
}