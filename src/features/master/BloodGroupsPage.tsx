import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Droplet, Search } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import {
  subscribeBloodGroups,
  createBloodGroup,
  updateBloodGroup,
  deleteBloodGroup,
} from '@/services/master.service';
import type { BloodGroup } from '@/types/master.types';

export function BloodGroupsPage() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [groups, setGroups] = useState<BloodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<BloodGroup | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<BloodGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    return subscribeBloodGroups((list) => {
      setGroups(list);
      setLoading(false);
    });
  }, []);

  function handleOpenAdd() {
    setEditingGroup(null);
    setLabel('');
    setDescription('');
    setModalOpen(true);
  }

  function handleOpenEdit(bg: BloodGroup) {
    setEditingGroup(bg);
    setLabel(bg.label);
    setDescription(bg.description);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      showError('Blood group label is required.');
      return;
    }

    setSaving(true);
    try {
      if (editingGroup) {
        await updateBloodGroup(editingGroup.id, {
          label: label.trim().toUpperCase(),
          description: description.trim(),
        });
        showSuccess(`Blood group ${label} updated.`);
      } else {
        await createBloodGroup(label, description, userProfile?.uid ?? '');
        showSuccess(`Blood group ${label} created.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to save blood group.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBloodGroup(deleteTarget.id);
      showSuccess(`Blood group ${deleteTarget.label} deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete blood group.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredGroups = groups.filter(
    (g) =>
      g.label.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Master Data — Blood Groups 🩸
          </h1>
          <p className="text-muted text-sm mt-1">
            Manage system-wide blood groups and donor classification
          </p>
        </div>

        <Button variant="primary" icon={<Plus size={18} />} onClick={handleOpenAdd}>
          Add Blood Group
        </Button>
      </div>

      {/* Search & Stats Bar */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search blood groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>

          <span className="text-xs text-muted">
            Total Groups: <strong className="text-white">{groups.length}</strong>
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Droplet size={36} className="text-muted mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-sm">No blood groups found</p>
            <p className="text-xs text-muted mt-1">Click "Add Blood Group" to create one.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3 px-6">Label</th>
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {filteredGroups.map((bg) => (
                  <tr key={bg.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-4 px-6 font-display font-bold text-white text-base">
                      {bg.label}
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {bg.description || '—'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-success/15 text-success">
                        Active
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(bg)}
                        className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-surface-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(bg)}
                        className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-surface-700 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGroup ? 'Edit Blood Group' : 'Add Blood Group'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Blood Group Label"
            placeholder="e.g. O+, AB-"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          <Input
            label="Description"
            placeholder="e.g. Universal Donor"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {editingGroup ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Blood Group"
        message={`Are you sure you want to delete blood group "${deleteTarget?.label}"? This action cannot be undone.`}
        danger
        loading={deleting}
      />
    </div>
  );
}
