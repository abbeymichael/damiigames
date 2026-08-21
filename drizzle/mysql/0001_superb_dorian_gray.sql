CREATE TABLE `admin_user_roles` (
	`user_id` varchar(36) NOT NULL,
	`role_id` varchar(36) NOT NULL,
	`assigned_by_admin_id` varchar(36) NOT NULL,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_user_roles_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `game_type_limits` (
	`id` varchar(36) NOT NULL,
	`game_type` varchar(32) NOT NULL,
	`min_wager` decimal(14,2) NOT NULL,
	`max_wager` decimal(14,2) NOT NULL,
	`min_tournament_prize_pool` decimal(14,2) NOT NULL,
	`max_tournament_prize_pool` decimal(14,2) NOT NULL,
	`platform_fee_percent` decimal(5,4) NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `game_type_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `game_type_limits_game_type_unique` UNIQUE(`game_type`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` varchar(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`slug` varchar(32) NOT NULL,
	`icon_url` varchar(255),
	`status` enum('enabled','disabled') NOT NULL DEFAULT 'enabled',
	`description` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`account_type` enum('available','escrow') NOT NULL,
	`entry_type` enum('deposit','withdrawal','wager_lock','wager_payout','wager_refund','platform_fee','entry_fee_lock','entry_fee_release','entry_fee_refund','prize_pool_lock','prize_disbursement','prize_pool_refund') NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`reference_type` varchar(32) NOT NULL,
	`reference_id` varchar(36) NOT NULL,
	`transaction_group_id` varchar(36) NOT NULL,
	`balance_after` decimal(14,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ledger_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` varchar(36) NOT NULL,
	`game_type` varchar(32) NOT NULL,
	`player_a_id` varchar(36) NOT NULL,
	`player_b_id` varchar(36),
	`wager_amount` decimal(14,2) NOT NULL,
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`winner_id` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`settled_at` timestamp,
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizer_applications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`applicant_type` enum('individual','organization'),
	`organization_name` varchar(160),
	`organization_reg_number` varchar(64),
	`ghana_card_front_url` varchar(255),
	`ghana_card_back_url` varchar(255),
	`selfie_url` varchar(255),
	`physical_address` varchar(255),
	`proof_of_address_url` varchar(255),
	`intended_game_types` varchar(255),
	`expected_tournament_size` int,
	`expected_frequency` varchar(64),
	`prior_experience` varchar(500),
	`terms_accepted_at` timestamp,
	`status` enum('draft','pending','approved','rejected','needs_info') NOT NULL DEFAULT 'draft',
	`previous_application_id` varchar(36),
	`submitted_at` timestamp,
	`needs_info_requested_at` timestamp,
	`needs_info_note` varchar(500),
	`reviewed_by_admin_id` varchar(36),
	`reviewed_at` timestamp,
	`review_note` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizer_applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizer_revocations` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`revoked_by_admin_id` varchar(36) NOT NULL,
	`reason` varchar(500) NOT NULL,
	`evidence_url` varchar(255),
	`reapply_eligible_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `organizer_revocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `otp_requests` (
	`id` varchar(36) NOT NULL,
	`phone_number` varchar(20) NOT NULL,
	`code_hash` varchar(128) NOT NULL,
	`ip_address` varchar(45) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`consumed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `otp_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(36) NOT NULL,
	`key` varchar(96) NOT NULL,
	`category` varchar(32) NOT NULL,
	`description` varchar(255) NOT NULL,
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `regions` (
	`id` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`code` varchar(32),
	`sort_order` int NOT NULL DEFAULT 0,
	`active` tinyint NOT NULL DEFAULT 1,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `regions_name_uq` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` varchar(36) NOT NULL,
	`permission_id` varchar(36) NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`name` varchar(64) NOT NULL,
	`description` varchar(255),
	`is_system_role` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` varchar(36) NOT NULL,
	`category` enum('sms','email','general','backup','security') NOT NULL,
	`key` varchar(96) NOT NULL,
	`value` text NOT NULL,
	`updated_by_admin_id` varchar(36),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_category_key_idx` UNIQUE(`category`,`key`)
);
--> statement-breakpoint
CREATE TABLE `tournament_action_requests` (
	`id` varchar(36) NOT NULL,
	`tournament_id` varchar(36) NOT NULL,
	`organizer_id` varchar(36) NOT NULL,
	`request_type` enum('cancel_tournament','disqualify_player','result_override') NOT NULL,
	`target_user_id` varchar(36),
	`match_id` varchar(36),
	`reason` varchar(500) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewed_by_admin_id` varchar(36),
	`reviewed_at` timestamp,
	`review_note` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_action_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_entries` (
	`id` varchar(36) NOT NULL,
	`tournament_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`fee_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
	`final_placement` int,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tournament_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `tournament_entries_user_uq` UNIQUE(`tournament_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `tournament_prizes` (
	`id` varchar(36) NOT NULL,
	`tournament_id` varchar(36) NOT NULL,
	`placement` int NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	CONSTRAINT `tournament_prizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tournaments` (
	`id` varchar(36) NOT NULL,
	`organizer_id` varchar(36) NOT NULL,
	`game_type` varchar(32) NOT NULL,
	`entry_fee` decimal(14,2) NOT NULL DEFAULT '0.00',
	`total_prize_pool` decimal(14,2) NOT NULL,
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `tournaments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`phone_number` varchar(20) NOT NULL,
	`phone_verified_at` timestamp,
	`full_name` varchar(120),
	`email` varchar(160),
	`email_verified_at` timestamp,
	`ghana_card_number` varchar(32),
	`date_of_birth` timestamp,
	`gender` varchar(16),
	`avatar_url` varchar(255),
	`region` varchar(64),
	`city` varchar(64),
	`address` varchar(255),
	`momo_number` varchar(20),
	`momo_network` varchar(32),
	`username` varchar(32),
	`referral_code` varchar(32),
	`role` enum('player','organizer','admin') NOT NULL DEFAULT 'player',
	`profile_completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_number_unique` UNIQUE(`phone_number`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE INDEX `ledger_user_account_idx` ON `ledger_entries` (`user_id`,`account_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `ledger_reference_idx` ON `ledger_entries` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `ledger_group_idx` ON `ledger_entries` (`transaction_group_id`);--> statement-breakpoint
CREATE INDEX `matches_status_idx` ON `matches` (`status`);--> statement-breakpoint
CREATE INDEX `matches_player_a_idx` ON `matches` (`player_a_id`);--> statement-breakpoint
CREATE INDEX `matches_player_b_idx` ON `matches` (`player_b_id`);--> statement-breakpoint
CREATE INDEX `matches_game_type_idx` ON `matches` (`game_type`);--> statement-breakpoint
CREATE INDEX `organizer_apps_user_id_idx` ON `organizer_applications` (`user_id`);--> statement-breakpoint
CREATE INDEX `organizer_apps_status_idx` ON `organizer_applications` (`status`);--> statement-breakpoint
CREATE INDEX `organizer_apps_created_at_idx` ON `organizer_applications` (`created_at`);--> statement-breakpoint
CREATE INDEX `organizer_apps_prev_app_idx` ON `organizer_applications` (`previous_application_id`);--> statement-breakpoint
CREATE INDEX `organizer_revocations_user_id_idx` ON `organizer_revocations` (`user_id`);--> statement-breakpoint
CREATE INDEX `organizer_revocations_created_at_idx` ON `organizer_revocations` (`created_at`);--> statement-breakpoint
CREATE INDEX `otp_phone_idx` ON `otp_requests` (`phone_number`,`created_at`);--> statement-breakpoint
CREATE INDEX `otp_ip_idx` ON `otp_requests` (`ip_address`,`created_at`);--> statement-breakpoint
CREATE INDEX `regions_sort_order_idx` ON `regions` (`sort_order`);--> statement-breakpoint
CREATE INDEX `tournament_entries_tournament_id_idx` ON `tournament_entries` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tournament_entries_user_id_idx` ON `tournament_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `tournament_prizes_tournament_id_idx` ON `tournament_prizes` (`tournament_id`);--> statement-breakpoint
CREATE INDEX `tournaments_status_idx` ON `tournaments` (`status`);--> statement-breakpoint
CREATE INDEX `tournaments_organizer_id_idx` ON `tournaments` (`organizer_id`);--> statement-breakpoint
CREATE INDEX `tournaments_game_type_idx` ON `tournaments` (`game_type`);