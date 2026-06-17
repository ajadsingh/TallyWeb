import jwt from 'jsonwebtoken';
import { getUserById, getUserPermissions } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'tallyweb-secret';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload || typeof payload !== 'object' || !payload.userId) {
      throw new Error('Invalid token payload');
    }
    const user = getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const permissions = getUserPermissions(user.id);
    req.user = { ...user, permissions };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  };
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.user.role === 'Admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: admin only' });
}
