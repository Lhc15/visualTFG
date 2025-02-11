const Usuario = require('../models/usuarios');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { response } = require('express');
const validator = require('validator');
const { generarJWT } = require('../helpers/jwt');

const obtenerUsuarios = async(req, res) => {

    // Recibimos el desde
    const desde = Number(req.query.desde) || 0;
    const registropp = Number(process.env.DOCSPERPAGE);

    // Obtenemos el ID de usuario por si quiere buscar solo un usuario
    const id = req.query.id;

    /* const usuarios = await Usuario.find({}, 'nombre apellidos email rol').skip(desde).limit(registropp);
    const total = await Usuario.countDocuments(); */
    try {

        let usuarios, total;
        if (id) {
            if (!validator.isMongoId(id)) {
                return res.json({
                    ok: false,
                    msg: 'El id de usuario debe ser válido'
                });
            }

            [usuarios, total] = await Promise.all([
                Usuario.findById(id),
                Usuario.countDocuments()
            ]);

        } else {
            [usuarios, total] = await Promise.all([
                Usuario.find({}).skip(desde).limit(registropp),
                Usuario.countDocuments()
            ]);
        }

        res.json({
            ok: true,
            msg: 'getUsuarios',
            usuarios,
            page: {
                desde,
                registropp,
                total
            }
        });

    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            msg: 'Error obteniedo usuarios'
        });
    }

}

const crearUsuario = async (req, res = response) => {
    console.log(req.body); // Log para verificar los datos recibidos
    const { email, password, rol } = req.body;

    try {
        // Verifica si el email ya está registrado
        const existeEmail = await Usuario.findOne({ email });
        if (existeEmail) {
            return res.status(400).json({
                ok: false,
                msg: 'El correo ya está registrado',
            });
        }

        // Validar si el rol es ADMIN y si el usuario autenticado tiene permisos
        if (rol === 'ROL_ADMIN' && req.rol !== 'ROL_ADMIN') {
            return res.status(403).json({
                ok: false,
                msg: 'No tiene permisos para asignar el rol de administrador',
            });
        }

        // Cifrar la contraseña
        const salt = bcrypt.genSaltSync();
        const usuario = new Usuario({
            ...req.body,
            password: bcrypt.hashSync(password, salt),
        });

        // Guardar el usuario en la base de datos
        await usuario.save();

        // Generar el JWT
        const token = await generarJWT(usuario._id, 'ROL_USUARIO');

        // Guardar el token en una cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: false, // Cambiar a true en producción con HTTPS
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
        });

        res.status(201).json({
            ok: true,
            msg: 'Usuario registrado correctamente',
            usuario: {
                uid: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: 'ROL_USUARIO',
            },
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al crear el usuario',
        });
    }
};

const actualizarUsuario = async(req, res = response) => {
    
    const { password, email, ...object } = req.body;
    const uid = req.params.id;

    try{
        console.log('Datos recibidos para actualizar:', req.body); // LOG para depuración

        const existeEmail = await Usuario.findOne({ email: email });

        if(existeEmail){
            
            if(existeEmail._id != uid){
                const valor = existeEmail._id;

                return res.status(400).json({
                    ok: false,
                    msg: 'Email ya existe'
                });
            }
        }

        object.email = email;
        const usuario = await Usuario.findByIdAndUpdate(uid, object, { new: true });
        
        console.log('Usuario actualizado:', usuario); // LOG para depuración

        res.json({
            ok: true,
            msg: 'Usuario actualizado',
            usuario: usuario

        });

    } catch (error){
        console.log(error);
        return res.status(400).json({
            ok: false,
            msg: 'Error actualizando usuario'
        });
    }
    
    
    
}

const borrarUsuario = async(req, res = response) => {
    
    const uid = req.params.id;

    try{

        const existeUsuario = await Usuario.findById(uid);
        if(!existeUsuario){
            return res.status(400).json({
                ok:true,
                msg: 'El usuario no existe'
            });
        }

        const resultado = await Usuario.findByIdAndDelete(uid);

        res.json({
            ok: true,
            msg: 'Usuario eliminado',
            resultado: resultado
        });

    } catch (error){
        console.log(error);
        return res.status(400).json({
            ok: true,
            msg: 'Error borrando usuario'
        });
    }
}

module.exports = {
    obtenerUsuarios,
    crearUsuario,
    actualizarUsuario, 
    borrarUsuario,
};
