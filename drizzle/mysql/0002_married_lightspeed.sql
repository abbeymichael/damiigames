CREATE TABLE `deposit_actions` (
	`id` varchar(191) NOT NULL,
	`deposit_id` varchar(191) NOT NULL,
	`action` varchar(32) NOT NULL,
	`actor_id` varchar(191) NOT NULL,
	`actor_name` varchar(191),
	`previous_status` varchar(32),
	`new_status` varchar(32),
	`notes` text,
	`metadata_json` text,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `deposit_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`currency` varchar(16) NOT NULL DEFAULT 'GHS',
	`method` varchar(32) NOT NULL DEFAULT 'momo',
	`provider` varchar(32) NOT NULL DEFAULT 'Paystack',
	`reference` varchar(191) NOT NULL,
	`gateway_reference` varchar(191),
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`phone_number` varchar(32),
	`account_name` varchar(191),
	`fee` decimal(14,2) NOT NULL DEFAULT '0.00',
	`net_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`gateway_response` text,
	`verified_at` varchar(32),
	`verified_by` varchar(191),
	`approved_at` varchar(32),
	`approved_by` varchar(191),
	`processed_at` varchar(32),
	`processed_by` varchar(191),
	`rejected_at` varchar(32),
	`rejected_by` varchar(191),
	`rejection_reason` text,
	`metadata_json` text,
	`ledger_entry_id` varchar(191),
	`wallet_transaction_id` varchar(191),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `deposits_id` PRIMARY KEY(`id`),
	CONSTRAINT `deposits_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `withdrawal_actions` (
	`id` varchar(191) NOT NULL,
	`withdrawal_id` varchar(191) NOT NULL,
	`action` varchar(32) NOT NULL,
	`actor_id` varchar(191) NOT NULL,
	`actor_name` varchar(191),
	`previous_status` varchar(32),
	`new_status` varchar(32),
	`notes` text,
	`metadata_json` text,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `withdrawal_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`currency` varchar(16) NOT NULL DEFAULT 'GHS',
	`method` varchar(32) NOT NULL DEFAULT 'momo',
	`provider` varchar(32) NOT NULL DEFAULT 'MTN',
	`account_number` varchar(32) NOT NULL,
	`account_name` varchar(191),
	`bank_code` varchar(32),
	`recipient_code` varchar(191),
	`transfer_code` varchar(191),
	`transfer_id` varchar(64),
	`reference` varchar(191) NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`fee` decimal(14,2) NOT NULL DEFAULT '0.00',
	`net_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
	`gateway_response` text,
	`failure_reason` text,
	`verified_at` varchar(32),
	`verified_by` varchar(191),
	`approved_at` varchar(32),
	`approved_by` varchar(191),
	`processed_at` varchar(32),
	`processed_by` varchar(191),
	`rejected_at` varchar(32),
	`rejected_by` varchar(191),
	`rejection_reason` text,
	`disbursed_at` varchar(32),
	`metadata_json` text,
	`ledger_entry_id` varchar(191),
	`wallet_transaction_id` varchar(191),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`),
	CONSTRAINT `withdrawals_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `admin_user_roles` MODIFY COLUMN `user_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_user_roles` MODIFY COLUMN `role_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `admin_user_roles` MODIFY COLUMN `assigned_by_admin_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `game_type_limits` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `games` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `user_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `reference_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `transaction_group_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `player_a_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `player_b_id` varchar(191);--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `winner_id` varchar(191);--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `user_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `previous_application_id` varchar(191);--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `reviewed_by_admin_id` varchar(191);--> statement-breakpoint
ALTER TABLE `organizer_revocations` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `organizer_revocations` MODIFY COLUMN `user_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `organizer_revocations` MODIFY COLUMN `revoked_by_admin_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `otp_requests` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `permissions` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `role_permissions` MODIFY COLUMN `role_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `role_permissions` MODIFY COLUMN `permission_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `roles` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `updated_by_admin_id` varchar(191);--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `tournament_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `organizer_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `target_user_id` varchar(191);--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `match_id` varchar(191);--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `reviewed_by_admin_id` varchar(191);--> statement-breakpoint
ALTER TABLE `tournament_entries` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_entries` MODIFY COLUMN `tournament_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_entries` MODIFY COLUMN `user_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_prizes` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournament_prizes` MODIFY COLUMN `tournament_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` MODIFY COLUMN `organizer_id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(191) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `avatar_url` text;--> statement-breakpoint
ALTER TABLE `rooms` ADD `is_private` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `host_ready` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `guest_ready` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `deposit_actions_deposit_id_idx` ON `deposit_actions` (`deposit_id`);--> statement-breakpoint
CREATE INDEX `deposit_actions_action_idx` ON `deposit_actions` (`action`);--> statement-breakpoint
CREATE INDEX `deposit_actions_created_at_idx` ON `deposit_actions` (`created_at`);--> statement-breakpoint
CREATE INDEX `deposits_user_id_idx` ON `deposits` (`user_id`);--> statement-breakpoint
CREATE INDEX `deposits_status_idx` ON `deposits` (`status`);--> statement-breakpoint
CREATE INDEX `deposits_created_at_idx` ON `deposits` (`created_at`);--> statement-breakpoint
CREATE INDEX `withdrawal_actions_withdrawal_id_idx` ON `withdrawal_actions` (`withdrawal_id`);--> statement-breakpoint
CREATE INDEX `withdrawal_actions_action_idx` ON `withdrawal_actions` (`action`);--> statement-breakpoint
CREATE INDEX `withdrawal_actions_created_at_idx` ON `withdrawal_actions` (`created_at`);--> statement-breakpoint
CREATE INDEX `withdrawals_user_id_idx` ON `withdrawals` (`user_id`);--> statement-breakpoint
CREATE INDEX `withdrawals_status_idx` ON `withdrawals` (`status`);--> statement-breakpoint
CREATE INDEX `withdrawals_transfer_code_idx` ON `withdrawals` (`transfer_code`);--> statement-breakpoint
CREATE INDEX `withdrawals_created_at_idx` ON `withdrawals` (`created_at`);