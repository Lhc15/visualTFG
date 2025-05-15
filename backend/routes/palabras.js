
/*
Ruta base: /api/palabras
*/

const { Router } = require('express');
const {
    obtenerPalabras,
    obtenerPalabra,
    crearPalabra,
    editarPalabra,
    borrarPalabra,
    asociarCategoria,
    obtenerPalabrasPorCategoria,
    obtenerPalabrasPorNivel,
    editarAnimacion
} = require('../controllers/palabras');
const { check } = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');
const { validarJWT } = require('../middleware/validar-jwt');
const { tieneRol } = require('../middleware/validar-rol');

const router = Router();

// Rutas públicas
router.get('/', obtenerPalabras);
router.get('/categoria', obtenerPalabrasPorCategoria); // Devuelve palabras por categoría
router.get('/por-nivel', obtenerPalabrasPorNivel); //Devuelve palabras por nivel
router.get('/:id', obtenerPalabra);

// Rutas restringidas a administradores
router.post('/', [
    validarJWT,
    tieneRol('ROL_ADMIN'), // Solo administradores pueden crear palabras
    check('palabra', 'La palabra es obligatoria').not().isEmpty(),
    validarCampos,
], crearPalabra);

router.put('/:id', [
    validarJWT,
    tieneRol('ROL_ADMIN'), // Solo administradores pueden editar palabras
    check('palabra', 'La palabra es obligatoria').not().isEmpty(),
    validarCampos,
], editarPalabra);

router.delete('/:id', [
    validarJWT,
    tieneRol('ROL_ADMIN'), // Solo administradores pueden borrar palabras
], borrarPalabra);

router.patch('/:id/categoria', [
    validarJWT,
    tieneRol('ROL_ADMIN'), // Solo administradores pueden asociar categorías
    check('categoria', 'La categoría no puede estar vacía').optional().isString(),
    validarCampos,
], asociarCategoria);

router.patch('/:id/animacion', [
   validarJWT,
   tieneRol('ROL_ADMIN'),
    check('gltf').optional().isString(),
    check('clipName').optional().isString(),
  validarCampos
], editarPalabra);

module.exports = router;

// Este archivo define todas las rutas relacionadas con la gestión de "Palabras" en la aplicación.
// La ruta base para todas las operaciones es '/api/palabras'.
//
// 1. Se importan los controladores del módulo 'palabras': obtenerPalabras, obtenerPalabra, crearPalabra, etc.
// 2. Se incluyen middlewares de validación (check, validarCampos, validarJWT, tieneRol) para garantizar la autenticidad y los permisos.
// 3. Rutas públicas:
//    - GET '/': Obtiene todas las palabras.
//    - GET '/categoria': Filtra las palabras por la categoría especificada en la query string.
//    - GET '/por-nivel': Filtra las palabras por un nivel dado en la query string.
//    - GET '/:id': Obtiene los detalles de una palabra por su ID.
//
// 4. Rutas para administradores (protección con validarJWT y tieneRol('ROL_ADMIN')):
//
//    a) POST '/':
//       - Recibe datos para crear una nueva palabra.
//       - Verifica que el usuario sea administrador y que el campo 'palabra' no esté vacío.
//       - Llama a 'crearPalabra'.
//
//    b) PUT '/:id':
//       - Actualiza la palabra identificada por 'id'.
//       - Restringido a administradores y verifica que 'palabra' no sea vacío.
//       - Llama a 'editarPalabra'.
//
//    c) DELETE '/:id':
//       - Elimina la palabra con el 'id' especificado.
//       - Restringido a administradores.
//       - Llama a 'borrarPalabra'.
//
//    d) PATCH '/:id/categoria':
//       - Asocia una categoría a la palabra con el 'id' dado.
//       - Verifica que el usuario sea administrador.
//       - Llama a 'asociarCategoria'.
//
// 5. Cada ruta utiliza "validarCampos" para verificar si hay errores de validación y responder con un error si los hay.
//
// 6. El router se exporta para ser utilizado en la configuración principal de la aplicación.
