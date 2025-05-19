const { response } = require("express");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/usuarios");
const { generarJWT } = require("../helpers/jwt");

const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
// const nodemailerSendgrid = require("nodemailer-sendgrid");

const sgTransport = require('nodemailer-sendgrid-transport');


// ⚠️ Usa tu clave secreta real aquí o desde .env
const JWT_SECRET = process.env.JWTSECRET;
// La función 'login' se encarga de autenticar al usuario.
// 1. Extrae del body los valores 'email', 'password' y 'rememberMe'.
// 2. Busca al usuario en la base de datos usando el email recibido.
// 3. Si el usuario no existe o la contraseña es incorrecta, devuelve un error 400.
// 4. Si las credenciales son correctas, genera un token JWT.
// 5. Determina el tiempo de expiración de la cookie según si se activó o no 'rememberMe'.
// 6. Envía la cookie al cliente, configurada para ser segura (httpOnly) y con la duración adecuada.
// 7. Devuelve la respuesta con el token (opcionalmente) en el body.
const login = async (req, res = response) => {
  const LoginLog = require("../models/loginLog");

  const { email, password, rememberMe } = req.body;

  try {
    // Buscamos en la base de datos el usuario que coincida con el email
    // Solo obtenemos el campo 'password' y 'rol' por motivos de seguridad y eficiencia
    const usuarioBD = await Usuario.findOne(
      { email },
      "password rol isnewuser"
    );

    // Verificamos si el usuario existe
    if (!usuarioBD) {
      return res.status(400).json({
        ok: false,
        msg: "Usuario o contraseña incorrectos",
        token: "",
      });
    }

    // Comparamos el password recibido con el password hasheado en la base de datos
    const validPassword = bcrypt.compareSync(password, usuarioBD.password);
    if (!validPassword) {
      return res.status(400).json({
        ok: false,
        msg: "Usuario o contraseña incorrectos",
        token: "",
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
    const fechaSolo = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate()
    );

    await LoginLog.findOneAndUpdate(
      { user: usuarioBD._id, date: fechaSolo },
      { $setOnInsert: { user: usuarioBD._id, date: fechaSolo } },
      { upsert: true }
    );

    // Definimos el tiempo de expiración de la cookie
    // Si 'rememberMe' es true, se establece en 7 días; si no, en 24 horas
    const cookieExpiry = rememberMe
      ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    // Configuramos la cookie con el token
    // - httpOnly evita que el JS del cliente acceda a la cookie
    // - secure debe ponerse a true cuando tengamos HTTPS en producción
    // - sameSite: 'strict' bloquea el envío de la cookie en requests de terceros
    // - maxAge define cuánto tiempo será válida la cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: cookieExpiry,
    });

    // Se devuelve una respuesta exitosa junto con el token
    res.json({
      ok: true,
      msg: "login",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      ok: false,
      msg: "Error en login",
    });
  }
};

// La función 'logout' cierra la sesión del usuario.
// 1. Usa 'res.clearCookie' para eliminar la cookie 'token'.
// 2. Confirma la acción mediante una respuesta JSON.
const logout = (req, res) => {
  console.log("[DEBUG] Cerrando sesión, eliminando cookie...");
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.json({
    ok: true,
    msg: "Sesión cerrada correctamente",
  });
};

const transporter = nodemailer.createTransport(sgTransport({
  auth: {
    api_key: process.env.SENDGRID_API_KEY,
  }
}));

transporter.verify((error, success) => {
  if (error) {
    console.error('[DEBUG] Error en transporter:', error);
  } else {
    console.log('[DEBUG] Transporter listo para enviar correos');
  }
});

const enviarResetEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res
        .status(404)
        .json({ ok: false, message: "Correo no registrado" });
    }

    const token = jwt.sign({ uid: usuario._id }, process.env.JWTSECRET, {
      expiresIn: "15m",
    });

    //Hola

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Recuperar contraseña",
      html: `<p>Haz clic aquí para recuperar tu contraseña:</p><a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({ ok: true, message: "Email enviado con instrucciones" });
  } catch (error) {
    console.error("Error al enviar email:", error);
    res
      .status(500)
      .json({ ok: false, message: "Error interno al enviar correo" });
  }
};

// Resetear contraseña con el token
const resetearPassword = async (req, res) => {
  const { token } = req.params;
  const { nuevaPassword } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findById(decoded.uid);

    if (!usuario) {
      return res
        .status(404)
        .json({ ok: false, message: "Usuario no encontrado" });
    }

    const salt = bcrypt.genSaltSync();
    usuario.password = bcrypt.hashSync(nuevaPassword, salt);
    await usuario.save();

    res.json({ ok: true, message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("Token inválido o expirado:", err);
    return res
      .status(400)
      .json({ ok: false, message: "Token inválido o expirado" });
  }
};

module.exports = { login, logout, enviarResetEmail, resetearPassword };
