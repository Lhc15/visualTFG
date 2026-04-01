// Este archivo define el modelo de "Categoria" usando Mongoose.
// 1. Importamos el objeto 'Schema' y la función 'model' desde la librería 'mongoose'.
// 2. Creamos un 'CategoriaSchema' que describe la estructura de la colección 'categorias' en la base de datos.
//    - El campo 'nombre' es de tipo String y es obligatorio (required: true).
// 3. Exportamos el modelo, asignándole el nombre 'Categoria' y utilizando el 'CategoriaSchema' definido.

const { Schema, model } = require('mongoose');

const CategoriaSchema = Schema({
    nombre: {
        type: String,
        required: true,
    },
    // Indica a qué sección de la app pertenece esta categoría.
    // Permite separar qué categorías van a Aprende/vocabulario,
    // Aprende/gramatica o Abecedario.
    modulo: {
        type: String,
        enum: ['abecedario', 'vocabulario', 'gramatica'],
        required: false
    }
});

module.exports = model('Categoria', CategoriaSchema);