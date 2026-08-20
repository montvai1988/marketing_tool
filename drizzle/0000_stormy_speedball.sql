CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'sending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."opt_out_reason" AS ENUM('unsubscribed', 'manual', 'bounced', 'complaint');--> statement-breakpoint
CREATE TYPE "public"."prospect_category" AS ENUM('accommodations', 'hotels', 'food_trucks', 'musicians');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"templateId" integer,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"totalCount" integer DEFAULT 0 NOT NULL,
	"sentCount" integer DEFAULT 0 NOT NULL,
	"failedCount" integer DEFAULT 0 NOT NULL,
	"skippedCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"campaignId" integer NOT NULL,
	"prospectId" integer NOT NULL,
	"recipientEmail" varchar(320) NOT NULL,
	"recipientName" varchar(255) NOT NULL,
	"subject" varchar(512) NOT NULL,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'queued' NOT NULL,
	"providerMessageId" varchar(255),
	"errorMessage" varchar(512),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"sentAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "optOuts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"reason" "opt_out_reason" DEFAULT 'unsubscribed' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospects" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"sourceUrl" varchar(1024) NOT NULL,
	"email" varchar(320) NOT NULL,
	"category" "prospect_category" NOT NULL,
	"tags" varchar(512) DEFAULT '' NOT NULL,
	"optedOut" boolean DEFAULT false NOT NULL,
	"optedOutAt" timestamp with time zone,
	"lastContactedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sourceSites" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"label" varchar(255) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"category" "prospect_category",
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(512) NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE INDEX "campaigns_owner_idx" ON "campaigns" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "messages_owner_idx" ON "messages" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "messages_campaign_idx" ON "messages" USING btree ("campaignId");--> statement-breakpoint
CREATE INDEX "messages_prospect_idx" ON "messages" USING btree ("prospectId");--> statement-breakpoint
CREATE UNIQUE INDEX "optouts_owner_email_idx" ON "optOuts" USING btree ("ownerId","email");--> statement-breakpoint
CREATE UNIQUE INDEX "prospects_owner_email_idx" ON "prospects" USING btree ("ownerId","email");--> statement-breakpoint
CREATE INDEX "prospects_owner_category_idx" ON "prospects" USING btree ("ownerId","category");--> statement-breakpoint
CREATE UNIQUE INDEX "source_owner_domain_idx" ON "sourceSites" USING btree ("ownerId","domain");--> statement-breakpoint
CREATE INDEX "templates_owner_idx" ON "templates" USING btree ("ownerId");