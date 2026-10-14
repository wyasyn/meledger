-- Violet left the category palette when the brand colour moved to blue; lime takes its place.
UPDATE `categories` SET `color` = 'lime', `updated_at` = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) WHERE `color` = 'violet';
--> statement-breakpoint
UPDATE `wallets` SET `color` = 'lime', `updated_at` = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) WHERE `color` = 'violet';
--> statement-breakpoint
UPDATE `tags` SET `color` = 'lime', `updated_at` = CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) WHERE `color` = 'violet';
