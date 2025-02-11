const { Schema, model } = require('mongoose');

const PalabraSchema = Schema({
    palabra: {
        type: String,
        required: true,
    },
    explicacion: {
        type: String,
        required: false,
    },
    categoria: {
        type: Schema.Types.ObjectId,
        ref: 'Categoria', // Referencia al modelo Categoría
        required: false,
    },
    animaciones: [{ 
        type: Schema.Types.ObjectId, // Referencia a los archivos GLTF
        ref: 'gltfFiles.files' 
    }]
});

module.exports = model('Palabra', PalabraSchema);
