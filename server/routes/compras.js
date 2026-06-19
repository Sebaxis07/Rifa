const express = require('express');
const router = express.Router();
const Compra = require('../models/Compra');
const Rifa = require('../models/Rifa');
const { authMiddleware, adminMiddleware, permissionMiddleware } = require('../middleware/auth');

// GET /api/compras/:rifaId — público
router.get('/:rifaId', async (req, res) => {
  try {
    const compras = await Compra.find({ rifaId: req.params.rifaId }).sort({ createdAt: -1 });
    res.json(compras);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/compras — solo admin
router.post('/', authMiddleware, permissionMiddleware('registrar_compra'), async (req, res) => {
  try {
    const { rifaId, comprador, numeros, nota, transferido } = req.body;

    if (!numeros || numeros.length === 0)
      return res.status(400).json({ message: 'Debes seleccionar al menos un número' });

    // Verificar que los números no estén ocupados
    const existentes = await Compra.find({ rifaId });
    const numerosOcupados = existentes.flatMap(c => c.numeros);
    const conflicto = numeros.filter(n => numerosOcupados.includes(n));
    if (conflicto.length > 0)
      return res.status(400).json({ message: `Los números ${conflicto.join(', ')} ya están vendidos` });

    const rifa = await Rifa.findById(rifaId);
    if (!rifa) return res.status(404).json({ message: 'Rifa no encontrada' });

    const montoTotal = numeros.length * rifa.precioPorNumero;
    const compra = new Compra({ rifaId, comprador, numeros, montoTotal, nota, transferido: !!transferido });
    const saved = await compra.save();

    // Emitir evento socket (el objeto io viene del req.app)
    const io = req.app.get('io');
    if (io) io.to(rifaId.toString()).emit('compra_nueva', saved);

    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/compras/:id — solo admin (editar números, nota, transferido)
router.put('/:id', authMiddleware, permissionMiddleware('editar_compra'), async (req, res) => {
  try {
    const { comprador, numeros, nota, transferido } = req.body;

    const compra = await Compra.findById(req.params.id);
    if (!compra) return res.status(404).json({ message: 'Compra no encontrada' });

    const finalNumeros = numeros !== undefined ? numeros : compra.numeros;
    if (!finalNumeros || finalNumeros.length === 0)
      return res.status(400).json({ message: 'Debe quedar al menos un número' });

    // Verificar que los nuevos números no estén tomados por OTRAS compras (solo si se enviaron números)
    if (numeros !== undefined) {
      const otras = await Compra.find({ rifaId: compra.rifaId, _id: { $ne: req.params.id } });
      const ocupados = otras.flatMap(c => c.numeros);
      const conflicto = finalNumeros.filter(n => ocupados.includes(n));
      if (conflicto.length > 0)
        return res.status(400).json({ message: `Los números ${conflicto.join(', ')} ya pertenecen a otro comprador` });
    }

    const rifa = await Rifa.findById(compra.rifaId);
    if (!rifa) return res.status(404).json({ message: 'Rifa no encontrada' });
    const montoTotal = finalNumeros.length * rifa.precioPorNumero;

    const updated = await Compra.findByIdAndUpdate(
      req.params.id,
      {
        comprador: comprador !== undefined ? comprador.trim() : compra.comprador,
        numeros: finalNumeros,
        montoTotal,
        nota: nota !== undefined ? nota : compra.nota,
        transferido: transferido !== undefined ? transferido : compra.transferido
      },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) io.to(compra.rifaId.toString()).emit('compra_actualizada', updated);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/compras/:id — solo admin
router.delete('/:id', authMiddleware, permissionMiddleware('eliminar_compra'), async (req, res) => {
  try {
    const compra = await Compra.findByIdAndDelete(req.params.id);
    if (!compra) return res.status(404).json({ message: 'Compra no encontrada' });

    const io = req.app.get('io');
    if (io) io.to(compra.rifaId.toString()).emit('compra_eliminada', { id: req.params.id, numeros: compra.numeros });

    res.json({ message: 'Compra eliminada' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
