import { ENV } from "./env";

/** Optional owner alert delivered through the portable Resend provider. */
export async function notifyOwner(payload: { title: string; content: string }) {
  if (!ENV.alertEmail || !process.env.RESEND_API_KEY || !process.env.OUTREACH_FROM_EMAIL) return false;
  const fromName = process.env.OUTREACH_FROM_NAME;
  const from = fromName ? `${fromName} <${process.env.OUTREACH_FROM_EMAIL}>` : process.env.OUTREACH_FROM_EMAIL;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [ENV.alertEmail], subject: payload.title, text: payload.content }),
      signal: AbortSignal.timeout(15000),
    });
    return response.ok;
  } catch { return false; }
}
