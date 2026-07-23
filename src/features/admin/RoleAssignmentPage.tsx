import React, { useEffect, useState } from 'react';
import { Shield, Users, Check, X, Search, Edit2 } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { listUsers, setRole } from '@/services/user.service';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PERMISSIONS, ROLE_LABELS, type Role, type Resource } from '@/core/constants/roles';
import type { UserProfile } from '@/types/auth.types';

export function RoleAssignmentPage() {
  const { userProfile: currentUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Role Modal State
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

      showSuccess(`Role updated: ${targetUser.displayName} is now ${ROLE_LABELS[selectedRole]}.`);
      setTargetUser(null);
      loadUsers();
    } catch (err: any) {
      showError(err?.message || 'Failed to update role.');
    } finally {
      setUpdating(false);
    }
  }

  const roleSelectOptions: SelectOption[] = [
    { value: 'user', label: 'Donor (User)' },
    { value: 'manager', label: 'Camp Coordinator (Manager)' },
    { value: 'admin', label: 'System Administrator (Admin)' },
  ];

  const resources: { id: Resource; name: string; description: string }[] = [
    { id: 'request',       name: 'Donation Requests',     description: 'Raise, view, and update requests' },
    { id: 'workflow',      name: 'Workflow Engine',       description: 'Verify, match, donate, & close states' },
    { id: 'master-data',   name: 'Master Data CRUD',      description: 'Manage Blood Groups, Camps, & Hospitals' },
    { id: 'reports',       name: 'Analytics & Reports',   description: 'View Summary, Status, & Activity reports' },
    { id: 'users',         name: 'User Management',       description: 'Manage accounts & active status' },
    { id: 'roles',         name: 'RBAC Role Assignment',  description: 'Manage system roles & permissions' },
    { id: 'audit',         name: 'System Audit Logs',     description: 'View system activity & transition trail' },
    { id: 'donor-history', name: 'Donor History Index',   description: 'View lifelong donation timelines' },
  ];

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 page-enter">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <Shield className="text-brand-400" /> Role Assignment & RBAC Matrix
        </h1>
        <p className="text-muted text-sm mt-1">
          Configure system roles, access permissions, and assign user privileges
        </p>
      </div>

      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Donor Role</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-700 text-slate-200">user</span>
          </div>
          <p className="font-display font-bold text-2xl text-white">
            {users.filter((u) => u.role === 'user').length} <span className="text-xs text-muted font-normal">users</span>
          </p>
          <p className="text-xs text-muted mt-2">
            Can raise donation requests, view own history, comment, and add medical attachments.
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-warning">Coordinator Role</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-warning/20 text-warning">manager</span>
          </div>
          <p className="font-display font-bold text-2xl text-white">
            {users.filter((u) => u.role === 'manager').length} <span className="text-xs text-muted font-normal">coordinators</span>
          </p>
          <p className="text-xs text-muted mt-2">
            Manages assigned camp stock, executes Verification & Matching queues, records donations.
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-danger">Administrator Role</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-danger/20 text-danger">admin</span>
          </div>
          <p className="font-display font-bold text-2xl text-white">
            {users.filter((u) => u.role === 'admin').length} <span className="text-xs text-muted font-normal">admins</span>
          </p>
          <p className="text-xs text-muted mt-2">
            Full system control: Master Data CRUD, RBAC role assignment, Audit Trail, System Settings.
          </p>
        </Card>
      </div>

      {/* RBAC Permission Matrix */}
      <Card padding="none" className="overflow-hidden">
        <div className="p-6 border-b border-surface-700">
          <h2 className="font-display font-semibold text-lg text-white">RBAC Permission Matrix</h2>
          <p className="text-xs text-muted mt-1">Resource access control rules by role</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                <th className="py-3.5 px-6">System Resource</th>
                <th className="py-3.5 px-6 text-center">Donor (user)</th>
                <th className="py-3.5 px-6 text-center">Coordinator (manager)</th>
                <th className="py-3.5 px-6 text-center">Admin (admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/60">
              {resources.map((res) => {
                const userActions    = PERMISSIONS.user[res.id] || [];
                const managerActions = PERMISSIONS.manager[res.id] || [];
                const adminActions   = PERMISSIONS.admin[res.id] || [];

                return (
                  <tr key={res.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-white">{res.name}</p>
                      <p className="text-xs text-muted">{res.description}</p>
                    </td>

                    <td className="py-4 px-6 text-center">
                      {userActions.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/15 px-2.5 py-1 rounded-full">
                          <Check size={14} /> {userActions.join(', ')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted opacity-50">
                          <X size={14} /> Denied
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-center">
                      {managerActions.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning bg-warning/15 px-2.5 py-1 rounded-full">
                          <Check size={14} /> {managerActions.join(', ')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted opacity-50">
                          <X size={14} /> Denied
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-center">
                      {adminActions.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-danger bg-danger/15 px-2.5 py-1 rounded-full">
                          <Check size={14} /> {adminActions.join(', ')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted opacity-50">
                          <X size={14} /> Denied
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Role Assignment Table */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-white">Assign Roles to Users</h2>
            <p className="text-xs text-muted">Modify access privileges for registered accounts</p>
          </div>

          <div className="w-full sm:w-64">
            <Input
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>
        </div>

        <div className="divide-y divide-surface-700">
          {filteredUsers.map((u) => (
            <div key={u.uid} className="py-3 flex items-center justify-between text-sm">
              <div>
                <span className="font-semibold text-white">{u.displayName}</span>
                <span className="text-xs text-muted ml-2">({u.email})</span>
              </div>

              <div className="flex items-center gap-3">
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

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Edit2 size={14} />}
                  onClick={() => handleOpenRoleModal(u)}
                >
                  Change Role
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Assign Role Modal */}
      <Modal
        isOpen={Boolean(targetUser)}
        onClose={() => setTargetUser(null)}
        title={`Assign Role — ${targetUser?.displayName}`}
      >
        <div className="space-y-4">
          <Select
            label="Select Role"
            options={roleSelectOptions}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setTargetUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveRole} loading={updating}>
              Save Role Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
