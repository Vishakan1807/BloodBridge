import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, FileText, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/core/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CLINICAL_BLOOD_GROUPS } from '@/core/utils/bloodUtils';
import { subscribeHospitals } from '@/services/master.service';
import { createRequest, updateRequest } from '@/services/request.service';
import type { Hospital } from '@/types/master.types';
import type { DonationRequest, UrgencyLevel } from '@/types/request.types';

interface RequestFormProps {
  initialData?: DonationRequest;
  isEditMode?:   boolean;
}

export function RequestForm({ initialData, isEditMode = false }: RequestFormProps) {
  const { userProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [patientName, setPatientName] = useState(initialData?.patientName || '');
  const [requiredBloodGroup, setRequiredBloodGroup] = useState(initialData?.requiredBloodGroup || userProfile?.bloodGroup || 'O+');
  const [unitsRequired, setUnitsRequired] = useState(initialData?.unitsRequired || 1);
  const [urgency, setUrgency] = useState<UrgencyLevel>(initialData?.urgency || 'normal');
  const [hospitalId, setHospitalId] = useState(initialData?.hospitalId || '');
  const [requiredByDate, setRequiredByDate] = useState<string>(
    initialData?.requiredByDate
      ? new Date(initialData.requiredByDate).toISOString().split('T')[0]
      : new Date(Date.now() + 86400000).toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return subscribeHospitals((list) => {
      const active = list.filter((h) => h.isActive);
      setHospitals(active);
      if (!hospitalId && active.length > 0) {
        setHospitalId(active[0].id);
      }
    });
  }, []);

  const bloodGroupOptions: SelectOption[] = CLINICAL_BLOOD_GROUPS.map((bg) => ({
    value: bg.value,
    label: `${bg.label}${bg.category !== 'standard' ? ' 🌟' : ''}`,
  }));

  const urgencyOptions: SelectOption[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'critical', label: 'Critical' },
  ];

  const hospitalOptions: SelectOption[] = hospitals.map((h) => ({
    value: h.id,
    label: `${h.name} (${h.city})`,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!patientName.trim()) {
      showError('Patient name is required.');
      return;
    }
    if (!hospitalId) {
      showError('Please select a destination hospital.');
      return;
    }
    if (unitsRequired < 1) {
      showError('Units required must be at least 1.');
      return;
    }

    const selectedHosp = hospitals.find((h) => h.id === hospitalId);
    const dateTimestamp = new Date(requiredByDate).getTime();

    setLoading(true);
    try {
      if (isEditMode && initialData) {
        await updateRequest(initialData.id, {
          patientName: patientName.trim(),
          requiredBloodGroup,
          unitsRequired: Number(unitsRequired),
          urgency,
          hospitalId,
          hospitalName: selectedHosp?.name || initialData.hospitalName,
          requiredByDate: dateTimestamp,
          notes: notes.trim(),
        });
        showSuccess('Request updated successfully.');
        navigate(`/requests/${initialData.id}`);
      } else {
        const newId = await createRequest(
          {
            patientName: patientName.trim(),
            requiredBloodGroup,
            unitsRequired: Number(unitsRequired),
            urgency,
            hospitalId,
            hospitalName: selectedHosp?.name || 'Selected Hospital',
            requiredByDate: dateTimestamp,
            notes: notes.trim(),
          },
          userProfile!,
        );
        showSuccess('Donation request raised successfully!');
        navigate(`/requests/${newId}`);
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Patient Full Name"
          placeholder="e.g. Ramesh Gupta"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          icon={<User size={16} />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Required Blood Group"
            options={bloodGroupOptions}
            value={requiredBloodGroup}
            onChange={(e) => setRequiredBloodGroup(e.target.value)}
            required
          />

          <Input
            label="Units Required"
            type="number"
            min={1}
            max={10}
            value={unitsRequired}
            onChange={(e) => setUnitsRequired(Number(e.target.value))}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Urgency Level"
            options={urgencyOptions}
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-300">
              Required By Date <span className="text-brand-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
                <Calendar size={16} />
              </span>
              <input
                type="date"
                value={requiredByDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setRequiredByDate(e.target.value)}
                required
                className="w-full bg-surface-700 border border-surface-600 rounded-lg text-sm text-slate-100 pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all duration-150 [color-scheme:dark]"
              />
            </div>
            {requiredByDate && (
              <p className="text-xs text-muted">
                📅 {new Date(requiredByDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {hospitals.length === 0 ? (
          <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg text-xs text-warning flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>No active hospitals found in Master Data. Please ask Admin to seed hospital master records.</span>
          </div>
        ) : (
          <Select
            label="Destination Hospital"
            options={hospitalOptions}
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            required
          />
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Clinical Notes / Patient Condition (Optional)
          </label>
          <textarea
            rows={3}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg p-3 text-sm text-slate-100 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            placeholder="e.g. Patient admitted for heart surgery. Needs blood urgently."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-700">
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading}>
            {isEditMode ? 'Save Changes' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
