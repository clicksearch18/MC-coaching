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

    // Mandatory HMAC-SHA256 webhook signature verification when OUTSTAND_WEBHOOK_SECRET is configured
    const webhookSecret = process.env.OUTSTAND_WEBHOOK_SECRET;
    const signatureHeader = String(req.headers['x-outstand-signature'] || '').trim();
    if (webhookSecret) {
      if (!signatureHeader) {
        return res.status(401).json({ error: 'Missing X-Outstand-Signature header' });
      }
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');
      const normalizedHeader = signatureHeader.replace(/^sha256=/i, '');
      const expectedBuf = Buffer.from(expectedSig, 'utf8');
      const receivedBuf = Buffer.from(normalizedHeader, 'utf8');
      if (
        expectedBuf.length !== receivedBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, receivedBuf)
      ) {
        return res.status(401).json({ error: 'Invalid X-Outstand-Signature' });
      }
    }

    const eventType = payload.event;
    const data = payload.data || {};
    const supabase = getSupabaseClient();

    // Load students & settings from Supabase if available
    let students = [];
    let globalApiKey = process.env.OUTSTAND_API_KEY || '';
    let settingsData = {};

    if (supabase) {
      const [{ data: studentRows }, { data: settingsRow }] = await Promise.all([
        supabase.from('mc_students').select('id, profile'),
        supabase.from('mc_lessons').select('data').eq('week_number', 0).maybeSingle()
      ]);

      if (Array.isArray(studentRows)) {
        students = studentRows.map(r => r.profile).filter(Boolean);
      }
      settingsData = settingsRow?.data || {};
      if (!globalApiKey && settingsData.outstandApiKey) {
        globalApiKey = settingsData.outstandApiKey;
      }
    }

    const recordWebhookLog = async (outcome) => {
      if (!supabase) return;
      try {
        const { data: freshSettingsRow } = await supabase
          .from('mc_lessons')
          .select('data')
          .eq('week_number', 0)
          .maybeSingle();
        const currentData = freshSettingsRow?.data || settingsData || {};
        const prevLogs = Array.isArray(currentData.webhookLogs) ? currentData.webhookLogs : [];
        const logEntry = {
          id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          receivedAt: new Date().toISOString(),
          event: eventType || 'unknown',
          network: data.network || null,
          accountId: data.accountId || data.account_id || data.socialAccountId || null,
          authorUsername: data.authorUsername || data.senderUsername || data.participantDisplayName || null,
          text: data.text || data.content || data.message || null,
          ...outcome
        };
        await supabase.from('mc_lessons').upsert(
          {
            week_number: 0,
            data: {
              ...currentData,
              webhookLogs: [logEntry, ...prevLogs].slice(0, 50)
            },
            updated_at: new Date().toISOString()
          },
          { onConflict: 'week_number' }
        );
      } catch (e) {
        console.warn('Webhook log write error:', e);
      }
    };

    const escapeRegExp = str => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Helper to match an incoming webhook event to a student profile
    const findMatchingStudent = (accountId, accountUsername, tenantId) => {
      const cleanAcctUser = String(accountUsername || '').replace(/^@/, '').toLowerCase();
      return (
        students.find(s => {
          try {
            if (tenantId && s.id === tenantId) return true;
            const cfg = JSON.parse(s.worksheetAnswers?.outstand_config_json || '{}');
            if (
              accountId &&
              (cfg.socialAccountId === accountId ||
                cfg.instagramAccountId === accountId ||
                cfg.facebookAccountId === accountId ||
                (Array.isArray(cfg.connectedAccounts) &&
                  cfg.connectedAccounts.some(a => a.id === accountId)))
            ) {
              return true;
            }
            if (cleanAcctUser) {
              const igHandle = String(cfg.instagramHandle || '').replace(/^@/, '').toLowerCase();
              const fbName = String(cfg.facebookPageName || '').replace(/^@/, '').toLowerCase();
              if ((igHandle && igHandle === cleanAcctUser) || (fbName && fbName === cleanAcctUser)) {
                return true;
              }
            }
            return false;
          } catch {
            return false;
          }
        }) || null
      );
    };

    // -------------------------------------------------------------------------
    // EVENT 1: comment.received -> Keyword Match -> POST /v1/conversations
    // -------------------------------------------------------------------------
    if (eventType === 'comment.received') {
      const network = data.network || 'instagram';
      const accountId =
        data.accountId || data.account_id || data.socialAccountId || data.social_account_id;
      const accountUsername =
        data.accountUsername || data.account_username || data.recipientUsername || data.recipient_username;
      const postId = data.postId || data.post_id || data.mediaId || data.media_id;
      const commentId = data.commentId || data.comment_id || data.id;
      const authorId = data.authorId || data.author_id || data.fromId || data.from_id;
      const authorUsername =
        data.authorUsername || data.author_username || data.fromUsername || data.username;
      const authorName =
        data.authorName || data.author_name || data.fromName || authorUsername;
      const text = data.text || data.content || data.message || '';

      // Ignore outbound/echo comments or comments authored by the connected account itself
      if (data.isEcho || data.fromMe || data.direction === 'outbound' || (accountId && authorId && accountId === authorId)) {
        await recordWebhookLog({ handled: false, reason: 'Ignored self/echo comment' });
        return res.status(200).json({ ok: true, handled: false, reason: 'Ignored self/echo comment' });
      }

      const handle = authorUsername ? `@${authorUsername}` : authorName || 'Prospect';
      const firstName = (authorName || authorUsername || 'there').split(/[ ._@-]/)[0];

      const targetStudent = findMatchingStudent(
        accountId,
        accountUsername || data.recipientUsername,
        data.tenantId || data.tenant_id
      );

      if (!targetStudent) {
        await recordWebhookLog({ handled: false, reason: 'No student profile found to match comment.received' });
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

      // Prevent self-triggering if the student comments from their own handle
      const cleanAuthor = String(authorUsername || '').replace(/^@/, '').toLowerCase();
      const cleanStudentIg = String(studentOutstandCfg.instagramHandle || '').replace(/^@/, '').toLowerCase();
      const cleanStudentFb = String(studentOutstandCfg.facebookPageName || '').replace(/^@/, '').toLowerCase();
      if (cleanAuthor && (cleanAuthor === cleanStudentIg || cleanAuthor === cleanStudentFb)) {
        await recordWebhookLog({ handled: false, reason: 'Ignored student own comment' });
        return res.status(200).json({ ok: true, handled: false, reason: 'Ignored student own comment' });
      }

      // Check idempotency BEFORE calling Outstand API so webhook retries never double-DM
      const initialThreads = (() => {
        try {
          return JSON.parse(targetStudent.worksheetAnswers?.dm_crm_threads_json || '[]');
        } catch {
          return [];
        }
      })();
      if (
        commentId &&
        initialThreads.some(
          t => (t.sourceCommentId || t.commentId) && (t.sourceCommentId === commentId || t.commentId === commentId)
        )
      ) {
        await recordWebhookLog({ handled: true, deduplicated: true, reason: `Comment ${commentId} already processed.` });
        return res.status(200).json({
          ok: true,
          handled: true,
          deduplicated: true,
          reason: `Comment ${commentId} already processed.`
        });
      }

      const activeApiKey = globalApiKey || studentOutstandCfg.apiKey;
      const commentStr = String(text || '');

      // Match comment text against student's Shift Magnets using word boundaries
      const matchedMagnet = (targetStudent.shiftMagnets || []).find(mag => {
        const kw = String(mag.keywordTrigger || '').trim();
        if (!kw) return false;
        if (mag.status && mag.status !== 'Live' && !mag.trackingLink?.trim()) return false;
        const regex = new RegExp(`(?:^|[^a-zA-Z0-9])${escapeRegExp(kw)}(?:$|[^a-zA-Z0-9])`, 'i');
        return regex.test(commentStr);
      });

      if (!matchedMagnet) {
        await recordWebhookLog({
          handled: false,
          studentId: targetStudent.id,
          reason: `Comment "${text}" did not match any Shift Magnet keyword trigger.`
        });
        return res.status(200).json({
          ok: true,
          handled: false,
          reason: `Comment "${text}" did not match any Shift Magnet keyword trigger.`
        });
      }

      // Build combined Stage S (Link Delivery) + Stage H (A/B/C Diagnostic) Private Reply
      const openerPart = (matchedMagnet.dmHandoffScript || '')
        .replace(/\[First Name\]/gi, firstName)
        .replace(/\[Name\]/gi, firstName)
        .replace(/\[Shift Magnet Title\]/gi, matchedMagnet.workingTitle || '')
        .replace(/\[Shift Magnet\]/gi, matchedMagnet.workingTitle || '')
        .replace(/\[KEYWORD\]/gi, matchedMagnet.keywordTrigger || '')
        .replace(/\[Link\]/gi, matchedMagnet.trackingLink || '');

      const diagnosticPart =
        matchedMagnet.dmDiagnosticQuestion ||
        'Quick question while you open it — are you currently focused on:\nA) Fixing leaky ad funnels\nB) Escaping referral-only spiky months\nC) Closing deals in DMs without sales calls?\n\n(Just reply A, B, or C!)';

      const alreadyHasQuestion =
        openerPart.includes('A)') ||
        openerPart.toLowerCase().includes('quick question') ||
        openerPart.includes(diagnosticPart.slice(0, 25));

      const combinedPrivateReply = alreadyHasQuestion
        ? openerPart
        : `${openerPart}\n\n${diagnosticPart}`;

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
              content: combinedPrivateReply,
              instagram: {
                comment_id: commentId,
                ...(authorId ? { author_id: authorId } : {})
              }
            }),
            signal: AbortSignal.timeout(8000)
          });
          outstandResult = await resp.json().catch(() => ({}));
          const createdConvoId =
            outstandResult?.conversation?.id ||
            outstandResult?.data?.conversation?.id ||
            outstandResult?.data?.id ||
            outstandResult?.id;
          if (createdConvoId) {
            outstandConvoId = createdConvoId;
          }
        } catch (err) {
          console.warn('POST /v1/conversations error:', err);
        }
      }

      // Re-fetch freshest student row right before writing to minimize race window
      if (supabase && targetStudent) {
        const { data: freshRow } = await supabase
          .from('mc_students')
          .select('profile')
          .eq('id', targetStudent.id)
          .maybeSingle();
        const baseStudent = freshRow?.profile || targetStudent;

        const existingThreads = (() => {
          try {
            return JSON.parse(baseStudent.worksheetAnswers?.dm_crm_threads_json || '[]');
          } catch {
            return [];
          }
        })();

        const alreadyExists =
          commentId &&
          existingThreads.some(
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
                stageTag: 'Stage S + H · Automated Private Reply',
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
            text: `⚡ @${cleanHandle} commented "${text}" → Auto-sent "${matchedMagnet.workingTitle}" + Stage H (A/B/C Diagnostic) Private Reply!`,
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
            ...baseStudent,
            dmConversationsWeekly: (baseStudent.dmConversationsWeekly || 0) + 1,
            worksheetAnswers: {
              ...(baseStudent.worksheetAnswers || {}),
              dm_crm_threads_json: JSON.stringify(updatedThreads)
            },
            messages: [...(baseStudent.messages || []), notifMsg]
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

      await recordWebhookLog({
        handled: true,
        studentId: targetStudent.id,
        keywordMatched: matchedMagnet.keywordTrigger,
        magnetSent: matchedMagnet.workingTitle,
        outstandConversationId: outstandConvoId,
        outstandError: outstandResult?.error || outstandResult?.message || null
      });

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
      const conversationId = data.conversationId || data.conversation_id;
      const accountId =
        data.accountId || data.account_id || data.socialAccountId || data.social_account_id;
      const accountUsername =
        data.accountUsername || data.account_username || data.recipientUsername;
      const messageId = data.messageId || data.message_id || data.id;
      const senderId =
        data.senderId || data.sender_id || data.participantId || data.participant_id;
      const senderUsername =
        data.senderUsername ||
        data.sender_username ||
        data.participantDisplayName ||
        data.participant_username;
      const senderName =
        data.senderName || data.sender_name || data.participantDisplayName || senderUsername;
      const text = data.text || data.content || data.message || '';

      // Ignore outbound echoes or messages sent by the connected business account itself
      if (
        data.isEcho ||
        data.fromMe ||
        data.direction === 'outbound' ||
        (accountId && senderId && accountId === senderId)
      ) {
        await recordWebhookLog({ handled: false, reason: 'Ignored outbound/echo DM' });
        return res.status(200).json({ ok: true, handled: false, reason: 'Ignored outbound/echo DM' });
      }

      const targetStudent = findMatchingStudent(
        accountId,
        accountUsername || data.recipientUsername,
        data.tenantId || data.tenant_id
      );

      if (supabase && targetStudent) {
        const studentCfg = (() => {
          try {
            return JSON.parse(targetStudent.worksheetAnswers?.outstand_config_json || '{}');
          } catch {
            return {};
          }
        })();

        const cleanSenderHandle = String(senderUsername || senderName || 'prospect').replace(/^@/, '');
        const cleanStudentIg = String(studentCfg.instagramHandle || '').replace(/^@/, '').toLowerCase();
        const cleanStudentFb = String(studentCfg.facebookPageName || '').replace(/^@/, '').toLowerCase();
        if (
          cleanSenderHandle &&
          (cleanSenderHandle.toLowerCase() === cleanStudentIg ||
            cleanSenderHandle.toLowerCase() === cleanStudentFb)
        ) {
          await recordWebhookLog({ handled: false, reason: 'Ignored student own DM echo' });
          return res.status(200).json({ ok: true, handled: false, reason: 'Ignored student own DM echo' });
        }

        const { data: freshRow } = await supabase
          .from('mc_students')
          .select('profile')
          .eq('id', targetStudent.id)
          .maybeSingle();
        const baseStudent = freshRow?.profile || targetStudent;

        const existingThreads = (() => {
          try {
            return JSON.parse(baseStudent.worksheetAnswers?.dm_crm_threads_json || '[]');
          } catch {
            return [];
          }
        })();

        // Deduplicate by messageId so webhook retries do not append duplicate messages
        if (
          messageId &&
          existingThreads.some(t =>
            (t.messages || []).some(m => m.id === messageId || m.outstandMessageId === messageId)
          )
        ) {
          await recordWebhookLog({ handled: true, deduplicated: true, event: 'message.received' });
          return res.status(200).json({
            ok: true,
            handled: true,
            deduplicated: true,
            event: 'message.received'
          });
        }

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
          const isFb =
            String(data.network || '').toLowerCase() === 'facebook' ||
            (accountId && studentCfg.facebookAccountId === accountId);

          updatedThreads.unshift({
            id: activeThreadId,
            outstandConversationId: conversationId || null,
            socialAccountId: accountId || null,
            platform: isFb ? 'facebook' : 'instagram',
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
          ...baseStudent,
          worksheetAnswers: {
            ...(baseStudent.worksheetAnswers || {}),
            dm_crm_threads_json: JSON.stringify(updatedThreads)
          },
          messages: [...(baseStudent.messages || []), replyNotifMsg]
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

      await recordWebhookLog({
        handled: Boolean(targetStudent),
        studentId: targetStudent?.id || null,
        reason: targetStudent ? 'Processed inbound DM' : 'No matching student found for inbound DM'
      });

      return res.status(200).json({ ok: true, handled: true, event: 'message.received' });
    }

    await recordWebhookLog({ handled: true, reason: `Received event: ${eventType || 'unknown'}` });
    return res.status(200).json({ ok: true, event: eventType || 'unknown' });
  } catch (err) {
    console.error('Outstand webhook error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Internal webhook error'
    });
  }
}
