/** Google allows at most 50 distinct domains per Programmable Search Engine. */
export const MAX_SOURCE_DOMAINS = 50;

/**
 * Reduces any user input (full URL, www-prefixed host, bare domain) to a plain
 * registrable host suitable for both the Google control panel and the
 * `site:` query operator.
 */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const host = withoutScheme.split(/[/?#]/)[0]?.replace(/^www\./, "").replace(/\.$/, "");

  if (!host || !host.includes(".") || host.includes(" ")) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;

  return host;
}

export function deriveLabel(domain: string): string {
  const [first] = domain.split(".");
  if (!first) return domain;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * Builds the query sent to Google. Because whole-web search is no longer
 * available for new engines, the query is scoped with `site:` operators to the
 * owner's approved sources.
 */
export function buildScopedQuery(parts: {
  terms: string[];
  domains: string[];
}): string {
  const terms = parts.terms.map(term => term.trim()).filter(Boolean).join(" ");
  const uniqueDomains = Array.from(new Set(parts.domains.filter(Boolean)));

  if (uniqueDomains.length === 0) return terms;

  const scope = uniqueDomains.map(domain => `site:${domain}`).join(" OR ");
  return terms ? `${terms} (${scope})` : `(${scope})`;
}

