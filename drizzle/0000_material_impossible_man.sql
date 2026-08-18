CREATE TABLE `profiles` (
	`token` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`rating` integer DEFAULT 1000 NOT NULL,
	`marbles` integer DEFAULT 100 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host_name` text NOT NULL,
	`host_token` text NOT NULL,
	`guest_name` text,
	`guest_token` text,
	`board_json` text NOT NULL,
	`turn` text DEFAULT 'white' NOT NULL,
	`forced_from` integer,
	`winner` text,
	`status` text DEFAULT 'waiting' NOT NULL,
	`move_count` integer DEFAULT 0 NOT NULL,
	`result_applied` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
