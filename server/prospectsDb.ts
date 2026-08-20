import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  campaigns,
  messages,
  optOuts,
  prospects,
  sourceSites,
  templates,
  type InsertProspect,
  type ProspectCategory,
} from "../drizzle/schema";
import { normalizeEmail } from "../shared/prospects";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Az adatbázis jelenleg nem elérhető.");
  return db;
}

export type ProspectFilters = {
  category?: ProspectCategory;
  search?: string;
  tag?: string;
  includeOptedOut?: boolean;
};

export async function listProspects(ownerId: number, filters: ProspectFilters = {}) {
  const db = await requireDb();
  const conditions = [eq(prospects.ownerId, ownerId)];

  if (filters.category) conditions.push(eq(prospects.category, filters.category));
  if (!filters.includeOptedOut) conditions.push(eq(prospects.optedOut, false));
  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(sql`(${prospects.name} LIKE ${term} OR ${prospects.email} LIKE ${term})`);
  }
  if (filters.tag) {
    conditions.push(sql`${prospects.tags} LIKE ${`%${filters.tag.trim()}%`}`);
  }

  return db
    .select()
    .from(prospects)
    .where(and(...conditions))
    .orderBy(desc(prospects.createdAt))
    .limit(500);
}

export async function getProspectsByIds(ownerId: number, ids: number[]) {
  if (ids.length === 0) return [];
  const db = await requireDb();
  return db
    .select()
    .from(prospects)
    .where(and(eq(prospects.ownerId, ownerId), inArray(prospects.id, ids)));
}

/**
 * Inserts discovered prospects, skipping addresses that already exist or are
 * present on the suppression list. Returns how many rows were actually stored.
 */
export async function saveDiscoveredProspects(
  ownerId: number,
  rows: Array<{ name: string; sourceUrl: string; email: string; category: ProspectCategory }>,
) {
  const db = await requireDb();
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  const suppressed = new Set(
    (await db.select({ email: optOuts.email }).from(optOuts).where(eq(optOuts.ownerId, ownerId))).map(
      row => row.email,
    ),
  );

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email || suppressed.has(email)) {
      skipped += 1;
      continue;
    }

    const values: InsertProspect = {
      ownerId,
      name: row.name.slice(0, 255),
      sourceUrl: row.sourceUrl.slice(0, 1024),
      email,
      category: row.category,
    };

    const [existing] = await db
      .select({ id: prospects.id })
      .from(prospects)
      .where(and(eq(prospects.ownerId, ownerId), eq(prospects.email, email)))
      .limit(1);

    if (existing) {
      await db
        .update(prospects)
        .set({ sourceUrl: values.sourceUrl, name: values.name, updatedAt: new Date() })
        .where(eq(prospects.id, existing.id));
      skipped += 1;
    } else {
      await db.insert(prospects).values(values);
      inserted += 1;
    }
  }

  return { inserted, skipped };
}

export async function updateProspectTags(ownerId: number, id: number, tags: string) {
  const db = await requireDb();
  await db
    .update(prospects)
    .set({ tags })
    .where(and(eq(prospects.ownerId, ownerId), eq(prospects.id, id)));
}

export async function deleteProspects(ownerId: number, ids: number[]) {
  if (ids.length === 0) return;
  const db = await requireDb();
  await db.delete(prospects).where(and(eq(prospects.ownerId, ownerId), inArray(prospects.id, ids)));
}

export async function addOptOut(
  ownerId: number,
  email: string,
  reason: "unsubscribed" | "manual" | "bounced" | "complaint" = "manual",
) {
  const db = await requireDb();
  const normalized = normalizeEmail(email);

  await db
    .insert(optOuts)
    .values({ ownerId, email: normalized, reason })
    .onConflictDoUpdate({ target: [optOuts.ownerId, optOuts.email], set: { reason } });

  await db
    .update(prospects)
    .set({ optedOut: true, optedOutAt: new Date() })
    .where(and(eq(prospects.ownerId, ownerId), eq(prospects.email, normalized)));
}

export async function removeOptOut(ownerId: number, email: string) {
  const db = await requireDb();
  const normalized = normalizeEmail(email);
  await db.delete(optOuts).where(and(eq(optOuts.ownerId, ownerId), eq(optOuts.email, normalized)));
  await db
    .update(prospects)
    .set({ optedOut: false, optedOutAt: null })
    .where(and(eq(prospects.ownerId, ownerId), eq(prospects.email, normalized)));
}

export async function listOptOuts(ownerId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(optOuts)
    .where(eq(optOuts.ownerId, ownerId))
    .orderBy(desc(optOuts.createdAt))
    .limit(500);
}

export async function getSuppressedEmails(ownerId: number) {
  const db = await requireDb();
  const rows = await db.select({ email: optOuts.email }).from(optOuts).where(eq(optOuts.ownerId, ownerId));
  return new Set(rows.map(row => row.email));
}

export async function listTemplates(ownerId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(templates)
    .where(eq(templates.ownerId, ownerId))
    .orderBy(desc(templates.updatedAt))
    .limit(100);
}

export async function createTemplate(
  ownerId: number,
  input: { name: string; subject: string; body: string },
) {
  const db = await requireDb();
  await db.insert(templates).values({ ownerId, ...input });
}

export async function updateTemplate(
  ownerId: number,
  id: number,
  input: { name: string; subject: string; body: string },
) {
  const db = await requireDb();
  await db
    .update(templates)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(templates.ownerId, ownerId), eq(templates.id, id)));
}

export async function deleteTemplate(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(templates).where(and(eq(templates.ownerId, ownerId), eq(templates.id, id)));
}

