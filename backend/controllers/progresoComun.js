const ProgresoComun = require('../models/progresoComun');

// GET /api/progreso-comunicacion
// Devuelve los bloqueIds completados del usuario autenticado
const obtenerProgreso = async (req, res) => {
  try {
    const registros = await ProgresoComun.find({ userId: req.uid }).select('bloqueId fechaCompletado');
    const completados = registros.map(r => ({
      bloqueId: r.bloqueId,
      fechaCompletado: r.fechaCompletado
    }));
    return res.json({ ok: true, completados });
  } catch (err) {
    console.error('[ProgresoComun] obtenerProgreso:', err);
    return res.status(500).json({ ok: false, msg: 'Error al obtener progreso' });
  }
};

// POST /api/progreso-comunicacion/completar
// Body: { bloqueId: string }
// Marca un bloque como completado (upsert — no falla si ya existe)
const completarBloque = async (req, res) => {
  try {
    const { bloqueId } = req.body;
    if (!bloqueId) {
      return res.status(400).json({ ok: false, msg: 'bloqueId es obligatorio' });
    }

    await ProgresoComun.findOneAndUpdate(
      { userId: req.uid, bloqueId },
      { userId: req.uid, bloqueId, fechaCompletado: new Date() },
      { upsert: true, new: true }
    );

    return res.json({ ok: true, bloqueId });
  } catch (err) {
    console.error('[ProgresoComun] completarBloque:', err);
    return res.status(500).json({ ok: false, msg: 'Error al guardar progreso' });
  }
};

module.exports = { obtenerProgreso, completarBloque };