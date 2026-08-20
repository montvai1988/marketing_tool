CREATE TABLE `sourceSites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`domain` varchar(255) NOT NULL,
	`category` enum('accommodations','hotels','food_trucks','musicians'),
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sourceSites_id` PRIMARY KEY(`id`),
	CONSTRAINT `source_owner_domain_idx` UNIQUE(`ownerId`,`domain`)
);
