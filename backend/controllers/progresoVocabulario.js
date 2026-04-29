const ProgresoVocabulario = require('../models/progresoVocabulario');

// GET /api/progreso-vocabulario?modulo=vocabulario
// Devuelve los IDs de palabras vistas por el usuario autenticado
const obtenerProgreso = async (req, res) => {
  try {
    const userId = req.uid;
    const { modulo } = req.query;
    const filtro = { userId };
    if (modulo) filtro.modulo = modulo;

    const registros = await ProgresoVocabulario.find(filtro).select('palabraId');
    const palabrasVistas = registros.map(r => r.palabraId.toString());

    return res.json({ ok: true, palabrasVistas });
  } catch (err) {
    console.error('obtenerProgreso vocabulario:', err);
    return res.status(500).json({ ok: false, msg: 'Error al obtener progreso' });
  }
};

// POST /api/progreso-vocabulario/marcar
// Marca una palabra como vista. Idempotente: si ya existe, no falla.
const marcarPalabraVista = async (req, res) => {
  try {
    const userId = req.uid;
    const { palabraId, modulo } = req.body;

    await ProgresoVocabulario.updateOne(
      { userId, palabraId },
      { $setOnInsert: { userId, palabraId, modulo: modulo || 'vocabulario', fechaVista: new Date() } },
      { upsert: true }
    );

    return res.json({ ok: true, palabraId });
  } catch (err) {
    console.error('marcarPalabraVista:', err);
    return res.status(500).json({ ok: false, msg: 'Error al marcar palabra' });
  }
};

module.exports = { obtenerProgreso, marcarPalabraVista };