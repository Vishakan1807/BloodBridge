import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Hospital as HospitalIcon, Search, MapPin, Phone } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import {
  subscribeHospitals,
  createHospital,
  updateHospital,
  deleteHospital,
} from '@/services/master.service';
import type { Hospital } from '@/types/master.types';

export function HospitalsPage() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState<Hospital | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    return subscribeHospitals((list) => {
      setHospitals(list);
      setLoading(false);
    });
  }, []);

  function handleOpenAdd() {
    setEditingHospital(null);
    setName('');
    setAddress('');
    setCity('');
    setPhone('');
    setModalOpen(true);
  }

  function handleOpenEdit(hosp: Hospital) {
    setEditingHospital(hosp);
    setName(hosp.name);
    setAddress(hosp.address);
    setCity(hosp.city);
    setPhone(hosp.phone);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim()) {
      showError('Hospital name and city are required.');
      return;
    }

    setSaving(true);
    try {
      if (editingHospital) {
        await updateHospital(editingHospital.id, {
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
        });
        showSuccess(`Hospital ${name} updated.`);
      } else {
        await createHospital({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          isActive: true,
          createdBy: userProfile?.uid ?? '',
        });
        showSuccess(`Hospital ${name} created.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to save hospital.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteHospital(deleteTarget.id);
      showSuccess(`Hospital ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete hospital.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            Master Data — Hospitals 🏥
          </h1>
          <p className="text-muted text-sm mt-1">
            Manage hospital destinations for blood donation requests
          </p>
        </div>

        <Button variant="primary" icon={<Plus size={18} />} onClick={handleOpenAdd}>
          Add Hospital
        </Button>
      </div>

      {/* Search Bar */}
      <Card padding="md">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search hospitals by name or city..."
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
        ) : filteredHospitals.length === 0 ? (
          <div className="text-center py-12">
            <HospitalIcon size={36} className="text-muted mx-auto mb-3" />
            <p className="text-slate-300 font-medium text-sm">No hospitals found</p>
            <p className="text-xs text-muted mt-1">Click "Add Hospital" to register a new medical center.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-700/60 text-muted text-xs uppercase tracking-wider border-b border-surface-600">
                  <th className="py-3 px-6">Hospital Name</th>
                  <th className="py-3 px-6">City</th>
                  <th className="py-3 px-6">Address</th>
                  <th className="py-3 px-6">Phone</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-700/60">
                {filteredHospitals.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="py-4 px-6 font-display font-semibold text-white">
                      {hosp.name}
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-muted shrink-0" />
                        <span>{hosp.city}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {hosp.address || '—'}
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {hosp.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone size={14} className="text-muted shrink-0" />
                          <span>{hosp.phone}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(hosp)}
                        className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-surface-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(hosp)}
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
        title={editingHospital ? 'Edit Hospital' : 'Add Hospital'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Hospital Name"
            placeholder="e.g. Lilavati Hospital"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="e.g. Mumbai"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="Phone"
              placeholder="e.g. +91-22-26751000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Address"
            placeholder="e.g. Bandra Reclamation, Bandra West"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {editingHospital ? 'Save Changes' : 'Create Hospital'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Hospital"
        message={`Are you sure you want to delete hospital "${deleteTarget?.name}"?`}
        danger
        loading={deleting}
      />
    </div>
  );
}
