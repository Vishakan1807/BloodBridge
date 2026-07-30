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
  whatsappStatus?: 'sent' | 'delivered' | 'unconfigured';
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
          email:      data.toEmail,
          name:       data.toName,
          subject:    data.title,
          title:      data.title,
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

// ── WhatsApp Business Cloud API Dispatch ────────────────────────
//
// Uses a Vercel serverless function (/api/whatsapp) to proxy calls to
// Meta's Graph API. Direct browser fetch() to graph.facebook.com is
// blocked by CORS — all WhatsApp calls MUST go through server-side proxy.
//
// The serverless function reads WHATSAPP_TOKEN and WHATSAPP_PHONE_ID
// from Vercel environment variables (server-side, secure).
// ─────────────────────────────────────────────────────────────────

async function dispatchWhatsApp(data: {
  toPhone:    string;
  toName:     string;
  title:      string;
  message:    string;
  refNumber?: string;
}): Promise<boolean> {
  // Normalize phone number to a clean format for the API
  let phone = data.toPhone.replace(/[^\d+]/g, '');
  if (!phone.startsWith('+')) {
    if (phone.length === 10) {
      phone = `+91${phone}`;
    } else if (phone.length === 12 && phone.startsWith('91')) {
      phone = `+${phone}`;
    } else if (phone.length === 11 && phone.startsWith('0')) {
      phone = `+91${phone.slice(1)}`;
    } else {
      phone = `+91${phone}`;
    }
  }

  try {
    // Call our Vercel serverless proxy (bypasses CORS)
    const res = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        title:        data.title,
        message:      data.message,
        refNumber:    data.refNumber,
        templateName: import.meta.env.VITE_WHATSAPP_TEMPLATE_NAME || 'bloodbridge_alert',
      }),
    });

    if (res.ok) {
      const result = await res.json();
      console.info(`[BloodBridge Notif] WhatsApp message sent to ${phone} via ${result.method || 'proxy'}`);
      return true;
    }

    const errBody = await res.text();
    console.error(`[BloodBridge Notif] WhatsApp proxy returned ${res.status}:`, errBody);
    return false;
  } catch (err) {
    console.error('[BloodBridge Notif] WhatsApp dispatch failed (proxy unreachable — are you on localhost?):', err);
    return false;
  }
}

// ── Send Notification (Firebase + Real EmailJS, SMS & WhatsApp Dispatch) ──
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

  // Execute real external Email, SMS & WhatsApp API calls if configured
  let emailSuccess    = false;
  let smsSuccess      = false;
  let whatsappSuccess = false;

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

  // WhatsApp is dispatched whenever a phone number is available (runs alongside email & SMS)
  if (data.recipientPhone) {
    whatsappSuccess = await dispatchWhatsApp({
      toPhone:    data.recipientPhone,
      toName:     data.recipientName,
      title:      data.title,
      message:    data.message,
      refNumber:  data.refNumber,
    });
  }

  const notification: AppNotification = {
    id:              notifRef.key || `notif-${now}`,
    recipientUid:    data.recipientUid,
    recipientEmail:  data.recipientEmail,
    recipientPhone:  data.recipientPhone,
    recipientName:   data.recipientName,
    title:           data.title,
    message:         data.message,
    channel:         data.channel || 'both',
    status:          'sent',
    emailStatus:     emailSuccess    ? 'delivered' : 'unconfigured',
    smsStatus:       smsSuccess      ? 'delivered' : 'unconfigured',
    whatsappStatus:  whatsappSuccess ? 'delivered' : 'unconfigured',
    requestId:       data.requestId,
    refNumber:       data.refNumber,
    timestamp:       now,
    isRead:          false,
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

  // Write to WhatsApp Log node
  if (data.recipientPhone) {
    const waRef = push(ref(db, 'whatsappLogs'));
    await set(waRef, {
      id:          waRef.key,
      toPhone:     data.recipientPhone,
      toName:      data.recipientName,
      title:       data.title,
      message:     data.message,
      status:      whatsappSuccess ? 'DELIVERED' : 'DISPATCHED_TO_SYSTEM',
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
