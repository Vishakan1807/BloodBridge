import { ref, set, push, update, get } from 'firebase/database';
import { db } from '@/core/config/firebase';
import { ALLOWED_TRANSITIONS, type WorkflowState } from '@/core/constants/workflowStates';
import { updateInventoryStock } from '@/services/master.service';
import type { UserProfile } from '@/types/auth.types';
import type { DonationRequest, PartialDonation } from '@/types/request.types';

// ── Standard Workflow State Transition ────────────────────────
export async function transitionWorkflowState(
  requestId: string,
  toState: WorkflowState,
  actor: UserProfile,
  extraData?: {
    campId?:       string;
    campName?:     string;
    matchedDonor?: { uid: string; name: string };
    allocations?:  { campId: string; campName: string; units: number }[];
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
  // (Only for non-broadcast requests that used old single/multi-camp flow)
  if (fromState === 'matched' && toState === 'donated') {
    const allocations = request.allocations || extraData?.allocations;

    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        const invSnap = await get(ref(db, `inventory/${alloc.campId}/${request.requiredBloodGroup}`));
        const currentStock = invSnap.exists() ? invSnap.val().units || 0 : 0;
        if (currentStock < alloc.units) {
          throw new Error(
            `Insufficient stock in ${alloc.campName}! Available: ${currentStock} u, Required: ${alloc.units} u.`,
          );
        }
        await updateInventoryStock(alloc.campId, request.requiredBloodGroup, currentStock - alloc.units, actor.uid);
      }
    } else {
      const targetCampId = extraData?.campId || request.campId;
      if (targetCampId && targetCampId !== 'broadcast') {
        const invSnap = await get(ref(db, `inventory/${targetCampId}/${request.requiredBloodGroup}`));
        const currentStock = invSnap.exists() ? invSnap.val().units || 0 : 0;
        if (currentStock < request.unitsRequired) {
          throw new Error(`Insufficient inventory! Available: ${currentStock} u, Required: ${request.unitsRequired} u.`);
        }
        await updateInventoryStock(targetCampId, request.requiredBloodGroup, currentStock - request.unitsRequired, actor.uid);
      }
    }

    if (request.matchedDonorUid) {
      const donorHistRef = ref(db, `donorHistory/${request.matchedDonorUid}/${requestId}`);
      await set(donorHistRef, {
        requestId,
        referenceNumber:    request.referenceNumber,
        requiredBloodGroup: request.requiredBloodGroup,
        campId:             request.campId || 'multi-camp',
        campName:           extraData?.campName || request.campName || 'Multi-Camp Inventory',
        hospitalName:       request.hospitalName,
        status:             'donated',
        donatedAt:          Date.now(),
      });
    }
  }

  // Prepare Request Updates
  const now = Date.now();
  const updates: Partial<DonationRequest> = {
    status:    toState,
    updatedAt: now,
  };

  if (extraData?.campId)       updates.campId = extraData.campId;
  if (extraData?.campName)     updates.campName = extraData.campName;
  if (extraData?.allocations)  updates.allocations = extraData.allocations;
  if (extraData?.matchedDonor) {
    updates.matchedDonorUid  = extraData.matchedDonor.uid;
    updates.matchedDonorName = extraData.matchedDonor.name;
  }
  if (toState === 'donated') updates.donatedAt = now;
  if (extraData?.closureNotes) updates.closureNotes = extraData.closureNotes;

  await update(reqRef, updates);

  // Workflow History
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

  // Audit Trail
  const auditRef = push(ref(db, 'audit'));
  await set(auditRef, {
    id:            auditRef.key,
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

  // Automated Email & SMS Notifications
  try {
    const { sendNotification } = await import('@/services/notification.service');
    const { getProfile }       = await import('@/services/user.service');

    if (request.createdBy) {
      const requester = await getProfile(request.createdBy);
      if (requester) {
        let title   = `Request ${request.referenceNumber} Status Updated`;
        let message = `Your request for ${request.patientName} (${request.requiredBloodGroup}) moved to ${toState.toUpperCase()}.`;

        if (toState === 'verified') {
          title   = `✅ [BloodBridge] Request ${request.referenceNumber} Verified`;
          message = `Your blood request for ${request.patientName} (${request.requiredBloodGroup}, ${request.unitsRequired} units) has been verified and broadcast to blood banks in ${request.donorCity || 'your city'}. You will be notified when units are allocated.`;
        } else if (toState === 'donated') {
          title   = `💉 [BloodBridge] Blood Units Fully Allocated — ${request.referenceNumber}`;
          message = `All ${request.unitsRequired} unit(s) of ${request.requiredBloodGroup} for ${request.patientName} have been allocated by blood banks. Please collect from the respective blood banks for transfusion at ${request.hospitalName}.`;
        } else if (toState === 'closed') {
          title   = `🔒 [BloodBridge] Case Closed — ${request.referenceNumber}`;
          message = `Request ${request.referenceNumber} has been successfully closed. Notes: "${extraData?.closureNotes || 'Case completed.'}"`;
        }

        await sendNotification({
          recipientUid:   requester.uid,
          recipientEmail: requester.email,
          recipientPhone: requester.phone,
          recipientName:  requester.displayName,
          title,
          message,
          channel:        'both',
          requestId,
          refNumber:      request.referenceNumber,
        });
      }
    }
  } catch (notifErr) {
    console.error('Failed to dispatch notification:', notifErr);
  }
}

// ── Partial Donation by Camp Coordinator (First-Come-First-Serve) ─────────────
export async function partialDonate(
  requestId: string,
  actor:     UserProfile,
  campId:    string,
  campName:  string,
  units:     number,
): Promise<{ fulfilled: boolean; unitsFulfilled: number }> {
  const reqRef = ref(db, `requests/${requestId}`);
  const snapshot = await get(reqRef);
  if (!snapshot.exists()) throw new Error('Request not found.');

  const request = snapshot.val() as DonationRequest;

  // Only allow donation on broadcast-verified requests
  if (request.status !== 'verified') {
    throw new Error(`Cannot donate — request is in ${request.status.toUpperCase()} state, not VERIFIED.`);
  }

  const alreadyFulfilled = request.unitsFulfilled || 0;
  const stillNeeded      = request.unitsRequired - alreadyFulfilled;

  if (stillNeeded <= 0) {
    throw new Error('This request is already fully fulfilled by other blood banks.');
  }

  if (units <= 0 || units > stillNeeded) {
    throw new Error(`You can donate between 1 and ${stillNeeded} units for this request.`);
  }

  // Check camp inventory
  const invSnap     = await get(ref(db, `inventory/${campId}/${request.requiredBloodGroup}`));
  const campStock   = invSnap.exists() ? invSnap.val().units || 0 : 0;

  if (campStock < units) {
    throw new Error(`Insufficient stock! Your camp has ${campStock} unit(s) of ${request.requiredBloodGroup}, but ${units} requested.`);
  }

  // Check if this camp already donated to this request
  const existingDonations = request.partialDonations || [];
  const alreadyDonatedByThisCamp = existingDonations.find((d) => d.campId === campId);
  if (alreadyDonatedByThisCamp) {
    throw new Error(`Your blood bank has already donated ${alreadyDonatedByThisCamp.units} unit(s) to this request.`);
  }

  // Deduct from camp inventory
  await updateInventoryStock(campId, request.requiredBloodGroup, campStock - units, actor.uid);

  // Record this donation
  const newDonation: PartialDonation = {
    campId,
    campName,
    units,
    donatedAt: Date.now(),
    donatedBy: actor.uid,
  };

  const newPartialDonations = [...existingDonations, newDonation];
  const newUnitsFulfilled   = alreadyFulfilled + units;
  const fullyFulfilled      = newUnitsFulfilled >= request.unitsRequired;

  const now = Date.now();

  // Build updates for the request
  const updates: Partial<DonationRequest> & Record<string, any> = {
    partialDonations: newPartialDonations,
    unitsFulfilled:   newUnitsFulfilled,
    updatedAt:        now,
  };

  // If fully fulfilled → auto-transition to 'donated'
  if (fullyFulfilled) {
    updates.status    = 'donated' as WorkflowState;
    updates.donatedAt = now;
    // Build combined campName summary
    updates.campName  = newPartialDonations.map((d) => `${d.campName} (${d.units}u)`).join(', ');
  }

  await update(reqRef, updates);

  // Workflow history entry
  const wfHistRef = push(ref(db, `workflow/${requestId}`));
  await set(wfHistRef, {
    fromState: 'verified',
    toState:   fullyFulfilled ? 'donated' : 'verified',
    actorUid:  actor.uid,
    actorName: actor.displayName,
    actorRole: actor.role,
    note:      `${campName} donated ${units} unit(s) of ${request.requiredBloodGroup}. Total fulfilled: ${newUnitsFulfilled}/${request.unitsRequired}.`,
    timestamp: now,
  });

  // Audit entry
  const auditRef = push(ref(db, 'audit'));
  await set(auditRef, {
    id:            auditRef.key,
    type:          'PARTIAL_DONATION',
    action:        'CAMP_PARTIAL_DONATE',
    actorUid:      actor.uid,
    actorName:     actor.displayName,
    actorRole:     actor.role,
    targetId:      requestId,
    targetType:    'request',
    previousValue: { unitsFulfilled: alreadyFulfilled },
    newValue:      { unitsFulfilled: newUnitsFulfilled, campId, campName, units },
    metadata:      { referenceNumber: request.referenceNumber },
    timestamp:     now,
  });

  // Notify requester about partial donation
  try {
    const { sendNotification } = await import('@/services/notification.service');
    const { getProfile }       = await import('@/services/user.service');

    if (request.createdBy) {
      const requester = await getProfile(request.createdBy);
      if (requester) {
        const title = fullyFulfilled
          ? `💉 [BloodBridge] All Units Allocated — ${request.referenceNumber}`
          : `🩸 [BloodBridge] Partial Donation — ${request.referenceNumber}`;
        const message = fullyFulfilled
          ? `All ${request.unitsRequired} unit(s) of ${request.requiredBloodGroup} for ${request.patientName} are now fully allocated! Collect from the respective blood banks for transfusion at ${request.hospitalName}.`
          : `${campName} has donated ${units} unit(s) of ${request.requiredBloodGroup} for ${request.patientName}. ${newUnitsFulfilled} of ${request.unitsRequired} units fulfilled so far. ${stillNeeded - units} unit(s) still needed.`;

        await sendNotification({
          recipientUid:   requester.uid,
          recipientEmail: requester.email,
          recipientPhone: requester.phone,
          recipientName:  requester.displayName,
          title,
          message,
          channel:        'both',
          requestId,
          refNumber:      request.referenceNumber,
        });
      }
    }
  } catch (notifErr) {
    console.error('Notification dispatch failed:', notifErr);
  }

  return { fulfilled: fullyFulfilled, unitsFulfilled: newUnitsFulfilled };
}
