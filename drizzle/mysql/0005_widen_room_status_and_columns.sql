ALTER TABLE `rooms` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'waiting';
--> statement-breakpoint
ALTER TABLE `rooms` MODIFY COLUMN `mode` varchar(64) NOT NULL DEFAULT 'casual';
--> statement-breakpoint
ALTER TABLE `rooms` MODIFY COLUMN `turn` varchar(16) NOT NULL DEFAULT 'white';
--> statement-breakpoint
ALTER TABLE `rooms` MODIFY COLUMN `winner` varchar(16);
--> statement-breakpoint
ALTER TABLE `rooms` MODIFY COLUMN `disconnected_player` varchar(16);
--> statement-breakpoint
ALTER TABLE `profiles` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `profiles` MODIFY COLUMN `role` varchar(64) NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE `organizer_profiles` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'none';
--> statement-breakpoint
ALTER TABLE `wallet_transactions` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'completed';
--> statement-breakpoint
ALTER TABLE `wallet_transactions` MODIFY COLUMN `type` varchar(64) NOT NULL;
--> statement-breakpoint
ALTER TABLE `escrows` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'locked';
--> statement-breakpoint
ALTER TABLE `leagues` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'registration';
--> statement-breakpoint
ALTER TABLE `leagues` MODIFY COLUMN `format` varchar(64) NOT NULL DEFAULT 'single_elimination';
--> statement-breakpoint
ALTER TABLE `league_participants` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'approved';
--> statement-breakpoint
ALTER TABLE `league_matches` MODIFY COLUMN `status` varchar(64) NOT NULL DEFAULT 'pending';
