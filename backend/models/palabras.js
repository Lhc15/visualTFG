// Este archivo define el modelo "Palabra" usando Mongoose.
// 1. La propiedad 'palabra' es de tipo String y obligatoria.
// 2. La propiedad 'explicacion' es opcional y de tipo String.
// 3. La propiedad 'categoria' es un ObjectId que hace referencia al modelo 'Categoria'; no es obligatoria.
// 4. La propiedad 'animaciones' es un array de ObjectIds que referencian al modelo 'gltfFiles.files'.
// 5. El campo 'nivel' es de tipo Number con valor predeterminado 1 y es requerido.
// 6. El campo 'orden' es de tipo Number con valor predeterminado 0 y también es requerido.
// 7. Se exporta el modelo 'Palabra' basado en este esquema.

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
    gltf:      String,   // "avatar_signos.glb"
    clipName:  String,   // "Saludar"
    nivel: {
        type: Number,
        default: 1,
        required: true
    },
    orden: {
        type: Number,
        default: 0,
        required: true
      }      
});

module.exports = model('Palabra', PalabraSchema);
