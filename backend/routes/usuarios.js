/*
Ruta base: /api/usuarios
*/

const { Router } = require('express');
const { obtenerUsuarios, crearUsuario, actualizarUsuario, borrarUsuario } = require('../controllers/usuarios');
const { check } = require('express-validator');
const {validarCampos} = require('../middleware/validar-campos');
const {validarJWT} = require('../middleware/validar-jwt');
const { tieneRol } = require('../middleware/validar-rol');

const router = Router();

router.get('/', obtenerUsuarios);

router.post('/', [
    check('nombre', 'El argumento nombre es obligatorio').not().isEmpty(),
    check('apellidos', 'El argumento apellidos es obligatorio').not().isEmpty(),
    check('email', 'El argumento email es obligatorio').not().isEmpty(),
    check('password', 'El argumento password es obligatorio').not().isEmpty(),
    validarCampos,
], crearUsuario);

router.put('/:id', [
    validarJWT,
    check('nombre', 'El argumento nombre es obligatorio').not().isEmpty(),
    check('apellidos', 'El argumento apellidos es obligatorio').not().isEmpty(),
    check('email', 'El argumento email es obligatorio').not().isEmpty(),
    check('id', 'El identificador no es válido').isMongoId(),
    validarCampos,
    tieneRol('ROL_ADMIN'),
], actualizarUsuario);

router.delete('/:id', [
    validarJWT,
    tieneRol('ROL_ADMIN'),
    check('id', 'El identificador no es válido').isMongoId(),
    validarCampos
], borrarUsuario);

module.exports = router;