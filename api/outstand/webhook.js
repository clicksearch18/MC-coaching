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

        // Deduplicate by sourceCommentId
        const alreadyExists = existingThreads.some(
          t => (t.sourceCommentId || t.commentId) && (t.sourceCommentId === commentId || t.commentId === commentId)
        );
        if (!alreadyExists) {
          const nowISO = new Date().toISOString();
          const formattedTime = new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
          });
          const cleanHandle = String(handle).replace(/^@/, '');
          const threadId = `crm-${commentId || Date.now()}`;

          const newThread = {
            id: threadId,
            outstandConversationId: outstandConvoId || null,
            socialAccountId: accountId || null,
            platform: network === 'facebook' ? 'facebook' : 'instagram',
            prospectHandle: cleanHandle,
            prospectName: firstName,
            matchedKeyword: matchedMagnet.keywordTrigger,
            matchedMagnetId: matchedMagnet.id,
            matchedMagnetTitle: matchedMagnet.workingTitle,
            sourceCommentId: commentId || null,
            sourcePostId: postId || null,
            stage: 'STAGE_S',
            constraintPicked: '',
            windowOpen: false, // Opens once prospect replies to the Private Reply
            lastUserReplyAt: null,
            scheduledFollowup: null,
            unreadCount: 1,
            updatedAt: nowISO,
            messages: [
              {
                id: `msg-comment-${Date.now()}-1`,
                direction: 'inbound_comment',
                text,
                stageTag: `Comment Trigger (${matchedMagnet.keywordTrigger})`,
                createdAt: nowISO,
                deliveryStatus: 'delivered'
              },
              {
                id: `msg-auto-${Date.now()}-2`,
                direction: 'outbound_dm',
                text: combinedPrivateReply,
                stageTag: 'Stage S + H · Outstand Private Reply',
                createdAt: nowISO,
                deliveryStatus: 'sent'
              }
            ]
          };

          const updatedThreads = [newThread, ...existingThreads];
          const notifMsg = {
            id: `msg-outstand-cmt-${Date.now()}`,
            senderRole: 'SYSTEM',
            senderName: 'Live DM CRM · Comment Trigger',
            text: `⚡ @${cleanHandle} commented "${text}" → Outstand auto-sent "${matchedMagnet.workingTitle}" + Stage H (A/B/C Diagnostic) Private Reply!`,
            timestamp: formattedTime,
            readByStudent: false,
            readByCoach: false,
            actionTarget: {
              label: 'Open DM Thread in Live CRM',
              tab: 'CRM',
              crmThreadId: threadId
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

        const cleanSenderHandle = String(senderUsername || senderName || 'prospect').replace(/^@/, '');
        let activeThreadId = `crm-${conversationId || Date.now()}`;
        let matchedThread = false;

        const updatedThreads = existingThreads.map(t => {
          const isMatch =
            (conversationId && t.outstandConversationId === conversationId) ||
            (senderUsername &&
              String(t.prospectHandle).replace(/^@/, '').toLowerCase() ===
                cleanSenderHandle.toLowerCase());
          if (!isMatch) return t;
          matchedThread = true;
          activeThreadId = t.id;

          const inboundMsg = {
            id: messageId || `msg-in-${Date.now()}`,
            outstandMessageId: messageId || null,
            direction: 'inbound_dm',
            text,
            stageTag: pickedLetter
              ? `Prospect Picked ${pickedLetter} · 24h Window Unlocked`
              : 'Inbound Prospect Reply · 24h Window Open',
            createdAt: nowISO,
            deliveryStatus: 'read'
          };

          // Cancel any scheduled re-engagement messages since the prospect replied!
          const filteredMsgs = (t.messages || []).filter(
            m => m.deliveryStatus !== 'scheduled' && m.status !== 'SCHEDULED'
          );

          return {
            ...t,
            windowOpen: true, // 24-hour Meta window is now OPEN!
            lastUserReplyAt: nowISO,
            stage: t.stage === 'STAGE_S' && pickedLetter ? 'STAGE_H' : t.stage,
            constraintPicked: pickedLetter ? `Option ${pickedLetter}` : t.constraintPicked || '',
            scheduledFollowup: null,
            unreadCount: (t.unreadCount || 0) + 1,
            updatedAt: nowISO,
            messages: [...filteredMsgs, inboundMsg]
          };
        });

        if (!matchedThread) {
          const firstName = (senderName || senderUsername || 'Prospect').split(/[ ._@-]/)[0];
          updatedThreads.unshift({
            id: activeThreadId,
            outstandConversationId: conversationId || null,
            socialAccountId: accountId || null,
            platform: 'instagram',
            prospectHandle: cleanSenderHandle,
            prospectName: firstName,
            matchedKeyword: 'INBOUND DM',
            matchedMagnetId: null,
            matchedMagnetTitle: 'Direct Inbound DM',
            sourceCommentId: null,
            sourcePostId: null,
            stage: pickedLetter ? 'STAGE_H' : 'STAGE_S',
            constraintPicked: pickedLetter ? `Option ${pickedLetter}` : '',
            windowOpen: true,
            lastUserReplyAt: nowISO,
            scheduledFollowup: null,
            unreadCount: 1,
            updatedAt: nowISO,
            messages: [
              {
                id: messageId || `msg-in-${Date.now()}`,
                outstandMessageId: messageId || null,
                direction: 'inbound_dm',
                text,
                stageTag: 'Inbound Prospect DM · 24h Window Open',
                createdAt: nowISO,
                deliveryStatus: 'read'
              }
            ]
          });
        }

        const replyNotifMsg = {
          id: `msg-outstand-reply-${Date.now()}`,
          senderRole: 'SYSTEM',
          senderName: 'Live DM CRM · Prospect Reply',
          text: `💬 @${cleanSenderHandle} replied in DMs: "${text}" — 24h Meta Messaging Window is now OPEN${
            pickedLetter ? ` (Diagnosed Option ${pickedLetter} · Stage H)` : ''
          }!`,
          timestamp: formattedTime,
          isAlert: true,
          readByStudent: false,
          readByCoach: false,
          actionTarget: {
            label: 'Reply in Live DM CRM',
            tab: 'CRM',
            crmThreadId: activeThreadId
          }
        };

        const updatedStudent = {
          ...targetStudent,
          worksheetAnswers: {
            ...(targetStudent.worksheetAnswers || {}),
            dm_crm_threads_json: JSON.stringify(updatedThreads)
          },
          messages: [...(targetStudent.messages || []), replyNotifMsg]
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
