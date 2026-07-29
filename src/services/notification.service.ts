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
// Uses Meta's free-tier WhatsApp Cloud API (1,000 conversations/month free).
// Requires:
//   1. Meta Developer account → create an app → add WhatsApp product
//   2. A WhatsApp Business phone number (provided free in sandbox)
//   3. An approved message template (e.g. "bloodbridge_alert")
//   4. Set VITE_WHATSAPP_TOKEN and VITE_WHATSAPP_PHONE_ID in .env.local
//
// Template setup: Create a template named "bloodbridge_alert" with body:
//   "{{1}}: {{2}}"
// where {{1}} = title, {{2}} = message body.
//
// For sandbox/testing, you can send to any number you've registered
// in the Meta Developer dashboard under WhatsApp > API Setup > Test Numbers.
// ─────────────────────────────────────────────────────────────────

async function dispatchWhatsApp(data: {
  toPhone:    string;
  toName:     string;
  title:      string;
  message:    string;
  refNumber?: string;
}): Promise<boolean> {
  const waToken   = import.meta.env.VITE_WHATSAPP_TOKEN;
  const waPhoneId = import.meta.env.VITE_WHATSAPP_PHONE_ID;
  const waTemplateId = import.meta.env.VITE_WHATSAPP_TEMPLATE_NAME || 'bloodbridge_alert';

  if (!waToken || !waPhoneId) {
    console.info('[BloodBridge Notif] WhatsApp Cloud API keys not configured in .env.local. Logged to database.');
    return false;
  }

  // Normalize phone number to E.164 format (e.g. +919876543210)
  let phone = data.toPhone.replace(/[^\d+]/g, '');
  if (!phone.startsWith('+')) {
    // Automatically attach Indian +91 country code to standard 10-digit numbers
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
    // Strategy 1: Try sending a pre-approved template message first
    // Templates are required for initiating conversations (outside 24hr window)
    const templateRes = await fetch(
      `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:                phone,
          type:              'template',
          template: {
            name:     waTemplateId,
            language: { code: 'en' },
            components: [
              {
                type:       'body',
                parameters: [
                  { type: 'text', text: data.title },
                  { type: 'text', text: data.message },
                ],
              },
            ],
          },
        }),
      }
    );

    if (templateRes.ok) {
      console.info(`[BloodBridge Notif] WhatsApp template message sent to ${phone}`);
      return true;
    } else {
      const tmplErr = await templateRes.text();
      console.warn(`[BloodBridge Notif] WhatsApp template ('${waTemplateId}') attempt failed:`, tmplErr);
    }

    // Strategy 2: If template fails (e.g. still in review), try a free-form text message
    // Note: Free-form text ONLY works if the recipient messaged the bot within the last 24 hours.
    const textRes = await fetch(
      `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:                phone,
          type:              'text',
          text: {
            preview_url: false,
            body:        `*${data.title}*\n\n${data.message}${data.refNumber ? `\n\n📋 Ref: ${data.refNumber}` : ''}`,
          },
        }),
      }
    );

    if (textRes.ok) {
      console.info(`[BloodBridge Notif] WhatsApp text message sent to ${phone}`);
      return true;
    }

    const errBody = await textRes.text();
    console.error(`[BloodBridge Notif] WhatsApp fallback text dispatch failed (${textRes.status}):`, errBody);
    console.error(`[BloodBridge Notif] TIP: If testing in Meta Sandbox and template is not approved yet, you MUST send a message (like "hi") from ${phone} to the test WhatsApp number first to open the 24-hour testing window.`);
    return false;
  } catch (err) {
    console.error('[BloodBridge Notif] WhatsApp Cloud API dispatch failed:', err);
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
