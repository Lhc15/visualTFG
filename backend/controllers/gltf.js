const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// La función 'subirArchivosGltf' recibe archivos GLTF mediante req.files, 
// para posteriormente subirlos a MongoDB usando GridFS.
// 1. Verifica si hay archivos en la petición (req.files).
// 2. Crea un GridFSBucket para manejar la colección 'gltfFiles'.
// 3. Recorre cada archivo recibido y hace lo siguiente:
//    a) Abre un fileStream para leer el archivo desde el sistema de archivos local.
//    b) Verifica si ya existe un archivo con el mismo nombre en la base de datos. Si existe, lo elimina para reemplazarlo.
//    c) Crea un uploadStream a GridFS usando el nombre del archivo original y lo define como 'model/gltf+json'.
//    d) Conecta el fileStream al uploadStream para transferir el contenido a la base de datos.
//    e) Espera el evento 'finish' indicando que la subida ha concluido correctamente. Si hay error, lo maneja.
//    f) Borra el archivo local una vez finalizada la subida.
// 4. Envía una respuesta al cliente confirmando el éxito de la operación.
const subirArchivosGltf = async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ msg: 'No se ha proporcionado ningún archivo' });
    }

    try {
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'gltfFiles' });

        const resultados = [];

        for (const file of req.files) {
            const fileStream = fs.createReadStream(file.path);

            // Verificar si el archivo ya existe en la base de datos
            const existingFiles = await bucket.find({ filename: file.originalname }).toArray();
            if (existingFiles.length > 0) {
                for (const existingFile of existingFiles) {
                    await bucket.delete(existingFile._id);
                }
            }

            // Crear un flujo de subida a GridFS con el nombre original del archivo
            const uploadStream = bucket.openUploadStream(file.originalname, {
                contentType: 'model/gltf-binary',
            });

            // Conectar el archivo del sistema al uploadStream de GridFS
            fileStream.pipe(uploadStream);

            // Esperar a que termine el proceso de subida
            await new Promise((resolve, reject) => {
                uploadStream.on('error', (error) => {
                    console.error(`Error al subir ${file.originalname}:`, error);
                    reject(error);
                });

                uploadStream.on('finish', () => {
                    console.log(`Archivo ${file.originalname} subido correctamente`);
                    resultados.push({ filename: file.originalname, status: 'success' });
                    resolve();
                });
            });

            // Eliminar el archivo del servidor local para liberar espacio
            fs.unlinkSync(file.path);
        }

        // Responder con un mensaje y el listado de archivos subidos
        res.status(200).json({ msg: 'Archivos subidos correctamente', resultados });
    } catch (error) {
        console.error('Error en subirArchivosGltf:', error);
        res.status(500).json({ msg: 'Error al procesar los archivos', error: error.message });
    }
};

// La función 'descargarArchivoGltf' permite descargar un archivo GLTF desde la base de datos.
// 1. Crea un GridFSBucket para la colección 'gltfFiles'.
// 2. Busca si existe un archivo cuyo nombre coincida con req.params.name.
// 3. Define el tipo de contenido como 'model/gltf+json' y un cacheo a largo plazo ('public, max-age=31536000').
// 4. Abre un flujo de descarga con 'openDownloadStreamByName' y envía el contenido al cliente.
// 5. Maneja los posibles errores durante la descarga.
const descargarArchivoGltf = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'gltfFiles' });
        
        const file = await bucket.find({ filename: req.params.name }).toArray();
        if (!file || file.length === 0) {
            return res.status(404).json({ msg: 'Archivo no encontrado' });
        }

        // Configurar encabezados de respuesta para indicar que se trata de un GLTF
        //res.set('Content-Type', 'model/gltf+json');
        res.set('Content-Type', 'model/gltf-binary');

        res.set('Cache-Control', 'public, max-age=31536000');

        // Iniciar la descarga
        const downloadStream = bucket.openDownloadStreamByName(req.params.name);
        downloadStream.pipe(res);

        downloadStream.on('error', (error) => {
            console.error('Error al descargar el archivo:', error);
            res.status(500).json({ msg: 'Error al descargar el archivo' });
        });
    } catch (error) {
        console.error('Error en descargarArchivoGltf:', error);
        res.status(500).json({ msg: 'Error al procesar la descarga', error: error.message });
    }
};

// La función 'listAllGltfFiles' devuelve la lista de todos los archivos GLTF almacenados.
// 1. Crea un GridFSBucket para acceder a 'gltfFiles'.
// 2. Consulta todos los documentos de 'gltfFiles.files'.
// 3. Retorna el resultado en formato JSON.
const listAllGltfFiles = async (req, res) => {
    try {
      const db = mongoose.connection.db;
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'gltfFiles' });
  
      // Traer todos los documentos de la colección gltfFiles.files
      const files = await bucket.find().toArray();
  
      return res.json(files);
    } catch (error) {
      console.error('Error listing GLTF files:', error);
      return res.status(500).json({
        msg: 'Error al listar los archivos GLTF',
      });
    }
};

module.exports = {
    subirArchivosGltf,
    descargarArchivoGltf,
    listAllGltfFiles
};