export async function createCampaign(
  ownerId: number,
  input: { name: string; templateId?: number | null; totalCount: number },
) {
  const db = await requireDb();
  const result = await db.insert(campaigns).values({
    ownerId,
    name: input.name,
    templateId: input.templateId ?? null,
    status: "sending",
    totalCount: input.totalCount,
  });
  return Number((result as unknown as { insertId: number }).insertId);
}

export async function finalizeCampaign(
  ownerId: number,
  campaignId: number,
  counts: { sent: number; failed: number; skipped: number },
) {
  const db = await requireDb();
  await db
    .update(campaigns)
    .set({
      status: counts.failed > 0 && counts.sent === 0 ? "failed" : "completed",
      sentCount: counts.sent,
      failedCount: counts.failed,
      skippedCount: counts.skipped,
      completedAt: new Date(),
    })
    .where(and(eq(campaigns.ownerId, ownerId), eq(campaigns.id, campaignId)));
}

export async function listCampaigns(ownerId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.ownerId, ownerId))
    .orderBy(desc(campaigns.createdAt))
    .limit(100);
}

export async function recordMessage(input: {
  ownerId: number;
  campaignId: number;
  prospectId: number;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  status: "queued" | "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  errorMessage?: string | null;
  sentAt?: Date | null;
}) {
  const db = await requireDb();
  await db.insert(messages).values({
    ...input,
    providerMessageId: input.providerMessageId ?? null,
    errorMessage: input.errorMessage?.slice(0, 512) ?? null,
    sentAt: input.sentAt ?? null,
  });

  if (input.status === "sent") {
    await db
      .update(prospects)
      .set({ lastContactedAt: input.sentAt ?? new Date() })
      .where(and(eq(prospects.ownerId, input.ownerId), eq(prospects.id, input.prospectId)));
  }
}

export async function listMessages(ownerId: number, campaignId?: number) {
  const db = await requireDb();
  const conditions = [eq(messages.ownerId, ownerId)];
  if (campaignId) conditions.push(eq(messages.campaignId, campaignId));

  return db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(500);
}

export async function getDashboardStats(ownerId: number) {
  const db = await requireDb();

  const [prospectRows] = await db
    .select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${prospects.optedOut} = false then 1 else 0 end)`,
    })
    .from(prospects)
    .where(eq(prospects.ownerId, ownerId));

  const [messageRows] = await db
    .select({
      sent: sql<number>`sum(case when ${messages.status} = 'sent' then 1 else 0 end)`,
      failed: sql<number>`sum(case when ${messages.status} = 'failed' then 1 else 0 end)`,
    })
    .from(messages)
    .where(eq(messages.ownerId, ownerId));

  const byCategory = await db
    .select({ category: prospects.category, count: sql<number>`count(*)` })
    .from(prospects)
    .where(eq(prospects.ownerId, ownerId))
    .groupBy(prospects.category);

  const [optOutRows] = await db
    .select({ total: sql<number>`count(*)` })
    .from(optOuts)
    .where(eq(optOuts.ownerId, ownerId));

  return {
    totalProspects: Number(prospectRows?.total ?? 0),
    activeProspects: Number(prospectRows?.active ?? 0),
    sentMessages: Number(messageRows?.sent ?? 0),
    failedMessages: Number(messageRows?.failed ?? 0),
    optOuts: Number(optOutRows?.total ?? 0),
    byCategory: byCategory.map(row => ({ category: row.category, count: Number(row.count) })),
  };
}

export async function listSourceSites(ownerId: number) {
  const db = await requireDb();
  return db
    .select()
    .from(sourceSites)
    .where(eq(sourceSites.ownerId, ownerId))
    .orderBy(desc(sourceSites.createdAt))
    .limit(200);
}

/** Active sources for a category, including sources marked for every category. */
export async function getActiveSourceDomains(ownerId: number, category: ProspectCategory) {
  const db = await requireDb();
  const rows = await db
    .select({ domain: sourceSites.domain })
    .from(sourceSites)
    .where(
      and(
        eq(sourceSites.ownerId, ownerId),
        eq(sourceSites.active, true),
        sql`(${sourceSites.category} IS NULL OR ${sourceSites.category} = ${category})`,
      ),
    );

  return Array.from(new Set(rows.map(row => row.domain)));
}

export async function countSourceDomains(ownerId: number) {
  const db = await requireDb();
  const [row] = await db
    .select({ total: sql<number>`count(distinct ${sourceSites.domain})` })
    .from(sourceSites)
    .where(eq(sourceSites.ownerId, ownerId));
  return Number(row?.total ?? 0);
}

export async function addSourceSites(
  ownerId: number,
  rows: Array<{ label: string; domain: string; category: ProspectCategory | null }>,
) {
  const db = await requireDb();
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const [existing] = await db
      .select({ id: sourceSites.id })
      .from(sourceSites)
      .where(and(eq(sourceSites.ownerId, ownerId), eq(sourceSites.domain, row.domain)))
      .limit(1);

    if (existing) {
      await db
        .update(sourceSites)
        .set({ label: row.label, category: row.category, active: true })
        .where(eq(sourceSites.id, existing.id));
      skipped += 1;
    } else {
      await db.insert(sourceSites).values({ ownerId, label: row.label, domain: row.domain, category: row.category });
      inserted += 1;
    }
  }

  return { inserted, skipped };
}

export async function setSourceSiteActive(ownerId: number, id: number, active: boolean) {
  const db = await requireDb();
  await db
    .update(sourceSites)
    .set({ active })
    .where(and(eq(sourceSites.ownerId, ownerId), eq(sourceSites.id, id)));
}

export async function deleteSourceSite(ownerId: number, id: number) {
  const db = await requireDb();
  await db.delete(sourceSites).where(and(eq(sourceSites.ownerId, ownerId), eq(sourceSites.id, id)));
}
