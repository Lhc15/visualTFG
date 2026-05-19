const { Router } = require('express');
const { subirArchivosGltf, descargarArchivoGltf,listAllGltfFiles } = require('../controllers/gltf');
const multer = require('multer');
const mongoose = require('mongoose');

const upload = multer({ dest: 'uploads/' }); // Carpeta temporal para almacenar archivos
const router = Router();

// Subir un archivo GLTF
router.post('/upload', upload.array('files', 10), subirArchivosGltf); // Máximo 10 archivos
// Descargar un archivo GLTF (usando un nombre específico)
router.get('/download/:name', descargarArchivoGltf);
// Esto haría que GET /api/gltf/ devuelva la lista con todos los archivos
router.get('/all', listAllGltfFiles); 


// Ruta para obtener un archivo GLTF por filename desde GridFS
router.get('/animaciones/:filename', async (req, res) => {
    const { filename } = req.params;
    try {
        const db = mongoose.connection.db; // Conexión a la base de datos
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'gltfFiles' });

        // Verificar si el archivo existe
        const files = await bucket.find({ filename: filename }).toArray();
        if (!files || files.length === 0) {
            console.error('Archivo no encontrado:', filename);
            return res.status(404).json({ msg: 'Archivo no encontrado' });
        }

        // Configurar los headers apropiados según la extensión
        const contentType = filename.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json';
        res.set('Content-Type', contentType);
        // No establecer Access-Control-Allow-Origin aquí, dejarlo para el middleware CORS
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año

        // Crear y enviar el stream
        const downloadStream = bucket.openDownloadStreamByName(filename);
        
        downloadStream.on('error', (error) => {
            console.error('Error en el stream:', error);
            res.status(500).json({ msg: 'Error al leer el archivo' });
        });

        downloadStream.pipe(res);
    } catch (error) {
        console.error('Error al servir el archivo GLTF:', error);
        res.status(500).json({ msg: 'Error al servir el archivo GLTF' });
    }
});

module.exports = router;


// Este archivo define las rutas relacionadas con la carga y descarga de archivos GLTF usando Multer y GridFS.
//
// 1. Se importa 'multer' para manejar la subida de archivos y se configura un destino temporal ('uploads/').
// 2. Se definen tres rutas principales:
//
//    a) POST '/upload':
//       - Usa Multer para recibir hasta 10 archivos simultáneamente bajo el campo 'files'.
//       - Llama al controlador 'subirArchivosGltf' para guardar dichos archivos en GridFS.
//
//    b) GET '/download/:name':
//       - Permite descargar un archivo GLTF específico, identificándolo por 'name'.
//       - Se delega la lógica de descarga a 'descargarArchivoGltf'.
//
//    c) GET '/all':
//       - Retorna un listado de todos los archivos GLTF almacenados en la colección 'gltfFiles' de GridFS,
//         a través del controlador 'listAllGltfFiles'.
//
// 3. Ruta GET '/animaciones/:filename':
//    - Busca un archivo en GridFS por su nombre (filename) usando el bucket 'gltfFiles'.
//    - Verifica si existe el archivo. Si no existe, responde con un error 404.
//    - Establece headers apropiados para la respuesta (tipo de contenido, política de recursos, caché).
//    - Crea un flujo de descarga que lee el archivo desde GridFS y lo envía al cliente.
//    - Maneja errores tanto en la búsqueda como en el flujo de descarga.
//
// 4. Finalmente, se exporta el 'router' para poder usar estas rutas en la configuración principal de la aplicación.