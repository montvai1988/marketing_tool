import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PROSPECT_CATEGORIES } from "../../drizzle/schema";
import { decideEligibility } from "../../shared/eligibility";
import {
  MAX_RECIPIENTS_PER_CAMPAIGN,
  normalizeEmail,
  parseTags,
  serializeTags,
} from "../../shared/prospects";
import { MAX_SOURCE_DOMAINS, deriveLabel, normalizeDomain } from "../../shared/sources";
import { protectedProcedure, router } from "../core/trpc";
import { notifyOwner } from "../core/notification";
import { ENV } from "../core/env";
import {
  addOptOut,
  addSourceSites,
  countSourceDomains,
  createCampaign,
  createTemplate,
  deleteProspects,
  deleteSourceSite,
  deleteTemplate,
  finalizeCampaign,
  getActiveSourceDomains,
  getDashboardStats,
  getProspectsByIds,
  getSuppressedEmails,
  listCampaigns,
  listMessages,
  listOptOuts,
  listProspects,
  listSourceSites,
  listTemplates,
  removeOptOut,
  recordMessage,
  saveDiscoveredProspects,
  setSourceSiteActive,
  updateProspectTags,
  updateTemplate,
} from "../prospectsDb";
import { generateDraft } from "../services/drafts";
import { extractContact } from "../services/extract";
import { getSenderIdentity, isMailerConfigured, sendEmail } from "../services/mailer";
import { isSearchConfigured, searchProspects } from "../services/search";

const categoryEnum = z.enum(PROSPECT_CATEGORIES);

