import { createClient } from '@supabase/supabase-js';

const OUTSTAND_BASE_URL = 'https://api.outstand.so/v1';

async function resolveOutstandApiKey(clientApiKey) {
  if (process.env.OUTSTAND_API_KEY) return process.env.OUTSTAND_API_KEY;
  if (clientApiKey) return clientApiKey;

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
      .select('data')
      .eq('week_number', 0)
      .maybeSingle();
    if (settingsRow?.data?.outstandApiKey) {
      return settingsRow.data.outstandApiKey;
    }
    const { data: studentRows } = await supabase.from('mc_students').select('id, profile');
    for (const row of studentRows || []) {
      const cfg = JSON.parse(row.profile?.worksheetAnswers?.outstand_config_json || '{}');
      if (cfg.apiKey) return cfg.apiKey;
    }
  } catch {
    // ignore
  }
  return '';
}

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
      authorId,
      messageId,
      content,
      text,
      scheduledAt
    } = body;

    const messageContent = content || text || '';
    const apiKey = await resolveOutstandApiKey(clientApiKey);
    if (!apiKey) {
      return res.status(400).json({
        ok: false,
        error: 'Social account connection is temporarily unavailable. Please contact your coach.'
      });
    }

    if (!action || typeof action !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid request action.' });
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // 1. List Connected Social Accounts (Scoped strictly to student tenantId when provided)
    if (action === 'LIST_ACCOUNTS') {
      const resp = await fetch(`${OUTSTAND_BASE_URL}/social-accounts`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000)
      });
      const json = await resp.json().catch(() => ({}));
      const rawList = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
      // Filter to accounts belonging to this student tenantId (or untagged accounts finalized in this workspace)
      const scopedList = tenantId
        ? rawList.filter(a => {
            const accTenant = a.tenant_id || a.tenantId;
            return !accTenant || accTenant === tenantId;
          })
        : rawList;
      return res.status(resp.status).json({
        ok: resp.ok,
        data: Array.isArray(json?.data) ? { ...json, data: scopedList } : scopedList
      });
    }

    // 2. Generate OAuth Connection URL for Instagram or Facebook
    if (action === 'GET_AUTH_URL') {
      const network = (body.network || socialNetworkId || 'instagram').toLowerCase();
      const payload = {};
      if (redirectUri) payload.redirect_uri = redirectUri;
      if (tenantId) payload.tenant_id = tenantId;
      // Per Outstand Conversations docs, instagram_business_manage_messages & instagram_business_manage_comments
      // must be explicitly requested in scopes so Outstand subscribes the account to DMs and comment webhooks.
      if (network === 'instagram') {
        payload.scopes =
          body.scopes ||
          'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_comments,instagram_business_manage_insights,instagram_business_manage_messages';
      }

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
          if (payload.scopes) params.set('scopes', payload.scopes);
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
      const availablePages =
        json?.data?.availablePages ||
        json?.data?.available_pages ||
        json?.data?.pages ||
        json?.data?.accounts ||
        json?.availablePages ||
        json?.available_pages ||
        json?.pages ||
        (Array.isArray(json?.data) ? json.data : []);

      return res.status(resp.status).json({
        ok: resp.ok,
        network: json?.data?.network || json?.network || null,
        availablePages: Array.isArray(availablePages) ? availablePages : [],
        data: json,
        error: !resp.ok ? json?.error || json?.message || 'Pending session expired or invalid' : undefined
      });
    }

    // 4. Finalize Pending Connection (select specific Facebook Page / Instagram account)
    if (action === 'FINALIZE_PENDING_CONNECTION' && sessionToken) {
      const pageIds = Array.isArray(selectedPageIds) ? selectedPageIds.filter(Boolean) : [];
      const resp = await fetch(
        `${OUTSTAND_BASE_URL}/social-accounts/pending/${encodeURIComponent(sessionToken)}/finalize`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            selectedPageIds: pageIds
          })
        }
      );
      const json = await resp.json().catch(() => ({}));
      const connectedAccounts =
        json?.connectedAccounts ||
        json?.data?.connectedAccounts ||
        (Array.isArray(json?.data) ? json.data : []);

      return res.status(resp.status).json({
        ok: resp.ok,
        connectedAccounts: Array.isArray(connectedAccounts) ? connectedAccounts : [],
        data: json,
        error: !resp.ok
          ? json?.error || json?.message || 'Could not finalize Facebook Page connection'
          : undefined
      });
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
          content: messageContent,
          instagram: {
            comment_id: commentId,
            ...(authorId ? { author_id: authorId } : {})
          }
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
