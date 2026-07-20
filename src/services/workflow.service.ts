import { ref, set, push, update, get } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { ALLOWED_TRANSITIONS, type WorkflowState } from '@/core/constants/workflowStates';
import { updateInventoryStock } from '@/services/master.service';
import type { UserProfile } from '@/types/auth.types';
import type { DonationRequest } from '@/types/request.types';

export async function transitionWorkflowState(
  requestId: string,
  toState: WorkflowState,
  actor: UserProfile,
  extraData?: {
    campId?:       string;
    campName?:     string;
    matchedDonor?: { uid: string; name: string };
    closureNotes?: string;
    note?:         string;
  },
): Promise<void> {
  const reqRef = ref(db, `requests/${requestId}`);
  const snapshot = await get(reqRef);
  if (!snapshot.exists()) throw new Error('Request not found.');

  const request = snapshot.val() as DonationRequest;
  const fromState = request.status;

  // ── WF-G02: Role Enforcement ─────────────────────────────────
  if (actor.role === 'user' && toState !== 'registered') {
    throw new Error('Donors cannot advance workflow lifecycle states.');
  }

  // ── WF-G01: Allowed Transitions & No Skipping States ─────────
  const validTransitions = ALLOWED_TRANSITIONS[fromState] || [];
  const matchedTransition = validTransitions.find(
    (t) => t.toState === toState && t.allowedRoles.includes(actor.role),
  );

  if (!matchedTransition) {
    throw new Error(
      `Transition from ${fromState.toUpperCase()} to ${toState.toUpperCase()} is not permitted for role ${actor.role}.`,
    );
  }

  // ── WF-G05: Closure Notes Required ────────────────────────────
  if (toState === 'closed' && !extraData?.closureNotes?.trim()) {
    throw new Error('Mandatory closure notes are required before closing a request.');
  }

  // ── WF-G04: Inventory Auto-Decrement on DONATED ─────────────
  if (fromState === 'matched' && toState === 'donated') {
    const targetCampId = extraData?.campId || request.campId;
    if (!targetCampId) throw new Error('Processing camp is required to record donation.');

    // Fetch live stock to auto-decrement
    const invSnap = await get(ref(db, `inventory/${targetCampId}/${request.requiredBloodGroup}`));
    const currentStock = invSnap.exists() ? invSnap.val().units || 0 : 0;

    if (currentStock < request.unitsRequired) {
      throw new Error(
        `Insufficient inventory stock in camp! Available: ${currentStock} units, Required: ${request.unitsRequired} units.`,
      );
    }

    // Auto-decrement camp inventory
    await updateInventoryStock(
      targetCampId,
      request.requiredBloodGroup,
      currentStock - request.unitsRequired,
      actor.uid,
    );

    // Update Donor History index for Trainer Extension
    if (request.matchedDonorUid) {
      const donorHistRef = ref(db, `donorHistory/${request.matchedDonorUid}/${requestId}`);
      await set(donorHistRef, {
        requestId,
        referenceNumber:    request.referenceNumber,
        requiredBloodGroup: request.requiredBloodGroup,
        campId:             targetCampId,
        campName:           extraData?.campName || request.campName || 'Camp',
        hospitalName:       request.hospitalName,
        status:             'donated',
        donatedAt:          Date.now(),
      });
    }
  }

  // Prepare Request Updates
  const now = Date.now();
  const updates: Partial<DonationRequest> = {
    status: toState,
    updatedAt: now,
  };

  if (extraData?.campId)   updates.campId = extraData.campId;
  if (extraData?.campName) updates.campName = extraData.campName;
  if (extraData?.matchedDonor) {
    updates.matchedDonorUid = extraData.matchedDonor.uid;
    updates.matchedDonorName = extraData.matchedDonor.name;
  }
  if (toState === 'donated') updates.donatedAt = now;
  if (extraData?.closureNotes) updates.closureNotes = extraData.closureNotes;

  // Execute Request Status Update
  await update(reqRef, updates);

  // Write Workflow History Entry
  const wfHistRef = push(ref(db, `workflow/${requestId}`));
  await set(wfHistRef, {
    fromState,
    toState,
    actorUid:  actor.uid,
    actorName: actor.displayName,
    actorRole: actor.role,
    note:      extraData?.note || extraData?.closureNotes || `State changed to ${toState}.`,
    timestamp: now,
  });

  // Write System Audit Trail Entry
  const auditRef = push(ref(db, 'audit'));
  await set(auditRef, {
    id: auditRef.key,
    type:          'WORKFLOW',
    action:        `TRANSITION_${toState.toUpperCase()}`,
    actorUid:      actor.uid,
    actorName:     actor.displayName,
    actorRole:     actor.role,
    targetId:      requestId,
    targetType:    'request',
    previousValue: { status: fromState },
    newValue:      { status: toState },
    metadata:      { referenceNumber: request.referenceNumber },
    timestamp:     now,
  });
}
