import type { ProspectCategory } from "../../drizzle/schema";
import { CATEGORY_SINGULAR } from "../../shared/prospects";
import { invokeLLM } from "../core/llm";

export type DraftInput = {
  businessName: string;
  category: ProspectCategory;
  serviceSummary: string;
  senderName: string;
  tone?: string;
};

export type Draft = { subject: string; body: string };

/**
 * Generates a personalized Hungarian cold-email draft for a single prospect,
 * using only the business name and its category as personalization inputs.
 */
export async function generateDraft(input: DraftInput): Promise<Draft> {
  const categoryLabel = CATEGORY_SINGULAR[input.category];

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: [
          "Magyar nyelvű, üzleti hangvételű hideg megkereső e-maileket írsz weboldal-készítési szolgáltatásokhoz.",
          "Szabályok: rövid legyen (110-170 szó), konkrét és tiszteletteljes; ne ígérj valótlan eredményeket;",
          "ne állítsd, hogy korábban már beszéltetek; ne használj kattintásvadász tárgymezőt;",
          "ne írj kitalált referenciát, statisztikát vagy vásárlói véleményt.",
          "A választ JSON formátumban add vissza.",
        ].join(" "),
      },
      {
        role: "user",
        content: [
          `Címzett vállalkozás neve: ${input.businessName}`,
          `Kategória: ${categoryLabel}`,
          `A feladó szolgáltatása: ${input.serviceSummary}`,
          `Feladó neve: ${input.senderName}`,
          input.tone ? `Kívánt hangvétel: ${input.tone}` : "",
          "Írj egy személyre szabott tárgymezőt és levéltörzset. A levéltörzs ne tartalmazzon aláírást és leiratkozó szöveget, azt a rendszer fűzi hozzá.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cold_email_draft",
        strict: true,
        schema: {
          type: "object",
          properties: {
            subject: { type: "string", description: "A levél tárgya magyarul" },
            body: { type: "string", description: "A levél törzse magyarul, bekezdésekre tördelve" },
          },
          required: ["subject", "body"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices?.[0]?.message?.content;
  const content = typeof raw === "string" ? raw : "";

  try {
    const parsed = JSON.parse(content) as Draft;
    if (!parsed.subject || !parsed.body) throw new Error("missing fields");
    return { subject: parsed.subject.slice(0, 500), body: parsed.body };
  } catch {
    throw new Error("A vázlat generálása nem sikerült, próbáld újra.");
  }
}
