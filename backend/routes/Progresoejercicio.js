/*
Ruta base: /api/progreso-ejercicio
*/
const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');
const { validarJWT }    = require('../middleware/validar-jwt');
const { obtenerProgreso, registrarResultado } = require('../controllers/progresoEjercicio');

const router = Router();
router.use(validarJWT);

// GET /api/progreso-ejercicio?categoriaId=xxx
router.get('/', obtenerProgreso);

// POST /api/progreso-ejercicio/registrar
router.post('/registrar', [
  check('palabraId',   'palabraId requerido').notEmpty(),
  check('categoriaId', 'categoriaId requerido').notEmpty(),
  check('acertada',    'acertada debe ser booleano').isBoolean(),
  validarCampos
], registrarResultado);

module.exports = router;