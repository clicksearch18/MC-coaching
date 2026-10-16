const OUTSTAND_BASE_URL = 'https://api.outstand.so/v1';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body =
      typeof req.body === 'object' && req.body !== null
        ? req.body
        : JSON.parse(req.body || '{}');

    const {
      action,
      apiKey: clientApiKey,
      socialAccountId,
      socialNetworkId,
      tenantId,
      redirectUri,
      sessionToken,
      selectedPageIds,
      conversationId,
      commentId,
      messageId,
      content,
      text,
      scheduledAt
    } = body;

    const messageContent = content || text || '';
    const apiKey = clientApiKey || process.env.OUTSTAND_API_KEY || '';
    if (!apiKey) {
      return res.status(400).json({
        ok: false,
        error:
          'Missing Outstand API Key. Paste your Outstand API key (out_live_...) in the Connect Instagram & Facebook modal or set OUTSTAND_API_KEY in Vercel environment variables.'
      });
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // 1. List Connected Social Accounts (Instagram, Facebook, etc.)
    if (action === 'LIST_ACCOUNTS') {
      const params = new URLSearchParams();
      if (tenantId) params.set('tenant_id', tenantId);
      const qs = params.toString() ? `?${params.toString()}` : '';
      let resp = await fetch(`${OUTSTAND_BASE_URL}/social-accounts${qs}`, {
        method: 'GET',
        headers
      });
      let json = await resp.json().catch(() => ({}));
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

      // Fallback: if tenant filter returned 0 accounts, check workspace-level accounts
      if (tenantId && list.length === 0) {
        const fallbackResp = await fetch(`${OUTSTAND_BASE_URL}/social-accounts`, {
          method: 'GET',
          headers
        });
        if (fallbackResp.ok) {
          resp = fallbackResp;
          json = await fallbackResp.json().catch(() => ({}));
        }
      }
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    // 2. Generate OAuth Connection URL for Instagram or Facebook
    if (action === 'GET_AUTH_URL') {
      const network = (body.network || socialNetworkId || 'instagram').toLowerCase();
      const payload = {};
      if (redirectUri) payload.redirect_uri = redirectUri;
      if (tenantId) payload.tenant_id = tenantId;

      const requestAuthUrl = async () => {
        let r = await fetch(
          `${OUTSTAND_BASE_URL}/social-networks/${encodeURIComponent(network)}/auth-url`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          }
        );

        if (r.status === 404 || r.status === 405) {
          const params = new URLSearchParams();
          if (tenantId) params.set('tenant_id', tenantId);
          if (redirectUri) params.set('redirect_uri', redirectUri);
          const qs = params.toString() ? `?${params.toString()}` : '';
          r = await fetch(
            `${OUTSTAND_BASE_URL}/social-networks/${encodeURIComponent(network)}/auth-url${qs}`,
            {
              method: 'GET',
              headers
            }
          );
        }
        return r;
      };

      let resp = await requestAuthUrl();

      // If the social network (e.g. 'facebook' or 'instagram') isn't enabled on the workspace yet, enable it automatically and retry
      if (!resp.ok) {
        await fetch(`${OUTSTAND_BASE_URL}/social-networks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ network })
        }).catch(() => {});
        resp = await requestAuthUrl();
      }

      const json = await resp.json().catch(() => ({}));
      const authUrl =
        json?.data?.auth_url ||
        json?.data?.url ||
        json?.auth_url ||
        json?.url ||
        null;

      return res.status(resp.status).json({
        ok: resp.ok && Boolean(authUrl),
        network,
        authUrl,
        data: json,
        error: !resp.ok
          ? json?.error || json?.message || `Failed to get ${network} OAuth URL`
          : undefined
      });
    }

    // 3. Get Pending Connection Details (for Facebook multi-page / Instagram Business selection after OAuth callback)
    if (action === 'GET_PENDING_CONNECTION' && sessionToken) {
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/social-accounts/pending/${encodeURIComponent(sessionToken)}`,
        {
          method: 'GET',
          headers
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    // 4. Finalize Pending Connection (select specific Facebook Page / Instagram account)
    if (action === 'FINALIZE_PENDING_CONNECTION' && sessionToken) {
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/social-accounts/pending/${encodeURIComponent(sessionToken)}/finalize`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            selectedPageIds: selectedPageIds || [],
            pageIds: selectedPageIds || [],
            accountIds: selectedPageIds || []
          })
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    // 5. Disconnect / Delete a Social Account
    if (action === 'DISCONNECT_ACCOUNT' && socialAccountId) {
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/social-accounts/${encodeURIComponent(socialAccountId)}`,
        {
          method: 'DELETE',
          headers
        }
      );
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    // 6. List DM Conversations
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

    // 7. Get Messages in a Conversation
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

    // 8. Send Comment-to-DM Private Reply (POST /v1/conversations)
    if (action === 'SEND_PRIVATE_REPLY') {
      const resp = await fetch(`${OUTSTAND_BASE_URL}/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          social_account_id: socialAccountId,
          comment_id: commentId,
          content: messageContent
        })
      });
      const json = await resp.json().catch(() => ({}));
      return res.status(resp.status).json({ ok: resp.ok, data: json });
    }

    // 9. Send or Schedule DM Message (POST /v1/conversations/{id}/messages)
    if (action === 'SEND_MESSAGE' && conversationId) {
      const payload = {
        content: messageContent,
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

    // 10. Cancel Scheduled Re-Engagement DM (DELETE /v1/conversations/{id}/messages/{messageId})
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

    // 11. Mark Conversation Read
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
