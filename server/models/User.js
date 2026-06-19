const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nombre: { type: String, default: 'Usuario' },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['admin', 'supervisor'], default: 'supervisor' },
  permisos: { type: [String], default: [] },
  ultimaConexion: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
