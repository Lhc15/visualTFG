// Importación de módulos
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const { dbConnection } = require('./database/configdb');
const usuariosRoute = require('./routes/usuarios');
const loginRoute = require('./routes/auth');
const palabrasRoutes = require('./routes/palabras');
const categoriasRoutes = require('./routes/categorias');
const gltfRoutes = require('./routes/gltf');

// Crear una aplicación de express
const app = express();

// Conexión a la base de datos
dbConnection();

app.use(cookieParser());

// Configurar CORS
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://visualvoices.ovh']
  : ['http://localhost:4200'];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origen (como las herramientas de desarrollo)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Configurar el uso de JSON
app.use(express.json());

// Middleware para manejar preflight requests manualmente (si es necesario)
app.options('*', cors());

// Definir rutas de la API
app.get('/api', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
});

app.use('/api/usuarios', usuariosRoute);
app.use('/api/login', loginRoute);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/palabras', palabrasRoutes);
app.use('/api/gltf', gltfRoutes);

// Abrir la aplicacíon en el puerto 3000
app.listen(process.env.PORT, () => {
    console.log('Servidor corriendo en el puerto ', process.env.PORT);
});
