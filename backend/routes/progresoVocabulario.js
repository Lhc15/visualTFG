/*
Ruta base: /api/progreso-vocabulario
*/
const { Router } = require('express');
const { check }  = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');
const { validarJWT }    = require('../middleware/validar-jwt');
const { obtenerProgreso, marcarPalabraVista } = require('../controllers/progresoVocabulario');

const router = Router();
router.use(validarJWT);

// GET /api/progreso-vocabulario?modulo=vocabulario
router.get('/', obtenerProgreso);

// POST /api/progreso-vocabulario/marcar
router.post('/marcar', [
  check('palabraId', 'palabraId es obligatorio').notEmpty(),
  validarCampos
], marcarPalabraVista);

module.exports = router;