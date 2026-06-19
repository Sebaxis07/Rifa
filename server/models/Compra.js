const mongoose = require('mongoose');

const compraSchema = new mongoose.Schema({
  rifaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rifa', required: true },
  comprador: { type: String, required: true },
  numeros: [{ type: Number }],
  montoTotal: { type: Number, required: true },
  nota: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Compra', compraSchema);
