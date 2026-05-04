const { Schema, model } = require('mongoose');

/**
 * Cada documento representa una combinación de frase generada por el motor
 * procedimental a partir del corpus de signos.
 *
 * Plantillas:
 *   'afirmativa'   → S + O + V
 *   'pregunta-sn'  → S + V  (pregunta sí/no, ENM cejas altas)
 *   'pregunta-wh'  → S + V + INT (pregunta con partícula, ENM cejas fruncidas)
 */
const CombinacionMotorSchema = new Schema({
  sujetoId: {
    type: Schema.Types.ObjectId,
    ref: 'Palabra',
    required: true
  },
  verboId: {
    type: Schema.Types.ObjectId,
    ref: 'Palabra',
    required: true
  },
  // Opcional: solo en plantilla 'afirmativa'
  objetoId: {
    type: Schema.Types.ObjectId,
    ref: 'Palabra',
    default: null
  },
  // Opcional: solo en plantilla 'pregunta-wh'
  interrId: {
    type: Schema.Types.ObjectId,
    ref: 'Palabra',
    default: null
  },
  plantilla: {
    type: String,
    enum: ['afirmativa', 'pregunta-sn', 'pregunta-wh'],
    required: true
  },
  // ENM que debe acompañar a esta frase
  enm: {
    type: String,
    enum: ['pregunta-sin-particula', 'pregunta-con-particula', null],
    default: null
  },
  // null = sin revisar, true = válida, false = inválida
  valida: {
    type: Boolean,
    default: null
  },
  revisada: {
    type: Boolean,
    default: false
  },
  notas: {
    type: String,
    default: ''
  }
}, {
  collection: 'combinaciones_motor',
  timestamps: true
});

// Índice único: no puede haber dos combinaciones idénticas
CombinacionMotorSchema.index(
  { sujetoId: 1, verboId: 1, objetoId: 1, interrId: 1, plantilla: 1 },
  { unique: true }
);

CombinacionMotorSchema.method('toJSON', function () {
  const { __v, ...object } = this.toObject();
  return object;
});

module.exports = model('CombinacionMotor', CombinacionMotorSchema);