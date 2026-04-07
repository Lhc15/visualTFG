const { Schema, model } = require('mongoose');

// Registra qué bloques de comunicación ha completado cada usuario.
// Un documento por bloque completado — si existe, está completado.
const ProgresoComunSchema = Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  bloqueId: {
    type: String,
    required: true
  },
  fechaCompletado: {
    type: Date,
    default: Date.now
  }
}, { collection: 'progreso_comunicacion' });

// Índice único: un usuario no puede completar el mismo bloque dos veces
ProgresoComunSchema.index({ userId: 1, bloqueId: 1 }, { unique: true });

ProgresoComunSchema.method('toJSON', function() {
  const { __v, _id, ...object } = this.toObject();
  object.id = _id;
  return object;
});

module.exports = model('ProgresoComun', ProgresoComunSchema);