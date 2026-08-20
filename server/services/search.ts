import type { ProspectCategory } from "../../drizzle/schema";
import { CATEGORY_QUERY_HINTS } from "../../shared/prospects";
import { buildScopedQuery } from "../../shared/sources";

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

const ENDPOINT = "https://www.googleapis.com/customsearch/v1";

export function isSearchConfigured() {
  return Boolean(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);
}

/**
 * Runs a Google Custom Search query for one category, scoped to the owner's
 * approved source domains. Since January 2026 new Programmable Search Engines
 * cannot search the entire web, so the caller must supply the domains.
 * The Google API returns at most 10 results per request, so multiple pages are
 * requested when more are needed.
 */
export async function searchProspects(options: {
  category: ProspectCategory;
  query?: string;
  location?: string;
  limit: number;
  domains: string[];
}): Promise<SearchHit[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !engineId) {
    throw new Error(
      "A Google keresés nincs beállítva. Add meg a GOOGLE_SEARCH_API_KEY és GOOGLE_SEARCH_ENGINE_ID értékeket.",
    );
  }

  if (options.domains.length === 0) {
    throw new Error(
      "Nincs aktív forrásoldal ehhez a kategóriához. Vegyél fel platformokat a Forrásoldalak lapon.",
    );
  }

  const query = buildScopedQuery({
    terms: [
      options.query?.trim() ?? "",
      options.location?.trim() ?? "",
      options.query?.trim() ? "" : CATEGORY_QUERY_HINTS[options.category],
    ],
    domains: options.domains,
  });
  const hits: SearchHit[] = [];
  const pages = Math.min(Math.ceil(options.limit / 10), 3);

  for (let page = 0; page < pages; page += 1) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", engineId);
    url.searchParams.set("q", query);
    url.searchParams.set("num", String(Math.min(10, options.limit - hits.length)));
    url.searchParams.set("start", String(page * 10 + 1));

    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `A Google keresés hibát adott (${response.status}). ${detail.slice(0, 200)}`.trim(),
      );
    }

    const payload = (await response.json()) as {
      items?: Array<{ title?: string; link?: string; snippet?: string }>;
    };

    for (const item of payload.items ?? []) {
      if (!item.link) continue;
      hits.push({
        title: item.title?.trim() ?? item.link,
        url: item.link,
        snippet: item.snippet?.trim() ?? "",
      });
    }

    if (!payload.items || payload.items.length < 10 || hits.length >= options.limit) break;
  }

  return hits.slice(0, options.limit);
}
