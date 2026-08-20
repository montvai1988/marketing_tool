import type { ProspectCategory } from "../drizzle/schema";

export const PROSPECT_CATEGORY_ORDER: ProspectCategory[] = [
  "accommodations",
  "hotels",
  "food_trucks",
  "musicians",
];

/** Hungarian display labels for the four supported categories. */
export const CATEGORY_LABELS: Record<ProspectCategory, string> = {
  accommodations: "Szállásadók",
  hotels: "Hotelek",
  food_trucks: "Food truckok",
  musicians: "Zenészek",
};

/** Singular label used in generated drafts and detail views. */
export const CATEGORY_SINGULAR: Record<ProspectCategory, string> = {
  accommodations: "szállásadó",
  hotels: "hotel",
  food_trucks: "food truck",
  musicians: "zenész",
};

/** Default Hungarian search phrasing used to seed the discovery query. */
export const CATEGORY_QUERY_HINTS: Record<ProspectCategory, string> = {
  accommodations: "szállás vendégház apartman kapcsolat email",
  hotels: "hotel szálloda kapcsolat email",
  food_trucks: "food truck rendezvény catering kapcsolat email",
  musicians: "zenész zenekar fellépés kapcsolat email",
};

export const MESSAGE_STATUS_LABELS: Record<string, string> = {
  queued: "Várakozik",
  sent: "Elküldve",
  failed: "Hibás",
  skipped: "Kihagyva",
};

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Vázlat",
  sending: "Küldés alatt",
  completed: "Befejezve",
  failed: "Hibás",
};

export const OPT_OUT_REASON_LABELS: Record<string, string> = {
  unsubscribed: "Leiratkozott",
  manual: "Kézi kizárás",
  bounced: "Visszapattant",
  complaint: "Panasz",
};

/** Maximum recipients allowed in a single dispatch, to keep sending reviewable. */
export const MAX_RECIPIENTS_PER_CAMPAIGN = 200;

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

export function serializeTags(tags: string[]): string {
  const unique = Array.from(new Set(tags.map(tag => tag.trim()).filter(Boolean)));
  return unique.join(", ");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
