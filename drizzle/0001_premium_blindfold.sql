CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`userId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contact_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notes` text,
	`replied_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` text NOT NULL,
	`impersonatedBy` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`role` text,
	`banned` integer,
	`banReason` text,
	`banExpires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer,
	`updatedAt` integer
);
--> statement-breakpoint
DROP INDEX "attendance_student_date_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "student_profiles_user_id_unique";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
ALTER TABLE `student_profiles` ALTER COLUMN "user_id" TO "user_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_student_date_idx` ON `attendance` (`student_user_id`,`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `student_profiles_user_id_unique` ON `student_profiles` (`user_id`);--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `student_name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `photo_url` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `nationality` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `religion` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `caste` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `aadhaar_number` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `previous_school` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `transfer_certificate_number` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `transport_mode` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `transport_route` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `transport_pickup_person` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `transport_pickup_phone` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `transport_drop_person` text;--> statement-breakpoint
ALTER TABLE `student_profiles` ADD `transport_drop_phone` text;