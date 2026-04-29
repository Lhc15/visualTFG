const { Schema, model } = require('mongoose');

// Registra qué palabras del módulo vocabulario/abecedario ha reproducido cada usuario.
// Un documento por palabra — si existe, la palabra fue reproducida al menos una vez.
const ProgresoVocabularioSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  palabraId: {
    type: Schema.Types.ObjectId,
    ref: 'Palabra',
    required: true
  },
  // 'vocabulario' | 'abecedario'
  modulo: {
    type: String,
    enum: ['vocabulario', 'abecedario'],
    required: true
  },
  fechaVista: {
    type: Date,
    default: Date.now
  }
}, { collection: 'progreso_vocabulario' });

// Un usuario no puede registrar la misma palabra dos veces
ProgresoVocabularioSchema.index({ userId: 1, palabraId: 1 }, { unique: true });

module.exports = model('ProgresoVocabulario', ProgresoVocabularioSchema);