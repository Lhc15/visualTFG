const { Schema, model } = require('mongoose');

// Registra una sesion completa de practica.
// Una sesion agrupa todos los intentos (PracticaEntry) de una ronda.
const PracticaSessionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    // Tipo de practica realizada en esta sesion
    tipo: {
        type: String,
        enum: ['abecedario', 'vocabulario', 'gramatica'],
        required: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    finishedAt: {
        type: Date
    },
    total: {
        type: Number,
        default: 0
    },
    correctas: {
        type: Number,
        default: 0
    },
    incorrectas: {
        type: Number,
        default: 0
    }
});

module.exports = model('PracticaSession', PracticaSessionSchema);