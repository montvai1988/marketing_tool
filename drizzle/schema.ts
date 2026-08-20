import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Stable local or external-auth identifier. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Fixed prospect categories supported by the discovery workflow. */
export const PROSPECT_CATEGORIES = [
  "accommodations",
  "hotels",
  "food_trucks",
  "musicians",
] as const;

export type ProspectCategory = (typeof PROSPECT_CATEGORIES)[number];

/**
 * A discovered business contact. Only the business name, the source URL the
 * data was read from, and the public email address are stored.
 */
export const prospects = mysqlTable(
  "prospects",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    category: mysqlEnum("category", PROSPECT_CATEGORIES).notNull(),
    /** Free-form comma-separated labels applied by the owner. */
    tags: varchar("tags", { length: 512 }).default("").notNull(),
    optedOut: boolean("optedOut").default(false).notNull(),
    optedOutAt: timestamp("optedOutAt"),
    lastContactedAt: timestamp("lastContactedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerEmailIdx: uniqueIndex("prospects_owner_email_idx").on(table.ownerId, table.email),
    ownerCategoryIdx: index("prospects_owner_category_idx").on(table.ownerId, table.category),
  }),
);

export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = typeof prospects.$inferInsert;

/** Reusable email template with a subject line and body. */
export const templates = mysqlTable(
  "templates",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 512 }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdx: index("templates_owner_idx").on(table.ownerId),
  }),
);

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/** A dispatch batch grouping the messages sent in one operation. */
export const campaigns = mysqlTable(
  "campaigns",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    templateId: int("templateId"),
    status: mysqlEnum("status", ["draft", "sending", "completed", "failed"])
      .default("draft")
      .notNull(),
    totalCount: int("totalCount").default(0).notNull(),
    sentCount: int("sentCount").default(0).notNull(),
    failedCount: int("failedCount").default(0).notNull(),
    skippedCount: int("skippedCount").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  table => ({
    ownerIdx: index("campaigns_owner_idx").on(table.ownerId),
  }),
);

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/** Per-recipient outreach record used for status tracking and history. */
export const messages = mysqlTable(
  "messages",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    campaignId: int("campaignId").notNull(),
    prospectId: int("prospectId").notNull(),
    recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
    recipientName: varchar("recipientName", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 512 }).notNull(),
    body: text("body").notNull(),
    status: mysqlEnum("status", ["queued", "sent", "failed", "skipped"])
      .default("queued")
      .notNull(),
    providerMessageId: varchar("providerMessageId", { length: 255 }),
    errorMessage: varchar("errorMessage", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    sentAt: timestamp("sentAt"),
  },
  table => ({
    ownerIdx: index("messages_owner_idx").on(table.ownerId),
    campaignIdx: index("messages_campaign_idx").on(table.campaignId),
    prospectIdx: index("messages_prospect_idx").on(table.prospectId),
  }),
);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Suppression list keyed by email address. An entry here blocks delivery even
 * if the same address is rediscovered later under a different prospect row.
 */
export const optOuts = mysqlTable(
  "optOuts",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    reason: mysqlEnum("reason", ["unsubscribed", "manual", "bounced", "complaint"])
      .default("unsubscribed")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    ownerEmailIdx: uniqueIndex("optouts_owner_email_idx").on(table.ownerId, table.email),
  }),
);

export type OptOut = typeof optOuts.$inferSelect;
export type InsertOptOut = typeof optOuts.$inferInsert;

/**
 * Owner-managed list of platforms and sites used as discovery sources. Google
 * limits a Programmable Search Engine to 50 designated domains, so this list is
 * the authoritative set of places the search is allowed to look.
 */
export const sourceSites = mysqlTable(
  "sourceSites",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    /** Null means the site is used for every category. */
    category: mysqlEnum("category", PROSPECT_CATEGORIES),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    ownerDomainIdx: uniqueIndex("source_owner_domain_idx").on(table.ownerId, table.domain),
  }),
);

export type SourceSite = typeof sourceSites.$inferSelect;
export type InsertSourceSite = typeof sourceSites.$inferInsert;
