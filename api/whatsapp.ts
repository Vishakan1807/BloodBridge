// Vercel Serverless Function — WhatsApp Cloud API Proxy
// Meta's Graph API blocks browser CORS, so all WhatsApp calls must go through this server-side proxy.

export default async function handler(req: any, res: any) {
  // Set CORS headers for the response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Read WhatsApp credentials from server-side environment variables
  const waToken   = process.env.WHATSAPP_TOKEN   || process.env.VITE_WHATSAPP_TOKEN;
  const waPhoneId = process.env.WHATSAPP_PHONE_ID || process.env.VITE_WHATSAPP_PHONE_ID;
  const defaultTemplate = process.env.WHATSAPP_TEMPLATE_NAME || process.env.VITE_WHATSAPP_TEMPLATE_NAME || 'bloodbridge_alert';

  console.log('[WhatsApp API] Config check:', {
    hasToken:   !!waToken,
    tokenStart: waToken ? waToken.substring(0, 10) + '...' : 'MISSING',
    phoneId:    waPhoneId || 'MISSING',
    template:   defaultTemplate,
  });

  if (!waToken || !waPhoneId) {
    console.error('[WhatsApp API] FATAL: WhatsApp credentials not configured!');
    return res.status(500).json({ error: 'WhatsApp credentials not configured on server.' });
  }

  const { phone, title, message, refNumber, templateName } = req.body || {};

  console.log('[WhatsApp API] Request received:', { phone, title: title?.substring(0, 50), templateName });

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  // Normalize phone to E.164 format WITHOUT the + prefix (Meta requires digits only)
  let normalizedPhone = (phone || '').replace(/[^\d]/g, ''); // strip everything except digits
  if (normalizedPhone.length === 10) {
    normalizedPhone = `91${normalizedPhone}`;
  } else if (normalizedPhone.length === 11 && normalizedPhone.startsWith('0')) {
    normalizedPhone = `91${normalizedPhone.slice(1)}`;
  }
  // If it already starts with 91 and is 12 digits, it's ready
  // If it's some other format, just use as-is

  console.log('[WhatsApp API] Normalized phone:', normalizedPhone);

  const usedTemplate = templateName || defaultTemplate;

  // Strategy 1: Try approved template message
  try {
    const templateBody = {
      messaging_product: 'whatsapp',
      to:                normalizedPhone,
      type:              'template',
      template: {
        name:     usedTemplate,
        language: { code: 'en_US' },
        components: [
          {
            type:       'body',
            parameters: [
              { type: 'text', text: (title || 'BloodBridge Alert').substring(0, 1024) },
              { type: 'text', text: (message || 'You have a new notification.').substring(0, 1024) },
            ],
          },
        ],
      },
    };

    console.log('[WhatsApp API] Sending template request:', JSON.stringify(templateBody));

    const templateRes = await fetch(
      `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(templateBody),
      }
    );

    const templateResponseText = await templateRes.text();
    console.log(`[WhatsApp API] Template response (${templateRes.status}):`, templateResponseText);

    if (templateRes.ok) {
      let data;
      try { data = JSON.parse(templateResponseText); } catch { data = templateResponseText; }
      console.log('[WhatsApp API] ✅ Template message sent successfully!');
      return res.status(200).json({ success: true, method: 'template', data });
    }

    console.warn('[WhatsApp API] ⚠️ Template failed, trying en language code...');

    // Retry with 'en' language code (some templates use 'en' instead of 'en_US')
    templateBody.template.language.code = 'en';
    const retryRes = await fetch(
      `https://graph.facebook.com/v21.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(templateBody),
      }
    );

    const retryText = await retryRes.text();
    console.log(`[WhatsApp API] Template retry 'en' response (${retryRes.status}):`, retryText);

    if (retryRes.ok) {
      let data;
      try { data = JSON.parse(retryText); } catch { data = retryText; }
      console.log('[WhatsApp API] ✅ Template message sent with en language code!');
      return res.status(200).json({ success: true, method: 'template_en', data });
    }

    // Strategy 2: Fallback to free-form text (only works within 24hr conversation window)
    console.warn('[WhatsApp API] ⚠️ Both template language codes failed. Trying free-form text...');

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

    const textResponseText = await textRes.text();
    console.log(`[WhatsApp API] Text response (${textRes.status}):`, textResponseText);

    if (textRes.ok) {
      let data;
      try { data = JSON.parse(textResponseText); } catch { data = textResponseText; }
      console.log('[WhatsApp API] ✅ Text message sent successfully!');
      return res.status(200).json({ success: true, method: 'text', data });
    }

    console.error('[WhatsApp API] ❌ ALL methods failed!');
    console.error('[WhatsApp API] Template error:', templateResponseText);
    console.error('[WhatsApp API] Template (en) error:', retryText);
    console.error('[WhatsApp API] Text error:', textResponseText);

    return res.status(502).json({
      error: 'All WhatsApp delivery methods failed',
      templateError: templateResponseText,
      templateEnError: retryText,
      textError: textResponseText,
      phone: normalizedPhone,
      template: usedTemplate,
    });

  } catch (err: any) {
    console.error('[WhatsApp API] ❌ Server exception:', err.message, err.stack);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
