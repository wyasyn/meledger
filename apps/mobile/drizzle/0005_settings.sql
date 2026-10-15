CREATE TABLE `alert_log` (
	`key` text PRIMARY KEY NOT NULL,
	`sent_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `profile` ADD `lock_delay` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `hide_balances` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `store_transcripts` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `bill_alerts` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `budget_alerts` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `goal_alerts` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `quiet_start` text DEFAULT '22:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `quiet_end` text DEFAULT '07:00' NOT NULL;