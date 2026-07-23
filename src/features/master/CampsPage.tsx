import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Building2, Search, MapPin, Phone, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { CITY_OPTIONS } from '@/core/constants/indianCities';
import { BulkUploadModal } from './components/BulkUploadModal';
import {
  subscribeCamps,
  createCamp,
  updateCamp,
  deleteCamp,
} from '@/services/master.service';
import { listUsers } from '@/services/user.service';
import type { Camp } from '@/types/master.types';
import type { UserProfile } from '@/types/auth.types';

export function CampsPage() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [camps, setCamps] = useState<Camp[]>([]);
  const [coordinators, setCoordinators] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCamp, setEditingCamp] = useState<Camp | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [coordinatorUid, setCoordinatorUid] = useState('');
  const [saving, setSaving] = useState(false);

  // Bulk Upload Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Camp | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Load manager / coordinator accounts
    listUsers().then((users) => {
      setCoordinators(users.filter((u) => u.role === 'manager' || u.role === 'admin'));
    });

    return subscribeCamps((list) => {
      setCamps(list);
      setLoading(false);
    });
  }, []);

  function handleOpenAdd() {
    setEditingCamp(null);
    setName('');
    setAddress('');
    setCity('');
    setPhone('');
    setCoordinatorUid('');
    setModalOpen(true);
  }

  function handleOpenEdit(camp: Camp) {
    setEditingCamp(camp);
    setName(camp.name);
    setAddress(camp.address);
    setCity(camp.city);
    setPhone(camp.phone);
    setCoordinatorUid(camp.coordinatorUid || '');
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      showError('Camp name and district are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingCamp) {
        await updateCamp(editingCamp.id, {
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          coordinatorUid: coordinatorUid || null,
        });

        // Link coordinator: set role to manager + assign campId
        if (coordinatorUid) {
          const { ref: fRef, update: fUpdate } = await import('firebase/database');
          const { db: fDb } = await import('@/core/config/firebase');
          await fUpdate(fRef(fDb, `users/${coordinatorUid}`), {
            campId: editingCamp.id,
            role: 'manager',
          });
        }

        showSuccess(`Blood Bank "${name}" updated. Coordinator auto-assigned as Camp Manager.`);
      } else {
        const newCampId = await createCamp({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          coordinatorUid: coordinatorUid || null,
          isActive: true,
          createdBy: userProfile?.uid ?? '',
        });

        // Link coordinator: set role to manager + assign campId
        if (coordinatorUid && newCampId) {
          const { ref: fRef, update: fUpdate } = await import('firebase/database');
          const { db: fDb } = await import('@/core/config/firebase');
          await fUpdate(fRef(fDb, `users/${coordinatorUid}`), {
            campId: newCampId,
            role: 'manager',
          });
        }

        showSuccess(`Blood Bank "${name}" created. Coordinator auto-assigned as Camp Manager.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to save camp.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCamp(deleteTarget.id);
      showSuccess(`Camp ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete camp.');
    } finally {
      setDeleting(false);
    }
  }

  const coordinatorOptions: SelectOption[] = [
    { value: '', label: 'Unassigned' },
    ...coordinators.map((c) => ({
      value: c.uid,
      label: `${c.displayName} (${c.role})`,
    })),
  ];

  const filteredCamps = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return camps;
    return camps.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)),
    );
  }, [camps, search]);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Master Data — Camps 🏢
          </h1>
          <p className="text-muted text-sm mt-1">
            Manage donation camps and coordinator assignments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            icon={<FileSpreadsheet size={18} className="text-emerald-400" />}
            onClick={() => setBulkModalOpen(true)}
          >
            Bulk Import (Excel / CSV)
          </Button>
          <Button variant="primary" icon={<Plus size={18} />} onClick={handleOpenAdd}>
            Add Camp
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card padding="md">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search camps by name or district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-10 w-full" />
            <div className="skeleton h-10 w-full" />
          </div>
        ) : filteredCamps.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={36} className="text-muted mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-sm">No camps found</p>
            <p className="text-xs text-muted mt-1">Click "Add Camp" to register a new camp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3 px-6">Camp Name</th>
                  <th className="py-3 px-6">Location</th>
                  <th className="py-3 px-6">Phone</th>
                  <th className="py-3 px-6">Coordinator</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {filteredCamps.map((camp) => {
                  const coord = coordinators.find((u) => u.uid === camp.coordinatorUid);
                  return (
                    <tr key={camp.id} className="hover:bg-surface-700/40 transition-colors">
                      <td className="py-4 px-6 font-display font-semibold text-white">
                        {camp.name}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-muted shrink-0" />
                          <span>{camp.city}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {camp.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone size={14} className="text-muted shrink-0" />
                            <span>{camp.phone}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {coord ? (
                          <span className="font-medium text-brand-400">{coord.displayName}</span>
                        ) : (
                          <span className="text-muted italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(camp)}
                          className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-surface-700 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(camp)}
                          className="p-1.5 text-muted hover:text-danger rounded-lg hover:bg-surface-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCamp ? 'Edit Camp' : 'Add Camp'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Camp Name"
            placeholder="e.g. Red Cross Mumbai North"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="District (Tamil Nadu)"
              options={[
                { value: '', label: 'Select District...' },
                ...CITY_OPTIONS,
              ]}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="Phone"
              placeholder="e.g. +91-44-28340000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Address"
            placeholder="e.g. 123 SV Road, Andheri West"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <Select
            label="Assign Coordinator"
            options={coordinatorOptions}
            value={coordinatorUid}
            onChange={(e) => setCoordinatorUid(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {editingCamp ? 'Save Changes' : 'Create Camp'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Camp"
        message={`Are you sure you want to delete camp "${deleteTarget?.name}"?`}
        danger
        loading={deleting}
      />
      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        entityType="camp"
      />
    </div>
  );
}
