const OUTSTAND_BASE_URL = 'https://api.outstand.so/v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');
    const {
      action,
      apiKey: clientApiKey,
      socialAccountId,
      socialNetworkId,
      tenantId,
      conversationId,
      commentId,
      messageId,
      content,
      scheduledAt
    } = body;

    const apiKey = clientApiKey || process.env.OUTSTAND_API_KEY || '';
    if (!apiKey) {
      return res.status(400).json({
        ok: false,
        error: 'Missing Outstand API Key. Add your Outstand API key in the Outstand Connection modal or Vercel OUTSTAND_API_KEY env var.'
      });
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    if (action === 'LIST_ACCOUNTS') {
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const resp = await fetch(`${OUTSTAND_BASE_URL}/social-accounts${qs}`, {
        method: 'GET',
        headers
      });
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    if (action === 'GET_AUTH_URL') {
      const network = socialNetworkId || 'instagram';
      const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/social-networks/${encodeURIComponent(network)}/auth-url${qs}`,
        {
          method: 'GET',
          headers
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    if (action === 'LIST_CONVERSATIONS') {
      const qs = socialAccountId
        ? `?social_account_id=${encodeURIComponent(socialAccountId)}`
        : '';
      const resp = await fetch(`${OUTSTAND_BASE_URL}/conversations${qs}`, {
        method: 'GET',
        headers
      });
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    if (action === 'GET_MESSAGES' && conversationId) {
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: 'GET',
          headers
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    if (action === 'SEND_PRIVATE_REPLY') {
      const resp = await fetch(`${OUTSTAND_BASE_URL}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          social_account_id: socialAccountId,
          comment_id: commentId,
          content
        })
      });
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    if (action === 'SEND_MESSAGE' && conversationId) {
      const payload = {
        content,
        ...(scheduledAt ? { scheduled_at: scheduledAt } : {})
      };
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    if (action === 'CANCEL_SCHEDULED_MESSAGE' && conversationId && messageId) {
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/conversations/${encodeURIComponent(
          conversationId
        )}/messages/${encodeURIComponent(messageId)}`,
        {
          method: 'DELETE',
          headers
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    if (action === 'MARK_READ' && conversationId) {
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/conversations/${encodeURIComponent(conversationId)}/read`,
        {
          method: 'POST',
          headers
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    return res.status(400).json({ ok: false, error: `Unsupported action: ${action}` });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Outstand proxy error'
    });
  }
}
