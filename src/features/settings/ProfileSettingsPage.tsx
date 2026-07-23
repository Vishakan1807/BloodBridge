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
import { updateUserProfile } from '@/services/user.service';
import { ROUTES } from '@/core/constants/routes';
import { User, Mail, Phone, MapPin, Droplets, CheckCircle2 } from 'lucide-react';

export function ProfileSettingsPage() {
  const { userProfile, signOut, refreshProfile } = useAuth();
  const { showSuccess, showError }                = useToast();
  const navigate                                   = useNavigate();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [phone, setPhone]             = useState(userProfile?.phone || '');
  const [district, setDistrict]       = useState(userProfile?.city || '');
  const [bloodGroup, setBloodGroup]   = useState(userProfile?.bloodGroup || '');
  const [saving, setSaving]           = useState(false);

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

    </div>
  );
}
