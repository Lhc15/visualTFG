const { Schema, model } = require('mongoose');

// Registra el historial de ejercicios por palabra y usuario.
// Un documento por par (usuario, palabra) — se actualiza en cada sesión.
const ProgresoEjercicioSchema = new Schema({
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
  categoriaId: {
    type: Schema.Types.ObjectId,
    ref: 'Categoria',
    required: true
  },
  vecesAcertada: { type: Number, default: 0 },
  vecesFallada:  { type: Number, default: 0 },
  fechaUltimo:   { type: Date, default: Date.now }
}, { collection: 'progreso_ejercicio' });

// Índice único: un documento por (usuario, palabra)
ProgresoEjercicioSchema.index({ userId: 1, palabraId: 1 }, { unique: true });
// Índice para consultas por categoría
ProgresoEjercicioSchema.index({ userId: 1, categoriaId: 1 });

module.exports = model('ProgresoEjercicio', ProgresoEjercicioSchema);