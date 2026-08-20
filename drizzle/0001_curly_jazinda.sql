CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`templateId` int,
	`status` enum('draft','sending','completed','failed') NOT NULL DEFAULT 'draft',
	`totalCount` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`failedCount` int NOT NULL DEFAULT 0,
	`skippedCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`campaignId` int NOT NULL,
	`prospectId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`recipientName` varchar(255) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`status` enum('queued','sent','failed','skipped') NOT NULL DEFAULT 'queued',
	`providerMessageId` varchar(255),
	`errorMessage` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `optOuts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`reason` enum('unsubscribed','manual','bounced','complaint') NOT NULL DEFAULT 'unsubscribed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `optOuts_id` PRIMARY KEY(`id`),
	CONSTRAINT `optouts_owner_email_idx` UNIQUE(`ownerId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`sourceUrl` varchar(1024) NOT NULL,
	`email` varchar(320) NOT NULL,
	`category` enum('accommodations','hotels','food_trucks','musicians') NOT NULL,
	`tags` varchar(512) NOT NULL DEFAULT '',
	`optedOut` boolean NOT NULL DEFAULT false,
	`optedOutAt` timestamp,
	`lastContactedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospects_id` PRIMARY KEY(`id`),
	CONSTRAINT `prospects_owner_email_idx` UNIQUE(`ownerId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(512) NOT NULL,
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `campaigns_owner_idx` ON `campaigns` (`ownerId`);--> statement-breakpoint
CREATE INDEX `messages_owner_idx` ON `messages` (`ownerId`);--> statement-breakpoint
CREATE INDEX `messages_campaign_idx` ON `messages` (`campaignId`);--> statement-breakpoint
CREATE INDEX `messages_prospect_idx` ON `messages` (`prospectId`);--> statement-breakpoint
CREATE INDEX `prospects_owner_category_idx` ON `prospects` (`ownerId`,`category`);--> statement-breakpoint
CREATE INDEX `templates_owner_idx` ON `templates` (`ownerId`);