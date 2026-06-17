import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { fetchPermissions, fetchRolePermissions, fetchRoles, updateRolePermissions } from '../../../services/api/authApiService';

const RolePermissions: React.FC = () => {
  const { token } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const [rolesResponse, permissionsResponse] = await Promise.all([
          fetchRoles(token),
          fetchPermissions(token),
        ]);
        setRoles(rolesResponse.roles);
        setPermissions(permissionsResponse.permissions);
        if (rolesResponse.roles.length > 0) {
          setSelectedRoleId(rolesResponse.roles[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load role permissions');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token]);

  useEffect(() => {
    const loadRolePermissions = async () => {
      if (!token || selectedRoleId === null) return;
      setError(null);
      try {
        const response = await fetchRolePermissions(token, selectedRoleId);
        setSelectedPermissionIds(response.permissions.map((permission) => permission.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load role permissions');
      }
    };

    loadRolePermissions();
  }, [selectedRoleId, token]);

  const handlePermissionToggle = (permissionId: number) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId) ? prev.filter((id) => id !== permissionId) : [...prev, permissionId]
    );
  };

  const handleSave = async () => {
    if (!token || selectedRoleId === null) return;
    setSaving(true);
    setError(null);
    try {
      await updateRolePermissions(token, selectedRoleId, selectedPermissionIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Role Permissions</h2>
            <p className="text-sm text-slate-600">Assign permissions to each role across the application modules.</p>
          </div>
          <button
            type="button"
            disabled={saving || selectedRoleId === null}
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-400"
          >
            {saving ? 'Saving...' : 'Save permissions'}
          </button>
        </div>

        {loading ? (
          <div className="text-slate-600">Loading role permissions…</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">Selected Role</label>
                <select
                  value={selectedRoleId ?? ''}
                  onChange={(event) => setSelectedRoleId(Number(event.target.value))}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-blue-200"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-600">Current role</div>
                <div className="mt-2 font-semibold text-slate-900">{selectedRole?.name || 'None selected'}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-6 bg-white">
              <div className="grid gap-3 sm:grid-cols-2">
                {permissions.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 cursor-pointer transition hover:border-blue-300"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissionIds.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-slate-900">{permission.module}</div>
                      <div className="text-sm text-slate-500">{permission.action}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      </div>
    </div>
  );
};

export default RolePermissions;
