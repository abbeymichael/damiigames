/**
 * DAMII — Production MySQL schema (Drizzle ORM / mysql2)
 *
 * This is the single authoritative production schema. Every column here maps
 * 1:1 onto the domain types declared in `lib/types.ts`, including the fields
 * the previous SQLite/Postgres schemas silently dropped (marbles balance,
 * password salts, ban metadata, streak/rating telemetry, sessions, admin &
 * organizer profiles, move logs, Paystack idempotency keys and the mutable
 * admin settings singleton).
 *
 * Conventions
 *  - Identifiers/tokens are `varchar(191)` so they stay index-safe under the
 *    utf8mb4 charset on MySQL 5.7 / MariaDB (191 * 4 bytes < 767-byte limit).
 *  - Timestamps are stored as ISO-8601 strings (`varchar(32)`) to match the
 *    string-typed domain model exactly and avoid timezone coercion surprises.
 *  - Booleans are stored as `tinyint` (0/1) and mapped in the repository layer.
 *  - Money-like values (points/marbles) are integers; 1 GHS = 1 point = 1 marble.
 */
import {
  bigint,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Shorthand for ISO-8601 timestamp strings. */
const isoTimestamp = (name: string) => varchar(name, { length: 32 });

/* ------------------------------------------------------------------------- */
/* profiles — the user account root record                                    */
/* ------------------------------------------------------------------------- */
export const profiles = mysqlTable(
  "profiles",
  {
    token: varchar("token", { length: 191 }).primaryKey(),
    username: varchar("username", { length: 191 }).notNull(),
    /** Lowercased username used for case-insensitive uniqueness + lookups. */
    usernameLower: varchar("username_lower", { length: 191 }).notNull(),
    phoneNumber: varchar("phone_number", { length: 32 }),
    /** PBKDF2-SHA256 hash (never the plaintext passcode). */
    passcode: varchar("passcode", { length: 255 }),
    /** Per-user PBKDF2 salt. */
    passwordSalt: varchar("password_salt", { length: 128 }),

    rating: int("rating").notNull().default(1000),
    marbles: int("marbles").notNull().default(0),
    points: int("points").notNull().default(0),
    wins: int("wins").notNull().default(0),
    losses: int("losses").notNull().default(0),
    draws: int("draws").notNull().default(0),

    // Rating / activity telemetry used by lib/rank-service.ts
    winStreak: int("win_streak").notNull().default(0),
    bestStreak: int("best_streak").notNull().default(0),
    lastMatchAt: isoTimestamp("last_match_at"),
    matchesLast7Days: int("matches_last_7_days").notNull().default(0),
    opponentRatingAvg: int("opponent_rating_avg").notNull().default(0),
    totalOpponentsFaced: int("total_opponents_faced").notNull().default(0),

    role: varchar("role", { length: 32 }).notNull().default("user"),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    bannedAt: isoTimestamp("banned_at"),
    bannedReason: varchar("banned_reason", { length: 512 }),

    createdAt: isoTimestamp("created_at").notNull(),
    updatedAt: isoTimestamp("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("profiles_username_lower_uq").on(t.usernameLower),
    index("profiles_role_idx").on(t.role),
    index("profiles_status_idx").on(t.status),
    index("profiles_rating_idx").on(t.rating),
  ],
);

/* ------------------------------------------------------------------------- */
/* sessions — server-side session store (opaque tokens + CSRF pairing)        */
/* ------------------------------------------------------------------------- */
export const sessions = mysqlTable(
  "sessions",
  {
    /** Opaque high-entropy session token, used as the cookie value. */
    token: varchar("token", { length: 191 }).primaryKey(),
    id: varchar("id", { length: 191 }).notNull(),
    userId: varchar("user_id", { length: 191 }).notNull(),
    role: varchar("role", { length: 32 }).notNull(),
    csrfToken: varchar("csrf_token", { length: 191 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: isoTimestamp("created_at").notNull(),
    expiresAt: isoTimestamp("expires_at").notNull(),
  },
  (t) => [
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

/* ------------------------------------------------------------------------- */
/* admin_profiles — elevated permission grants                               */
/* ------------------------------------------------------------------------- */
export const adminProfiles = mysqlTable(
  "admin_profiles",
  {
    userId: varchar("user_id", { length: 191 }).primaryKey(),
    /** JSON array of AdminPermission values. */
    permissionsJson: text("permissions_json").notNull(),
    isSuperAdmin: tinyint("is_super_admin").notNull().default(0),
    grantedBy: varchar("granted_by", { length: 191 }).notNull(),
    grantedAt: isoTimestamp("granted_at").notNull(),
  },
  (t) => [index("admin_profiles_granted_at_idx").on(t.grantedAt)],
);

/* ------------------------------------------------------------------------- */
/* organizer_profiles — tournament organizer applications & approvals        */
/* ------------------------------------------------------------------------- */
export const organizerProfiles = mysqlTable(
  "organizer_profiles",
  {
    userId: varchar("user_id", { length: 191 }).primaryKey(),
    username: varchar("username", { length: 191 }),
    status: varchar("status", { length: 16 }).notNull().default("none"),
    requestedAt: isoTimestamp("requested_at").notNull(),
    reviewedBy: varchar("reviewed_by", { length: 191 }),
    reviewedAt: isoTimestamp("reviewed_at"),
    rejectionReason: varchar("rejection_reason", { length: 512 }),
    organizationName: varchar("organization_name", { length: 191 }),
    bio: text("bio"),
    contactPhone: varchar("contact_phone", { length: 32 }),
  },
  (t) => [
    index("organizer_profiles_status_idx").on(t.status),
    index("organizer_profiles_requested_at_idx").on(t.requestedAt),
  ],
);

/* ------------------------------------------------------------------------- */
/* rooms — live and historical match rooms                                   */
/* ------------------------------------------------------------------------- */
export const rooms = mysqlTable(
  "rooms",
  {
    code: varchar("code", { length: 32 }).primaryKey(),
    hostName: varchar("host_name", { length: 191 }).notNull(),
    hostToken: varchar("host_token", { length: 191 }).notNull(),
    guestName: varchar("guest_name", { length: 191 }),
    guestToken: varchar("guest_token", { length: 191 }),

    /** Serialized 10x10 board state. */
    boardJson: text("board_json").notNull(),
    /** Append-only serialized MoveLogEntry[] used for reconnect replay. */
    movesJson: text("moves_json"),

    turn: varchar("turn", { length: 8 }).notNull().default("white"),
    forcedFrom: int("forced_from"),
    winner: varchar("winner", { length: 8 }),
    status: varchar("status", { length: 16 }).notNull().default("waiting"),
    mode: varchar("mode", { length: 16 }).notNull().default("casual"),

    wagerAmount: int("wager_amount").notNull().default(0),
    escrowId: varchar("escrow_id", { length: 191 }),
    leagueId: varchar("league_id", { length: 191 }),
    matchId: varchar("match_id", { length: 191 }),

    isPrivate: tinyint("is_private").notNull().default(0),
    hostReady: tinyint("host_ready").notNull().default(0),
    guestReady: tinyint("guest_ready").notNull().default(0),

    moveCount: int("move_count").notNull().default(0),
    /** 0/1 guard so match results are only ever applied once. */
    resultApplied: tinyint("result_applied").notNull().default(0),

    /** Epoch millis — needs 64-bit width. */
    lastMoveTime: bigint("last_move_time", { mode: "number" }).notNull().default(0),
    disconnectTime: bigint("disconnect_time", { mode: "number" }),
    disconnectedPlayer: varchar("disconnected_player", { length: 8 }),

    createdAt: isoTimestamp("created_at").notNull(),
    updatedAt: isoTimestamp("updated_at").notNull(),
  },
  (t) => [
    index("rooms_status_idx").on(t.status),
    index("rooms_host_token_idx").on(t.hostToken),
    index("rooms_guest_token_idx").on(t.guestToken),
    index("rooms_league_id_idx").on(t.leagueId),
    index("rooms_updated_at_idx").on(t.updatedAt),
  ],
);

/* ------------------------------------------------------------------------- */
/* wallet_transactions — immutable money ledger                              */
/* ------------------------------------------------------------------------- */
export const walletTransactions = mysqlTable(
  "wallet_transactions",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    userToken: varchar("user_token", { length: 191 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    currency: varchar("currency", { length: 16 }).notNull(),
    amount: int("amount").notNull(),
    reference: varchar("reference", { length: 191 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("completed"),
    metaJson: text("meta_json").notNull(),
    createdAt: isoTimestamp("created_at").notNull(),
  },
  (t) => [
    index("wallet_tx_user_token_idx").on(t.userToken),
    index("wallet_tx_created_at_idx").on(t.createdAt),
    index("wallet_tx_reference_idx").on(t.reference),
    index("wallet_tx_type_idx").on(t.type),
  ],
);

/* ------------------------------------------------------------------------- */
/* paystack_events — webhook/charge idempotency keys                         */
/* ------------------------------------------------------------------------- */
export const paystackEvents = mysqlTable("paystack_events", {
  reference: varchar("reference", { length: 191 }).primaryKey(),
  processedAt: isoTimestamp("processed_at").notNull(),
});

/* ------------------------------------------------------------------------- */
/* escrows — wager pot custody                                               */
/* ------------------------------------------------------------------------- */
export const escrows = mysqlTable(
  "escrows",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    roomCode: varchar("room_code", { length: 32 }).notNull(),
    amountMarbles: int("amount_marbles").notNull().default(0),
    amountPoints: int("amount_points").notNull().default(0),
    player1Token: varchar("player1_token", { length: 191 }).notNull(),
    player2Token: varchar("player2_token", { length: 191 }),
    lockedAt: isoTimestamp("locked_at").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("locked"),
    winnerToken: varchar("winner_token", { length: 191 }),
    disbursedAt: isoTimestamp("disbursed_at"),
  },
  (t) => [
    index("escrows_room_code_idx").on(t.roomCode),
    index("escrows_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------------- */
/* leagues — tournaments                                                     */
/* ------------------------------------------------------------------------- */
export const leagues = mysqlTable(
  "leagues",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    title: varchar("title", { length: 191 }).notNull(),
    description: text("description").notNull(),

    entryFeeMarbles: int("entry_fee_marbles").notNull().default(0),
    entryFeePoints: int("entry_fee_points").notNull().default(0),
    prizePoolPoints: int("prize_pool_points").notNull().default(0),

    status: varchar("status", { length: 16 }).notNull().default("registration"),
    format: varchar("format", { length: 32 }).notNull().default("single_elimination"),

    facilitatorToken: varchar("facilitator_token", { length: 191 }).notNull(),
    facilitatorName: varchar("facilitator_name", { length: 191 }).notNull(),

    maxParticipants: int("max_participants").notNull().default(16),
    participantCount: int("participant_count").notNull().default(0),

    winnerToken: varchar("winner_token", { length: 191 }),
    winnerName: varchar("winner_name", { length: 191 }),
    runnerUpToken: varchar("runner_up_token", { length: 191 }),
    runnerUpName: varchar("runner_up_name", { length: 191 }),
    thirdPlaceToken: varchar("third_place_token", { length: 191 }),
    thirdPlaceName: varchar("third_place_name", { length: 191 }),

    isPrivate: tinyint("is_private").notNull().default(0),
    inviteCode: varchar("invite_code", { length: 64 }),
    requiresApproval: tinyint("requires_approval").notNull().default(0),

    scheduleDate: varchar("schedule_date", { length: 32 }),
    scheduleTime: varchar("schedule_time", { length: 32 }),
    gameDays: varchar("game_days", { length: 191 }),
    turnTimerSeconds: int("turn_timer_seconds").notNull().default(60),
    roundsCount: int("rounds_count").notNull().default(0),

    /** JSON PrizeDistribution { first, second, third } percentages. */
    prizeDistributionJson: text("prize_distribution_json").notNull(),
    rulesNotes: text("rules_notes"),

    createdAt: isoTimestamp("created_at").notNull(),
    updatedAt: isoTimestamp("updated_at").notNull(),
  },
  (t) => [
    index("leagues_status_idx").on(t.status),
    index("leagues_facilitator_token_idx").on(t.facilitatorToken),
    index("leagues_created_at_idx").on(t.createdAt),
    index("leagues_invite_code_idx").on(t.inviteCode),
  ],
);

/* ------------------------------------------------------------------------- */
/* league_participants                                                       */
/* ------------------------------------------------------------------------- */
export const leagueParticipants = mysqlTable(
  "league_participants",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    leagueId: varchar("league_id", { length: 191 }).notNull(),
    userToken: varchar("user_token", { length: 191 }).notNull(),
    username: varchar("username", { length: 191 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("approved"),
    seed: int("seed").notNull().default(0),
    checkedIn: tinyint("checked_in").notNull().default(0),
    pointsScore: int("points_score").notNull().default(0),
    winsCount: int("wins_count").notNull().default(0),
    lossesCount: int("losses_count").notNull().default(0),
    drawsCount: int("draws_count").notNull().default(0),
    joinedAt: isoTimestamp("joined_at").notNull(),
  },
  (t) => [
    uniqueIndex("league_participants_league_user_uq").on(t.leagueId, t.userToken),
    index("league_participants_league_id_idx").on(t.leagueId),
    index("league_participants_user_token_idx").on(t.userToken),
  ],
);

/* ------------------------------------------------------------------------- */
/* league_matches — bracket fixtures                                         */
/* ------------------------------------------------------------------------- */
export const leagueMatches = mysqlTable(
  "league_matches",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    leagueId: varchar("league_id", { length: 191 }).notNull(),
    round: int("round").notNull(),
    matchNumber: int("match_number").notNull(),
    bracketType: varchar("bracket_type", { length: 32 }).notNull().default("winners"),

    player1Token: varchar("player1_token", { length: 191 }),
    player1Name: varchar("player1_name", { length: 191 }),
    player1Score: int("player1_score").notNull().default(0),
    player2Token: varchar("player2_token", { length: 191 }),
    player2Name: varchar("player2_name", { length: 191 }),
    player2Score: int("player2_score").notNull().default(0),

    winnerToken: varchar("winner_token", { length: 191 }),
    roomCode: varchar("room_code", { length: 32 }),
    scheduledTime: varchar("scheduled_time", { length: 64 }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    disputeNotes: text("dispute_notes"),
    createdAt: isoTimestamp("created_at").notNull(),
  },
  (t) => [
    index("league_matches_league_id_idx").on(t.leagueId),
    index("league_matches_status_idx").on(t.status),
    index("league_matches_room_code_idx").on(t.roomCode),
    index("league_matches_order_idx").on(t.leagueId, t.round, t.matchNumber),
  ],
);

/* ------------------------------------------------------------------------- */
/* admin_logs — immutable audit trail                                        */
/* ------------------------------------------------------------------------- */
export const adminLogs = mysqlTable(
  "admin_logs",
  {
    id: varchar("id", { length: 191 }).primaryKey(),
    adminToken: varchar("admin_token", { length: 191 }).notNull(),
    adminName: varchar("admin_name", { length: 191 }).notNull(),
    action: varchar("action", { length: 191 }).notNull(),
    target: varchar("target", { length: 191 }).notNull(),
    detailsJson: text("details_json").notNull(),
    createdAt: isoTimestamp("created_at").notNull(),
  },
  (t) => [
    index("admin_logs_admin_token_idx").on(t.adminToken),
    index("admin_logs_created_at_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------------- */
/* admin_settings — mutable platform configuration singleton (id = 1)        */
/* ------------------------------------------------------------------------- */
export const adminSettings = mysqlTable(
  "admin_settings",
  {
    id: int("id").notNull().default(1),
    wagerFeePercent: int("wager_fee_percent").notNull().default(5),
    tournamentFeePercent: int("tournament_fee_percent").notNull().default(10),
    pointsPerGhsBuy: int("points_per_ghs_buy").notNull().default(1),
    pointsPerGhsWithdraw: int("points_per_ghs_withdraw").notNull().default(1),
    minDepositGhs: int("min_deposit_ghs").notNull().default(5),
    maxDepositGhs: int("max_deposit_ghs").notNull().default(5000),
    minWithdrawalGhs: int("min_withdrawal_ghs").notNull().default(10),
    maxWithdrawalGhs: int("max_withdrawal_ghs").notNull().default(2000),
    maxDailyWithdrawalGhs: int("max_daily_withdrawal_ghs").notNull().default(5000),
    updatedAt: isoTimestamp("updated_at").notNull(),
    updatedBy: varchar("updated_by", { length: 191 }),
  },
  (t) => [primaryKey({ columns: [t.id] })],
);

/* ------------------------------------------------------------------------- */
/* users — user account root with phone OTP verification & profile completion */
/* ------------------------------------------------------------------------- */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull().unique(),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  fullName: varchar("full_name", { length: 120 }),
  email: varchar("email", { length: 160 }),
  emailVerifiedAt: timestamp("email_verified_at"),
  ghanaCardNumber: varchar("ghana_card_number", { length: 32 }),
  dateOfBirth: timestamp("date_of_birth"),
  gender: varchar("gender", { length: 16 }),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  region: varchar("region", { length: 64 }),
  city: varchar("city", { length: 64 }),
  address: varchar("address", { length: 255 }),
  momoNumber: varchar("momo_number", { length: 20 }),
  momoNetwork: varchar("momo_network", { length: 32 }),
  username: varchar("username", { length: 32 }).unique(),
  referralCode: varchar("referral_code", { length: 32 }),
  role: mysqlEnum("role", ["player", "organizer", "admin"]).notNull().default("player"),
  profileCompletedAt: timestamp("profile_completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------------- */
/* otp_requests — single-use phone OTP verification requests                 */
/* ------------------------------------------------------------------------- */
export const otpRequests = mysqlTable(
  "otp_requests",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(), // never store the raw code
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(), // sentAt + 4 minutes
    consumedAt: timestamp("consumed_at"), // set on the one verification attempt, success or fail
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("otp_phone_idx").on(table.phoneNumber, table.createdAt),
    index("otp_ip_idx").on(table.ipAddress, table.createdAt),
  ],
);

/* ------------------------------------------------------------------------- */
/* organizer_applications — detailed applications for organizer role         */
/* ------------------------------------------------------------------------- */
export const organizerApplications = mysqlTable(
  "organizer_applications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    applicantType: mysqlEnum("applicant_type", ["individual", "organization"]),
    organizationName: varchar("organization_name", { length: 160 }),
    organizationRegNumber: varchar("organization_reg_number", { length: 64 }),
    ghanaCardFrontUrl: varchar("ghana_card_front_url", { length: 255 }),
    ghanaCardBackUrl: varchar("ghana_card_back_url", { length: 255 }),
    selfieUrl: varchar("selfie_url", { length: 255 }),
    physicalAddress: varchar("physical_address", { length: 255 }),
    proofOfAddressUrl: varchar("proof_of_address_url", { length: 255 }),
    intendedGameTypes: varchar("intended_game_types", { length: 255 }), // comma separated or JSON
    expectedTournamentSize: int("expected_tournament_size"),
    expectedFrequency: varchar("expected_frequency", { length: 64 }),
    priorExperience: varchar("prior_experience", { length: 500 }),
    termsAcceptedAt: timestamp("terms_accepted_at"),
    status: mysqlEnum("status", ["draft", "pending", "approved", "rejected", "needs_info"]).notNull().default("draft"),
    previousApplicationId: varchar("previous_application_id", { length: 36 }),
    submittedAt: timestamp("submitted_at"),
    needsInfoRequestedAt: timestamp("needs_info_requested_at"),
    needsInfoNote: varchar("needs_info_note", { length: 500 }),
    reviewedByAdminId: varchar("reviewed_by_admin_id", { length: 36 }),
    reviewedAt: timestamp("reviewed_at"),
    reviewNote: varchar("review_note", { length: 500 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("organizer_apps_user_id_idx").on(t.userId),
    index("organizer_apps_status_idx").on(t.status),
    index("organizer_apps_created_at_idx").on(t.createdAt),
    index("organizer_apps_prev_app_idx").on(t.previousApplicationId),
  ],
);

/* ------------------------------------------------------------------------- */
/* organizer_revocations — revocation records for revoked organizers          */
/* ------------------------------------------------------------------------- */
export const organizerRevocations = mysqlTable(
  "organizer_revocations",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    revokedByAdminId: varchar("revoked_by_admin_id", { length: 36 }).notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    evidenceUrl: varchar("evidence_url", { length: 255 }),
    reapplyEligibleAt: timestamp("reapply_eligible_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("organizer_revocations_user_id_idx").on(t.userId),
    index("organizer_revocations_created_at_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------------- */
/* regions — administrative / geographical regions for tournament & profiles  */
/* ------------------------------------------------------------------------- */
export const regions = mysqlTable(
  "regions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    code: varchar("code", { length: 32 }),
    sortOrder: int("sort_order").notNull().default(0),
    active: tinyint("active").notNull().default(1),
    createdAt: isoTimestamp("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("regions_name_uq").on(t.name),
    index("regions_sort_order_idx").on(t.sortOrder),
  ],
);

/* ------------------------------------------------------------------------- */
/* matches — 1v1 wager matches with escrow lifecycle (Section 6)             */
/* ------------------------------------------------------------------------- */
export const matches = mysqlTable(
  "matches",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    gameType: varchar("game_type", { length: 32 }).notNull(),
    playerAId: varchar("player_a_id", { length: 36 }).notNull(),
    playerBId: varchar("player_b_id", { length: 36 }),
    wagerAmount: decimal("wager_amount", { precision: 14, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).notNull().default("open"),
    winnerId: varchar("winner_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    settledAt: timestamp("settled_at"),
  },
  (t) => [
    index("matches_status_idx").on(t.status),
    index("matches_player_a_idx").on(t.playerAId),
    index("matches_player_b_idx").on(t.playerBId),
    index("matches_game_type_idx").on(t.gameType),
  ],
);

/* ------------------------------------------------------------------------- */
/* tournaments — tournament prize escrow & bracket management (Section 7)     */
/* ------------------------------------------------------------------------- */
export const tournaments = mysqlTable(
  "tournaments",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    organizerId: varchar("organizer_id", { length: 36 }).notNull(),
    gameType: varchar("game_type", { length: 32 }).notNull(),
    entryFee: decimal("entry_fee", { precision: 14, scale: 2 }).notNull().default("0.00"),
    totalPrizePool: decimal("total_prize_pool", { precision: 14, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).notNull().default("open"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    index("tournaments_status_idx").on(t.status),
    index("tournaments_organizer_id_idx").on(t.organizerId),
    index("tournaments_game_type_idx").on(t.gameType),
  ],
);

export const tournamentPrizes = mysqlTable(
  "tournament_prizes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tournamentId: varchar("tournament_id", { length: 36 }).notNull(),
    placement: int("placement").notNull(), // 1, 2, 3...
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  },
  (t) => [
    index("tournament_prizes_tournament_id_idx").on(t.tournamentId),
  ],
);

export const tournamentEntries = mysqlTable(
  "tournament_entries",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    tournamentId: varchar("tournament_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    feePaid: decimal("fee_paid", { precision: 14, scale: 2 }).notNull().default("0.00"),
    finalPlacement: int("final_placement"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    index("tournament_entries_tournament_id_idx").on(t.tournamentId),
    index("tournament_entries_user_id_idx").on(t.userId),
    uniqueIndex("tournament_entries_user_uq").on(t.tournamentId, t.userId),
  ],
);

/* ------------------------------------------------------------------------- */
/* game_type_limits — admin game-type wager/prize constraints (Section 8)    */
/* ------------------------------------------------------------------------- */
export const gameTypeLimits = mysqlTable(
  "game_type_limits",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    gameType: varchar("game_type", { length: 32 }).notNull().unique(),
    minWager: decimal("min_wager", { precision: 14, scale: 2 }).notNull(),
    maxWager: decimal("max_wager", { precision: 14, scale: 2 }).notNull(),
    minTournamentPrizePool: decimal("min_tournament_prize_pool", { precision: 14, scale: 2 }).notNull(),
    maxTournamentPrizePool: decimal("max_tournament_prize_pool", { precision: 14, scale: 2 }).notNull(),
    platformFeePercent: decimal("platform_fee_percent", { precision: 5, scale: 4 }).notNull(), // e.g. 0.0500 for 5%
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
);

/* ------------------------------------------------------------------------- */
/* ledger_entries — double-entry transaction ledger                          */
/* ------------------------------------------------------------------------- */
export const ledgerAccountType = mysqlEnum("account_type", ["available", "escrow"]);

export const ledgerEntryType = mysqlEnum("entry_type", [
  "deposit",
  "withdrawal",
  "wager_lock",
  "wager_payout",
  "wager_refund",
  "platform_fee",
  "entry_fee_lock",
  "entry_fee_release",
  "entry_fee_refund",
  "prize_pool_lock",
  "prize_disbursement",
  "prize_pool_refund",
]);

export const ledgerEntries = mysqlTable(
  "ledger_entries",
  {
    id: varchar("id", { length: 36 }).primaryKey(), // uuid
    userId: varchar("user_id", { length: 36 }).notNull(),
    accountType: ledgerAccountType.notNull(),
    entryType: ledgerEntryType.notNull(),
    amount: decimal("amount", { precision: 14, scale: 2 }).notNull(), // signed
    referenceType: varchar("reference_type", { length: 32 }).notNull(), // "match", "tournament", "wallet"
    referenceId: varchar("reference_id", { length: 36 }).notNull(),
    transactionGroupId: varchar("transaction_group_id", { length: 36 }).notNull(),
    balanceAfter: decimal("balance_after", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("ledger_user_account_idx").on(table.userId, table.accountType, table.createdAt),
    index("ledger_reference_idx").on(table.referenceType, table.referenceId),
    index("ledger_group_idx").on(table.transactionGroupId),
  ],
);

/* ------------------------------------------------------------------------- */
/* roles — RBAC Role Definitions (Section 1)                                  */
/* ------------------------------------------------------------------------- */
export const roles = mysqlTable("roles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(), // "Super Admin", "Finance Admin", "Support Admin", "Reviewer"
  description: varchar("description", { length: 255 }),
  isSystemRole: tinyint("is_system_role").notNull().default(0), // true only for "Super Admin"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------------- */
/* permissions — Granular system permissions (Section 1)                      */
/* ------------------------------------------------------------------------- */
export const permissions = mysqlTable("permissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 96 }).notNull().unique(), // "users.suspend", "ledger.adjust", "disputes.resolve"
  category: varchar("category", { length: 32 }).notNull(), // "review" | "operations" | "admin" | "system"
  description: varchar("description", { length: 255 }).notNull(),
});

/* ------------------------------------------------------------------------- */
/* role_permissions — Junction table linking roles to permissions             */
/* ------------------------------------------------------------------------- */
export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    roleId: varchar("role_id", { length: 36 }).notNull(),
    permissionId: varchar("permission_id", { length: 36 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

/* ------------------------------------------------------------------------- */
/* admin_user_roles — Multi-role assignment junction for admin accounts      */
/* ------------------------------------------------------------------------- */
export const adminUserRoles = mysqlTable(
  "admin_user_roles",
  {
    userId: varchar("user_id", { length: 36 }).notNull(),
    roleId: varchar("role_id", { length: 36 }).notNull(),
    assignedByAdminId: varchar("assigned_by_admin_id", { length: 36 }).notNull(),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

/* ------------------------------------------------------------------------- */
/* games — Catalog of supported games (Section 2.2)                          */
/* ------------------------------------------------------------------------- */
export const games = mysqlTable("games", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  slug: varchar("slug", { length: 32 }).notNull().unique(), // "damii-10x10", "blitz-damii", etc.
  iconUrl: varchar("icon_url", { length: 255 }),
  status: mysqlEnum("status", ["enabled", "disabled"]).notNull().default("enabled"),
  description: varchar("description", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------------- */
/* tournament_action_requests — Organizer requests approval queue (Section 2.3) */
/* ------------------------------------------------------------------------- */
export const tournamentActionRequests = mysqlTable("tournament_action_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tournamentId: varchar("tournament_id", { length: 36 }).notNull(),
  organizerId: varchar("organizer_id", { length: 36 }).notNull(),
  requestType: mysqlEnum("request_type", ["cancel_tournament", "disqualify_player", "result_override"]).notNull(),
  targetUserId: varchar("target_user_id", { length: 36 }),
  matchId: varchar("match_id", { length: 36 }),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).notNull().default("pending"),
  reviewedByAdminId: varchar("reviewed_by_admin_id", { length: 36 }),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: varchar("review_note", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------------- */
/* system_settings — Key-value platform settings by category (Section 2.7)   */
/* ------------------------------------------------------------------------- */
export const systemSettings = mysqlTable(
  "system_settings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    category: mysqlEnum("category", ["sms", "email", "general", "backup", "security"]).notNull(),
    key: varchar("key", { length: 96 }).notNull(),
    value: text("value").notNull(), // JSON string payload
    updatedByAdminId: varchar("updated_by_admin_id", { length: 36 }),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("settings_category_key_idx").on(table.category, table.key),
  ],
);

export type ProfileRow = typeof profiles.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type OtpRequestRow = typeof otpRequests.$inferSelect;
export type OrganizerApplicationRow = typeof organizerApplications.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type AdminProfileRow = typeof adminProfiles.$inferSelect;
export type OrganizerProfileRow = typeof organizerProfiles.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
export type WalletTransactionRow = typeof walletTransactions.$inferSelect;
export type EscrowRow = typeof escrows.$inferSelect;
export type LeagueRow = typeof leagues.$inferSelect;
export type LeagueParticipantRow = typeof leagueParticipants.$inferSelect;
export type LeagueMatchRow = typeof leagueMatches.$inferSelect;
export type AdminLogRow = typeof adminLogs.$inferSelect;
export type AdminSettingsRow = typeof adminSettings.$inferSelect;
export type RegionRow = typeof regions.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type TournamentRow = typeof tournaments.$inferSelect;
export type TournamentPrizeRow = typeof tournamentPrizes.$inferSelect;
export type TournamentEntryRow = typeof tournamentEntries.$inferSelect;
export type GameTypeLimitRow = typeof gameTypeLimits.$inferSelect;
export type LedgerEntryRow = typeof ledgerEntries.$inferSelect;
export type RoleRow = typeof roles.$inferSelect;
export type PermissionRow = typeof permissions.$inferSelect;
export type RolePermissionRow = typeof rolePermissions.$inferSelect;
export type AdminUserRoleRow = typeof adminUserRoles.$inferSelect;
export type GameRow = typeof games.$inferSelect;
export type TournamentActionRequestRow = typeof tournamentActionRequests.$inferSelect;
export type SystemSettingRow = typeof systemSettings.$inferSelect;
