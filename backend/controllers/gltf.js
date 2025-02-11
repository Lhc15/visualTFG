const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

            // Verificar si el archivo ya existe
            const existingFiles = await bucket.find({ filename: file.originalname }).toArray();
            if (existingFiles.length > 0) {
                for (const existingFile of existingFiles) {
                    await bucket.delete(existingFile._id);
                }
            }

            const uploadStream = bucket.openUploadStream(file.originalname, {
                contentType: 'model/gltf+json',
            });

            fileStream.pipe(uploadStream);

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

            fs.unlinkSync(file.path);
        }

        res.status(200).json({ msg: 'Archivos subidos correctamente', resultados });
    } catch (error) {
        console.error('Error en subirArchivosGltf:', error);
        res.status(500).json({ msg: 'Error al procesar los archivos', error: error.message });
    }
};


const descargarArchivoGltf = async (req, res) => {
    try {
        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'gltfFiles' });
        
        const file = await bucket.find({ filename: req.params.name }).toArray();
        if (!file || file.length === 0) {
            return res.status(404).json({ msg: 'Archivo no encontrado' });
        }

        res.set('Content-Type', 'model/gltf+json');
        res.set('Cache-Control', 'public, max-age=31536000');

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

// controllers/gltf.js
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
