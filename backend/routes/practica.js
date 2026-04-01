/*
Ruta base: /api/practica
*/

const { Router } = require('express');
const { check }  = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');
const { validarJWT }    = require('../middleware/validar-jwt');
const {
    crearSession,
    cerrarSession,
    crearEntry,
    obtenerStats,
    obtenerPalabrasMotor
} = require('../controllers/practica');

const router = Router();

// Todas las rutas de practica requieren autenticacion
router.use(validarJWT);

// Sesiones
router.post('/session', [
    check('tipo', 'El tipo es obligatorio').isIn(['abecedario', 'vocabulario', 'gramatica']),
    validarCampos
], crearSession);

router.patch('/session/:id', [
    check('total').optional().isNumeric(),
    check('correctas').optional().isNumeric(),
    check('incorrectas').optional().isNumeric(),
    validarCampos
], cerrarSession);

// Intentos individuales
router.post('/entry', [
    check('sessionId', 'sessionId es obligatorio').notEmpty(),
    check('tipo', 'El tipo es obligatorio').isIn(['abecedario', 'vocabulario', 'gramatica']),
    check('acierto', 'acierto debe ser booleano').isBoolean(),
    validarCampos
], crearEntry);

// Estadisticas de perfil
router.get('/stats/:userId', obtenerStats);

// Palabras listas para el motor de frases
router.get('/motor', obtenerPalabrasMotor);

module.exports = router;