import { describe, expect, it } from "vitest";
import { buildScopedQuery, deriveLabel, normalizeDomain } from "../shared/sources";

describe("normalizeDomain", () => {
  it("accepts a bare domain", () => {
    expect(normalizeDomain("szallas.hu")).toBe("szallas.hu");
  });

  it("strips the scheme, path, and www prefix from a full URL", () => {
    expect(normalizeDomain("https://www.pelda-katalogus.hu/kereso?q=hotel")).toBe(
      "pelda-katalogus.hu",
    );
  });

  it("keeps a meaningful subdomain", () => {
    expect(normalizeDomain("https://zenekarok.pelda.hu/lista")).toBe("zenekarok.pelda.hu");
  });

  it("normalizes casing and surrounding whitespace", () => {
    expect(normalizeDomain("  Szallas.HU/ ")).toBe("szallas.hu");
  });

  it("rejects input that is not a domain", () => {
    expect(normalizeDomain("nem domain")).toBeNull();
    expect(normalizeDomain("hotel")).toBeNull();
    expect(normalizeDomain("")).toBeNull();
  });
});

describe("deriveLabel", () => {
  it("builds a readable label from the domain", () => {
    expect(deriveLabel("szallas.hu")).toBe("Szallas");
  });
});

describe("buildScopedQuery", () => {
  it("scopes the query to the approved domains", () => {
    const query = buildScopedQuery({ terms: ["panzió"], domains: ["szallas.hu", "hotelek.hu"] });
    expect(query).toBe("panzió (site:szallas.hu OR site:hotelek.hu)");
  });

  it("removes duplicate domains", () => {
    const query = buildScopedQuery({ terms: ["hotel"], domains: ["szallas.hu", "szallas.hu"] });
    expect(query).toBe("hotel (site:szallas.hu)");
  });

  it("drops empty terms without leaving stray spaces", () => {
    const query = buildScopedQuery({ terms: ["", "  ", "zenekar"], domains: ["zenekarok.hu"] });
    expect(query).toBe("zenekar (site:zenekarok.hu)");
  });

  it("returns only the scope when no search terms are given", () => {
    expect(buildScopedQuery({ terms: [], domains: ["szallas.hu"] })).toBe("(site:szallas.hu)");
  });

  it("returns plain terms when no domain is supplied", () => {
    expect(buildScopedQuery({ terms: ["hotel"], domains: [] })).toBe("hotel");
  });
});

