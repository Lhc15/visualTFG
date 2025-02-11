const { Schema, model } = require('mongoose');

// Esquema vacío para la colección gltfFiles.files
const GltfFileSchema = new Schema({}, { strict: false, collection: 'gltfFiles.files' });

module.exports = model('gltfFiles.files', GltfFileSchema); // Nombre del modelo exacto
