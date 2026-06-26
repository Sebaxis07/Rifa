const express = require('express');
const router = express.Router();
const Rifa = require('../models/Rifa');
const Compra = require('../models/Compra');

// GET /api/dashboard/global — público (supervisor y admin pueden verlo)
router.get('/global', async (req, res) => {
  try {
    const [rifas, todasCompras] = await Promise.all([
      Rifa.find().sort({ createdAt: -1 }),
      Compra.find()
    ]);

    // ── Agrupar compras por rifa ──
    const comprasPorRifa = {};
    todasCompras.forEach(c => {
      const rid = c.rifaId.toString();
      if (!comprasPorRifa[rid]) comprasPorRifa[rid] = [];
      comprasPorRifa[rid].push(c);
    });

    // ── Estadísticas globales ──
    const totalRifas       = rifas.length;
    const rifasActivas     = rifas.filter(r => r.estado === 'activa').length;
    const rifasSorteadas   = rifas.filter(r => r.estado === 'sorteada').length;
    const totalCompras     = todasCompras.length;
    const totalRecaudado   = todasCompras.reduce((a, c) => a + c.montoTotal, 0);
    const totalVerificado  = todasCompras.filter(c => c.transferido).reduce((a, c) => a + c.montoTotal, 0);
    const totalPendiente   = totalRecaudado - totalVerificado;

    // ── Alertas: pagos vencidos (más de 3 días sin transferir) ──
    const ahora = Date.now();
    const alertasVencidas = todasCompras.filter(c => {
      if (c.transferido) return false;
      const limite = new Date(c.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000;
      return ahora > limite;
    });

    const alertasPorVencer = todasCompras.filter(c => {
      if (c.transferido) return false;
      const limite = new Date(c.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000;
      const restante = limite - ahora;
      return restante > 0 && restante <= 24 * 60 * 60 * 1000;
    });

    // ── Top compradores globales ──
    const compradorMap = {};
    todasCompras.forEach(c => {
      const key = c.comprador.trim().toLowerCase();
      if (!compradorMap[key]) {
        compradorMap[key] = { nombre: c.comprador, totalNumeros: 0, totalMonto: 0, compras: 0 };
      }
      compradorMap[key].totalNumeros += c.numeros.length;
      compradorMap[key].totalMonto   += c.montoTotal;
      compradorMap[key].compras      += 1;
    });
    const topCompradores = Object.values(compradorMap)
      .sort((a, b) => b.totalMonto - a.totalMonto)
      .slice(0, 10);

    // ── Resumen por rifa ──
    const resumenRifas = rifas.map(r => {
      const compras = comprasPorRifa[r._id.toString()] || [];
      const numerosVendidos = compras.flatMap(c => c.numeros).length;
      const recaudado       = compras.reduce((a, c) => a + c.montoTotal, 0);
      const verificado      = compras.filter(c => c.transferido).reduce((a, c) => a + c.montoTotal, 0);
      const pendientesVenc  = compras.filter(c => {
        if (c.transferido) return false;
        return ahora > new Date(c.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000;
      }).length;
      const meta = r.totalNumeros * r.precioPorNumero;
      const porcentaje = r.totalNumeros > 0
        ? parseFloat(((numerosVendidos / r.totalNumeros) * 100).toFixed(1))
        : 0;
      const diasAlSorteo = Math.ceil(
        (new Date(r.fechaSorteo).getTime() - ahora) / (24 * 60 * 60 * 1000)
      );
      return {
        _id:            r._id,
        nombre:         r.nombre,
        nombrePremio:   r.nombrePremio,
        imagenPremio:   r.imagenPremio,
        estado:         r.estado,
        fechaSorteo:    r.fechaSorteo,
        totalNumeros:   r.totalNumeros,
        precioPorNumero: r.precioPorNumero,
        numerosVendidos,
        recaudado,
        verificado,
        pendiente:      recaudado - verificado,
        pendientesVenc,
        meta,
        porcentaje,
        diasAlSorteo,
        totalCompras:   compras.length,
      };
    });

    // ── Actividad reciente (últimas 10 compras del sistema) ──
    const actividadReciente = todasCompras
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(c => {
        const rifa = rifas.find(r => r._id.toString() === c.rifaId.toString());
        return {
          _id:        c._id,
          comprador:  c.comprador,
          numeros:    c.numeros,
          montoTotal: c.montoTotal,
          transferido: c.transferido,
          createdAt:  c.createdAt,
          rifaNombre: rifa?.nombre || 'Rifa desconocida',
          rifaId:     c.rifaId,
        };
      });

    res.json({
      // KPIs globales
      totalRifas,
      rifasActivas,
      rifasSorteadas,
      totalCompras,
      totalRecaudado,
      totalVerificado,
      totalPendiente,
      // Alertas
      alertasVencidas: alertasVencidas.map(c => ({
        _id: c._id, comprador: c.comprador, montoTotal: c.montoTotal,
        createdAt: c.createdAt, rifaId: c.rifaId,
        rifaNombre: rifas.find(r => r._id.toString() === c.rifaId.toString())?.nombre || '—',
      })),
      alertasPorVencer: alertasPorVencer.map(c => ({
        _id: c._id, comprador: c.comprador, montoTotal: c.montoTotal,
        createdAt: c.createdAt, rifaId: c.rifaId,
        rifaNombre: rifas.find(r => r._id.toString() === c.rifaId.toString())?.nombre || '—',
      })),
      // Rankings
      topCompradores,
      // Desglose por rifa
      resumenRifas,
      // Feed de actividad
      actividadReciente,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
