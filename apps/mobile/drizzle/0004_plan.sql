CREATE TABLE `savings_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	`sync_version` integer DEFAULT 0 NOT NULL,
	`name` text NOT NULL,
	`wallet_id` text NOT NULL,
	`contribution_amount` integer NOT NULL,
	`frequency` text NOT NULL,
	`members` text DEFAULT '[]' NOT NULL,
	`payout_turn` integer,
	`cycle_start` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE `budgets` ADD `starts_at` integer;--> statement-breakpoint
ALTER TABLE `budgets` ADD `ends_at` integer;--> statement-breakpoint
ALTER TABLE `debts` ADD `note` text;--> statement-breakpoint
ALTER TABLE `debts` ADD `started_at` integer;--> statement-breakpoint
ALTER TABLE `goals` ADD `color` text DEFAULT 'teal' NOT NULL;--> statement-breakpoint
ALTER TABLE `recurring_rules` ADD `name` text DEFAULT '' NOT NULL;