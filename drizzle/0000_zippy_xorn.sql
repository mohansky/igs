CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_user_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`notes` text,
	`marked_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_student_date_idx` ON `attendance` (`student_user_id`,`date`);--> statement-breakpoint
CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`section` text,
	`academic_year` text NOT NULL,
	`capacity` integer,
	`teacher_user_id` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `fees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_user_id` text NOT NULL,
	`amount` real NOT NULL,
	`due_date` text NOT NULL,
	`paid_date` text,
	`paid_amount` real,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text,
	`receipt_number` text,
	`description` text,
	`notes` text,
	`received_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`class_id` integer,
	`date_of_birth` text,
	`gender` text,
	`blood_group` text,
	`admission_date` text,
	`admission_number` text,
	`parent_name` text,
	`parent_relation` text,
	`parent_phone` text,
	`parent_email` text,
	`parent_occupation` text,
	`emergency_contact` text,
	`emergency_phone` text,
	`address` text,
	`medical_notes` text,
	`allergies` text,
	`is_active` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_profiles_user_id_unique` ON `student_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
