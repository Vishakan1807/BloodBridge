// Vercel Serverless Function — WhatsApp Cloud API Proxy
// Meta's Graph API blocks browser CORS, so all WhatsApp calls must go through this server-side proxy.

// Helper to log Meta errors plainly so Vercel doesn't collapse them into { error: ... }
function logMetaError(stepName: string, responseText: string) {
  try {
    const json = JSON.parse(responseText);
    const err = json.error || {};
    const errCode = err.code ?? 'Unknown Code';
    const subcode = err.error_subcode ?? 'N/A';
    const errType = err.type ?? 'Unknown Type';
    const errMsg  = err.message ?? responseText;
    
    console.error(`❌ [Meta API Error - ${stepName}] Code: ${errCode} (Subcode: ${subcode}) | Type: ${errType} | Message: ${errMsg}`);
  } catch {
    console.error(`❌ [Meta API Error - ${stepName}] Raw response: ${responseText}`);
  }
}

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

  if (!waToken || !waPhoneId) {
    console.error('❌ [WhatsApp API] FATAL: WhatsApp credentials (token or phone ID) are not configured in Vercel.');
    return res.status(500).json({ error: 'WhatsApp credentials not configured on server.' });
  }

  const { phone, title, message, refNumber, templateName } = req.body || {};

  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  // Normalize phone to E.164 format WITHOUT the + prefix (Meta requires digits only)
  let normalizedPhone = (phone || '').replace(/[^\d]/g, '');
  if (normalizedPhone.length === 10) {
    normalizedPhone = `91${normalizedPhone}`;
  } else if (normalizedPhone.length === 11 && normalizedPhone.startsWith('0')) {
    normalizedPhone = `91${normalizedPhone.slice(1)}`;
  }

  console.log(`[WhatsApp API] Attempting delivery to phone: ${normalizedPhone} | Template: ${templateName || defaultTemplate}`);

  const usedTemplate = templateName || defaultTemplate;

  try {
    // Strategy 1: Template with parameters + en_US language code
    const bodyWithParams_enUS = {
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

    const res1 = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithParams_enUS),
    });
    const text1 = await res1.text();
    if (res1.ok) {
      console.log('✅ [WhatsApp API] Success with Strategy 1 (en_US with params)');
      return res.status(200).json({ success: true, strategy: 1 });
    }
    logMetaError('Strategy 1 - en_US with params', text1);

    // Strategy 2: Template with parameters + en language code
    const bodyWithParams_en = JSON.parse(JSON.stringify(bodyWithParams_enUS));
    bodyWithParams_en.template.language.code = 'en';

    const res2 = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyWithParams_en),
    });
    const text2 = await res2.text();
    if (res2.ok) {
      console.log('✅ [WhatsApp API] Success with Strategy 2 (en with params)');
      return res.status(200).json({ success: true, strategy: 2 });
    }
    logMetaError('Strategy 2 - en with params', text2);

    // Strategy 3: Template WITHOUT components (in case your Meta template has no {{1}} {{2}} placeholders!)
    const bodyNoParams = {
      messaging_product: 'whatsapp',
      to:                normalizedPhone,
      type:              'template',
      template: {
        name:     usedTemplate,
        language: { code: 'en_US' },
      },
    };

    const res3 = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyNoParams),
    });
    const text3 = await res3.text();
    if (res3.ok) {
      console.log('✅ [WhatsApp API] Success with Strategy 3 (en_US no params)');
      return res.status(200).json({ success: true, strategy: 3 });
    }
    logMetaError('Strategy 3 - en_US without params', text3);

    // Strategy 3b: Template WITHOUT components + en language code
    bodyNoParams.template.language.code = 'en';
    const res3b = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyNoParams),
    });
    const text3b = await res3b.text();
    if (res3b.ok) {
      console.log('✅ [WhatsApp API] Success with Strategy 3b (en no params)');
      return res.status(200).json({ success: true, strategy: '3b' });
    }
    logMetaError('Strategy 3b - en without params', text3b);

    // Strategy 4: Fallback to free-form text (works only within 24hr window of customer messaging bot)
    const res4 = await fetch(`https://graph.facebook.com/v21.0/${waPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${waToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:                normalizedPhone,
        type:              'text',
        text: {
          preview_url: false,
          body:        `*${title}*\n\n${message}${refNumber ? `\n\n📋 Ref: ${refNumber}` : ''}`,
        },
      }),
    });
    const text4 = await res4.text();
    if (res4.ok) {
      console.log('✅ [WhatsApp API] Success with Strategy 4 (free-form text)');
      return res.status(200).json({ success: true, strategy: 4 });
    }
    logMetaError('Strategy 4 - free-form text', text4);

    return res.status(502).json({
      error: 'All WhatsApp delivery methods rejected by Meta',
      phone: normalizedPhone,
      template: usedTemplate,
      lastError: text1
    });

  } catch (err: any) {
    console.error('❌ [WhatsApp API] Server exception:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
