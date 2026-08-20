export type SendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

export function isMailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.OUTREACH_FROM_EMAIL);
}

export function getSenderIdentity() {
  return {
    fromEmail: process.env.OUTREACH_FROM_EMAIL ?? null,
    fromName: process.env.OUTREACH_FROM_NAME ?? null,
    replyTo: process.env.OUTREACH_REPLY_TO ?? null,
  };
}

/**
 * Sends one message through the Resend HTTP API. No SMTP configuration is
 * required; the API key and verified sender live in server-side environment
 * variables.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  unsubscribeUrl?: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const { fromEmail, fromName, replyTo } = getSenderIdentity();

  if (!apiKey || !fromEmail) {
    return { ok: false, error: "A küldés nincs beállítva (RESEND_API_KEY vagy OUTREACH_FROM_EMAIL hiányzik)." };
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const headers: Record<string, string> = {};
  if (input.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${input.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      name?: string;
    };

    if (!response.ok) {
      return { ok: false, error: payload.message ?? `A szolgáltató hibát adott (${response.status}).` };
    }

    return { ok: true, id: payload.id ?? null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Ismeretlen hiba";
    return { ok: false, error: reason };
  }
}
