import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { hashPassword, verifyPassword } from './utils.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = resolve(__dirname, 'auth.json');
const adapter = new JSONFile(dbPath);
const db = new Low(adapter);

async function ensureDb() {
  await db.read();
  if (!db.data) {
    db.data = {
      roles: [],
      permissions: [],
      role_permissions: [],
      users: [],
      nextId: { role: 1, permission: 1, user: 1 },
    };
    await db.write();
  }
}

function getNextId(key) {
  db.data.nextId[key] = db.data.nextId[key] ?? 1;
  const nextId = db.data.nextId[key];
  db.data.nextId[key] = nextId + 1;
  return nextId;
}

export async function initDb() {
  await ensureDb();

  const findRole = (name) => db.data.roles.find((role) => role.name === name);
  const findPermission = (module, action) => db.data.permissions.find((perm) => perm.module === module && perm.action === action);

  if (!findRole('Admin')) {
    db.data.roles.push({ id: getNextId('role'), name: 'Admin', description: 'Full access to the application' });
  }
  if (!findRole('Viewer')) {
    db.data.roles.push({ id: getNextId('role'), name: 'Viewer', description: 'Read-only access for reporting and dashboards' });
  }

  const defaultPermissions = [
    ['dashboard', 'view'],
    ['sales', 'view'],
    ['sales', 'edit'],
    ['purchases', 'view'],
    ['purchases', 'edit'],
    ['payments', 'view'],
    ['outstanding', 'view'],
    ['expenses', 'view'],
    ['inventory', 'view'],
    ['ledger', 'view'],
    ['reports', 'view'],
    ['gst', 'view'],
    ['company', 'view'],
    ['settings', 'manage'],
    ['users', 'manage'],
    ['roles', 'manage'],
  ];

  for (const [module, action] of defaultPermissions) {
    if (!findPermission(module, action)) {
      db.data.permissions.push({ id: getNextId('permission'), module, action });
    }
  }

  const adminRole = findRole('Admin');
  const viewerRole = findRole('Viewer');

  for (const permission of db.data.permissions) {
    const exists = db.data.role_permissions.some((rp) => rp.roleId === adminRole.id && rp.permissionId === permission.id);
    if (!exists) {
      db.data.role_permissions.push({ roleId: adminRole.id, permissionId: permission.id });
    }
  }

  const viewerPermissions = db.data.permissions.filter((perm) => ['dashboard', 'reports', 'gst'].includes(perm.module));
  for (const permission of viewerPermissions) {
    const exists = db.data.role_permissions.some((rp) => rp.roleId === viewerRole.id && rp.permissionId === permission.id);
    if (!exists) {
      db.data.role_permissions.push({ roleId: viewerRole.id, permissionId: permission.id });
    }
  }

  if (!db.data.users.some((user) => user.email === 'admin@tallyweb.local')) {
    db.data.users.push({
      id: getNextId('user'),
      name: 'Administrator',
      email: 'admin@tallyweb.local',
      password_hash: hashPassword(process.env.ADMIN_PASSWORD || 'Admin@123'),
      role_id: adminRole.id,
      created_at: new Date().toISOString(),
    });
  }

  await db.write();
}

function findRoleById(roleId) {
  return db.data.roles.find((role) => role.id === Number(roleId));
}

export function getUserByEmail(email) {
  const user = db.data.users.find((item) => item.email === email);
  if (!user) return null;
  const role = findRoleById(user.role_id);
  return { ...user, role: role?.name || 'Unknown' };
}

export function getUserById(id) {
  const user = db.data.users.find((item) => item.id === Number(id));
  if (!user) return null;
  const role = findRoleById(user.role_id);
  return { ...user, role: role?.name || 'Unknown' };
}

export function getUserPermissions(userId) {
  const user = getUserById(userId);
  if (!user) return [];
  return db.data.role_permissions
    .filter((rp) => rp.roleId === user.role_id)
    .map((rp) => db.data.permissions.find((perm) => perm.id === rp.permissionId))
    .filter((perm) => perm !== undefined)
    .map((perm) => `${perm.module}.${perm.action}`);
}

export function verifyUserPassword(user, password) {
  return user && verifyPassword(password, user.password_hash);
}

export function getAllUsers() {
  return db.data.users
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: findRoleById(user.role_id)?.name || 'Unknown',
      created_at: user.created_at,
    }))
    .sort((a, b) => a.id - b.id);
}

export function getRoles() {
  return db.data.roles.slice().sort((a, b) => a.id - b.id);
}

export function getPermissions() {
  return db.data.permissions.slice().sort((a, b) => {
    if (a.module === b.module) return a.action.localeCompare(b.action);
    return a.module.localeCompare(b.module);
  });
}

export function getRolePermissions(roleId) {
  return db.data.role_permissions
    .filter((rp) => rp.roleId === Number(roleId))
    .map((rp) => db.data.permissions.find((perm) => perm.id === rp.permissionId))
    .filter((perm) => perm !== undefined)
    .sort((a, b) => {
      if (a.module === b.module) return a.action.localeCompare(b.action);
      return a.module.localeCompare(b.module);
    });
}

export function createRole(name, description) {
  const role = { id: getNextId('role'), name, description };
  db.data.roles.push(role);
  db.write();
  return role;
}

export function setRolePermissions(roleId, permissionIds) {
  db.data.role_permissions = db.data.role_permissions.filter((rp) => rp.roleId !== Number(roleId));
  for (const permissionId of permissionIds) {
    db.data.role_permissions.push({ roleId: Number(roleId), permissionId: Number(permissionId) });
  }
  db.write();
}

export function createUser(name, email, password, roleId) {
  const user = {
    id: getNextId('user'),
    name,
    email,
    password_hash: hashPassword(password),
    role_id: Number(roleId),
    created_at: new Date().toISOString(),
  };
  db.data.users.push(user);
  db.write();
  return { id: user.id, name: user.name, email: user.email, role_id: user.role_id };
}

export function updateUser(id, name, email, roleId) {
  const user = db.data.users.find((item) => item.id === Number(id));
  if (!user) return null;
  user.name = name;
  user.email = email;
  user.role_id = Number(roleId);
  db.write();
  return { id: user.id, name: user.name, email: user.email, role_id: user.role_id };
}
