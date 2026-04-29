const ProgresoEjercicio = require('../models/progresoEjercicio');

// GET /api/progreso-ejercicio?categoriaId=xxx
// Devuelve el historial de ejercicios del usuario para una categoría
const obtenerProgreso = async (req, res) => {
  try {
    const userId = req.uid;
    const { categoriaId } = req.query;
    if (!categoriaId) return res.status(400).json({ ok: false, msg: 'categoriaId requerido' });

    const registros = await ProgresoEjercicio.find({ userId, categoriaId })
      .select('palabraId vecesAcertada vecesFallada');

    return res.json({ ok: true, registros });
  } catch (err) {
    console.error('obtenerProgresoEjercicio:', err);
    return res.status(500).json({ ok: false, msg: 'Error al obtener progreso' });
  }
};

// POST /api/progreso-ejercicio/registrar
// Registra el resultado de una pregunta (acierto o fallo). Idempotente con upsert.
const registrarResultado = async (req, res) => {
  try {
    const userId = req.uid;
    const { palabraId, categoriaId, acertada } = req.body;

    const inc = acertada
      ? { vecesAcertada: 1 }
      : { vecesFallada: 1 };

    await ProgresoEjercicio.findOneAndUpdate(
      { userId, palabraId },
      {
        $inc: inc,
        $set: { fechaUltimo: new Date(), categoriaId },
        $setOnInsert: { userId, palabraId, categoriaId }
      },
      { upsert: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('registrarResultado:', err);
    return res.status(500).json({ ok: false, msg: 'Error al registrar resultado' });
  }
};

module.exports = { obtenerProgreso, registrarResultado };