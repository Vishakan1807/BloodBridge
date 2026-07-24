import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Tent, Search, MapPin, Calendar } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { CITY_OPTIONS } from '@/core/constants/indianCities';
import {
  subscribeCharityDrives,
  createCharityDrive,
  updateCharityDrive,
  deleteCharityDrive,
} from '@/services/event.service';
import type { CharityDrive } from '@/services/event.service';

export function CharityDrivesPage() {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [drives, setDrives] = useState<CharityDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDrive, setEditingDrive] = useState<CharityDrive | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<CharityDrive | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    return subscribeCharityDrives((list) => {
      setDrives(list);
      setLoading(false);
    });
  }, []);

  function handleOpenAdd() {
    setEditingDrive(null);
    setName('');
    setAddress('');
    setCity('');
    setStartDateStr(new Date().toISOString().slice(0, 10));
    setEndDateStr(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setModalOpen(true);
  }

  function handleOpenEdit(drive: CharityDrive) {
    setEditingDrive(drive);
    setName(drive.name);
    setAddress(drive.address);
    setCity(drive.city);
    setStartDateStr(new Date(drive.startDate).toISOString().slice(0, 10));
    setEndDateStr(new Date(drive.endDate).toISOString().slice(0, 10));
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !city.trim() || !startDateStr || !endDateStr) {
      showError('Name, district, start date, and end date are required.');
      return;
    }

    const startTs = new Date(startDateStr).getTime();
    const endTs = new Date(endDateStr).setHours(23, 59, 59, 999);

    if (endTs < startTs) {
      showError('End date cannot be before start date.');
      return;
    }

    setSaving(true);
    try {
      if (editingDrive) {
        await updateCharityDrive(editingDrive.id, {
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          startDate: startTs,
          endDate: endTs,
        });
        showSuccess(`Charity Drive "${name}" updated.`);
      } else {
        await createCharityDrive({
          name: name.trim(),
          address: address.trim(),
          city: city.trim(),
          startDate: startTs,
          endDate: endTs,
          isActive: true,
          createdBy: userProfile?.uid ?? '',
        });
        showSuccess(`Charity Drive "${name}" created.`);
      }
      setModalOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to save drive.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCharityDrive(deleteTarget.id);
      showSuccess(`Drive ${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
    } catch (err: any) {
      showError(err?.message || 'Failed to delete drive.');
    } finally {
      setDeleting(false);
    }
  }

  const filteredDrives = drives.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.address.toLowerCase().includes(search.toLowerCase());
    const matchesDistrict = filterDistrict ? d.city === filterDistrict : true;
    return matchesSearch && matchesDistrict;
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Charity Drives</h1>
          <p className="text-muted text-sm mt-1">Manage temporary blood donation camps and charity events.</p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" icon={<Plus size={18} />}>
          Add Charity Drive
        </Button>
      </div>

      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <Input
              placeholder="Search by name or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full md:w-64">
            <Select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              options={[{ label: 'All Districts', value: '' }, ...CITY_OPTIONS]}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="spinner w-8 h-8" />
        </div>
      ) : filteredDrives.length === 0 ? (
        <Card padding="lg" className="text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-surface-700/50 flex items-center justify-center mx-auto mb-4 border border-surface-600/50">
            <Tent className="text-muted" size={32} />
          </div>
          <h3 className="font-display font-semibold text-white mb-2">No Charity Drives Found</h3>
          <p className="text-muted text-sm max-w-md mx-auto mb-6">
            There are no charity drives matching your criteria.
          </p>
          <Button variant="secondary" onClick={handleOpenAdd} icon={<Plus size={18} />}>
            Add First Drive
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDrives.map((drive) => {
            const isExpired = Date.now() > drive.endDate;
            return (
              <Card key={drive.id} padding="md" className={`flex flex-col border ${isExpired ? 'border-surface-600/50 opacity-60' : 'border-brand-500/20'} hover:border-surface-500 transition-colors`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isExpired ? 'bg-surface-700' : 'bg-brand-500/10'} border ${isExpired ? 'border-surface-600' : 'border-brand-500/20'}`}>
                      <Tent size={20} className={isExpired ? 'text-muted' : 'text-brand-400'} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white text-base">{drive.name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExpired ? 'bg-surface-700 text-muted' : 'bg-success/20 text-success'}`}>
                        {isExpired ? 'EXPIRED' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(drive)}
                      className="p-1.5 text-muted hover:text-brand-400 hover:bg-brand-500/10 rounded-md transition-colors"
                      title="Edit Drive"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(drive)}
                      className="p-1.5 text-muted hover:text-error hover:bg-error/10 rounded-md transition-colors"
                      title="Delete Drive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <MapPin size={14} className="text-muted shrink-0" />
                    <span className="truncate">{drive.address}, {drive.city}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Calendar size={14} className="text-muted shrink-0" />
                    <span>{new Date(drive.startDate).toLocaleDateString()} - {new Date(drive.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingDrive ? 'Edit Charity Drive' : 'Add Charity Drive'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Event Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rotary Club Blood Drive"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="District (City)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              options={[{ label: 'Select District', value: '' }, ...CITY_OPTIONS]}
              required
            />
            <Input
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Town Hall"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date"
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              required
            />
            <Input
              type="date"
              label="End Date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {saving ? 'Saving...' : 'Save Charity Drive'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Charity Drive"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setDeleteTarget(null)}
        danger={true}
        loading={deleting}
      />
    </div>
  );
}
