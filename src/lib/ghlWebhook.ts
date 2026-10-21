export type GhlNotificationEventType =
  | 'COACH_VIDEO_REVIEW'
  | 'COACH_NUDGE'
  | 'COACH_BROADCAST'
  | 'COACH_GATE_REVIEW'
  | 'STUDENT_VIDEO_SUBMITTED'
  | 'STUDENT_VIDEO_QUESTION'
  | 'STUDENT_GATE_SUBMITTED'
  | 'STUDENT_DIRECT_MESSAGE'
  | 'GHL_WEBHOOK_TEST';

export interface GhlWebhookPayload {
  event: GhlNotificationEventType;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentCompany?: string;
  recipientRole: 'STUDENT' | 'COACH';
  coachEmail?: string;
  subject: string;
  message: string;
  videoTitle?: string;
  videoUrl?: string;
  videoTimestamp?: string;
  reviewDecision?: string;
  coachVideoUrl?: string;
  phaseNumber?: number;
  lessonNumber?: number;
  portalUrl?: string;
}

export async function triggerGhlWebhook(
  payload: GhlWebhookPayload,
  webhookUrlOverride?: string
): Promise<{ ok: boolean; error?: string }> {
  const configuredUrl = (
    webhookUrlOverride ||
    import.meta.env.VITE_GHL_WEBHOOK_URL ||
    ''
  ).trim();

  const enrichedPayload = {
    source: '2mmShift_Coaching_Portal',
    timestampISO: new Date().toISOString(),
    ...payload,
    portalUrl:
      payload.portalUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/student?student=${encodeURIComponent(payload.studentId)}`
        : '')
  };

  try {
    const res = await fetch('/api/ghl-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl: configuredUrl || undefined,
        payload: enrichedPayload
      })
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) return { ok: true };
      if (data.skipped && !configuredUrl) {
        return { ok: false, error: data.error };
      }
    }
  } catch {
    // Fallback to direct browser POST if running in local dev without Vercel serverless runtime
  }

  if (!configuredUrl || !/^https?:\/\//i.test(configuredUrl)) {
    return { ok: false, error: 'No GHL Webhook URL configured.' };
  }

  try {
    const directRes = await fetch(configuredUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload)
    });
    return { ok: directRes.ok };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error calling GHL webhook'
    };
  }
}
