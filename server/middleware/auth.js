const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({ message: 'Acceso solo para administradores' });
  }
  next();
};

const permissionMiddleware = (permiso) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado' });
    }
    if (req.user.rol === 'admin') {
      return next();
    }
    if (req.user.permisos && req.user.permisos.includes(permiso)) {
      return next();
    }
    return res.status(403).json({ message: `No tienes el permiso requerido: ${permiso}` });
  };
};

module.exports = { authMiddleware, adminMiddleware, permissionMiddleware };
