import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';
import { CITY_OPTIONS } from '@/core/constants/indianCities';
import { updateUserProfile, deleteUserAccount } from '@/services/user.service';
import { ROUTES } from '@/core/constants/routes';
import { User, Mail, Phone, MapPin, Droplets, Trash2, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function ProfileSettingsPage() {
  const { userProfile, signOut, refreshProfile } = useAuth();
  const { showSuccess, showError }                = useToast();
  const navigate                                   = useNavigate();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone]             = useState(userProfile?.phone || '');
  const [district, setDistrict]       = useState(userProfile?.city || '');
  const [bloodGroup, setBloodGroup]   = useState(userProfile?.bloodGroup || '');
  const [saving, setSaving]           = useState(false);

  // Account Deletion Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText]         = useState('');
  const [deleting, setDeleting]               = useState(false);

  const TARGET_CONFIRM_TEXT = 'I am deleting my account';

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhone(userProfile.phone || '');
      setDistrict(userProfile.city || '');
      setBloodGroup(userProfile.bloodGroup || '');
    }
  }, [userProfile]);

  const bgOptions: SelectOption[] = [
    { value: '', label: 'Select your blood group...' },
    ...CLINICAL_BLOOD_GROUPS.map((g) => ({
      value: g.value,
      label: `${g.label}${g.category !== 'standard' ? ' 🌟' : ''}`,
    })),
  ];

  const districtOptions: SelectOption[] = [
    { value: '', label: 'Select your Tamil Nadu district...' },
    ...CITY_OPTIONS,
  ];

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userProfile?.uid) return;

    if (!displayName.trim()) {
      showError('Display name is required.');
      return;
    }
    if (!district) {
      showError('Please select your Tamil Nadu district.');
      return;
    }
    if (!bloodGroup) {
      showError('Please select your blood group.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(userProfile.uid, {
        displayName: displayName.trim(),
        phone: phone.trim(),
        city: district.trim(),
        bloodGroup,
      });
      await refreshProfile();
      showSuccess('Settings & Location updated successfully!');
    } catch (err: any) {
      showError(err?.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!userProfile?.uid) return;
    if (confirmText.trim() !== TARGET_CONFIRM_TEXT) {
      showError(`Please type "${TARGET_CONFIRM_TEXT}" exactly to confirm.`);
      return;
    }

    setDeleting(true);
    try {
      await deleteUserAccount(userProfile.uid);
      await signOut();
      showSuccess('Your BloodBridge account has been permanently deleted.');
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err: any) {
      showError(err?.message || 'Failed to delete account.');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-enter">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <User className="text-brand-400" /> Account & Profile Settings ⚙️
        </h1>
        <p className="text-muted text-sm mt-1">
          Manage your personal details, update your location/district, and account preferences
        </p>
      </div>

      {/* Profile Details Form */}
      <Card padding="lg">
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <h2 className="font-display font-semibold text-lg text-white border-b border-surface-700 pb-3 flex items-center gap-2">
            <User size={18} className="text-brand-400" /> Personal & Donor Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              placeholder="e.g. Seker V"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              icon={<User size={16} />}
              required
            />

            <Input
              label="Email Address (Registered)"
              value={userProfile?.email || ''}
              disabled
              icon={<Mail size={16} />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number (Mobile / Landline)"
              placeholder="e.g. 9876543210 or 044-28290000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone size={16} />}
              required
            />

            <Select
              label="District (Tamil Nadu) — Change Location Anytime"
              options={districtOptions}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              required
            />
          </div>

          <div className="w-full sm:w-1/2">
            <Select
              label="Blood Group"
              options={bgOptions}
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-700">
            <Button variant="primary" type="submit" loading={saving} icon={<CheckCircle2 size={16} />}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone: Account Deletion */}
      <Card padding="lg" className="border-danger/30 bg-danger/5 space-y-4">
        <h2 className="font-display font-semibold text-lg text-danger flex items-center gap-2">
          <Trash2 size={18} /> Danger Zone — Delete Account
        </h2>

        <p className="text-xs text-slate-300 leading-relaxed">
          Once you delete your account, your profile, donation preferences, and records will be permanently removed from BloodBridge. This action <strong>cannot be undone</strong>.
        </p>

        <div className="pt-2">
          <Button
            variant="danger"
            onClick={() => {
              setConfirmText('');
              setDeleteModalOpen(true);
            }}
            icon={<Trash2 size={16} />}
          >
            Delete My Account
          </Button>
        </div>
      </Card>

      {/* ── Strict Account Deletion Modal ────────────────────────────── */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Permanent Account Deletion"
      >
        <div className="space-y-4">
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-xs text-slate-200 space-y-2">
            <p className="font-bold text-danger text-sm flex items-center gap-1.5">
              <ShieldAlert size={16} /> Warning: Irreversible Action
            </p>
            <p>
              Are you sure you want to delete your account (<strong>{userProfile?.email}</strong>)? All your data will be permanently wiped.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              To confirm deletion, please type <strong className="text-danger select-all font-mono">{TARGET_CONFIRM_TEXT}</strong> below:
            </label>
            <Input
              placeholder="I am deleting my account"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmText.trim() !== TARGET_CONFIRM_TEXT}
              loading={deleting}
              onClick={handleDeleteAccount}
              icon={<Trash2 size={16} />}
            >
              Permanently Delete My Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
