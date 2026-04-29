const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'giardino_secret_2026';

function verifyToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res) {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Token inválido ou ausente' });
    return null;
  }
  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito a administradores' });
    return null;
  }
  return user;
}

module.exports = { verifyToken, requireAuth, requireAdmin, JWT_SECRET };
