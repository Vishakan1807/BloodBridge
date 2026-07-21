import { ref, push, set, onValue } from 'firebase/database';
import { db } from '@/core/config/firebase';

export interface AppNotification {
  id:              string;
  recipientUid:    string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName:   string;
  title:           string;
  message:         string;
  channel:         'email' | 'sms' | 'both';
  status:          'sent' | 'delivered' | 'failed';
  emailStatus?:    'sent' | 'delivered' | 'unconfigured';
  smsStatus?:      'sent' | 'delivered' | 'unconfigured';
  requestId?:      string;
  refNumber?:      string;
  timestamp:       number;
  isRead:          boolean;
}

// ── Real Email Dispatch (EmailJS / REST API Provider) ───────────
async function dispatchRealEmail(data: {
  toEmail:    string;
  toName:     string;
  title:      string;
  message:    string;
  refNumber?: string;
}): Promise<boolean> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    console.info('[BloodBridge Notif] Real EmailJS keys not configured in .env.local. Logged notification to database.');
    return false;
  }

  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: {
          to_email:   data.toEmail,
          to_name:    data.toName,
          subject:    data.title,
          message:    data.message,
          ref_number: data.refNumber || '',
        },
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[BloodBridge Notif] EmailJS dispatch failed:', err);
    return false;
  }
}

// ── Real SMS Dispatch (Twilio / MSG91 / Fast2SMS API Provider) ──
async function dispatchRealSMS(data: {
  toPhone: string;
  toName:  string;
  message: string;
}): Promise<boolean> {
  const smsApiUrl = import.meta.env.VITE_SMS_API_URL;
  const smsApiKey = import.meta.env.VITE_SMS_API_KEY;

  if (!smsApiUrl) {
    console.info('[BloodBridge Notif] Real SMS API URL not configured in .env.local. Logged SMS to database.');
    return false;
  }

  try {
    const res = await fetch(smsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(smsApiKey ? { Authorization: `Bearer ${smsApiKey}` } : {}),
      },
      body: JSON.stringify({
        to:      data.toPhone,
        message: data.message,
        sender:  'BLDBRG',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[BloodBridge Notif] SMS Gateway dispatch failed:', err);
    return false;
  }
}

// ── Send Notification (Firebase + Real EmailJS & SMS Dispatch) ──
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

  // Execute real external Email & SMS API calls if configured
  let emailSuccess = false;
  let smsSuccess = false;

  if (data.recipientEmail && (data.channel === 'email' || data.channel === 'both' || !data.channel)) {
    emailSuccess = await dispatchRealEmail({
      toEmail:   data.recipientEmail,
      toName:    data.recipientName,
      title:     data.title,
      message:   data.message,
      refNumber: data.refNumber,
    });
  }

  if (data.recipientPhone && (data.channel === 'sms' || data.channel === 'both' || !data.channel)) {
    smsSuccess = await dispatchRealSMS({
      toPhone: data.recipientPhone,
      toName:  data.recipientName,
      message: `[BloodBridge Alert] ${data.title}: ${data.message}`,
    });
  }

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
    emailStatus:    emailSuccess ? 'delivered' : 'unconfigured',
    smsStatus:      smsSuccess ? 'delivered' : 'unconfigured',
    requestId:      data.requestId,
    refNumber:      data.refNumber,
    timestamp:      now,
    isRead:         false,
  };

  // Write notification to Firebase for recipient's real-time inbox
  await set(notifRef, notification);

  // Write to global notification audit log
  const globalNotifRef = push(ref(db, 'system_notifications'));
  await set(globalNotifRef, notification);

  // Write to SMS Log node
  const smsRef = push(ref(db, 'smsLogs'));
  await set(smsRef, {
    id:          smsRef.key,
    toPhone:     data.recipientPhone || 'Unspecified Phone',
    toName:      data.recipientName,
    message:     `[BloodBridge Alert] ${data.title}: ${data.message}`,
    status:      smsSuccess ? 'DELIVERED_TO_CARRIER' : 'DISPATCHED_TO_SYSTEM',
    timestamp:   now,
  });
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
