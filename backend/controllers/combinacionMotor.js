const Palabra           = require('../models/palabras');
const CombinacionMotor  = require('../models/combinacionMotor');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/combinaciones-motor/regenerar
// Genera todas las combinaciones posibles a partir de los signos con enMotor:true
// Solo inserta las nuevas (las ya existentes no se tocan)
// ─────────────────────────────────────────────────────────────────────────────
const regenerar = async (req, res) => {
  try {
    // Traer todas las palabras activas en el motor
    const palabras = await Palabra.find({ enMotor: true }).lean();

    const sujetos  = palabras.filter(p => p.tiposLexicos.includes('S'));
    const verbos   = palabras.filter(p => p.tiposLexicos.includes('V'));
    const objetos  = palabras.filter(p => p.tiposLexicos.includes('O'));
    const interrs  = palabras.filter(p => p.tiposLexicos.includes('INT'));

    const nuevas = [];

    for (const s of sujetos) {
      for (const v of verbos) {

        // ── Plantilla afirmativa: S + O + V ──────────────────────────────
        for (const o of objetos) {
          nuevas.push({
            sujetoId:  s._id,
            verboId:   v._id,
            objetoId:  o._id,
            interrId:  null,
            plantilla: 'afirmativa',
            enm:       null
          });
        }

        // ── Plantilla pregunta-sn: S + V (cejas altas) ───────────────────
        nuevas.push({
          sujetoId:  s._id,
          verboId:   v._id,
          objetoId:  null,
          interrId:  null,
          plantilla: 'pregunta-sn',
          enm:       'pregunta-sin-particula'
        });

        // ── Plantilla pregunta-wh: S + V + INT (cejas fruncidas) ─────────
        for (const i of interrs) {
          nuevas.push({
            sujetoId:  s._id,
            verboId:   v._id,
            objetoId:  null,
            interrId:  i._id,
            plantilla: 'pregunta-wh',
            enm:       'pregunta-con-particula'
          });
        }
      }
    }

    // Insertar solo las que no existen (ignorar duplicados por índice único)
    let insertadas = 0;
    for (const combo of nuevas) {
      try {
        await CombinacionMotor.create(combo);
        insertadas++;
      } catch (e) {
        if (e.code !== 11000) throw e; // solo ignorar duplicados
      }
    }

    // Estadísticas actuales
    const totalCombinaciones  = await CombinacionMotor.countDocuments();
    const sinRevisar          = await CombinacionMotor.countDocuments({ revisada: false });

    res.json({
      ok: true,
      msg: `Regeneración completada. ${insertadas} combinaciones nuevas insertadas.`,
      insertadas,
      totalCombinaciones,
      sinRevisar
    });
  } catch (error) {
    console.error('regenerar:', error);
    res.status(500).json({ ok: false, msg: 'Error al regenerar combinaciones', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/combinaciones-motor
// Lista combinaciones con populate, filtros y paginación
// Query params: filtro (todas|sin-revisar|validas|invalidas), page, limit
// ─────────────────────────────────────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const { filtro = 'todas', page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (filtro === 'sin-revisar') query = { revisada: false };
    else if (filtro === 'validas')   query = { revisada: true, valida: true };
    else if (filtro === 'invalidas') query = { revisada: true, valida: false };

    const [combinaciones, total, sinRevisar] = await Promise.all([
      CombinacionMotor.find(query)
        .populate('sujetoId', 'palabra tiposLexicos')
        .populate('verboId',  'palabra tiposLexicos')
        .populate('objetoId', 'palabra tiposLexicos')
        .populate('interrId', 'palabra tiposLexicos')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CombinacionMotor.countDocuments(query),
      CombinacionMotor.countDocuments({ revisada: false })
    ]);

    res.json({ ok: true, combinaciones, total, sinRevisar, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('listar:', error);
    res.status(500).json({ ok: false, msg: 'Error al listar combinaciones' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/combinaciones-motor/:id
// Actualiza valida, revisada y/o notas de una combinación
// ─────────────────────────────────────────────────────────────────────────────
const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { valida, revisada, notas } = req.body;

    const update = {};
    if (valida    !== undefined) update.valida    = valida;
    if (revisada  !== undefined) update.revisada  = revisada;
    if (notas     !== undefined) update.notas     = notas;

    const combo = await CombinacionMotor.findByIdAndUpdate(id, update, { new: true })
      .populate('sujetoId', 'palabra')
      .populate('verboId',  'palabra')
      .populate('objetoId', 'palabra')
      .populate('interrId', 'palabra');

    if (!combo) return res.status(404).json({ ok: false, msg: 'Combinación no encontrada' });

    res.json({ ok: true, combinacion: combo });
  } catch (error) {
    console.error('actualizar:', error);
    res.status(500).json({ ok: false, msg: 'Error al actualizar combinación' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/combinaciones-motor/ejercicios/:bloqueId
// Devuelve ejercicios generados para un bloque gramatical específico
// Combina combinaciones validadas del motor + preguntas estáticas por bloque
// ─────────────────────────────────────────────────────────────────────────────

// Qué plantillas son relevantes para cada bloque
const PLANTILLAS_POR_BLOQUE = {
  'enm':           [],                              // solo preguntas teóricas
  'sov':           ['afirmativa'],
  'preguntas':     ['pregunta-sn', 'pregunta-wh'],
  'genero':        ['afirmativa'],
  'presentaciones':['afirmativa'],
  'verbos':        ['afirmativa'],
  'tiempos':       ['afirmativa'],
  'negacion':      ['afirmativa'],
  'plural':        ['afirmativa'],
  'adverbios':     ['afirmativa'],
  'intensidad':    [],
};

const generarEjercicios = async (req, res) => {
  try {
    const { bloqueId } = req.params;
    const plantillas = PLANTILLAS_POR_BLOQUE[bloqueId] ?? [];

    let ejerciciosProcedurales = [];

    if (plantillas.length > 0) {
      const combinaciones = await CombinacionMotor.find({
        plantilla: { $in: plantillas },
        valida: true,
        revisada: true
      })
        .populate('sujetoId',  'palabra tiposLexicos gltf clipName')
        .populate('verboId',   'palabra tiposLexicos gltf clipName')
        .populate('objetoId',  'palabra tiposLexicos gltf clipName')
        .populate('interrId',  'palabra tiposLexicos gltf clipName')
        .lean();

      ejerciciosProcedurales = combinaciones.map(c => construirEjercicio(c, bloqueId));
    }

    res.json({
      ok: true,
      bloqueId,
      ejercicios: ejerciciosProcedurales
    });
  } catch (error) {
    console.error('generarEjercicios:', error);
    res.status(500).json({ ok: false, msg: 'Error al generar ejercicios' });
  }
};

/**
 * Convierte una CombinacionMotor en un objeto ejercicio listo para el frontend.
 */
function construirEjercicio(combo, bloqueId) {
  const fichas = [];
  const { sujetoId: s, verboId: v, objetoId: o, interrId: i } = combo;

  if (combo.plantilla === 'afirmativa') {
    // Orden: S O V
    fichas.push({ texto: s.palabra, rol: 'S', palabraId: String(s._id) });
    if (o) fichas.push({ texto: o.palabra, rol: 'O', palabraId: String(o._id) });
    fichas.push({ texto: v.palabra, rol: 'V', palabraId: String(v._id) });
  } else if (combo.plantilla === 'pregunta-sn') {
    // Orden: S V (+ ENM)
    fichas.push({ texto: s.palabra, rol: 'S', palabraId: String(s._id) });
    fichas.push({ texto: v.palabra, rol: 'V', palabraId: String(v._id) });
  } else if (combo.plantilla === 'pregunta-wh') {
    // Orden: S V INT (+ ENM)
    fichas.push({ texto: s.palabra, rol: 'S', palabraId: String(s._id) });
    fichas.push({ texto: v.palabra, rol: 'V', palabraId: String(v._id) });
    if (i) fichas.push({ texto: i.palabra, rol: 'INT', palabraId: String(i._id) });
  }

  const ordenCorrecto = fichas.map(f => f.texto);

  // Frase en español (aproximada para el Formato B)
  const fraseEsp = generarFraseEspanol(combo);

  return {
    _id:         String(combo._id),
    tipo:        'fichas',
    bloqueId,
    plantilla:   combo.plantilla,
    pregunta:    fraseEsp,
    fichas,
    ordenCorrecto,
    conEnm:      combo.enm !== null,
    enmCorrecto: combo.enm,
    enmAbreAvatar: null,
    distractores: [] // el frontend puede añadir distractores del mismo tipo léxico
  };
}

function generarFraseEspanol(combo) {
  const s = combo.sujetoId?.palabra ?? '';
  const v = combo.verboId?.palabra  ?? '';
  const o = combo.objetoId?.palabra ?? '';
  const i = combo.interrId?.palabra ?? '';

  const pronombres = { 'YO': 'yo', 'TÚ': 'tú', 'ÉL/ELLA': 'él/ella', 'NOSOTROS': 'nosotros' };
  const sEsp = pronombres[s] ?? s.toLowerCase();

  if (combo.plantilla === 'afirmativa') {
    return `${sEsp} ${v.toLowerCase()} ${o.toLowerCase()}`.trim();
  } else if (combo.plantilla === 'pregunta-sn') {
    return `¿${sEsp} ${v.toLowerCase()}?`;
  } else if (combo.plantilla === 'pregunta-wh') {
    const wh = { 'DÓNDE': 'dónde', 'QUÉ': 'qué', 'QUIÉN': 'quién', 'CÓMO': 'cómo', 'CUÁNTOS': 'cuántos' };
    return `¿${wh[i] ?? i.toLowerCase()} ${v.toLowerCase()} ${sEsp}?`;
  }
  return `${s} ${v} ${o} ${i}`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/combinaciones-motor/stats
// Devuelve estadísticas rápidas para el panel admin
// ─────────────────────────────────────────────────────────────────────────────
const stats = async (req, res) => {
  try {
    const [total, sinRevisar, validas, invalidas] = await Promise.all([
      CombinacionMotor.countDocuments(),
      CombinacionMotor.countDocuments({ revisada: false }),
      CombinacionMotor.countDocuments({ revisada: true, valida: true }),
      CombinacionMotor.countDocuments({ revisada: true, valida: false }),
    ]);
    res.json({ ok: true, total, sinRevisar, validas, invalidas });
  } catch (error) {
    res.status(500).json({ ok: false, msg: 'Error al obtener estadísticas' });
  }
};

module.exports = { regenerar, listar, actualizar, generarEjercicios, stats };