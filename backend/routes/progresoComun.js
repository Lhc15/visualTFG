/*
Ruta base: /api/progreso-comunicacion
*/

const { Router } = require('express');
const { check }  = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');
const { validarJWT }    = require('../middleware/validar-jwt');
const { obtenerProgreso, completarBloque } = require('../controllers/progresoComun');

const router = Router();

router.use(validarJWT);

// GET /api/progreso-comunicacion  → bloques completados del usuario autenticado
router.get('/', obtenerProgreso);

// POST /api/progreso-comunicacion/completar  → marcar un bloque como completado
router.post('/completar', [
  check('bloqueId', 'bloqueId es obligatorio').notEmpty(),
  validarCampos
], completarBloque);

module.exports = router;