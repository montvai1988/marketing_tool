import { describe, expect, it } from "vitest";
import { extractBusinessName, extractEmails } from "./services/extract";

describe("extractEmails", () => {
  it("finds a public contact address and normalizes it", () => {
    const html = `<p>Írjon nekünk: <a href="mailto:Info@Panzio.hu">Info@Panzio.hu</a></p>`;
    expect(extractEmails(html)).toEqual(["info@panzio.hu"]);
  });

  it("removes duplicates while preserving first-seen order", () => {
    const html = "kapcsolat@hotel.hu foglalas@hotel.hu kapcsolat@hotel.hu";
    expect(extractEmails(html)).toEqual(["kapcsolat@hotel.hu", "foglalas@hotel.hu"]);
  });

  it("ignores placeholder, no-reply, and asset-like matches", () => {
    const html = `
      <span>test@example.com</span>
      <span>no-reply@hotel.hu</span>
      <span>logo@sprite.png</span>
      <span>valodi@hotel.hu</span>
    `;
    expect(extractEmails(html)).toEqual(["valodi@hotel.hu"]);
  });

  it("returns an empty list when no address is present", () => {
    expect(extractEmails("<p>Csak telefonszám: 06 1 234 5678</p>")).toEqual([]);
  });
});

describe("extractBusinessName", () => {
  it("prefers the site name metadata", () => {
    const html = `<meta property="og:site_name" content="Nap Panzió" /><title>Kapcsolat</title>`;
    expect(extractBusinessName(html, "fallback")).toBe("Nap Panzió");
  });

  it("strips trailing page descriptors from the title", () => {
    const html = "<title>Csárda Food Truck | Rendezvények | Kapcsolat</title>";
    expect(extractBusinessName(html, "fallback")).toBe("Csárda Food Truck");
  });

  it("decodes HTML entities", () => {
    const html = "<title>Kiss &amp; Fiai Zenekar</title>";
    expect(extractBusinessName(html, "fallback")).toBe("Kiss & Fiai Zenekar");
  });

  it("falls back to the search result title when markup has no name", () => {
    expect(extractBusinessName("<div>nincs cím</div>", "Balaton Hotel")).toBe("Balaton Hotel");
  });
});
