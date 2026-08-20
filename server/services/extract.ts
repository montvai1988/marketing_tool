const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Addresses that are almost never a usable business contact. */
const BLOCKED_PATTERNS = [
  "example.com",
  "sentry.io",
  "wordpress",
  "noreply",
  "no-reply",
  "donotreply",
  "@localhost",
  "u003e",
];

const BLOCKED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".css", ".js"];

export function extractEmails(html: string): string[] {
  const found = html.match(EMAIL_PATTERN) ?? [];
  const cleaned = found
    .map(email => email.toLowerCase().trim().replace(/\.$/, ""))
    .filter(email => email.length <= 320)
    .filter(email => !BLOCKED_PATTERNS.some(pattern => email.includes(pattern)))
    .filter(email => !BLOCKED_EXTENSIONS.some(ext => email.endsWith(ext)));

  return Array.from(new Set(cleaned));
}

export function extractBusinessName(html: string, fallback: string): string {
  const ogSite = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  if (ogSite?.[1]) return decodeEntities(ogSite[1]).trim().slice(0, 255);

  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) return cleanTitle(decodeEntities(ogTitle[1]));

  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title?.[1]) return cleanTitle(decodeEntities(title[1]));

  return cleanTitle(fallback);
}

function cleanTitle(value: string): string {
  const primary = value.split(/[|–—·]/)[0] ?? value;
  return primary.replace(/\s+/g, " ").trim().slice(0, 255) || value.trim().slice(0, 255);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Contact sub-pages that commonly hold the public email address. */
const CONTACT_PATHS = ["/kapcsolat", "/contact", "/impressum", "/elerhetoseg", "/about"];

export type ExtractionResult = {
  name: string;
  sourceUrl: string;
  email: string | null;
  error?: string;
};

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MarketingProspectHub/1.0; contact-discovery)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return null;

    const buffer = await response.arrayBuffer();
    // Guard against very large documents.
    return new TextDecoder("utf-8").decode(buffer.slice(0, 900_000));
  } catch {
    return null;
  }
}

/**
 * Visits a discovered page and, if needed, one likely contact sub-page, then
 * returns the business name, the URL the data came from, and the email address.
 */
export async function extractContact(pageUrl: string, fallbackName: string): Promise<ExtractionResult> {
  const html = await fetchPage(pageUrl);

  if (!html) {
    return { name: fallbackName, sourceUrl: pageUrl, email: null, error: "A weboldal nem volt elérhető." };
  }

  const name = extractBusinessName(html, fallbackName);
  const direct = extractEmails(html);
  if (direct.length > 0) {
    return { name, sourceUrl: pageUrl, email: direct[0] };
  }

  const origin = safeOrigin(pageUrl);
  if (origin) {
    for (const path of CONTACT_PATHS) {
      const contactUrl = `${origin}${path}`;
      const contactHtml = await fetchPage(contactUrl);
      if (!contactHtml) continue;

      const emails = extractEmails(contactHtml);
      if (emails.length > 0) {
        return { name, sourceUrl: contactUrl, email: emails[0] };
      }
    }
  }

  return { name, sourceUrl: pageUrl, email: null, error: "Nem található nyilvános e-mail cím." };
}

function safeOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
