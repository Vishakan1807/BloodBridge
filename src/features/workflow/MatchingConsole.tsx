import React, { useEffect, useState } from 'react';
import { Target, CheckCircle2, Droplets, Clock, AlertTriangle, Activity } from 'lucide-react';
import { useRequests } from '@/features/requests/hooks/useRequests';
import { Card } from '@/components/ui/Card';
import { STATE_CONFIG } from '@/core/constants/workflowStates';
import type { DonationRequest } from '@/types/request.types';

export function MatchingConsole() {
  const { requests, loading } = useRequests();

  // Show all broadcast (city-dispatched) requests with their current fulfillment
  const broadcastRequests = requests.filter(
    (r) => r.campId === 'broadcast' || (r.status === 'verified' && r.campId === 'broadcast'),
  );

  // Include recently fulfilled ones too
  const trackableRequests = requests.filter(
    (r) => r.campId === 'broadcast' || (r.partialDonations && r.partialDonations.length > 0),
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-800 border border-surface-600/40 rounded-2xl p-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-white flex items-center gap-2">
            <Target className="text-warning" /> Blood Request Fulfillment Status
          </h1>
          <p className="text-muted text-sm mt-1">
            Live status of all broadcast requests — which blood banks donated, how many units fulfilled
          </p>
        </div>
        <div className="bg-warning-dim/40 border border-warning/30 rounded-xl px-4 py-2 text-right">
          <p className="text-xs text-muted">Active Broadcasts</p>
          <p className="font-display font-bold text-xl text-warning">{broadcastRequests.length}</p>
        </div>
      </div>

      {/* Status Table */}
      <Card padding="none" className="overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : trackableRequests.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 size={40} className="text-success mx-auto mb-3 opacity-80" />
            <p className="text-slate-200 font-medium text-base">No Broadcast Requests Yet</p>
            <p className="text-xs text-muted mt-1">
              Broadcast requests appear here once admin verifies and broadcasts them to city blood banks.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700/60">
            {trackableRequests.map((req) => {
              const fulfilled   = req.unitsFulfilled || 0;
              const stillNeeded = req.unitsRequired - fulfilled;
              const pct         = Math.round((fulfilled / req.unitsRequired) * 100);
              const stateCfg    = STATE_CONFIG[req.status];
              const donations   = req.partialDonations || [];

              return (
                <div key={req.id} className="p-5 hover:bg-surface-700/30 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left: Request Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-brand-400 text-sm">{req.referenceNumber}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stateCfg.bgColor} ${stateCfg.color}`}>
                          {stateCfg.label}
                        </span>
                        {req.urgency === 'critical' && (
                          <span className="text-[10px] font-bold bg-danger/20 text-danger px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} /> CRITICAL
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white">{req.patientName}</p>
                      <p className="text-xs text-muted">{req.hospitalName} · {req.donorCity}</p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Droplets size={13} className="text-brand-400" />
                        <span className="font-display font-bold text-white">{req.requiredBloodGroup}</span>
                        <span className="text-xs text-muted">— {req.unitsRequired} units required</span>
                      </div>
                    </div>

                    {/* Right: Fulfillment */}
                    <div className="min-w-[200px] space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">Fulfillment</span>
                        <span className={fulfilled >= req.unitsRequired ? 'text-success font-bold' : 'text-warning font-bold'}>
                          {fulfilled} / {req.unitsRequired} units ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-surface-600 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${fulfilled >= req.unitsRequired ? 'bg-success' : 'bg-brand-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Donation breakdown per camp */}
                      {donations.length > 0 ? (
                        <div className="space-y-1 pt-1">
                          {donations.map((d, i) => (
                            <div key={i} className="flex justify-between text-xs text-slate-300 bg-surface-700/50 px-2.5 py-1.5 rounded-lg">
                              <span className="text-success">🏢 {d.campName}</span>
                              <span className="font-bold">{d.units} u</span>
                            </div>
                          ))}
                          {stillNeeded > 0 && (
                            <div className="flex justify-between text-xs text-warning bg-warning/10 px-2.5 py-1.5 rounded-lg">
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> Still needed
                              </span>
                              <span className="font-bold">{stillNeeded} u</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">No blood banks have donated yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
