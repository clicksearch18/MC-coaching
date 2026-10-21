import { createClient } from '@supabase/supabase-js';

async function resolveGhlWebhookUrl(clientWebhookUrl) {
  if (clientWebhookUrl && /^https?:\/\//i.test(String(clientWebhookUrl).trim())) {
    return String(clientWebhookUrl).trim();
  }
  if (process.env.GHL_WEBHOOK_URL) return process.env.GHL_WEBHOOK_URL.trim();
  if (process.env.VITE_GHL_WEBHOOK_URL) return process.env.VITE_GHL_WEBHOOK_URL.trim();

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  if (!url || !key) return '';

  try {
    const supabase = createClient(url, key);
    const { data: settingsRow } = await supabase
      .from('mc_lessons')
      .select('lesson')
      .eq('week_number', 0)
      .maybeSingle();
    if (settingsRow?.lesson?.ghlWebhookUrl) {
      return String(settingsRow.lesson.ghlWebhookUrl).trim();
    }
  } catch {
    // ignore
  }
  return '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body =
      typeof req.body === 'object' && req.body !== null
        ? req.body
        : JSON.parse(req.body || '{}');

    const targetUrl = await resolveGhlWebhookUrl(body.webhookUrl);
    if (!targetUrl) {
      return res.status(200).json({
        ok: false,
        skipped: true,
        error: 'No GoHighLevel Inbound Webhook URL configured yet.'
      });
    }

    const payload = {
      source: '2mmShift_Coaching_Portal',
      timestampISO: new Date().toISOString(),
      ...(body.payload || {})
    };

    const ghlResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await ghlResponse.text().catch(() => '');

    return res.status(200).json({
      ok: ghlResponse.ok,
      status: ghlResponse.status,
      response: responseText.slice(0, 300)
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to dispatch GHL webhook'
    });
  }
}
