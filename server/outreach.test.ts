import { describe, expect, it } from "vitest";
import { outreachHelpers } from "./routers/outreach";
import { normalizeEmail, parseTags, serializeTags } from "../shared/prospects";

const { buildEmailBodies, renderPlaceholders } = outreachHelpers;

describe("renderPlaceholders", () => {
  it("personalizes the message with the business name", () => {
    const result = renderPlaceholders("Kedves {{nev}}, üdvözlöm!", {
      name: "Nap Panzió",
      category: "accommodations",
    });
    expect(result).toBe("Kedves Nap Panzió, üdvözlöm!");
  });

  it("replaces every occurrence of the placeholder", () => {
    const result = renderPlaceholders("{{nev}} · {{nev}}", {
      name: "Hotel Ág",
      category: "hotels",
    });
    expect(result).toBe("Hotel Ág · Hotel Ág");
  });
});

describe("buildEmailBodies", () => {
  const bodies = buildEmailBodies({
    body: "Első bekezdés.\n\nMásodik bekezdés.",
    signature: "Üdvözlettel,\nAdam",
    unsubscribeUrl: "https://pelda.hu/leiratkozas?email=a%40b.hu",
  });

  it("always includes an unsubscribe link in both parts", () => {
    expect(bodies.text).toContain("https://pelda.hu/leiratkozas?email=a%40b.hu");
    expect(bodies.html).toContain("https://pelda.hu/leiratkozas?email=a%40b.hu");
  });

  it("includes the sender signature", () => {
    expect(bodies.text).toContain("Üdvözlettel,");
    expect(bodies.html).toContain("Adam");
  });

  it("splits paragraphs into separate HTML blocks", () => {
    expect(bodies.html.match(/<p style="margin:0 0 16px;">/g)?.length).toBe(2);
  });

  it("escapes HTML so injected markup cannot break the message", () => {
    const escaped = buildEmailBodies({
      body: '<script>alert("x")</script>',
      signature: "Adam",
      unsubscribeUrl: "https://pelda.hu/leiratkozas",
    });
    expect(escaped.html).not.toContain("<script>");
    expect(escaped.html).toContain("&lt;script&gt;");
  });
});

describe("contact hygiene helpers", () => {
  it("normalizes addresses so opt-out matching is case-insensitive", () => {
    expect(normalizeEmail("  Info@Panzio.HU ")).toBe("info@panzio.hu");
  });

  it("round-trips tags without duplicates or blanks", () => {
    expect(serializeTags(["prémium", " prémium ", "", "Balaton"])).toBe("prémium, Balaton");
    expect(parseTags("prémium, Balaton")).toEqual(["prémium", "Balaton"]);
  });

  it("treats an empty tag column as no tags", () => {
    expect(parseTags("")).toEqual([]);
    expect(parseTags(null)).toEqual([]);
  });
});

