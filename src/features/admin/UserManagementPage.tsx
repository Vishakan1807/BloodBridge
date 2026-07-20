import React, { useEffect, useState } from 'react';
import { Users, Search, Shield, UserCheck, UserX, History, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { listUsers, setRole, setActive } from '@/services/user.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ROLE_LABELS, type Role } from '@/core/constants/roles';
import type { UserProfile } from '@/types/auth.types';

export function UserManagementPage() {
  const { userProfile: currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Role Edit Modal
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('user');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  function loadUsers() {
    listUsers().then(setUsers).finally(() => setLoading(false));
  }

  function handleOpenRoleModal(u: UserProfile) {
    setTargetUser(u);
    setSelectedRole(u.role);
  }

  async function handleSaveRole() {
    if (!targetUser) return;
    setUpdating(true);
    try {
      await setRole(targetUser.uid, selectedRole);
      showSuccess(`Updated role for ${targetUser.displayName} to ${ROLE_LABELS[selectedRole]}.`);
      setTargetUser(null);
      loadUsers();
    } catch (err: any) {
      showError(err?.message || 'Failed to update role.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleToggleActive(u: UserProfile) {
    if (u.uid === currentUser?.uid) {
      showError('Security Guardrail: You cannot deactivate your own account.');
      return;
    }
    try {
      await setActive(u.uid, !u.isActive);
      showSuccess(`${u.displayName} has been ${u.isActive ? 'deactivated' : 'reactivated'}.`);
      loadUsers();
    } catch (err: any) {
      showError(err?.message || 'Failed to update status.');
    }
  }

  const roleFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'user', label: 'Donor' },
  ];

  const roleSelectOptions: SelectOption[] = [
    { value: 'user', label: 'Donor (User)' },
    { value: 'manager', label: 'Camp Coordinator (Manager)' },
    { value: 'admin', label: 'System Administrator (Admin)' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.city.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <Users className="text-brand-400" /> User Management & RBAC
        </h1>
        <p className="text-muted text-sm mt-1">
          Manage system users, role privileges, and account active status
        </p>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            placeholder="Search users by name, email, or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />

          <Select
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* User Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-muted text-sm p-6 text-center">No users match your criteria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Blood Group</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {filteredUsers.map((u) => (
                  <tr key={u.uid} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-semibold text-white">{u.displayName}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-display font-bold text-brand-400">
                      {u.bloodGroup || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          u.role === 'admin'
                            ? 'bg-danger/20 text-danger border border-danger/30'
                            : u.role === 'manager'
                            ? 'bg-warning/20 text-warning border border-warning/30'
                            : 'bg-surface-700 text-slate-200'
                        }`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          u.isActive ? 'bg-success/15 text-success' : 'bg-surface-700 text-muted'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <Link
                        to={`/donor/${u.uid}/history`}
                        className="p-1.5 inline-block text-muted hover:text-white rounded-lg hover:bg-surface-700 transition-colors"
                        title="View Donor History"
                      >
                        <History size={16} />
                      </Link>

                      <button
                        onClick={() => handleOpenRoleModal(u)}
                        className="p-1.5 text-muted hover:text-brand-400 rounded-lg hover:bg-surface-700 transition-colors"
                        title="Change Role"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-1.5 rounded-lg hover:bg-surface-700 transition-colors ${
                          u.isActive ? 'text-muted hover:text-danger' : 'text-muted hover:text-success'
                        }`}
                        title={u.isActive ? 'Deactivate Account' : 'Reactivate Account'}
                      >
                        {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Role Assignment Modal */}
      <Modal
        isOpen={Boolean(targetUser)}
        onClose={() => setTargetUser(null)}
        title={`Assign Role — ${targetUser?.displayName}`}
      >
        <div className="space-y-4">
          <Select
            label="System Role (RBAC)"
            options={roleSelectOptions}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setTargetUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRole} loading={updating}>
              Save Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
