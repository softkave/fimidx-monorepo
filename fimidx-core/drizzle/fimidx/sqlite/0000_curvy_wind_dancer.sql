CREATE TABLE `emailBlockList` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`email` text NOT NULL,
	`justifyingEmailRecordId` text,
	`reason` text,
	FOREIGN KEY (`justifyingEmailRecordId`) REFERENCES `emailRecord`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `emailRecord` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`from` text NOT NULL,
	`to` text NOT NULL,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`params` text,
	`provider` text NOT NULL,
	`response` text,
	`senderError` text,
	`serverError` text,
	`callerId` text
);
--> statement-breakpoint
CREATE TABLE `objField` (
	`id` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`projectId` text NOT NULL,
	`groupId` text NOT NULL,
	`path` text NOT NULL,
	`type` text NOT NULL,
	`arrayTypes` text NOT NULL,
	`isArrayCompressed` integer NOT NULL,
	`tag` text NOT NULL
);
