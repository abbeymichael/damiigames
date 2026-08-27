ALTER TABLE `deposits` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `deposits` MODIFY COLUMN `ledger_entry_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `withdrawals` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `withdrawals` MODIFY COLUMN `ledger_entry_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `deposit_actions` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `deposit_actions` MODIFY COLUMN `deposit_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `withdrawal_actions` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `withdrawal_actions` MODIFY COLUMN `withdrawal_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `otp_requests` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `user_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `previous_application_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `organizer_applications` MODIFY COLUMN `reviewed_by_admin_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `organizer_revocations` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizer_revocations` MODIFY COLUMN `user_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `organizer_revocations` MODIFY COLUMN `revoked_by_admin_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `player_a_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `player_b_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `matches` MODIFY COLUMN `winner_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `tournaments` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournaments` MODIFY COLUMN `organizer_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_prizes` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_prizes` MODIFY COLUMN `tournament_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_entries` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_entries` MODIFY COLUMN `tournament_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_entries` MODIFY COLUMN `user_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `game_type_limits` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `user_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `reference_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `ledger_entries` MODIFY COLUMN `transaction_group_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `roles` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `permissions` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `role_permissions` MODIFY COLUMN `role_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `role_permissions` MODIFY COLUMN `permission_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `admin_user_roles` MODIFY COLUMN `user_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `admin_user_roles` MODIFY COLUMN `role_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `admin_user_roles` MODIFY COLUMN `assigned_by_admin_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `games` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `tournament_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `organizer_id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `target_user_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `match_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `tournament_action_requests` MODIFY COLUMN `reviewed_by_admin_id` varchar(191);
--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `id` varchar(191) NOT NULL;
--> statement-breakpoint
ALTER TABLE `system_settings` MODIFY COLUMN `updated_by_admin_id` varchar(191);
