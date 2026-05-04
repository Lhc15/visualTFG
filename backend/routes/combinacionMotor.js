/*
  Ruta base: /api/combinaciones-motor
*/
const { Router } = require('express');
const { validarJWT }  = require('../middleware/validar-jwt');
const { tieneRol }    = require('../middleware/validar-rol');
const {
  regenerar,
  listar,
  actualizar,
  generarEjercicios,
  stats
} = require('../controllers/combinacionMotor');

const router = Router();

// Rutas de admin (requieren ROL_ADMIN)
router.use(validarJWT);

// Stats rápidas
router.get('/stats',              tieneRol('ROL_ADMIN'), stats);

// Regenerar combinaciones desde el corpus
router.post('/regenerar',         tieneRol('ROL_ADMIN'), regenerar);

// Listar con filtros y paginación
router.get('/',                   tieneRol('ROL_ADMIN'), listar);

// Actualizar validación de una combinación
router.patch('/:id',              tieneRol('ROL_ADMIN'), actualizar);

// Generar ejercicios para un bloque — accesible para usuarios autenticados
router.get('/ejercicios/:bloqueId', generarEjercicios);

module.exports = router;