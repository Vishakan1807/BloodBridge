import { ref, get } from 'firebase/database';
import { db } from '@/core/config/firebase';
import type { DonationRequest } from '@/types/request.types';
import type { WorkflowState } from '@/core/constants/workflowStates';

export interface SummaryReportMetrics {
  totalRequests:      number;
  donatedCount:       number;
  pendingCount:       number;
  totalUnitsDonated:  number;
  groupBreakdown:     Record<string, number>;
  statusBreakdown:    Record<WorkflowState, number>;
}

export interface ActivityReportItem {
  id:              string;
  type:            string;
  action:          string;
  actorName:       string;
  actorRole:       string;
  targetId:        string;
  timestamp:       number;
  metadata?:       any;
}

export async function fetchSummaryReport(
  startDate?: number,
  endDate?: number,
  campId?: string,
): Promise<SummaryReportMetrics> {
  const snapshot = await get(ref(db, 'requests'));
  if (!snapshot.exists()) {
    return {
      totalRequests: 0,
      donatedCount: 0,
      pendingCount: 0,
      totalUnitsDonated: 0,
      groupBreakdown: {},
      statusBreakdown: { registered: 0, verified: 0, matched: 0, donated: 0, closed: 0 },
    };
  }

  let list = Object.values(snapshot.val()) as DonationRequest[];

  // Filter by date range
  if (startDate) list = list.filter((r) => r.createdAt >= startDate);
  if (endDate) list = list.filter((r) => r.createdAt <= endDate);

  // Filter by camp
  if (campId && campId !== 'all') {
    list = list.filter((r) => r.campId === campId);
  }

  const groupBreakdown: Record<string, number> = {};
  const statusBreakdown: Record<WorkflowState, number> = {
    registered: 0, verified: 0, matched: 0, donated: 0, closed: 0,
  };

  let totalUnitsDonated = 0;
  let donatedCount = 0;
  let pendingCount = 0;

  list.forEach((r) => {
    // Group breakdown
    groupBreakdown[r.requiredBloodGroup] = (groupBreakdown[r.requiredBloodGroup] || 0) + 1;

    // Status breakdown
    if (statusBreakdown[r.status] !== undefined) {
      statusBreakdown[r.status] += 1;
    }

    if (r.status === 'donated' || r.status === 'closed') {
      donatedCount += 1;
      totalUnitsDonated += r.unitsRequired || 0;
    } else {
      pendingCount += 1;
    }
  });

  return {
    totalRequests: list.length,
    donatedCount,
    pendingCount,
    totalUnitsDonated,
    groupBreakdown,
    statusBreakdown,
  };
}

export async function fetchActivityReport(): Promise<ActivityReportItem[]> {
  const snapshot = await get(ref(db, 'audit'));
  if (!snapshot.exists()) return [];

  const list = Object.values(snapshot.val()) as ActivityReportItem[];
  return list.sort((a, b) => b.timestamp - a.timestamp);
}

// ── Export CSV Helper ──────────────────────────────────────────
export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(','),
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
