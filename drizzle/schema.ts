import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const PROSPECT_CATEGORIES = ["accommodations", "hotels", "food_trucks", "musicians"] as const;
export type ProspectCategory = (typeof PROSPECT_CATEGORIES)[number];

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const prospectCategoryEnum = pgEnum("prospect_category", PROSPECT_CATEGORIES);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "sending", "completed", "failed"]);
export const messageStatusEnum = pgEnum("message_status", ["queued", "sent", "failed", "skipped"]);
export const optOutReasonEnum = pgEnum("opt_out_reason", ["unsubscribed", "manual", "bounced", "complaint"]);

const createdAt = () => timestamp("createdAt", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull();

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const prospects = pgTable("prospects", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1024 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  category: prospectCategoryEnum("category").notNull(),
  tags: varchar("tags", { length: 512 }).default("").notNull(),
  optedOut: boolean("optedOut").default(false).notNull(),
  optedOutAt: timestamp("optedOutAt", { withTimezone: true }),
  lastContactedAt: timestamp("lastContactedAt", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({
  ownerEmailIdx: uniqueIndex("prospects_owner_email_idx").on(table.ownerId, table.email),
  ownerCategoryIdx: index("prospects_owner_category_idx").on(table.ownerId, table.category),
}));
export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = typeof prospects.$inferInsert;

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => ({ ownerIdx: index("templates_owner_idx").on(table.ownerId) }));
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  templateId: integer("templateId"),
  status: campaignStatusEnum("status").default("draft").notNull(),
  totalCount: integer("totalCount").default(0).notNull(),
  sentCount: integer("sentCount").default(0).notNull(),
  failedCount: integer("failedCount").default(0).notNull(),
  skippedCount: integer("skippedCount").default(0).notNull(),
  createdAt: createdAt(),
  completedAt: timestamp("completedAt", { withTimezone: true }),
}, table => ({ ownerIdx: index("campaigns_owner_idx").on(table.ownerId) }));
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  campaignId: integer("campaignId").notNull(),
  prospectId: integer("prospectId").notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 512 }).notNull(),
  body: text("body").notNull(),
  status: messageStatusEnum("status").default("queued").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: varchar("errorMessage", { length: 512 }),
  createdAt: createdAt(),
  sentAt: timestamp("sentAt", { withTimezone: true }),
}, table => ({
  ownerIdx: index("messages_owner_idx").on(table.ownerId),
  campaignIdx: index("messages_campaign_idx").on(table.campaignId),
  prospectIdx: index("messages_prospect_idx").on(table.prospectId),
}));
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

export const optOuts = pgTable("optOuts", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  reason: optOutReasonEnum("reason").default("unsubscribed").notNull(),
  createdAt: createdAt(),
}, table => ({ ownerEmailIdx: uniqueIndex("optouts_owner_email_idx").on(table.ownerId, table.email) }));
export type OptOut = typeof optOuts.$inferSelect;
export type InsertOptOut = typeof optOuts.$inferInsert;

export const sourceSites = pgTable("sourceSites", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).notNull(),
  category: prospectCategoryEnum("category"),
  active: boolean("active").default(true).notNull(),
  createdAt: createdAt(),
}, table => ({ ownerDomainIdx: uniqueIndex("source_owner_domain_idx").on(table.ownerId, table.domain) }));
export type SourceSite = typeof sourceSites.$inferSelect;
export type InsertSourceSite = typeof sourceSites.$inferInsert;
