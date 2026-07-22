import React, { useState, useEffect } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';
import { CITY_OPTIONS } from '@/core/constants/indianCities';
import { updateUserProfile } from '@/services/user.service';
import { Droplets, ShieldCheck, MapPin, Phone } from 'lucide-react';

export function CompleteProfileModal() {
  const { userProfile, refreshProfile } = useAuth();
  const { showSuccess, showError }      = useToast();

  const [isOpen, setIsOpen]           = useState(false);
  const [bloodGroup, setBloodGroup]   = useState('');
  const [district, setDistrict]       = useState('');
  const [phone, setPhone]             = useState('');
  const [saving, setSaving]           = useState(false);

  // Trigger modal whenever userProfile has missing bloodGroup, city, or phone
  useEffect(() => {
    if (!userProfile) {
      setIsOpen(false);
      return;
    }
    const needsCompletion = !userProfile.city || !userProfile.bloodGroup || !userProfile.phone;
    if (needsCompletion) {
      setBloodGroup(userProfile.bloodGroup || 'O+');
      setDistrict(userProfile.city || '');
      setPhone(userProfile.phone || '');
      setIsOpen(true);
    } else {
      setIsOpen(false);
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userProfile?.uid) return;
    if (!bloodGroup) {
      showError('Please select your blood group.');
      return;
    }
    if (!district) {
      showError('Please select your Tamil Nadu district.');
      return;
    }
    if (!phone.trim()) {
      showError('Please enter a valid contact phone number.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(userProfile.uid, {
        bloodGroup,
        city: district.trim(),
        phone: phone.trim(),
      });
      await refreshProfile();
      showSuccess('Donor profile completed successfully! 🩸');
      setIsOpen(false);
    } catch (err: any) {
      showError(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Cannot dismiss without completing initial setup
      title="Complete Your Donor Profile 🩸"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
            <Droplets size={16} /> Welcome to BloodBridge!
          </div>
          <p className="text-xs text-slate-300">
            Please configure your <strong>Blood Group</strong>, <strong>Tamil Nadu District</strong>, and <strong>Phone Number</strong> so local hospitals and patients can connect with you during emergencies.
          </p>
        </div>

        <Select
          label="Your Blood Group"
          options={bgOptions}
          value={bloodGroup}
          onChange={(e) => setBloodGroup(e.target.value)}
          required
        />

        <Select
          label="District (Tamil Nadu)"
          options={districtOptions}
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          required
        />

        <Input
          label="Phone Number (Mobile / Landline)"
          placeholder="e.g. 9876543210 or 044-28290000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          icon={<Phone size={16} />}
          required
        />

        <div className="pt-3 border-t border-surface-700">
          <Button variant="primary" type="submit" fullWidth loading={saving} icon={<ShieldCheck size={18} />}>
            Save & Continue to Dashboard
          </Button>
        </div>
      </form>
    </Modal>
  );
}
