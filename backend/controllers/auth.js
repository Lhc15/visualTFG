const { response } = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarios');
const { generarJWT } = require('../helpers/jwt');
// La función 'login' se encarga de autenticar al usuario.
// 1. Extrae del body los valores 'email', 'password' y 'rememberMe'.
// 2. Busca al usuario en la base de datos usando el email recibido.
// 3. Si el usuario no existe o la contraseña es incorrecta, devuelve un error 400.
// 4. Si las credenciales son correctas, genera un token JWT.
// 5. Determina el tiempo de expiración de la cookie según si se activó o no 'rememberMe'.
// 6. Envía la cookie al cliente, configurada para ser segura (httpOnly) y con la duración adecuada.
// 7. Devuelve la respuesta con el token (opcionalmente) en el body.

const login = async (req, res = response) => {
  const LoginLog = require('../models/loginLog');

  const { email, password, rememberMe } = req.body; 

  try {
    // Buscamos en la base de datos el usuario que coincida con el email
    // Solo obtenemos el campo 'password' y 'rol' por motivos de seguridad y eficiencia
    const usuarioBD = await Usuario.findOne({ email }, 'password rol isnewuser');


    // Verificamos si el usuario existe
    if (!usuarioBD) {
      return res.status(400).json({
        ok: false,
        msg: 'Usuario o contraseña incorrectos',
        token: ''
      });
    }

    // Comparamos el password recibido con el password hasheado en la base de datos
    const validPassword = bcrypt.compareSync(password, usuarioBD.password);
    
    if (!validPassword) {
      return res.status(400).json({
        ok: false,
        msg: 'Usuario o contraseña incorrectos',
        token: ''
      });
    }

    // Si el usuario es "nuevo", es decir, isnewuser es true,
    // actualizamos el campo a false para marcar que ha iniciado sesión nuevamente.
    if (usuarioBD.isnewuser) {
      // Actualizamos el campo isnewuser a false
      await Usuario.findByIdAndUpdate(usuarioBD._id, { isnewuser: false });
    }

    // Si las credenciales son válidas, generamos el token JWT
    const token = await generarJWT(usuarioBD._id, usuarioBD.rol);

    const hoy = new Date();
    const fechaSolo = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    await LoginLog.findOneAndUpdate(
      { user: usuarioBD._id, date: fechaSolo },
      { $setOnInsert: { user: usuarioBD._id, date: fechaSolo } },
      { upsert: true }
    );
    
    // Definimos el tiempo de expiración de la cookie
    // Si 'rememberMe' es true, se establece en 7 días; si no, en 24 horas
    const cookieExpiry = rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // Configuramos la cookie con el token
    // - httpOnly evita que el JS del cliente acceda a la cookie
    // - secure debe ponerse a true cuando tengamos HTTPS en producción
    // - sameSite: 'strict' bloquea el envío de la cookie en requests de terceros
    // - maxAge define cuánto tiempo será válida la cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: cookieExpiry,
    });

    // Se devuelve una respuesta exitosa junto con el token
    res.json({
      ok: true,
      msg: 'login',
      token
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      msg: 'Error en login',
    });
  }
};

// La función 'logout' cierra la sesión del usuario.
// 1. Usa 'res.clearCookie' para eliminar la cookie 'token'.
// 2. Confirma la acción mediante una respuesta JSON.
const logout = (req, res) => {
  console.log('[DEBUG] Cerrando sesión, eliminando cookie...');
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({
    ok: true,
    msg: 'Sesión cerrada correctamente',
  });
};

module.exports = { login, logout };
