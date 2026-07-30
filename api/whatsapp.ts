// Vercel Serverless Function — WhatsApp Cloud API Proxy
// Meta's Graph API blocks browser CORS, so all WhatsApp calls must go through this server-side proxy.

export default async function handler(req: any, res: any) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read WhatsApp credentials from server-side environment variables
  const waToken   = process.env.WHATSAPP_TOKEN   || process.env.VITE_WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_ID || process.env.VITE_WHATSAPP_PHONE_ID;
  const waTemplate = process.env.WHATSAPP_TEMPLATE_NAME || process.env.VITE_WHATSAPP_TEMPLATE_NAME || 'bloodbridge_alert';

  if (!waToken || !waPhoneId) {
    return res.status(500).json({ error: 'WhatsApp credentials not configured on server.' });
  }

  const { phone, title, message, refNumber, templateName } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  // Normalize phone to E.164 format
  let normalizedPhone = (phone || '').replace(/[^\d+]/g, '');
  if (!normalizedPhone.startsWith('+')) {
    if (normalizedPhone.length === 10) {
      normalizedPhone = `91${normalizedPhone}`;
    } else if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      // already fine
    } else if (normalizedPhone.length === 11 && normalizedPhone.startsWith('0')) {
      normalizedPhone = `91${normalizedPhone.slice(1)}`;
    } else {
      normalizedPhone = `91${normalizedPhone}`;
    }
  } else {
    normalizedPhone = normalizedPhone.replace('+', '');
  }

  const usedTemplate = templateName || waTemplate;

  // Strategy 1: Try approved template message
  try {
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
          to:                normalizedPhone,
          type:              'template',
          template: {
            name:     usedTemplate,
            language: { code: 'en' },
            components: [
              {
                type:       'body',
                parameters: [
                  { type: 'text', text: title || 'BloodBridge Alert' },
                  { type: 'text', text: message || 'You have a new notification.' },
                ],
              },
            ],
          },
        }),
      }
    );

    if (templateRes.ok) {
      const data = await templateRes.json();
      console.log('[WhatsApp API] Template message sent successfully:', data);
      return res.status(200).json({ success: true, method: 'template', data });
    }

    const tmplErr = await templateRes.text();
    console.warn('[WhatsApp API] Template failed:', tmplErr);

    // Strategy 2: Fallback to free-form text (only works within 24hr conversation window)
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
          to:                normalizedPhone,
          type:              'text',
          text: {
            preview_url: false,
            body:        `*${title}*\n\n${message}${refNumber ? `\n\n📋 Ref: ${refNumber}` : ''}`,
          },
        }),
      }
    );

    if (textRes.ok) {
      const data = await textRes.json();
      console.log('[WhatsApp API] Text message sent successfully:', data);
      return res.status(200).json({ success: true, method: 'text', data });
    }

    const textErr = await textRes.text();
    console.error('[WhatsApp API] Text fallback also failed:', textErr);
    return res.status(502).json({ error: 'Both template and text message failed', templateError: tmplErr, textError: textErr });

  } catch (err: any) {
    console.error('[WhatsApp API] Server error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
