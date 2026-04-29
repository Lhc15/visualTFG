/**
 * seed.js — Datos iniciales para Visual Voices (TFG)
 *
 * Uso:
 *   1. Pon este archivo en la carpeta backend/
 *   2. Asegurate de tener el .env con DBCONNECTION y JWT_SECRET
 *   3. cd backend && node seed.js
 *
 * Que hace:
 *   - Crea un usuario admin (email: admin@visualvoices.com / pass: Admin1234!)
 *   - Crea todas las categorias organizadas por modulo
 *   - Crea las 41 palabras del vocabulario clasificadas por tipoLexico, nivel y orden
 *   - Las palabras NO tienen gltf/clipName porque eso lo vas asignando tu
 *     desde el panel admin a medida que produces las animaciones en Blender
 *   - Si ya existe algun dato, lo omite (no duplica)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── Modelos ─────────────────────────────────────────────────────────────────
const { Schema, model } = mongoose;

const UsuarioSchema = new Schema({
  nombre:    String,
  apellidos: String,
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  imagen:    String,
  rol:       { type: String, default: 'ROL_USUARIO' },
  currentLevel:      { type: Number, default: 1 },
  maxUnlockedLevel:  { type: Number, default: 1 },
  currentWordIndex:  { type: Number, default: 0 },
  lastWordLearned:   { type: String,  default: '' },
  isnewuser:         { type: Boolean, default: true },
  exploredFreeWords: [{ type: Schema.Types.ObjectId, ref: 'Palabra' }],
  statsExamen: {
    correctas:   { type: Number, default: 0 },
    incorrectas: { type: Number, default: 0 }
  }
}, { collection: 'usuarios' });

const CategoriaSchema = new Schema({
  nombre: { type: String, required: true },
  modulo: { type: String, enum: ['abecedario', 'vocabulario', 'gramatica'] }
});

const PalabraSchema = new Schema({
  palabra:     { type: String, required: true },
  explicacion: String,
  descripcion: String,
  usarDescripcion: { type: Boolean, default: false },
  categoria:   { type: Schema.Types.ObjectId, ref: 'Categoria' },
  gltf:        String,
  clipName:    String,
  nivel:       { type: Number, default: 1, required: true },
  orden:       { type: Number, default: 0, required: true },
  tiposLexicos: {
    type: [String],
    enum: ['S', 'O', 'V', 'ADJ', 'INT', 'FX', 'ADV'],
    default: []
  },
  enMotor: { type: Boolean, default: false }
});

const Usuario  = model('Usuario',  UsuarioSchema);
const Categoria = model('Categoria', CategoriaSchema);
const Palabra   = model('Palabra',   PalabraSchema);

// ─── Datos ────────────────────────────────────────────────────────────────────

const ADMIN = {
  nombre:    'Admin',
  apellidos: 'Visual Voices',
  email:     'admin@visualvoices.com',
  password:  'Admin1234!',
  rol:       'ROL_ADMIN',
  isnewuser: false
};

// Categorias — nombre + modulo al que pertenecen
// El abecedario no necesita subcategorias tematicas, solo una entrada de modulo
const CATEGORIAS = [
  // abecedario
  { nombre: 'Abecedario',        modulo: 'abecedario' },

  // vocabulario (categorias tematicas)
  { nombre: 'Saludos y despedidas', modulo: 'vocabulario' },
  { nombre: 'Pronombres',           modulo: 'vocabulario' },
  { nombre: 'Familia',              modulo: 'vocabulario' },
  { nombre: 'Personas',             modulo: 'vocabulario' },
  { nombre: 'Lugares y objetos',    modulo: 'vocabulario' },
  { nombre: 'Verbos',               modulo: 'vocabulario' },
  { nombre: 'Adjetivos y estados',  modulo: 'vocabulario' },
  { nombre: 'Tiempo y adverbios',   modulo: 'vocabulario' },
  { nombre: 'Interrogativos',       modulo: 'vocabulario' },
  { nombre: 'Conversacion basica',  modulo: 'vocabulario' },

  // gramatica
  { nombre: 'Gramatica LSE',     modulo: 'gramatica' },
];

// Palabras del vocabulario segun MEMORIA_NOTAS.md [VOCABULARIO_MOTOR]
// 41 signos clasificados por tipoLexico.
// nivel 1 = palabras basicas (todas estas lo son para el TFG)
// orden = posicion dentro de su categoria tematica (para que el admin las vea ordenadas)
//
// gltf y clipName van vacios — los asignas desde el panel admin
// cuando tengas la animacion Blender lista para cada palabra.
// enMotor: false por defecto — lo pones a true cuando la animacion este lista.

const PALABRAS_DATA = [

  // ── FORMULAS FIJAS (saludos) ──────────────────────────────────────────────
  {
    palabra: 'HOLA',
    explicacion: 'Saludo informal. Se usa para saludar de forma cercana.',
    cat: 'Saludos y despedidas',
    nivel: 1, orden: 1,
    tiposLexicos: ['FX']
  },
  {
    palabra: 'BUENOS DIAS',
    explicacion: 'Saludo formal de manana. Equivale a "buenos dias" en espanol.',
    cat: 'Saludos y despedidas',
    nivel: 1, orden: 2,
    tiposLexicos: ['FX']
  },
  {
    palabra: 'ADIOS',
    explicacion: 'Despedida general.',
    cat: 'Saludos y despedidas',
    nivel: 1, orden: 3,
    tiposLexicos: ['FX']
  },
  {
    palabra: 'HASTA MANANA',
    explicacion: 'Despedida para hasta el dia siguiente.',
    cat: 'Saludos y despedidas',
    nivel: 1, orden: 4,
    tiposLexicos: ['FX']
  },
  {
    palabra: 'ENCANTADO/A',
    explicacion: 'Formula de presentacion al conocer a alguien.',
    cat: 'Saludos y despedidas',
    nivel: 1, orden: 5,
    tiposLexicos: ['FX']
  },

  // ── RESPUESTAS BASICAS ────────────────────────────────────────────────────
  {
    palabra: 'SI',
    explicacion: 'Respuesta afirmativa. Tiene signo manual propio.',
    cat: 'Conversacion basica',
    nivel: 1, orden: 1,
    tiposLexicos: ['FX']
  },
  {
    palabra: 'NO',
    explicacion: 'Respuesta negativa. Tiene signo manual y tambien ENM (cabeceo) en negacion.',
    cat: 'Conversacion basica',
    nivel: 1, orden: 2,
    tiposLexicos: ['FX']
  },
  {
    palabra: 'POR FAVOR REPETIR',
    explicacion: 'Formula para pedir que repitan lo que han signado.',
    cat: 'Conversacion basica',
    nivel: 1, orden: 3,
    tiposLexicos: ['FX']
  },

  // ── PRONOMBRES (sujetos) ──────────────────────────────────────────────────
  {
    palabra: 'YO',
    explicacion: 'Pronombre personal de primera persona.',
    cat: 'Pronombres',
    nivel: 1, orden: 1,
    tiposLexicos: ['S']
  },
  {
    palabra: 'TU',
    explicacion: 'Pronombre personal de segunda persona.',
    cat: 'Pronombres',
    nivel: 1, orden: 2,
    tiposLexicos: ['S']
  },
  {
    palabra: 'EL/ELLA',
    explicacion: 'Pronombre personal de tercera persona. En LSE el genero se marca por contexto o expresion no manual.',
    cat: 'Pronombres',
    nivel: 1, orden: 3,
    tiposLexicos: ['S']
  },
  {
    palabra: 'NOSOTROS',
    explicacion: 'Pronombre personal de primera persona del plural.',
    cat: 'Pronombres',
    nivel: 1, orden: 4,
    tiposLexicos: ['S']
  },

  // ── FAMILIA ───────────────────────────────────────────────────────────────
  {
    palabra: 'MADRE',
    explicacion: 'Sustantivo. Tiene signo propio diferente a MUJER.',
    cat: 'Familia',
    nivel: 1, orden: 1,
    tiposLexicos: ['O']
  },
  {
    palabra: 'PADRE',
    explicacion: 'Sustantivo. Tiene signo propio diferente a HOMBRE.',
    cat: 'Familia',
    nivel: 1, orden: 2,
    tiposLexicos: ['O']
  },
  {
    palabra: 'ABUELO',
    explicacion: 'Sustantivo. En LSE el genero no esta marcado morfologicamente; se puede especificar con HOMBRE o MUJER despues.',
    cat: 'Familia',
    nivel: 1, orden: 3,
    tiposLexicos: ['O']
  },
  {
    palabra: 'HIJO',
    explicacion: 'Sustantivo. El genero se especifica anadiendo HOMBRE o MUJER si es necesario.',
    cat: 'Familia',
    nivel: 1, orden: 4,
    tiposLexicos: ['O']
  },
  {
    palabra: 'HERMANO',
    explicacion: 'Sustantivo. El genero se puede especificar con HOMBRE o MUJER despues.',
    cat: 'Familia',
    nivel: 1, orden: 5,
    tiposLexicos: ['O']
  },

  // ── PERSONAS ──────────────────────────────────────────────────────────────
  {
    palabra: 'HOMBRE',
    explicacion: 'Sustantivo. Tambien se usa como marcador de genero masculino junto a otro sustantivo.',
    cat: 'Personas',
    nivel: 1, orden: 1,
    tiposLexicos: ['O']
  },
  {
    palabra: 'MUJER',
    explicacion: 'Sustantivo. Tambien se usa como marcador de genero femenino junto a otro sustantivo.',
    cat: 'Personas',
    nivel: 1, orden: 2,
    tiposLexicos: ['O']
  },
  {
    palabra: 'COMPANERO',
    explicacion: 'Sustantivo. Persona con quien se comparte espacio o actividad.',
    cat: 'Personas',
    nivel: 1, orden: 3,
    tiposLexicos: ['O']
  },
  {
    palabra: 'AMIGO',
    explicacion: 'Sustantivo. Persona con quien se tiene amistad.',
    cat: 'Personas',
    nivel: 1, orden: 4,
    tiposLexicos: ['O']
  },

  // ── LUGARES Y OBJETOS ─────────────────────────────────────────────────────
  {
    palabra: 'PUERTA',
    explicacion: 'Sustantivo. Ejemplo clasico usado en frases S-O-V: "TU PUERTA COMPRAR".',
    cat: 'Lugares y objetos',
    nivel: 1, orden: 1,
    tiposLexicos: ['O']
  },
  {
    palabra: 'CASA',
    explicacion: 'Sustantivo. Lugar de residencia.',
    cat: 'Lugares y objetos',
    nivel: 1, orden: 2,
    tiposLexicos: ['O']
  },
  {
    palabra: 'HABITACION',
    explicacion: 'Sustantivo. Espacio dentro de una casa.',
    cat: 'Lugares y objetos',
    nivel: 1, orden: 3,
    tiposLexicos: ['O']
  },

  // ── VERBOS ────────────────────────────────────────────────────────────────
  {
    palabra: 'COMPRAR',
    explicacion: 'Verbo. En LSE va al final de la frase: TU PUERTA COMPRAR.',
    cat: 'Verbos',
    nivel: 1, orden: 1,
    tiposLexicos: ['V']
  },
  {
    palabra: 'COMER',
    explicacion: 'Verbo. Accion de ingerir alimentos.',
    cat: 'Verbos',
    nivel: 1, orden: 2,
    tiposLexicos: ['V']
  },
  {
    palabra: 'VIVIR',
    explicacion: 'Verbo. Ejemplo de uso: TU VIVIR DONDE.',
    cat: 'Verbos',
    nivel: 1, orden: 3,
    tiposLexicos: ['V']
  },
  {
    palabra: 'DORMIR',
    explicacion: 'Verbo. Accion de descansar durmiendo.',
    cat: 'Verbos',
    nivel: 1, orden: 4,
    tiposLexicos: ['V']
  },
  {
    palabra: 'LLAMARSE',
    explicacion: 'Verbo. Se usa en presentaciones: MI SIGNO "X" LLAMARSE.',
    cat: 'Verbos',
    nivel: 1, orden: 5,
    tiposLexicos: ['V']
  },
  {
    palabra: 'PRESENTAR',
    explicacion: 'Verbo. Se usa en la formula de presentacion: YO PRESENTAR-yo-a-ti.',
    cat: 'Verbos',
    nivel: 1, orden: 6,
    tiposLexicos: ['V']
  },
  {
    palabra: 'CUIDAR',
    explicacion: 'Verbo direccional. El movimiento indica quien cuida a quien: CUIDAR yo-a-ti / CUIDAR tu-a-mi.',
    cat: 'Verbos',
    nivel: 1, orden: 7,
    tiposLexicos: ['V']
  },


  // ── ADJETIVOS Y ESTADOS ───────────────────────────────────────────────────
  {
    palabra: 'ALTO',
    explicacion: 'Adjetivo. Describe la altura de una persona o cosa.',
    cat: 'Adjetivos y estados',
    nivel: 1, orden: 1,
    tiposLexicos: ['ADJ']
  },
  {
    palabra: 'SOLTERO/A',
    explicacion: 'Adjetivo/estado civil. En LSE no tiene morfema de genero.',
    cat: 'Adjetivos y estados',
    nivel: 1, orden: 2,
    tiposLexicos: ['ADJ']
  },
  {
    palabra: 'BIEN',
    explicacion: 'Adjetivo/formula fija. Se usa tanto como adjetivo ("estoy bien") como formula de cierre ("bien, hasta luego").',
    cat: 'Conversacion basica',
    nivel: 1, orden: 4,
    tiposLexicos: ['ADJ', 'FX']
  },
  {
    palabra: 'REGULAR',
    explicacion: 'Adjetivo y adverbio de modo. Estado intermedio. Ejemplo: TU VIVIR REGULAR.',
    cat: 'Conversacion basica',
    nivel: 1, orden: 5,
    tiposLexicos: ['ADJ']
  },

  // ── TIEMPO Y ADVERBIOS ──────────────────────────────────────────────────
  {
    palabra: 'AYER',
    explicacion: 'Marcador temporal de pasado reciente. Va al inicio de la frase: AYER YO COMPRAR.',
    cat: 'Tiempo y adverbios',
    nivel: 1, orden: 1,
    tiposLexicos: ['ADV']
  },
  {
    palabra: 'ANTES',
    explicacion: 'Marcador temporal de pasado habitual. Va al inicio: ANTES YO DORMIR.',
    cat: 'Tiempo y adverbios',
    nivel: 1, orden: 2,
    tiposLexicos: ['ADV']
  },
  {
    palabra: 'MANANA',
    explicacion: 'Marcador temporal de futuro proximo. Va al inicio: MANANA TU COMPRAR.',
    cat: 'Tiempo y adverbios',
    nivel: 1, orden: 3,
    tiposLexicos: ['ADV']
  },

  // ── INTERROGATIVOS ────────────────────────────────────────────────────────
  {
    palabra: 'QUE',
    explicacion: 'Particula interrogativa. Va al FINAL: TU COMER QUE / TU COMPRAR QUE.',
    cat: 'Interrogativos',
    nivel: 1, orden: 1,
    tiposLexicos: ['INT']
  },
  {
    palabra: 'QUIEN',
    explicacion: 'Particula interrogativa. Va al final: TU AMIGO QUIEN / TU COMPANERO QUIEN.',
    cat: 'Interrogativos',
    nivel: 1, orden: 2,
    tiposLexicos: ['INT']
  },
  {
    palabra: 'DONDE',
    explicacion: 'Particula interrogativa. Ejemplo: TU VIVIR DONDE.',
    cat: 'Interrogativos',
    nivel: 1, orden: 3,
    tiposLexicos: ['INT']
  },
  {
    palabra: 'CUANTOS/AS',
    explicacion: 'Particula interrogativa de cantidad. Va al final de la frase.',
    cat: 'Interrogativos',
    nivel: 1, orden: 4,
    tiposLexicos: ['INT']
  },
  {
    palabra: 'COMO',
    explicacion: 'Particula interrogativa de modo. Ejemplo: TU LLAMARSE COMO.',
    cat: 'Interrogativos',
    nivel: 1, orden: 5,
    tiposLexicos: ['INT']
  },

  // ── ABECEDARIO (27 letras) ────────────────────────────────────────────────
  ...('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letra, i) => ({
    palabra: letra,
    explicacion: `Letra ${letra} del alfabeto dactilologico de la LSE.`,
    cat: 'Abecedario',
    nivel: 1,
    orden: i + 1,
    tiposLexicos: []
  }))),
  // La CH es la letra 27 en el abecedario dactilologico LSE
  {
    palabra: 'CH',
    explicacion: 'Digrama CH del alfabeto dactilologico de la LSE.',
    cat: 'Abecedario',
    nivel: 1,
    orden: 28,
    tiposLexicos: []
  }
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    await mongoose.connect(process.env.DBCONNECTION);
    console.log('Conectado a MongoDB:', mongoose.connection.name);

    // 1. ADMIN ----------------------------------------------------------------
    const adminExiste = await Usuario.findOne({ email: ADMIN.email });
    if (adminExiste) {
      console.log('  [SKIP] Usuario admin ya existe');
    } else {
      const hash = bcrypt.hashSync(ADMIN.password, 10);
      await Usuario.create({ ...ADMIN, password: hash });
      console.log('  [OK]   Usuario admin creado:', ADMIN.email);
    }

    // 2. CATEGORIAS ----------------------------------------------------------
    const catMap = {}; // nombre -> _id

    for (const c of CATEGORIAS) {
      let cat = await Categoria.findOne({ nombre: c.nombre });
      if (cat) {
        console.log(`  [SKIP] Categoria ya existe: ${c.nombre}`);
      } else {
        cat = await Categoria.create(c);
        console.log(`  [OK]   Categoria creada: ${c.nombre} (${c.modulo})`);
      }
      catMap[c.nombre] = cat._id;
    }

    // 3. PALABRAS ------------------------------------------------------------
    let creadas = 0;
    let omitidas = 0;

    for (const p of PALABRAS_DATA) {
      const existe = await Palabra.findOne({ palabra: p.palabra });
      if (existe) {
        omitidas++;
        continue;
      }

      const { cat, ...resto } = p;
      await Palabra.create({
        ...resto,
        categoria: catMap[cat] || null
      });
      creadas++;
    }

    console.log(`  [OK]   Palabras creadas: ${creadas} | Omitidas (ya existian): ${omitidas}`);

    // 4. RESUMEN -------------------------------------------------------------
    const totalUsuarios  = await Usuario.countDocuments();
    const totalCats      = await Categoria.countDocuments();
    const totalPalabras  = await Palabra.countDocuments();

    console.log('\n=== Seed completado ===');
    console.log(`  Usuarios:   ${totalUsuarios}`);
    console.log(`  Categorias: ${totalCats}`);
    console.log(`  Palabras:   ${totalPalabras}`);
    console.log('\nCredenciales del admin:');
    console.log(`  Email:    ${ADMIN.email}`);
    console.log(`  Password: ${ADMIN.password}`);
    console.log('\nRecuerda cambiar la password del admin despues del primer login.');

  } catch (err) {
    console.error('Error en el seed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB.');
  }
}

seed();