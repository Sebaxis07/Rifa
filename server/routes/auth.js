const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Seed admin si no existe
const seedAdmin = async () => {
  try {
    const existing = await User.findOne({ email: 'thefilex07@gmail.com' });
    const adminPerms = [
      'gestionar_usuarios', 'crear_rifa', 'editar_rifa', 'eliminar_rifa',
      'registrar_compra', 'editar_compra', 'eliminar_compra', 'ver_analytics'
    ];
    if (!existing) {
      const hashed = await bcrypt.hash('Dpastora2', 12);
      await User.create({
        nombre: 'Admin Principal',
        email: 'thefilex07@gmail.com',
        password: hashed,
        rol: 'admin',
        permisos: adminPerms
      });
      console.log('✅ Admin creado: thefilex07@gmail.com');
    } else {
      existing.rol = 'admin';
      existing.permisos = adminPerms;
      if (!existing.nombre || existing.nombre === 'Usuario') {
        existing.nombre = 'Admin Principal';
      }
      await existing.save();
    }
  } catch (err) {
    console.error('Error seeding admin:', err.message);
  }
};
// We export seedAdmin to run it after MongoDB connects successfully

const { authMiddleware, permissionMiddleware } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email) return res.status(400).json({ message: 'Email requerido' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Credenciales incorrectas' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Credenciales incorrectas' });

    // Registrar última conexión
    user.ultimaConexion = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, rol: user.rol, permisos: user.permisos || [], nombre: user.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { email: user.email, rol: user.rol, permisos: user.permisos || [], nombre: user.nombre }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No autorizado' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Actualizar la última conexión en la BD de forma silenciosa
    await User.findByIdAndUpdate(decoded.id, { ultimaConexion: new Date() });
    res.json({
      email: decoded.email,
      rol: decoded.rol,
      permisos: decoded.permisos || [],
      nombre: decoded.nombre
    });
  } catch {
    res.status(401).json({ message: 'Token inválido' });
  }
});

// POST /api/auth/heartbeat — Actualizar última conexión desde el frontend activo
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { ultimaConexion: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/users — Listar usuarios
router.get('/users', authMiddleware, permissionMiddleware('gestionar_usuarios'), async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    
    // Generar loginToken de larga duración (30 días) para que el admin pueda generar enlaces directos
    const usersWithTokens = users.map(u => {
      const token = jwt.sign(
        { id: u._id, email: u.email, rol: u.rol, permisos: u.permisos || [], nombre: u.nombre },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      const userObj = u.toObject();
      userObj.loginToken = token;
      return userObj;
    });

    res.json(usersWithTokens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/users — Crear usuario
router.post('/users', authMiddleware, permissionMiddleware('gestionar_usuarios'), async (req, res) => {
  let { nombre, email, password, rol, permisos } = req.body;
  try {
    if (!nombre || !rol) {
      return res.status(400).json({ message: 'El nombre y el rol son obligatorios' });
    }

    // Si no se proporciona email, generar uno único basado en el nombre
    if (!email) {
      const base = nombre.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
      const rand = Math.floor(Math.random() * 9000) + 1000;
      email = `${base}.${rand}@acceso.interno`;
    }

    // Si no se proporciona contraseña, generar una aleatoria (solo se accederá via enlace)
    if (!password) {
      password = require('crypto').randomBytes(16).toString('hex');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const newUser = new User({
      nombre,
      email: email.toLowerCase(),
      password: hashed,
      rol,
      permisos: rol === 'admin' ? [
        'gestionar_usuarios', 'crear_rifa', 'editar_rifa', 'eliminar_rifa',
        'registrar_compra', 'editar_compra', 'eliminar_compra', 'ver_analytics'
      ] : (permisos || [])
    });

    const saved = await newUser.save();
    const result = saved.toObject();
    delete result.password;

    // Adjuntar token de acceso rápido
    result.loginToken = jwt.sign(
      { id: result._id, email: result.email, rol: result.rol, permisos: result.permisos || [], nombre: result.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/auth/users/:id — Editar usuario
router.put('/users/:id', authMiddleware, permissionMiddleware('gestionar_usuarios'), async (req, res) => {
  const { nombre, email, password, rol, permisos } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Evitar que un admin se des-promueva a sí mismo sin querer si es el único, o evitar quitarse permisos a sí mismo
    if (req.user.id === user.id.toString() && rol !== user.rol) {
      return res.status(400).json({ message: 'No puedes cambiar tu propio rol' });
    }

    if (nombre) user.nombre = nombre;
    if (email) user.email = email.toLowerCase();
    if (rol) user.rol = rol;

    if (rol === 'admin') {
      user.permisos = [
        'gestionar_usuarios', 'crear_rifa', 'editar_rifa', 'eliminar_rifa',
        'registrar_compra', 'editar_compra', 'eliminar_compra', 'ver_analytics'
      ];
    } else if (permisos) {
      user.permisos = permisos;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 12);
    }

    const updated = await user.save();
    const result = updated.toObject();
    delete result.password;

    // Adjuntar token de acceso rápido
    result.loginToken = jwt.sign(
      { id: result._id, email: result.email, rol: result.rol, permisos: result.permisos || [], nombre: result.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/auth/users/:id — Eliminar usuario
router.delete('/users/:id', authMiddleware, permissionMiddleware('gestionar_usuarios'), async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'No puedes eliminarte a ti mismo' });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/supervisores-estado — Obtener estado de conexión de supervisores (solo admin)
router.get('/supervisores-estado', authMiddleware, async (req, res) => {
  try {
    // Solo admin puede ver estado de supervisores
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }

    const supervisores = await User.find({ rol: 'supervisor' }, 'nombre email ultimaConexion').sort({ nombre: 1 });
    
    // Calcular estado de conexión: conectado si última conexión < 1 hora, desconectado si >= 1 hora
    const ahora = new Date();
    const unaHoraAtras = new Date(ahora.getTime() - 60 * 60 * 1000); // 1 hora en ms
    
    const supervisoresConEstado = supervisores.map(sup => {
      const ultimaConexion = sup.ultimaConexion ? new Date(sup.ultimaConexion) : null;
      const estado = ultimaConexion && ultimaConexion > unaHoraAtras ? 'conectado' : 'desconectado';
      
      return {
        _id: sup._id,
        nombre: sup.nombre,
        email: sup.email,
        ultimaConexion: ultimaConexion ? ultimaConexion.toISOString() : null,
        estado
      };
    });

    res.json(supervisoresConEstado);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = { router, seedAdmin };
