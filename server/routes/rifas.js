const express = require('express');
const router = express.Router();
const multer = require('multer');
const Rifa = require('../models/Rifa');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');

// Usar memoria en vez de disco → compatible con Vercel
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Convierte el buffer a Base64 data URI
function toBase64(file) {
  if (!file) return '';
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

// GET /api/rifas — público
router.get('/', async (req, res) => {
  try {
    const rifas = await Rifa.find().sort({ createdAt: -1 });
    res.json(rifas);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/rifas/:id — público
router.get('/:id', async (req, res) => {
  try {
    const rifa = await Rifa.findById(req.params.id);
    if (!rifa) return res.status(404).json({ message: 'Rifa no encontrada' });
    res.json(rifa);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/rifas — solo admin
router.post('/', authMiddleware, permissionMiddleware('crear_rifa'), upload.single('imagenPremio'), async (req, res) => {
  try {
    const { nombre, fechaInicio, fechaSorteo, precioPorNumero, nombrePremio } = req.body;
    const imagenPremio = toBase64(req.file);
    const rifa = new Rifa({ nombre, fechaInicio, fechaSorteo, precioPorNumero, nombrePremio, imagenPremio });
    const saved = await rifa.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/rifas/:id — solo admin
router.put('/:id', authMiddleware, permissionMiddleware('editar_rifa'), upload.single('imagenPremio'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.imagenPremio = toBase64(req.file);
    const rifa = await Rifa.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(rifa);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/rifas/:id — solo admin
router.delete('/:id', authMiddleware, permissionMiddleware('eliminar_rifa'), async (req, res) => {
  try {
    await Rifa.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rifa eliminada' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
