const { Schema, model } = require('mongoose');

// Registra un intento individual dentro de una sesion de practica.
// Cada pregunta respondida genera un PracticaEntry.
const PracticaEntrySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'PracticaSession',
        required: true
    },
    tipo: {
        type: String,
        enum: ['abecedario', 'vocabulario', 'gramatica'],
        required: true
    },
    // Referencia a la palabra mostrada. Null si el ejercicio es gramatica
    // (porque en ese caso se genera una frase, no se muestra una palabra suelta)
    palabraId: {
        type: Schema.Types.ObjectId,
        ref: 'Palabra',
        default: null
    },
    acierto: {
        type: Boolean,
        required: true
    },
    // Tiempo que tardo el usuario en responder esta pregunta
    tiempoMs: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // Solo se rellena en ejercicios de gramatica:
    // la frase generada por el motor S-O-V
    fraseGenerada: {
        type: [String],
        default: []
    },
    // Estructura usada por el motor: "SOV" | "SOV-INT" | "SV-ENM"
    estructuraUsada: {
        type: String,
        default: null
    }
});

module.exports = model('PracticaEntry', PracticaEntrySchema);