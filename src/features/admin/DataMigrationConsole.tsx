import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, ArrowRight, CheckCircle2, AlertTriangle, Layers, Server, Activity } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/core/context/ToastContext';
import { dbController, type DatabaseTable } from '@/core/db';
import { FirebaseAdapter } from '@/core/db/firebaseAdapter';

interface MigrationStatus {
  table: DatabaseTable;
  label: string;
  firebaseCount: number;
  migratedCount: number;
  status: 'pending' | 'migrating' | 'completed' | 'error';
  errorMessage?: string;
}

const INITIAL_TABLES: { table: DatabaseTable; label: string }[] = [
  { table: 'users', label: 'Registered User Profiles' },
  { table: 'camps', label: 'Blood Banks & Camps' },
  { table: 'hospitals', label: 'Registered Hospitals' },
  { table: 'camp_inventories', label: 'Camp Blood Inventories' },
  { table: 'requests', label: 'Blood Donation Requests' },
  { table: 'comments', label: 'Clinical Comment Threads' },
  { table: 'attachments', label: 'Document Attachments' },
  { table: 'audit_logs', label: 'System Audit Logs' },
];

export function DataMigrationConsole() {
  const { showSuccess, showError } = useToast();
  const [currentMode, setCurrentMode] = useState(dbController.getMode());
  const [isSyncing, setIsSyncing] = useState(false);
  const [tableStatuses, setTableStatuses] = useState<MigrationStatus[]>(
    INITIAL_TABLES.map(t => ({
      table: t.table,
      label: t.label,
      firebaseCount: 0,
      migratedCount: 0,
      status: 'pending',
    }))
  );

  useEffect(() => {
    // Load existing record counts from legacy Firebase
    const fb = new FirebaseAdapter();
    async function loadCounts() {
      const updated = await Promise.all(
        tableStatuses.map(async (st) => {
          try {
            const list = await fb.list(st.table);
            return { ...st, firebaseCount: list.length };
          } catch {
            return st;
          }
        })
      );
      setTableStatuses(updated);
    }
    loadCounts();
  }, []);

  const handleExecuteMigration = async () => {
    setIsSyncing(true);
    showSuccess('Starting zero-downtime batch migration to PostgreSQL...');
    const fb = new FirebaseAdapter();

    for (let i = 0; i < tableStatuses.length; i++) {
      const current = tableStatuses[i];
      setTableStatuses(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'migrating', errorMessage: undefined } : item));

      try {
        // Step 1: Fetch from Firebase Realtime DB
        const records = await fb.list(current.table);
        if (records.length === 0) {
          setTableStatuses(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'completed', migratedCount: 0 } : item));
          continue;
        }

        // Step 2: Push batch to Vercel Serverless Migration endpoint
        const res = await fetch('/api/migrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: current.table, records }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setTableStatuses(prev => prev.map((item, idx) => idx === i ? { 
            ...item, 
            status: 'completed', 
            migratedCount: data.count 
          } : item));
        } else {
          throw new Error(data.error || 'Server error during transaction');
        }
      } catch (error: any) {
        console.error(`Migration failed for ${current.table}:`, error);
        setTableStatuses(prev => prev.map((item, idx) => idx === i ? { 
          ...item, 
          status: 'error', 
          errorMessage: error.message 
        } : item));
        showError(`Failed to migrate ${current.label}: ${error.message}`);
        break;
      }
    }

    setIsSyncing(false);
    showSuccess('Batch synchronization routine finished!');
  };

  const handleModeSwitch = (newMode: 'firebase' | 'dual' | 'postgres') => {
    dbController.setMode(newMode);
    setCurrentMode(newMode);
    showSuccess(`Database operation mode switched to '${newMode.toUpperCase()}'.`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-7 w-7" />
            PostgreSQL Enterprise Migration Console
          </h1>
          <p className="text-red-100 text-sm mt-1">
            Zero-downtime architecture synchronization. Transition from Firebase NoSQL to real-world relational PostgreSQL without data loss or application interruptions.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
          <Activity className="h-5 w-5 text-green-300 animate-pulse" />
          <span className="text-sm font-semibold">Live Failover Engine Ready</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 col-span-1 border border-gray-200 dark:border-gray-800 shadow-md">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white mb-4">
            <Server className="h-5 w-5 text-rose-600" />
            Active Database Mode
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-6">
            Control live data traffic routing between legacy Firebase and high-performance standalone PostgreSQL.
          </p>
          <div className="space-y-3">
            {(['firebase', 'dual', 'postgres'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeSwitch(mode)}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                  currentMode === mode
                    ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 font-semibold ring-2 ring-rose-500/20'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="capitalize font-medium flex items-center gap-2">
                  <Layers className={`h-4 w-4 ${currentMode === mode ? 'text-rose-600' : 'text-gray-400'}`} />
                  {mode === 'dual' ? 'Dual (Hybrid Safe Switch)' : mode === 'firebase' ? 'Firebase (Legacy NoSQL)' : 'PostgreSQL (Enterprise SQL)'}
                </div>
                {currentMode === mode && <CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0" />}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-6 col-span-1 md:col-span-2 border border-gray-200 dark:border-gray-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <RefreshCw className={`h-5 w-5 text-rose-600 ${isSyncing ? 'animate-spin' : ''}`} />
                Batch Table Synchronization
              </h2>
              <Button
                variant="primary"
                onClick={handleExecuteMigration}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 shadow-md"
              >
                <Database className="h-4 w-4" />
                {isSyncing ? 'Synchronizing Tables...' : 'Sync Firebase to PostgreSQL'}
              </Button>
            </div>

            <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 font-medium text-left">
                  <tr>
                    <th className="px-4 py-3">Table Entity</th>
                    <th className="px-4 py-3">Firebase Count</th>
                    <th className="px-4 py-3">PostgreSQL Target</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm bg-white dark:bg-gray-950">
                  {tableStatuses.map((st) => (
                    <tr key={st.table} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{st.label}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{st.firebaseCount} rows</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3 text-gray-400" />
                        {st.migratedCount} imported
                      </td>
                      <td className="px-4 py-3">
                        {st.status === 'completed' && <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> Synced</span>}
                        {st.status === 'migrating' && <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-full font-medium animate-pulse"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Syncing...</span>}
                        {st.status === 'pending' && <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">Ready</span>}
                        {st.status === 'error' && <span title={st.errorMessage} className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 dark:bg-red-900/30 px-2.5 py-1 rounded-full font-medium cursor-help"><AlertTriangle className="h-3.5 w-3.5" /> Failed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <strong>Pro Tip:</strong> Ensure your <code>DATABASE_URL</code> environment variable is set in Vercel settings before executing batch sync. In Dual Mode, your users experience zero interruptions while data transfers seamlessly.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
