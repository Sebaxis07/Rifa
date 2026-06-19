const mongoose = require('mongoose');

const rifaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fechaInicio: { type: Date, required: true },
  fechaSorteo: { type: Date, required: true },
  precioPorNumero: { type: Number, required: true },
  nombrePremio: { type: String, required: true },
  imagenPremio: { type: String, default: '' },
  totalNumeros: { type: Number, default: 41 },
  estado: { type: String, enum: ['activa', 'cerrada', 'sorteada'], default: 'activa' }
}, { timestamps: true });

module.exports = mongoose.model('Rifa', rifaSchema);
