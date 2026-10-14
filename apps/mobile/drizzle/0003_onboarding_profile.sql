ALTER TABLE `profile` ADD `reminder_on` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `biometric_lock` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profile` ADD `income_kind` text;--> statement-breakpoint
ALTER TABLE `profile` ADD `usual_income` integer;--> statement-breakpoint
ALTER TABLE `profile` ADD `pay_day` integer;