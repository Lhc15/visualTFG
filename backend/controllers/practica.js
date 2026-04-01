const PracticaSession = require('../models/practicaSession');
const PracticaEntry   = require('../models/practicaEntry');
const Palabra         = require('../models/palabras');

// POST /api/practica/session
// Crea una nueva sesion de practica al empezar una ronda.
const crearSession = async (req, res) => {
    try {
        const { tipo } = req.body;
        const session = new PracticaSession({
            userId: req.uid,
            tipo
        });
        await session.save();
        res.status(201).json({ ok: true, session });
    } catch (error) {
        console.error('Error al crear sesion:', error);
        res.status(500).json({ ok: false, msg: 'Error al crear la sesion' });
    }
};

// PATCH /api/practica/session/:id
// Cierra una sesion: guarda finishedAt y los totales.
const cerrarSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { total, correctas, incorrectas } = req.body;

        const session = await PracticaSession.findByIdAndUpdate(
            id,
            { finishedAt: new Date(), total, correctas, incorrectas },
            { new: true }
        );
        if (!session) return res.status(404).json({ ok: false, msg: 'Sesion no encontrada' });

        res.json({ ok: true, session });
    } catch (error) {
        console.error('Error al cerrar sesion:', error);
        res.status(500).json({ ok: false, msg: 'Error al cerrar la sesion' });
    }
};

// POST /api/practica/entry
// Registra un intento individual (una pregunta respondida).
const crearEntry = async (req, res) => {
    try {
        const { sessionId, tipo, palabraId, acierto, tiempoMs, fraseGenerada, estructuraUsada } = req.body;

        const entry = new PracticaEntry({
            userId: req.uid,
            sessionId,
            tipo,
            palabraId: palabraId || null,
            acierto,
            tiempoMs,
            fraseGenerada:   fraseGenerada   || [],
            estructuraUsada: estructuraUsada || null
        });
        await entry.save();
        res.status(201).json({ ok: true, entry });
    } catch (error) {
        console.error('Error al crear entry:', error);
        res.status(500).json({ ok: false, msg: 'Error al guardar el intento' });
    }
};

// GET /api/practica/stats/:userId
// Devuelve estadisticas agregadas para la pagina de perfil.
const obtenerStats = async (req, res) => {
    try {
        const { userId } = req.params;

        const sesiones = await PracticaSession.find({ userId });
        const entries  = await PracticaEntry.find({ userId });

        const porTipo = (tipo) => {
            const s = sesiones.filter(s => s.tipo === tipo);
            const e = entries.filter(e => e.tipo === tipo);
            return {
                sesiones:    s.length,
                correctas:   e.filter(e => e.acierto).length,
                incorrectas: e.filter(e => !e.acierto).length,
                total:       e.length
            };
        };

        res.json({
            ok: true,
            abecedario:  porTipo('abecedario'),
            vocabulario: porTipo('vocabulario'),
            gramatica:   porTipo('gramatica')
        });
    } catch (error) {
        console.error('Error al obtener stats:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener estadisticas' });
    }
};

// GET /api/palabras/motor
// Devuelve todas las palabras listas para el motor de generacion de frases.
// Se filtra por enMotor: true y se puede filtrar por tipoLexico con query param.
const obtenerPalabrasMotor = async (req, res) => {
    try {
        const { tipo } = req.query;
        const filtro = { enMotor: true };
        if (tipo) filtro.tiposLexicos = tipo;

        const palabras = await Palabra.find(filtro).populate('categoria', 'nombre');
        res.json({ ok: true, palabras });
    } catch (error) {
        console.error('Error al obtener palabras motor:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener palabras del motor' });
    }
};

module.exports = {
    crearSession,
    cerrarSession,
    crearEntry,
    obtenerStats,
    obtenerPalabrasMotor
};