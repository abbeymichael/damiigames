CREATE TABLE IF NOT EXISTS `deposits` (
	`id` varchar(36) NOT NULL,
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
	`fee` decimal(14,2) NOT NULL DEFAULT 0.00,
	`net_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
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
	`ledger_entry_id` varchar(36),
	`wallet_transaction_id` varchar(191),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `deposits_id_pk` PRIMARY KEY(`id`),
	CONSTRAINT `deposits_reference_unique` UNIQUE(`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `deposits_user_id_idx` ON `deposits` (`user_id`);
--> statement-breakpoint
CREATE INDEX `deposits_status_idx` ON `deposits` (`status`);
--> statement-breakpoint
CREATE INDEX `deposits_created_at_idx` ON `deposits` (`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `withdrawals` (
	`id` varchar(36) NOT NULL,
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
	`fee` decimal(14,2) NOT NULL DEFAULT 0.00,
	`net_amount` decimal(14,2) NOT NULL DEFAULT 0.00,
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
	`ledger_entry_id` varchar(36),
	`wallet_transaction_id` varchar(191),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `withdrawals_id_pk` PRIMARY KEY(`id`),
	CONSTRAINT `withdrawals_reference_unique` UNIQUE(`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `withdrawals_user_id_idx` ON `withdrawals` (`user_id`);
--> statement-breakpoint
CREATE INDEX `withdrawals_status_idx` ON `withdrawals` (`status`);
--> statement-breakpoint
CREATE INDEX `withdrawals_transfer_code_idx` ON `withdrawals` (`transfer_code`);
--> statement-breakpoint
CREATE INDEX `withdrawals_created_at_idx` ON `withdrawals` (`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `deposit_actions` (
	`id` varchar(36) NOT NULL,
	`deposit_id` varchar(36) NOT NULL,
	`action` varchar(32) NOT NULL,
	`actor_id` varchar(191) NOT NULL,
	`actor_name` varchar(191),
	`previous_status` varchar(32),
	`new_status` varchar(32),
	`notes` text,
	`metadata_json` text,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `deposit_actions_id_pk` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `deposit_actions_deposit_id_idx` ON `deposit_actions` (`deposit_id`);
--> statement-breakpoint
CREATE INDEX `deposit_actions_action_idx` ON `deposit_actions` (`action`);
--> statement-breakpoint
CREATE INDEX `deposit_actions_created_at_idx` ON `deposit_actions` (`created_at`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `withdrawal_actions` (
	`id` varchar(36) NOT NULL,
	`withdrawal_id` varchar(36) NOT NULL,
	`action` varchar(32) NOT NULL,
	`actor_id` varchar(191) NOT NULL,
	`actor_name` varchar(191),
	`previous_status` varchar(32),
	`new_status` varchar(32),
	`notes` text,
	`metadata_json` text,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `withdrawal_actions_id_pk` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `withdrawal_actions_withdrawal_id_idx` ON `withdrawal_actions` (`withdrawal_id`);
--> statement-breakpoint
CREATE INDEX `withdrawal_actions_action_idx` ON `withdrawal_actions` (`action`);
--> statement-breakpoint
CREATE INDEX `withdrawal_actions_created_at_idx` ON `withdrawal_actions` (`created_at`);
