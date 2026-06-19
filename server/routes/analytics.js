const express = require('express');
const router  = express.Router();
const Compra  = require('../models/Compra');
const Rifa    = require('../models/Rifa');

const { optionalAuthMiddleware } = require('../middleware/auth');

// GET /api/analytics/:rifaId — público (vista supervisor + admin con token)
router.get('/:rifaId', optionalAuthMiddleware, async (req, res) => {
  try {
    const rifa = await Rifa.findById(req.params.rifaId);
    if (!rifa) return res.status(404).json({ message: 'Rifa no encontrada' });

    const compras = await Compra.find({ rifaId: req.params.rifaId });

    const numerosVendidos = compras.flatMap(c => c.numeros);
    const totalVendidos   = numerosVendidos.length;
    const totalNumeros    = rifa.totalNumeros;
    const porcentaje      = ((totalVendidos / totalNumeros) * 100).toFixed(1);
    const dineroRecaudado = compras.reduce((acc, c) => acc + c.montoTotal, 0);
    const dineroFaltante  = (totalNumeros - totalVendidos) * rifa.precioPorNumero;
    const meta            = totalNumeros * rifa.precioPorNumero;

    // Mapa número -> comprador
    const numeroMap = {};
    compras.forEach(c => {
      c.numeros.forEach(n => { numeroMap[n] = c.comprador; });
    });

    // Top compradores
    const compradorMap = {};
    compras.forEach(c => {
      if (!compradorMap[c.comprador]) compradorMap[c.comprador] = { nombre: c.comprador, numeros: [], monto: 0 };
      compradorMap[c.comprador].numeros.push(...c.numeros);
      compradorMap[c.comprador].monto += c.montoTotal;
    });
    const topCompradores = Object.values(compradorMap)
      .sort((a, b) => b.numeros.length - a.numeros.length)
      .slice(0, 10);

    // Ventas por día (formato corto)
    const ventasPorDia = {};
    compras.forEach(c => {
      const dia = new Date(c.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
      ventasPorDia[dia] = (ventasPorDia[dia] || 0) + c.numeros.length;
    });

    // Velocidad de venta (números/día)
    let velocidadDiaria = 0;
    let diasHastaCompletar = null;
    if (compras.length > 0) {
      const fechas = compras.map(c => new Date(c.createdAt).getTime());
      const primera = Math.min(...fechas);
      const diasTranscurridos = Math.max(1, (Date.now() - primera) / (1000 * 60 * 60 * 24));
      velocidadDiaria = parseFloat((totalVendidos / diasTranscurridos).toFixed(1));
      if (velocidadDiaria > 0 && totalVendidos < totalNumeros) {
        diasHastaCompletar = Math.ceil((totalNumeros - totalVendidos) / velocidadDiaria);
      }
    }

    // Días hasta sorteo
    const diasHastaSorteo = Math.max(0, Math.ceil((new Date(rifa.fechaSorteo) - Date.now()) / (1000 * 60 * 60 * 24)));

    // Ticket promedio por comprador único
    const nCompradores = Object.keys(compradorMap).length;
    const ticketPromedio = nCompradores > 0 ? Math.round(dineroRecaudado / nCompradores) : 0;

    // Compra más reciente
    const sorted = compras.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const ultimaCompra = sorted[0] || null;

    res.json({
      totalNumeros, totalVendidos,
      totalLibres: totalNumeros - totalVendidos,
      porcentaje: parseFloat(porcentaje),
      dineroRecaudado, dineroFaltante, meta,
      totalCompras: compras.length,
      topCompradores, ventasPorDia, numeroMap,
      velocidadDiaria, diasHastaCompletar, diasHastaSorteo,
      ticketPromedio, ultimaCompra,
      compras: sorted
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
