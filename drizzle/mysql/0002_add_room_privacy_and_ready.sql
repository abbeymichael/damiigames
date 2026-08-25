ALTER TABLE `rooms` ADD COLUMN `is_private` tinyint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `rooms` ADD COLUMN `host_ready` tinyint NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `rooms` ADD COLUMN `guest_ready` tinyint NOT NULL DEFAULT 0;
