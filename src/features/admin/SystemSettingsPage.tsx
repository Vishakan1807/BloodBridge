import React, { useState } from 'react';
import { Settings, Globe, ShieldCheck, Bell, Lock, Palette, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/core/context/ToastContext';
import { useTheme, type Theme } from '@/core/context/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';

export function SystemSettingsPage() {
  const { showSuccess, showError } = useToast();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'general' | 'clinical' | 'notifications' | 'security' | 'appearance'>('general');
  const [saving, setSaving] = useState(false);

  // General Settings
  const [appName, setAppName] = useState('BloodBridge');
  const [orgName, setOrgName] = useState('National Blood Transfusion Network');
  const [supportEmail, setSupportEmail] = useState('support@bloodbridge.org');
  const [supportPhone, setSupportPhone] = useState('+91-1800-256-6327');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Clinical & Safety Rules
  const [redonationInterval, setRedonationInterval] = useState(56);
  const [lowStockThreshold, setLowStockThreshold] = useState(3);
  const [requireClosureNotes, setRequireClosureNotes] = useState(true);
  const [autoEscalateCritical, setAutoEscalateCritical] = useState(true);

  // Notifications
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsEmergencyBroadcast, setSmsEmergencyBroadcast] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);

  // Security & Session
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [auditRetentionDays, setAuditRetentionDays] = useState(365);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      // Simulate saving to database/localStorage
      localStorage.setItem(
        'bloodbridge-settings',
        JSON.stringify({
          appName,
          orgName,
          supportEmail,
          supportPhone,
          maintenanceMode,
          redonationInterval,
          lowStockThreshold,
          requireClosureNotes,
          autoEscalateCritical,
          emailAlerts,
          smsEmergencyBroadcast,
          lowStockAlerts,
          sessionTimeout,
          requireEmailVerification,
          auditRetentionDays,
        }),
      );

      await new Promise((res) => setTimeout(res, 600));
      showSuccess('System settings updated successfully.');
    } catch (err: any) {
      showError(err?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  const themeSelectOptions: SelectOption[] = [
    { value: 'dark', label: 'Crimson Dark (Default)' },
    { value: 'light', label: 'Executive Light' },
    { value: 'emerald', label: 'Emerald Health' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Settings className="text-brand-400" /> System Settings & Configuration
          </h1>
          <p className="text-muted text-sm mt-1">
            Global application parameters, clinical rules, security policies, and UI preferences
          </p>
        </div>

        <Button variant="primary" icon={<Save size={16} />} loading={saving} onClick={handleSaveSettings}>
          Save All Changes
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-700 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'general' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-white hover:bg-surface-700/60'
          }`}
        >
          <Globe size={14} /> General Platform
        </button>

        <button
          onClick={() => setActiveTab('clinical')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'clinical' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-white hover:bg-surface-700/60'
          }`}
        >
          <ShieldCheck size={14} /> Clinical & Safety
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'notifications' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-white hover:bg-surface-700/60'
          }`}
        >
          <Bell size={14} /> Alerts & Notifications
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'security' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-white hover:bg-surface-700/60'
          }`}
        >
          <Lock size={14} /> Security & Governance
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
            activeTab === 'appearance' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-white hover:bg-surface-700/60'
          }`}
        >
          <Palette size={14} /> Appearance
        </button>
      </div>

      <form onSubmit={handleSaveSettings}>
        {/* Tab 1: General Settings */}
        {activeTab === 'general' && (
          <Card padding="lg" className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-white border-b border-surface-700 pb-3">
              General Platform Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Application Name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                required
              />
              <Input
                label="Parent Organization"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Public Support Email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                required
              />
              <Input
                label="Support Helpline Phone"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                required
              />
            </div>

            <div className="pt-4 border-t border-surface-700 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">System Maintenance Mode</p>
                <p className="text-xs text-muted">Temporarily block non-admin logins for system updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </Card>
        )}

        {/* Tab 2: Clinical & Safety Rules */}
        {activeTab === 'clinical' && (
          <Card padding="lg" className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-white border-b border-surface-700 pb-3">
              Clinical & Safety Parameters
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="WHO Re-donation Interval (Days)"
                type="number"
                min={30}
                max={180}
                value={redonationInterval}
                onChange={(e) => setRedonationInterval(Number(e.target.value))}
                hint="Standard WHO interval is 56 days between whole blood donations"
                required
              />

              <Input
                label="Critical Low Stock Threshold (Units)"
                type="number"
                min={1}
                max={20}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                hint="Triggers low stock warnings when camp inventory drops below this level"
                required
              />
            </div>

            <div className="pt-4 border-t border-surface-700 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Mandatory Closure Notes Enforcement</p>
                  <p className="text-xs text-muted">Require coordinators to type closure notes before closing a request</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireClosureNotes}
                    onChange={(e) => setRequireClosureNotes(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Auto-Escalate Emergency Requests</p>
                  <p className="text-xs text-muted">Flag requests marked 'Critical' at top of verification & matching queues</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEscalateCritical}
                    onChange={(e) => setAutoEscalateCritical(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 3: Notifications */}
        {activeTab === 'notifications' && (
          <Card padding="lg" className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-white border-b border-surface-700 pb-3">
              Alerts & Communication Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Email Status Updates</p>
                  <p className="text-xs text-muted">Send automated emails to donors on status changes (Verified, Matched, Donated)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Emergency Donor SMS Broadcast</p>
                  <p className="text-xs text-muted">Allow camp coordinators to send emergency SMS alerts for rare blood matches</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsEmergencyBroadcast}
                    onChange={(e) => setSmsEmergencyBroadcast(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white text-sm">Low Stock Inventory Alerts</p>
                  <p className="text-xs text-muted">Notify Camp Coordinator when camp inventory drops below threshold</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lowStockAlerts}
                    onChange={(e) => setLowStockAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Tab 4: Security & Governance */}
        {activeTab === 'security' && (
          <Card padding="lg" className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-white border-b border-surface-700 pb-3">
              Security Policies & Session Control
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Session Inactivity Timeout (Minutes)"
                type="number"
                min={5}
                max={240}
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                required
              />

              <Input
                label="Audit Log Retention Period (Days)"
                type="number"
                min={30}
                max={3650}
                value={auditRetentionDays}
                onChange={(e) => setAuditRetentionDays(Number(e.target.value))}
                required
              />
            </div>

            <div className="pt-4 border-t border-surface-700 flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-sm">Require Email Verification on Registration</p>
                <p className="text-xs text-muted">Force new donor accounts to verify email before raising requests</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireEmailVerification}
                  onChange={(e) => setRequireEmailVerification(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
              </label>
            </div>
          </Card>
        )}

        {/* Tab 5: Appearance */}
        {activeTab === 'appearance' && (
          <Card padding="lg" className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-white border-b border-surface-700 pb-3">
              Default Theme & UI Style
            </h2>

            <Select
              label="System Default Theme Preset"
              options={themeSelectOptions}
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            />

            <p className="text-xs text-muted">
              Users can also change themes dynamically using the top theme toggle bar on any page.
            </p>
          </Card>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="primary" type="submit" loading={saving} icon={<Save size={16} />}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
