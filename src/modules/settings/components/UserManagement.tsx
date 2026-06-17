import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createUserApi, fetchRoles, fetchUsers } from '../../../services/api/authApiService';

const UserManagement: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({ name: '', email: '', password: '', roleId: '' });
  const [saving, setSaving] = useState(false);

  const roleOptions = useMemo(() => roles.map((role) => ({ value: String(role.id), label: role.name })), [roles]);

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [usersResponse, rolesResponse] = await Promise.all([fetchUsers(token), fetchRoles(token)]);
        setUsers(usersResponse.users);
        setRoles(rolesResponse.roles);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleInputChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const { name, email, password, roleId } = formState;
    if (!name.trim() || !email.trim() || !password.trim() || !roleId) {
      setError('Please complete all user fields.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createUserApi(token, name.trim(), email.trim().toLowerCase(), password, Number(roleId));
      const refreshed = await fetchUsers(token);
      setUsers(refreshed.users);
      setFormState({ name: '', email: '', password: '', roleId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">User Management</h2>
            <p className="text-sm text-slate-600">Create users, assign roles, and review existing accounts.</p>
          </div>
        </div>

        <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
            <input
              value={formState.name}
              onChange={(event) => handleInputChange('name', event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-blue-200"
              placeholder="Full name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input
              type="email"
              value={formState.email}
              onChange={(event) => handleInputChange('email', event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-blue-200"
              placeholder="user@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              type="password"
              value={formState.password}
              onChange={(event) => handleInputChange('password', event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-blue-200"
              placeholder="Secure password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <select
              value={formState.roleId}
              onChange={(event) => handleInputChange('roleId', event.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-blue-200"
              required
            >
              <option value="">Select role</option>
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">Add a new user who can access the application.</div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-400"
              >
                {saving ? 'Saving...' : 'Create user'}
              </button>
            </div>
          </div>
        </form>

        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Active users</h3>

        {loading ? (
          <div className="text-slate-600">Loading users…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-4">{user.name}</td>
                    <td className="px-4 py-4">{user.email}</td>
                    <td className="px-4 py-4">{user.role}</td>
                    <td className="px-4 py-4">{new Date(user.created_at).toLocaleString()}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-slate-500" colSpan={4}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
