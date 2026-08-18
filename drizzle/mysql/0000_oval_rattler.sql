CREATE TABLE `admin_logs` (
	`id` varchar(191) NOT NULL,
	`admin_token` varchar(191) NOT NULL,
	`admin_name` varchar(191) NOT NULL,
	`action` varchar(191) NOT NULL,
	`target` varchar(191) NOT NULL,
	`details_json` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_profiles` (
	`user_id` varchar(191) NOT NULL,
	`permissions_json` text NOT NULL,
	`is_super_admin` tinyint NOT NULL DEFAULT 0,
	`granted_by` varchar(191) NOT NULL,
	`granted_at` varchar(32) NOT NULL,
	CONSTRAINT `admin_profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `admin_settings` (
	`id` int NOT NULL DEFAULT 1,
	`wager_fee_percent` int NOT NULL DEFAULT 5,
	`tournament_fee_percent` int NOT NULL DEFAULT 10,
	`points_per_ghs_buy` int NOT NULL DEFAULT 1,
	`points_per_ghs_withdraw` int NOT NULL DEFAULT 1,
	`min_deposit_ghs` int NOT NULL DEFAULT 5,
	`max_deposit_ghs` int NOT NULL DEFAULT 5000,
	`min_withdrawal_ghs` int NOT NULL DEFAULT 10,
	`max_withdrawal_ghs` int NOT NULL DEFAULT 2000,
	`max_daily_withdrawal_ghs` int NOT NULL DEFAULT 5000,
	`updated_at` varchar(32) NOT NULL,
	`updated_by` varchar(191),
	CONSTRAINT `admin_settings_id_pk` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escrows` (
	`id` varchar(191) NOT NULL,
	`room_code` varchar(32) NOT NULL,
	`amount_marbles` int NOT NULL DEFAULT 0,
	`amount_points` int NOT NULL DEFAULT 0,
	`player1_token` varchar(191) NOT NULL,
	`player2_token` varchar(191),
	`locked_at` varchar(32) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'locked',
	`winner_token` varchar(191),
	`disbursed_at` varchar(32),
	CONSTRAINT `escrows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `league_matches` (
	`id` varchar(191) NOT NULL,
	`league_id` varchar(191) NOT NULL,
	`round` int NOT NULL,
	`match_number` int NOT NULL,
	`bracket_type` varchar(32) NOT NULL DEFAULT 'winners',
	`player1_token` varchar(191),
	`player1_name` varchar(191),
	`player1_score` int NOT NULL DEFAULT 0,
	`player2_token` varchar(191),
	`player2_name` varchar(191),
	`player2_score` int NOT NULL DEFAULT 0,
	`winner_token` varchar(191),
	`room_code` varchar(32),
	`scheduled_time` varchar(64),
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`dispute_notes` text,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `league_matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `league_participants` (
	`id` varchar(191) NOT NULL,
	`league_id` varchar(191) NOT NULL,
	`user_token` varchar(191) NOT NULL,
	`username` varchar(191) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'approved',
	`seed` int NOT NULL DEFAULT 0,
	`checked_in` tinyint NOT NULL DEFAULT 0,
	`points_score` int NOT NULL DEFAULT 0,
	`wins_count` int NOT NULL DEFAULT 0,
	`losses_count` int NOT NULL DEFAULT 0,
	`draws_count` int NOT NULL DEFAULT 0,
	`joined_at` varchar(32) NOT NULL,
	CONSTRAINT `league_participants_id` PRIMARY KEY(`id`),
	CONSTRAINT `league_participants_league_user_uq` UNIQUE(`league_id`,`user_token`)
);
--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` varchar(191) NOT NULL,
	`title` varchar(191) NOT NULL,
	`description` text NOT NULL,
	`entry_fee_marbles` int NOT NULL DEFAULT 0,
	`entry_fee_points` int NOT NULL DEFAULT 0,
	`prize_pool_points` int NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'registration',
	`format` varchar(32) NOT NULL DEFAULT 'single_elimination',
	`facilitator_token` varchar(191) NOT NULL,
	`facilitator_name` varchar(191) NOT NULL,
	`max_participants` int NOT NULL DEFAULT 16,
	`participant_count` int NOT NULL DEFAULT 0,
	`winner_token` varchar(191),
	`winner_name` varchar(191),
	`runner_up_token` varchar(191),
	`runner_up_name` varchar(191),
	`third_place_token` varchar(191),
	`third_place_name` varchar(191),
	`is_private` tinyint NOT NULL DEFAULT 0,
	`invite_code` varchar(64),
	`requires_approval` tinyint NOT NULL DEFAULT 0,
	`schedule_date` varchar(32),
	`schedule_time` varchar(32),
	`game_days` varchar(191),
	`turn_timer_seconds` int NOT NULL DEFAULT 60,
	`rounds_count` int NOT NULL DEFAULT 0,
	`prize_distribution_json` text NOT NULL,
	`rules_notes` text,
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `leagues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizer_profiles` (
	`user_id` varchar(191) NOT NULL,
	`username` varchar(191),
	`status` varchar(16) NOT NULL DEFAULT 'none',
	`requested_at` varchar(32) NOT NULL,
	`reviewed_by` varchar(191),
	`reviewed_at` varchar(32),
	`rejection_reason` varchar(512),
	`organization_name` varchar(191),
	`bio` text,
	`contact_phone` varchar(32),
	CONSTRAINT `organizer_profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `paystack_events` (
	`reference` varchar(191) NOT NULL,
	`processed_at` varchar(32) NOT NULL,
	CONSTRAINT `paystack_events_reference` PRIMARY KEY(`reference`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`token` varchar(191) NOT NULL,
	`username` varchar(191) NOT NULL,
	`username_lower` varchar(191) NOT NULL,
	`phone_number` varchar(32),
	`passcode` varchar(255),
	`password_salt` varchar(128),
	`rating` int NOT NULL DEFAULT 1000,
	`marbles` int NOT NULL DEFAULT 0,
	`points` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`draws` int NOT NULL DEFAULT 0,
	`win_streak` int NOT NULL DEFAULT 0,
	`best_streak` int NOT NULL DEFAULT 0,
	`last_match_at` varchar(32),
	`matches_last_7_days` int NOT NULL DEFAULT 0,
	`opponent_rating_avg` int NOT NULL DEFAULT 0,
	`total_opponents_faced` int NOT NULL DEFAULT 0,
	`role` varchar(32) NOT NULL DEFAULT 'user',
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`banned_at` varchar(32),
	`banned_reason` varchar(512),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `profiles_token` PRIMARY KEY(`token`),
	CONSTRAINT `profiles_username_lower_uq` UNIQUE(`username_lower`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` varchar(32) NOT NULL,
	`host_name` varchar(191) NOT NULL,
	`host_token` varchar(191) NOT NULL,
	`guest_name` varchar(191),
	`guest_token` varchar(191),
	`board_json` text NOT NULL,
	`moves_json` text,
	`turn` varchar(8) NOT NULL DEFAULT 'white',
	`forced_from` int,
	`winner` varchar(8),
	`status` varchar(16) NOT NULL DEFAULT 'waiting',
	`mode` varchar(16) NOT NULL DEFAULT 'casual',
	`wager_amount` int NOT NULL DEFAULT 0,
	`escrow_id` varchar(191),
	`league_id` varchar(191),
	`match_id` varchar(191),
	`move_count` int NOT NULL DEFAULT 0,
	`result_applied` tinyint NOT NULL DEFAULT 0,
	`last_move_time` bigint NOT NULL DEFAULT 0,
	`disconnect_time` bigint,
	`disconnected_player` varchar(8),
	`created_at` varchar(32) NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `rooms_code` PRIMARY KEY(`code`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` varchar(191) NOT NULL,
	`id` varchar(191) NOT NULL,
	`user_id` varchar(191) NOT NULL,
	`role` varchar(32) NOT NULL,
	`csrf_token` varchar(191),
	`ip_address` varchar(64),
	`user_agent` varchar(512),
	`created_at` varchar(32) NOT NULL,
	`expires_at` varchar(32) NOT NULL,
	CONSTRAINT `sessions_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` varchar(191) NOT NULL,
	`user_token` varchar(191) NOT NULL,
	`type` varchar(32) NOT NULL,
	`currency` varchar(16) NOT NULL,
	`amount` int NOT NULL,
	`reference` varchar(191) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'completed',
	`meta_json` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `admin_logs_admin_token_idx` ON `admin_logs` (`admin_token`);--> statement-breakpoint
CREATE INDEX `admin_logs_created_at_idx` ON `admin_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `admin_profiles_granted_at_idx` ON `admin_profiles` (`granted_at`);--> statement-breakpoint
CREATE INDEX `escrows_room_code_idx` ON `escrows` (`room_code`);--> statement-breakpoint
CREATE INDEX `escrows_status_idx` ON `escrows` (`status`);--> statement-breakpoint
CREATE INDEX `league_matches_league_id_idx` ON `league_matches` (`league_id`);--> statement-breakpoint
CREATE INDEX `league_matches_status_idx` ON `league_matches` (`status`);--> statement-breakpoint
CREATE INDEX `league_matches_room_code_idx` ON `league_matches` (`room_code`);--> statement-breakpoint
CREATE INDEX `league_matches_order_idx` ON `league_matches` (`league_id`,`round`,`match_number`);--> statement-breakpoint
CREATE INDEX `league_participants_league_id_idx` ON `league_participants` (`league_id`);--> statement-breakpoint
CREATE INDEX `league_participants_user_token_idx` ON `league_participants` (`user_token`);--> statement-breakpoint
CREATE INDEX `leagues_status_idx` ON `leagues` (`status`);--> statement-breakpoint
CREATE INDEX `leagues_facilitator_token_idx` ON `leagues` (`facilitator_token`);--> statement-breakpoint
CREATE INDEX `leagues_created_at_idx` ON `leagues` (`created_at`);--> statement-breakpoint
CREATE INDEX `leagues_invite_code_idx` ON `leagues` (`invite_code`);--> statement-breakpoint
CREATE INDEX `organizer_profiles_status_idx` ON `organizer_profiles` (`status`);--> statement-breakpoint
CREATE INDEX `organizer_profiles_requested_at_idx` ON `organizer_profiles` (`requested_at`);--> statement-breakpoint
CREATE INDEX `profiles_role_idx` ON `profiles` (`role`);--> statement-breakpoint
CREATE INDEX `profiles_status_idx` ON `profiles` (`status`);--> statement-breakpoint
CREATE INDEX `profiles_rating_idx` ON `profiles` (`rating`);--> statement-breakpoint
CREATE INDEX `rooms_status_idx` ON `rooms` (`status`);--> statement-breakpoint
CREATE INDEX `rooms_host_token_idx` ON `rooms` (`host_token`);--> statement-breakpoint
CREATE INDEX `rooms_guest_token_idx` ON `rooms` (`guest_token`);--> statement-breakpoint
CREATE INDEX `rooms_league_id_idx` ON `rooms` (`league_id`);--> statement-breakpoint
CREATE INDEX `rooms_updated_at_idx` ON `rooms` (`updated_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `wallet_tx_user_token_idx` ON `wallet_transactions` (`user_token`);--> statement-breakpoint
CREATE INDEX `wallet_tx_created_at_idx` ON `wallet_transactions` (`created_at`);--> statement-breakpoint
CREATE INDEX `wallet_tx_reference_idx` ON `wallet_transactions` (`reference`);--> statement-breakpoint
CREATE INDEX `wallet_tx_type_idx` ON `wallet_transactions` (`type`);