import { ref, push, set, get, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';

export interface AppNotification {
  id:           string;
  recipientUid: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName: string;
  title:        string;
  message:      string;
  channel:      'email' | 'sms' | 'both';
  status:       'sent' | 'delivered';
  requestId?:   string;
  refNumber?:   string;
  timestamp:    number;
  isRead:       boolean;
}

// ── Send Notification (Email & SMS Dispatch Simulation) ──────────
export async function sendNotification(data: {
  recipientUid:    string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName:   string;
  title:           string;
  message:         string;
  channel?:        'email' | 'sms' | 'both';
  requestId?:      string;
  refNumber?:      string;
}): Promise<void> {
  const now = Date.now();
  const notifRef = push(ref(db, `notifications/${data.recipientUid}`));

  const notification: AppNotification = {
    id:             notifRef.key || `notif-${now}`,
    recipientUid:   data.recipientUid,
    recipientEmail: data.recipientEmail,
    recipientPhone: data.recipientPhone,
    recipientName:  data.recipientName,
    title:          data.title,
    message:        data.message,
    channel:        data.channel || 'both',
    status:         'sent',
    requestId:      data.requestId,
    refNumber:      data.refNumber,
    timestamp:      now,
    isRead:         false,
  };

  // Write notification to Firebase for recipient's real-time inbox
  await set(notifRef, notification);

  // Also write to global notification audit log
  const globalNotifRef = push(ref(db, 'system_notifications'));
  await set(globalNotifRef, notification);

  // Log simulated SMS gateway dispatch
  if (data.channel === 'sms' || data.channel === 'both') {
    const smsRef = push(ref(db, 'smsLogs'));
    await set(smsRef, {
      id:          smsRef.key,
      toPhone:     data.recipientPhone || 'Unspecified Phone',
      toName:      data.recipientName,
      message:     `[BloodBridge Alert] ${data.title}: ${data.message}`,
      status:      'DISPATCHED_TO_CARRIER',
      timestamp:   now,
    });
  }
}

// ── Subscribe to User Notifications ───────────────────────────
export function subscribeUserNotifications(
  userUid: string,
  callback: (notifications: AppNotification[]) => void,
) {
  const userNotifRef = ref(db, `notifications/${userUid}`);
  return onValue(userNotifRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = Object.values(snapshot.val()) as AppNotification[];
    callback(data.sort((a, b) => b.timestamp - a.timestamp));
  });
}
