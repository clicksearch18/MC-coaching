import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const OUTSTAND_BASE_URL = 'https://api.outstand.so/v1';

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req, res) {
  // Healthcheck for GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      endpoint: '/api/outstand/webhook',
      service: '2mmShift · Outstand Comment-to-DM & CRM Webhook Receiver',
      events: [
        'comment.received',
        'conversation.started',
        'message.received',
        'message.sent',
        'message.read',
        'message.failed'
      ]
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const payload = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(rawBody);

    // Optional HMAC-SHA256 webhook signature verification
    const webhookSecret = process.env.OUTSTAND_WEBHOOK_SECRET;
    const signatureHeader = req.headers['x-outstand-signature'];
    if (webhookSecret && signatureHeader) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      if (signatureHeader !== expectedSig && signatureHeader !== `sha256=${expectedSig}`) {
        return res.status(401).json({ error: 'Invalid X-Outstand-Signature' });
      }
    }

    const eventType = payload.event;
    const data = payload.data || {};
    const supabase = getSupabaseClient();

    // Load students & settings from Supabase if available
    let students = [];
    let globalApiKey = process.env.OUTSTAND_API_KEY || '';

    if (supabase) {
      const [{ data: studentRows }, { data: settingsRow }] = await Promise.all([
        supabase.from('mc_students').select('id, profile'),
        supabase.from('mc_lessons').select('data').eq('week_number', 0).maybeSingle()
      ]);

      if (Array.isArray(studentRows)) {
        students = studentRows.map(r => r.profile).filter(Boolean);
      }
      if (!globalApiKey && settingsRow?.data?.outstandApiKey) {
        globalApiKey = settingsRow.data.outstandApiKey;
      }
    }

    // -------------------------------------------------------------------------
    // EVENT 1: comment.received -> Keyword Match -> POST /v1/conversations
    // -------------------------------------------------------------------------
    if (eventType === 'comment.received') {
      const {
        network = 'instagram',
        accountId,
        postId,
        commentId,
        authorId,
        authorUsername,
        authorName,
        text = ''
      } = data;

      const handle = authorUsername ? `@${authorUsername}` : authorName || 'Prospect';
      const firstName = (authorName || authorUsername || 'there').split(/[ ._@-]/)[0];

      // Find matching student by connected Outstand accountId (or fallback to first student)
      const targetStudent =
        students.find(s => {
          try {
            const cfg = JSON.parse(s.worksheetAnswers?.outstand_config_json || '{}');
            return cfg.socialAccountId && cfg.socialAccountId === accountId;
          } catch {
            return false;
          }
        }) || students[0];

      if (!targetStudent) {
        return res.status(200).json({
          ok: true,
          handled: false,
          reason: 'No student profile found to match comment.received'
        });
      }

      const studentOutstandCfg = (() => {
        try {
          return JSON.parse(targetStudent.worksheetAnswers?.outstand_config_json || '{}');
        } catch {
          return {};
        }
      })();

      const activeApiKey = studentOutstandCfg.apiKey || globalApiKey;
      const upperComment = String(text).toUpperCase();

      // Match comment text against student's Live Shift Magnets
      const matchedMagnet = (targetStudent.shiftMagnets || []).find(mag => {
        const kw = String(mag.keywordTrigger || '').trim().toUpperCase();
        return kw && upperComment.includes(kw);
      });

      if (!matchedMagnet) {
        return res.status(200).json({
          ok: true,
          handled: false,
          reason: `Comment "${text}" did not match any Shift Magnet keyword trigger.`
        });
      }

      // Build combined Stage S (Link Delivery) + Stage H (A/B/C Diagnostic) Private Reply
      // Meta allows 1 Private Reply per comment until the user responds
      const openerPart = (matchedMagnet.dmHandoffScript || '')
        .replace(/\[First Name\]/gi, firstName)
        .replace(/\[Name\]/gi, firstName)
        .replace(/\[Link\]/gi, matchedMagnet.trackingLink || '');

      const diagnosticPart =
        matchedMagnet.dmDiagnosticQuestion ||
        'Quick question while you open it — are you currently focused on:\nA) Fixing leaky ad funnels\nB) Escaping referral-only spiky months\nC) Closing deals in DMs without sales calls?\n\n(Just reply A, B, or C!)';

      const combinedPrivateReply = `${openerPart}\n\n${diagnosticPart}`;

      let outstandResult = null;
      let outstandConvoId = `outstand-conv-${commentId || Date.now()}`;

      // Dispatch real Comment-to-DM Private Reply via Outstand API if key is configured
      if (activeApiKey && accountId && commentId) {
        try {
          const resp = await fetch(`${OUTSTAND_BASE_URL}/conversations`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              social_account_id: accountId,
              comment_id: commentId,
              content: combinedPrivateReply
            })
          });
          outstandResult = await resp.json().catch(() => ({}));
          if (outstandResult?.data?.id || outstandResult?.id) {
            outstandConvoId = outstandResult.data?.id || outstandResult.id;
          }
        } catch (err) {
          console.warn('Outstand POST /v1/conversations error:', err);
        }
      }

      // Save the new DM CRM thread into the student's profile in Supabase
      if (supabase && targetStudent) {
        const existingThreads = (() => {
          try {
            return JSON.parse(targetStudent.worksheetAnswers?.dm_crm_threads_json || '[]');
          } catch {
            return [];
          }
        })();

        // Deduplicate by commentId
        const alreadyExists = existingThreads.some(t => t.commentId && t.commentId === commentId);
        if (!alreadyExists) {
          const nowISO = new Date().toISOString();
          const formattedTime = new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          });

          const newThread = {
            id: `dm-thread-${commentId || Date.now()}`,
            outstandConversationId: outstandConvoId,
            outstandAccountId: accountId || '',
            commentId: commentId || '',
            postId: postId || '',
            postTitle: `Post ${postId || ''}`,
            authorId: authorId || '',
            network: network === 'facebook' ? 'facebook' : 'instagram',
            prospectHandle: handle,
            prospectName: firstName,
            prospectAvatar: firstName.slice(0, 2).toUpperCase(),
            triggeredKeyword: matchedMagnet.keywordTrigger,
            magnetId: matchedMagnet.id,
            magnetTitle: matchedMagnet.workingTitle,
            stage: 'STAGE_S',
            windowOpen: false, // Opens once prospect replies to the Private Reply
            unreadCount: 1,
            lastActivityAt: `Just now · ${formattedTime}`,
            lastActivityISO: nowISO,
            commentText: text,
            messages: [
              {
                id: `msg-comment-${Date.now()}-1`,
                sender: 'PROSPECT',
                text: `[Commented on Post]: "${text}"`,
                timestamp: formattedTime,
                createdAtISO: nowISO,
                status: 'DELIVERED'
              },
              {
                id: `msg-auto-${Date.now()}-2`,
                sender: 'AUTO_TRIGGER',
                text: combinedPrivateReply,
                timestamp: formattedTime,
                createdAtISO: nowISO,
                status: 'SENT'
              }
            ]
          };

          const updatedThreads = [newThread, ...existingThreads];
          const notifMsg = {
            id: `msg-outstand-${Date.now()}`,
            senderRole: 'SYSTEM',
            senderName: 'Outstand DM Trigger',
            text: `⚡ ${handle} commented "${text}" → Auto-sent "${matchedMagnet.workingTitle}" + Stage H (A/B/C Diagnostic) in DMs!`,
            timestamp: formattedTime,
            readByStudent: false,
            readByCoach: false,
            actionTarget: {
              label: 'Open DM CRM Thread',
              tab: 'MAGNETS'
            }
          };

          const updatedStudent = {
            ...targetStudent,
            dmConversationsWeekly: (targetStudent.dmConversationsWeekly || 0) + 1,
            worksheetAnswers: {
              ...(targetStudent.worksheetAnswers || {}),
              dm_crm_threads_json: JSON.stringify(updatedThreads)
            },
            messages: [...(targetStudent.messages || []), notifMsg]
          };

          await supabase.from('mc_students').upsert(
            {
              id: updatedStudent.id,
              profile: updatedStudent,
              updated_at: nowISO
            },
            { onConflict: 'id' }
          );
        }
      }

      return res.status(200).json({
        ok: true,
        handled: true,
        event: 'comment.received',
        keywordMatched: matchedMagnet.keywordTrigger,
        magnetSent: matchedMagnet.workingTitle,
        outstandConversationId: outstandConvoId
      });
    }

    // -------------------------------------------------------------------------
    // EVENT 2: message.received -> Append Prospect Reply & Unlock 24h Window
    // -------------------------------------------------------------------------
    if (eventType === 'message.received') {
      const {
        conversationId,
        accountId,
        messageId,
        senderUsername,
        senderName,
        text = ''
      } = data;

      const targetStudent =
        students.find(s => {
          try {
            const cfg = JSON.parse(s.worksheetAnswers?.outstand_config_json || '{}');
            return cfg.socialAccountId && cfg.socialAccountId === accountId;
          } catch {
            return false;
          }
        }) || students[0];

      if (supabase && targetStudent) {
        const existingThreads = (() => {
          try {
            return JSON.parse(targetStudent.worksheetAnswers?.dm_crm_threads_json || '[]');
          } catch {
            return [];
          }
        })();

        const nowISO = new Date().toISOString();
        const formattedTime = new Date().toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

        // Auto-detect if they answered A, B, or C to the Stage H diagnostic
        const trimmedUpper = String(text).trim().toUpperCase();
        const pickedLetter =
          trimmedUpper === 'A' || trimmedUpper.startsWith('A)') || trimmedUpper.startsWith('OPTION A')
            ? 'A'
            : trimmedUpper === 'B' || trimmedUpper.startsWith('B)') || trimmedUpper.startsWith('OPTION B')
            ? 'B'
            : trimmedUpper === 'C' || trimmedUpper.startsWith('C)') || trimmedUpper.startsWith('OPTION C')
            ? 'C'
            : undefined;

        let matchedThread = false;
        const updatedThreads = existingThreads.map(t => {
          const isMatch =
            (conversationId && t.outstandConversationId === conversationId) ||
            (senderUsername && t.prospectHandle.toLowerCase() === `@${senderUsername.toLowerCase()}`);
          if (!isMatch) return t;
          matchedThread = true;

          const inboundMsg = {
            id: messageId || `msg-in-${Date.now()}`,
            outstandMessageId: messageId,
            sender: 'PROSPECT',
            text,
            timestamp: formattedTime,
            createdAtISO: nowISO,
            status: 'DELIVERED'
          };

          // Cancel any scheduled re-engagement messages since the prospect replied!
          const filteredMsgs = (t.messages || []).filter(m => m.status !== 'SCHEDULED');

          return {
            ...t,
            windowOpen: true, // 24-hour Meta window is now OPEN!
            stage: t.stage === 'STAGE_S' && pickedLetter ? 'STAGE_H' : t.stage,
            constraintIdentified: pickedLetter || t.constraintIdentified,
            unreadCount: (t.unreadCount || 0) + 1,
            lastActivityAt: `Replied · ${formattedTime}`,
            lastActivityISO: nowISO,
            messages: [...filteredMsgs, inboundMsg]
          };
        });

        if (!matchedThread) {
          const handle = senderUsername ? `@${senderUsername}` : senderName || '@prospect';
          const firstName = (senderName || senderUsername || 'Prospect').split(/[ ._@-]/)[0];
          updatedThreads.unshift({
            id: `dm-thread-${conversationId || Date.now()}`,
            outstandConversationId: conversationId || '',
            outstandAccountId: accountId || '',
            network: 'instagram',
            prospectHandle: handle,
            prospectName: firstName,
            prospectAvatar: firstName.slice(0, 2).toUpperCase(),
            triggeredKeyword: 'INBOUND DM',
            stage: pickedLetter ? 'STAGE_H' : 'STAGE_S',
            constraintIdentified: pickedLetter,
            windowOpen: true,
            unreadCount: 1,
            lastActivityAt: `Replied · ${formattedTime}`,
            lastActivityISO: nowISO,
            messages: [
              {
                id: messageId || `msg-in-${Date.now()}`,
                sender: 'PROSPECT',
                text,
                timestamp: formattedTime,
                createdAtISO: nowISO,
                status: 'DELIVERED'
              }
            ]
          });
        }

        const updatedStudent = {
          ...targetStudent,
          worksheetAnswers: {
            ...(targetStudent.worksheetAnswers || {}),
            dm_crm_threads_json: JSON.stringify(updatedThreads)
          }
        };

        await supabase.from('mc_students').upsert(
          {
            id: updatedStudent.id,
            profile: updatedStudent,
            updated_at: nowISO
          },
          { onConflict: 'id' }
        );
      }

      return res.status(200).json({ ok: true, handled: true, event: 'message.received' });
    }

    return res.status(200).json({ ok: true, event: eventType || 'unknown' });
  } catch (err) {
    console.error('Outstand webhook error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal webhook error'
    });
  }
}
