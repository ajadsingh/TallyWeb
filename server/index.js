import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { initDb, getUserByEmail, getUserById, getAllUsers, getRoles, getPermissions, getRolePermissions, setRolePermissions, createRole, createUser, updateUser } from './db.js';
import { authenticate, requirePermission } from './authMiddleware.js';
import { verifyPassword } from './utils.js';

const app = express();
const PORT = parseInt(process.env.AUTH_SERVER_PORT || '4000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'tallyweb-secret';
const TOKEN_EXPIRY = '8h';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

await initDb();

app.get('/api/auth/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = getUserByEmail(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  const permissions = getRolePermissions(user.role_id).map(item => `${item.module}.${item.action}`);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions,
    },
    token,
  });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const { user } = req;
  res.json({ user });
});

app.get('/api/auth/users', authenticate, requirePermission('users.manage'), (req, res) => {
  res.json({ users: getAllUsers() });
});

app.post('/api/auth/users', authenticate, requirePermission('users.manage'), (req, res) => {
  const { name, email, password, roleId } = req.body;
  if (!name || !email || !password || !roleId) {
    return res.status(400).json({ error: 'Name, email, password, and roleId are required' });
  }
  const existing = getUserByEmail(email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Email is already in use' });
  }
  const user = createUser(name, email.toLowerCase(), password, roleId);
  res.status(201).json({ user });
});

app.put('/api/auth/users/:id', authenticate, requirePermission('users.manage'), (req, res) => {
  const { id } = req.params;
  const { name, email, roleId } = req.body;
  if (!name || !email || !roleId) {
    return res.status(400).json({ error: 'Name, email, and roleId are required' });
  }
  const user = updateUser(id, name, email.toLowerCase(), roleId);
  res.json({ user });
});

app.get('/api/auth/roles', authenticate, (req, res) => {
  res.json({ roles: getRoles() });
});

app.post('/api/auth/roles', authenticate, requirePermission('roles.manage'), (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Role name is required' });
  }
  const role = createRole(name, description || '');
  res.status(201).json({ role });
});

app.get('/api/auth/permissions', authenticate, (req, res) => {
  res.json({ permissions: getPermissions() });
});

app.get('/api/auth/roles/:id/permissions', authenticate, (req, res) => {
  const { id } = req.params;
  res.json({ permissions: getRolePermissions(id) });
});

app.put('/api/auth/roles/:id/permissions', authenticate, requirePermission('roles.manage'), (req, res) => {
  const { id } = req.params;
  const { permissionIds } = req.body;
  if (!Array.isArray(permissionIds)) {
    return res.status(400).json({ error: 'permissionIds must be an array' });
  }
  setRolePermissions(id, permissionIds);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Auth server listening on http://localhost:${PORT}`);
});