function fail(message: string, code: "BAD_REQUEST" | "PRECONDITION_FAILED" = "BAD_REQUEST"): never {
  throw new TRPCError({ code, message });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPlaceholders(text: string, values: { name: string; category: string }) {
  return text.replaceAll("{{nev}}", values.name).replaceAll("{{kategoria}}", values.category);
}

function buildEmailBodies(input: {
  body: string;
  signature: string;
  unsubscribeUrl: string;
}) {
  const text = [
    input.body.trim(),
    "",
    input.signature.trim(),
    "",
    `Ha nem szeretne több levelet, itt leiratkozhat: ${input.unsubscribeUrl}`,
  ].join("\n");

  const paragraphs = input.body
    .split(/\n{2,}/)
    .map(part => `<p style="margin:0 0 16px;">${escapeHtml(part).replace(/\n/g, "<br />")}</p>`)
    .join("");

  const html = `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.65;color:#1f2430;max-width:560px;">
${paragraphs}
<p style="margin:0 0 16px;white-space:pre-line;">${escapeHtml(input.signature.trim())}</p>
<hr style="border:none;border-top:1px solid #e3e0d8;margin:24px 0 12px;" />
<p style="margin:0;font-size:12px;color:#7c7768;">Ha nem szeretne több levelet, <a href="${input.unsubscribeUrl}" style="color:#7c7768;">itt leiratkozhat</a>.</p>
</div>`;

  return { text, html };
}

export const outreachRouter = router({
  config: protectedProcedure.query(() => {
    const sender = getSenderIdentity();
    return {
      searchConfigured: isSearchConfigured(),
      mailerConfigured: isMailerConfigured(),
      unsubscribeConfigured: Boolean(ENV.appBaseUrl),
      fromEmail: sender.fromEmail,
      fromName: sender.fromName,
      maxRecipients: MAX_RECIPIENTS_PER_CAMPAIGN,
      maxSourceDomains: MAX_SOURCE_DOMAINS,
    };
  }),

  listSourceSites: protectedProcedure.query(({ ctx }) => listSourceSites(ctx.user.id)),

  /** Accepts a pasted list of platforms/sites, one per line. */
  addSourceSites: protectedProcedure
    .input(
      z.object({
        input: z.string().min(1).max(4000),
        category: categoryEnum.nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lines = input.input
        .split(/[\n,;]/)
        .map(line => line.trim())
        .filter(Boolean);

      const rejected: string[] = [];
      const rows: Array<{ label: string; domain: string; category: typeof input.category }> = [];
      const seen = new Set<string>();

      for (const line of lines) {
        const domain = normalizeDomain(line);
        if (!domain) {
          rejected.push(line);
          continue;
        }
        if (seen.has(domain)) continue;
        seen.add(domain);
        rows.push({ label: deriveLabel(domain), domain, category: input.category });
      }

      if (rows.length === 0) {
        fail("Nem sikerült érvényes domaint felismerni a megadott szövegből.");
      }

      const existing = await countSourceDomains(ctx.user.id);
      if (existing + rows.length > MAX_SOURCE_DOMAINS) {
        fail(
          `A Google legfeljebb ${MAX_SOURCE_DOMAINS} domaint engedélyez. Jelenleg ${existing} van felvéve, így még ${Math.max(
            0,
            MAX_SOURCE_DOMAINS - existing,
          )} adható hozzá.`,
        );
      }

      const result = await addSourceSites(ctx.user.id, rows);
      return { ...result, rejected };
    }),

  setSourceSiteActive: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await setSourceSiteActive(ctx.user.id, input.id, input.active);
      return { success: true } as const;
    }),

  deleteSourceSite: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSourceSite(ctx.user.id, input.id);
      return { success: true } as const;
    }),

  stats: protectedProcedure.query(({ ctx }) => getDashboardStats(ctx.user.id)),

  /** Runs the Google search and extracts contacts, without storing anything yet. */
  discover: protectedProcedure
    .input(
      z.object({
        category: categoryEnum,
        query: z.string().max(200).optional(),
        location: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isSearchConfigured()) {
        fail(
          "A Google keresés még nincs beállítva. Add meg a Google API kulcsot és a keresőmotor azonosítóját.",
          "PRECONDITION_FAILED",
        );
      }

      const domains = await getActiveSourceDomains(ctx.user.id, input.category);
      if (domains.length === 0) {
        fail(
          "Ehhez a kategóriához nincs aktív forrásoldal. Vegyél fel platformokat a Forrásoldalak lapon.",
          "PRECONDITION_FAILED",
        );
      }

      let hits;
      try {
        hits = await searchProspects({ ...input, domains });
      } catch (error) {
        fail(error instanceof Error ? error.message : "A keresés nem sikerült.");
      }

      const suppressed = await getSuppressedEmails(ctx.user.id);
      const seen = new Set<string>();
      const results: Array<{
        name: string;
        sourceUrl: string;
        email: string | null;
        category: typeof input.category;
        status: "found" | "no_email" | "opted_out" | "duplicate";
        note?: string;
      }> = [];

      for (const hit of hits) {
        const extracted = await extractContact(hit.url, hit.title);

        if (!extracted.email) {
          results.push({
            name: extracted.name,
            sourceUrl: extracted.sourceUrl,
            email: null,
            category: input.category,
            status: "no_email",
            note: extracted.error,
          });
          continue;
        }

        const email = normalizeEmail(extracted.email);

        if (suppressed.has(email)) {
          results.push({
            name: extracted.name,
            sourceUrl: extracted.sourceUrl,
            email,
            category: input.category,
            status: "opted_out",
            note: "Ez a cím leiratkozott, ezért kihagyjuk.",
          });
          continue;
        }

        if (seen.has(email)) {
          results.push({
            name: extracted.name,
            sourceUrl: extracted.sourceUrl,
            email,
            category: input.category,
            status: "duplicate",
            note: "Ugyanez a cím már szerepel a találatok között.",
          });
          continue;
        }

        seen.add(email);
        results.push({
          name: extracted.name,
          sourceUrl: extracted.sourceUrl,
          email,
          category: input.category,
          status: "found",
        });
      }

      return { searched: hits.length, results, domains };
    }),

  /** Persists the rows the owner approved from a discovery run. */
  saveDiscovered: protectedProcedure
    .input(
      z.object({
        rows: z
          .array(
            z.object({
              name: z.string().min(1).max(255),
              sourceUrl: z.string().url().max(1024),
              email: z.string().email().max(320),
              category: categoryEnum,
            }),
          )
          .min(1)
          .max(50),
      }),
    )
    .mutation(({ ctx, input }) => saveDiscoveredProspects(ctx.user.id, input.rows)),

  listProspects: protectedProcedure
    .input(
      z
        .object({
          category: categoryEnum.optional(),
          search: z.string().max(120).optional(),
          tag: z.string().max(60).optional(),
          includeOptedOut: z.boolean().default(false),
        })
        .default({ includeOptedOut: false }),
    )
    .query(({ ctx, input }) => listProspects(ctx.user.id, input)),

  setTags: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), tags: z.array(z.string().max(40)).max(12) }))
    .mutation(async ({ ctx, input }) => {
      await updateProspectTags(ctx.user.id, input.id, serializeTags(input.tags));
      return { success: true } as const;
    }),

  deleteProspects: protectedProcedure
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await deleteProspects(ctx.user.id, input.ids);
      return { success: true } as const;
    }),

  listTemplates: protectedProcedure.query(({ ctx }) => listTemplates(ctx.user.id)),

  saveTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(255),
        subject: z.string().min(1).max(500),
        body: z.string().min(1).max(20000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payload = { name: input.name, subject: input.subject, body: input.body };
      if (input.id) await updateTemplate(ctx.user.id, input.id, payload);
      else await createTemplate(ctx.user.id, payload);
      return { success: true } as const;
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteTemplate(ctx.user.id, input.id);
      return { success: true } as const;
    }),

  generateDraft: protectedProcedure
    .input(
      z.object({
        prospectId: z.number().int().positive(),
        serviceSummary: z.string().min(3).max(600),
        tone: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [prospect] = await getProspectsByIds(ctx.user.id, [input.prospectId]);
      if (!prospect) fail("A megkeresett kontakt nem található.");

      try {
        return await generateDraft({
          businessName: prospect.name,
          category: prospect.category,
          serviceSummary: input.serviceSummary,
          senderName: ctx.user.name ?? "a feladó",
          tone: input.tone,
        });
      } catch (error) {
        fail(error instanceof Error ? error.message : "A vázlat generálása nem sikerült.");
      }
    }),

  /** Sends a reviewed campaign, skipping every suppressed address. */
  sendCampaign: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        subject: z.string().min(1).max(500),
        body: z.string().min(1).max(20000),
        signature: z.string().min(1).max(1000),
        templateId: z.number().int().positive().optional(),
        prospectIds: z.array(z.number().int().positive()).min(1).max(MAX_RECIPIENTS_PER_CAMPAIGN),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isMailerConfigured()) {
        fail(
          "A küldés még nincs beállítva. Add meg a Resend API kulcsot és a hitelesített feladó címet.",
          "PRECONDITION_FAILED",
        );
      }
      if (!ENV.appBaseUrl) {
        fail(
          "A kiküldéshez APP_BASE_URL szükséges, hogy minden levél működő leiratkozó linket tartalmazzon.",
          "PRECONDITION_FAILED",
        );
      }

      const prospects = await getProspectsByIds(ctx.user.id, input.prospectIds);
      if (prospects.length === 0) fail("Nincs érvényes címzett a kiválasztásban.");

      const suppressed = await getSuppressedEmails(ctx.user.id);
      const campaignId = await createCampaign(ctx.user.id, {
        name: input.name,
        templateId: input.templateId ?? null,
        totalCount: prospects.length,
      });

      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const prospect of prospects) {
        const email = normalizeEmail(prospect.email);
        const unsubscribeUrl = `${ENV.appBaseUrl}/leiratkozas?email=${encodeURIComponent(email)}`;

        const personalized = {
          subject: renderPlaceholders(input.subject, { name: prospect.name, category: prospect.category }),
          body: renderPlaceholders(input.body, { name: prospect.name, category: prospect.category }),
        };

        const eligibility = decideEligibility(
          { email, optedOut: prospect.optedOut },
          suppressed,
        );

        if (!eligibility.send) {
          skipped += 1;
          await recordMessage({
            ownerId: ctx.user.id,
            campaignId,
            prospectId: prospect.id,
            recipientEmail: email,
            recipientName: prospect.name,
            subject: personalized.subject,
            body: personalized.body,
            status: "skipped",
            errorMessage:
              eligibility.reason === "invalid"
                ? "Érvénytelen e-mail cím."
                : "A címzett leiratkozott, ezért kihagytuk.",
          });
          continue;
        }

        const bodies = buildEmailBodies({
          body: personalized.body,
          signature: input.signature,
          unsubscribeUrl,
        });

        const result = await sendEmail({
          to: email,
          subject: personalized.subject,
          text: bodies.text,
          html: bodies.html,
          unsubscribeUrl,
        });

        if (result.ok) {
          sent += 1;
          await recordMessage({
            ownerId: ctx.user.id,
            campaignId,
            prospectId: prospect.id,
            recipientEmail: email,
            recipientName: prospect.name,
            subject: personalized.subject,
            body: personalized.body,
            status: "sent",
            providerMessageId: result.id,
            sentAt: new Date(),
          });
        } else {
          failed += 1;
          await recordMessage({
            ownerId: ctx.user.id,
            campaignId,
            prospectId: prospect.id,
            recipientEmail: email,
            recipientName: prospect.name,
            subject: personalized.subject,
            body: personalized.body,
            status: "failed",
            errorMessage: result.error,
          });
        }
      }

      await finalizeCampaign(ctx.user.id, campaignId, { sent, failed, skipped });

      await notifyOwner({
        title: `Kampány lezárva: ${input.name}`,
        content: `Elküldve: ${sent}, hibás: ${failed}, kihagyva: ${skipped}.`,
      }).catch(() => undefined);

      return { campaignId, sent, failed, skipped };
    }),

  listCampaigns: protectedProcedure.query(({ ctx }) => listCampaigns(ctx.user.id)),

  listMessages: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive().optional() }).default({}))
    .query(({ ctx, input }) => listMessages(ctx.user.id, input.campaignId)),

  listOptOuts: protectedProcedure.query(({ ctx }) => listOptOuts(ctx.user.id)),

  addOptOut: protectedProcedure
    .input(
      z.object({
        email: z.string().email().max(320),
        reason: z.enum(["unsubscribed", "manual", "bounced", "complaint"]).default("manual"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await addOptOut(ctx.user.id, input.email, input.reason);
      return { success: true } as const;
    }),

  removeOptOut: protectedProcedure
    .input(z.object({ email: z.string().email().max(320) }))
    .mutation(async ({ ctx, input }) => {
      await removeOptOut(ctx.user.id, input.email);
      return { success: true } as const;
    }),
});

export const outreachHelpers = { buildEmailBodies, renderPlaceholders, parseTags };
