CREATE TABLE `generation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workbook_id` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`cache_read_tokens` integer DEFAULT 0,
	`cache_write_tokens` integer DEFAULT 0,
	`cost` real NOT NULL,
	`duration_ms` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workbook_id`) REFERENCES `workbooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `question_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`question_id` text NOT NULL,
	`user_id` text NOT NULL,
	`rating` integer,
	`reason` text,
	`comment` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`workbook_id` text NOT NULL,
	`type` text NOT NULL,
	`difficulty` text DEFAULT 'grade_level' NOT NULL,
	`points` integer DEFAULT 1 NOT NULL,
	`question_text` text NOT NULL,
	`options` text,
	`answer` text NOT NULL,
	`solution` text,
	`standard_code` text,
	`confidence` text DEFAULT 'high' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_ai_generated` integer DEFAULT true,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workbook_id`) REFERENCES `workbooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rubrics` (
	`id` text PRIMARY KEY NOT NULL,
	`workbook_id` text NOT NULL,
	`question_id` text,
	`criteria` text NOT NULL,
	`max_score` integer NOT NULL,
	`score_levels` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workbook_id`) REFERENCES `workbooks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `semantic_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`prompt_hash` text NOT NULL,
	`embedding` text,
	`response_json` text NOT NULL,
	`subject` text,
	`topic` text,
	`grade_level` text,
	`hit_count` integer DEFAULT 1,
	`created_at` text NOT NULL,
	`last_hit_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `semantic_cache_prompt_hash_unique` ON `semantic_cache` (`prompt_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`role` text DEFAULT 'teacher' NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`grade_levels` text,
	`subjects` text,
	`avatar_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `workbooks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`subject` text NOT NULL,
	`topic` text NOT NULL,
	`grade_level` text NOT NULL,
	`description` text,
	`estimated_time` text,
	`question_count` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`standard_codes` text,
	`is_enhanced` integer DEFAULT false,
	`source_material_name` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
