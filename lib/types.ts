export type Player = "white" | "black";

export type Role = "user" | "player" | "organizer" | "facilitator" | "admin" | "super_admin" | "treasurer";

export type BaseRole = "player" | "organizer" | "admin";

export type OrganizerStatus = "none" | "pending" | "approved" | "rejected" | "revoked";

export type OrganizerApplicationStatus = "pending" | "approved" | "rejected" | "needs_info";
export type OrganizerApplicantType = "individual" | "organization";

export interface User {
  id: string;
  phoneNumber: string;
  phoneVerifiedAt?: string | null;
  fullName?: string | null;
  email?: string | null;
  emailVerifiedAt?: string | null;
  ghanaCardNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  region?: string | null;
  city?: string | null;
  address?: string | null;
  momoNumber?: string | null;
  momoNetwork?: string | null;
  username?: string | null;
  referralCode?: string | null;
  role: "player" | "organizer" | "admin";
  profileCompletedAt?: string | null;
  createdAt: string;
}

export interface OtpRequest {
  id: string;
  phoneNumber: string;
  codeHash: string;
  ipAddress: string;
  expiresAt: string | Date;
  consumedAt?: string | Date | null;
  createdAt: string | Date;
}

export interface Region {
  id: string;
  name: string;
  code?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface OrganizerApplication {
  id: string;
  userId: string;
  applicantType: OrganizerApplicantType;
  organizationName?: string | null;
  organizationRegNumber?: string | null;
  ghanaCardFrontUrl: string;
  ghanaCardBackUrl: string;
  selfieUrl: string;
  physicalAddress: string;
  proofOfAddressUrl: string;
  intendedGameTypes: string;
  expectedTournamentSize?: number | null;
  expectedFrequency?: string | null;
  priorExperience?: string | null;
  termsAcceptedAt: string | Date;
  status: OrganizerApplicationStatus;
  reviewedByAdminId?: string | null;
  reviewedAt?: string | Date | null;
  reviewNote?: string | null;
  createdAt: string | Date;
}

export type AdminPermission =
  | "manage_users"          // suspend/ban accounts, view PII
  | "manage_organizers"     // approve/reject/revoke organizer requests
  | "manage_tournaments"    // edit/cancel any tournament, override brackets
  | "manage_wallet"         // view wallet ledger, approve manual adjustments
  | "manage_payouts"        // execute/approve cashouts (treasurer-tier)
  | "resolve_disputes"      // access dispute resolver, rule on matches
  | "manage_admins"         // grant/revoke admin roles & permissions (super_admin only)
  | "run_seeder"            // execute seeder / system maintenance actions
  | "view_audit_log";       // read-only access to audit trail

export interface AdminProfile {
  userId: string;
  permissions: AdminPermission[];
  isSuperAdmin: boolean;    // super_admin implicitly has ALL permissions
  grantedBy: string;        // userId of admin who granted this role
  grantedAt: string;
}

export interface OrganizerProfile {
  userId: string;
  username?: string;
  status: OrganizerStatus;
  requestedAt: string;
  reviewedBy?: string;      // admin userId
  reviewedAt?: string;
  rejectionReason?: string;
  organizationName?: string;
  bio?: string;
  contactPhone?: string;
}

export type Profile = {
  token: string;
  username: string;
  phoneNumber?: string;
  passcode?: string;
  passwordSalt?: string;
  rating: number;
  marbles: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak?: number;
  bestStreak?: number;
  lastMatchAt?: string;
  matchesLast7Days?: number;
  opponentRatingAvg?: number;
  totalOpponentsFaced?: number;
  role: Role;
  status?: "active" | "banned";
  bannedAt?: string;
  bannedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  userId: string; // matches profile.token
  token: string;  // high entropy session token
  role: Role;
  csrfToken?: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AdminSettings = {
  wagerFeePercent: number; // Default: 5% platform fee per wagered match
  tournamentFeePercent: number; // Default: 10% platform fee per tournament prize pool
  pointsPerGhsBuy?: number;
  pointsPerGhsWithdraw?: number;
  minDepositGhs: number;        // Default: 5 GHS
  maxDepositGhs: number;        // Default: 5000 GHS
  minWithdrawalGhs: number;     // Default: 10 GHS
  maxWithdrawalGhs: number;     // Default: 2000 GHS
  maxDailyWithdrawalGhs?: number; // Default: 5000 GHS
  updatedAt: string;
  updatedBy?: string;
};

export type GameMode = "casual" | "wager" | "league";

export type RoomStatus = "waiting" | "playing" | "completed" | "abandoned" | "forfeited";

export type TournamentFormat = "single_elimination" | "double_elimination" | "round_robin" | "swiss";

export type MoveLogEntry = {
  moveNumber: number;
  player: Player;
  playerName: string;
  from: number;
  to: number;
  notation: string;
  algNotation: string;
  sqNotation: string;
  isCapture: boolean;
  timestamp: number;
};

export type Room = {
  code: string;
  hostName: string;
  hostToken: string;
  guestName: string | null;
  guestToken: string | null;
  boardJson: string;
  turn: Player;
  forcedFrom: number | null;
  winner: Player | null;
  status: RoomStatus;
  mode: GameMode;
  wagerAmount: number;
  escrowId: string | null;
  leagueId: string | null;
  matchId: string | null;
  moveCount: number;
  resultApplied: number;
  lastMoveTime: number;
  disconnectTime: number | null;
  disconnectedPlayer: Player | null;
  movesJson?: string;
  moves?: MoveLogEntry[];
  role?: "white" | "black" | "spectator";
  createdAt: string;
  updatedAt: string;
};

export type WalletTransactionType =
  | "deposit"
  | "withdrawal"
  | "wager_lock"
  | "wager_win"
  | "wager_refund"
  | "platform_fee"
  | "convert_points"
  | "league_prize"
  | "league_fee";

export type WalletTransaction = {
  id: string;
  userToken: string;
  type: WalletTransactionType;
  currency: "marbles" | "points";
  amount: number;
  reference: string;
  status: "pending" | "completed" | "failed";
  metaJson: string;
  createdAt: string;
};

export type LeagueStatus = "draft" | "registration" | "active" | "completed" | "cancelled";

export type PrizeDistribution = {
  first: number; // Percentage e.g. 50%
  second: number; // Percentage e.g. 30%
  third: number; // Percentage e.g. 20%
};

export type League = {
  id: string;
  title: string;
  description: string;
  entryFeeMarbles: number;
  entryFeePoints: number;
  prizePoolPoints: number;
  status: LeagueStatus;
  format: TournamentFormat;
  facilitatorToken: string;
  facilitatorName: string;
  maxParticipants: number;
  participantCount: number;
  winnerToken: string | null;
  winnerName: string | null;
  runnerUpToken?: string | null;
  runnerUpName?: string | null;
  thirdPlaceToken?: string | null;
  thirdPlaceName?: string | null;
  isPrivate?: boolean;
  inviteCode?: string;
  requiresApproval?: boolean;
  scheduleDate?: string;
  scheduleTime?: string;
  gameDays?: string;
  turnTimerSeconds?: number; // Custom turn clock e.g. 30s, 60s
  roundsCount?: number;
  prizeDistribution?: PrizeDistribution;
  rulesNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LeagueParticipant = {
  id: string;
  leagueId: string;
  userToken: string;
  username: string;
  status?: "approved" | "pending" | "rejected";
  seed?: number;
  checkedIn?: boolean;
  pointsScore?: number; // For Round Robin / Swiss (Wins: 3pts, Draws: 1pt, Loss: 0)
  winsCount?: number;
  lossesCount?: number;
  drawsCount?: number;
  joinedAt: string;
};

export type LeagueMatch = {
  id: string;
  leagueId: string;
  round: number;
  matchNumber: number;
  bracketType?: "winners" | "losers" | "final" | "round_robin" | "swiss";
  player1Token: string | null;
  player1Name: string | null;
  player1Score?: number;
  player2Token: string | null;
  player2Name: string | null;
  player2Score?: number;
  winnerToken: string | null;
  roomCode: string | null;
  scheduledTime?: string;
  status: "pending" | "in_progress" | "completed" | "disputed";
  disputeNotes?: string;
  createdAt: string;
};

export type WagerEscrow = {
  id: string;
  roomCode: string;
  amountMarbles: number;
  amountPoints: number;
  player1Token: string;
  player2Token: string | null;
  lockedAt: string;
  status: "locked" | "disbursed" | "refunded";
  winnerToken: string | null;
  disbursedAt: string | null;
};

export type AdminLog = {
  id: string;
  adminToken: string;
  adminName: string;
  action: string;
  target: string;
  detailsJson: string;
  createdAt: string;
};

/* ------------------------------------------------------------------------- */
/* Wager Match Escrow (Section 6)                                            */
/* ------------------------------------------------------------------------- */
export type MatchStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface Match {
  id: string;
  gameType: string;
  playerAId: string;
  playerBId?: string | null;
  wagerAmount: number | string;
  status: MatchStatus;
  winnerId?: string | null;
  createdAt: string | Date;
  settledAt?: string | Date | null;
}

/* ------------------------------------------------------------------------- */
/* Tournament Prize Escrow (Section 7)                                       */
/* ------------------------------------------------------------------------- */
export type TournamentEscrowStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface Tournament {
  id: string;
  organizerId: string;
  gameType: string;
  entryFee: number | string;
  totalPrizePool: number | string;
  status: TournamentEscrowStatus;
  createdAt: string | Date;
  completedAt?: string | Date | null;
}

export interface TournamentPrize {
  id: string;
  tournamentId: string;
  placement: number;
  amount: number | string;
}

export interface TournamentEntry {
  id: string;
  tournamentId: string;
  userId: string;
  feePaid: number | string;
  finalPlacement?: number | null;
  joinedAt: string | Date;
}

/* ------------------------------------------------------------------------- */
/* Admin Controls: Game Type Limits (Section 8)                              */
/* ------------------------------------------------------------------------- */
export interface GameTypeLimit {
  id: string;
  gameType: string;
  minWager: number | string;
  maxWager: number | string;
  minTournamentPrizePool: number | string;
  maxTournamentPrizePool: number | string;
  platformFeePercent: number | string;
  updatedAt: string | Date;
}

/* ------------------------------------------------------------------------- */
/* Double-Entry Ledger Types                                                 */
/* ------------------------------------------------------------------------- */
export type LedgerAccountType = "available" | "escrow";

export type LedgerEntryType =
  | "wager_lock"
  | "wager_payout"
  | "wager_refund"
  | "platform_fee"
  | "prize_pool_lock"
  | "prize_pool_refund"
  | "entry_fee_lock"
  | "entry_fee_release"
  | "entry_fee_refund"
  | "prize_disbursement"
  | "deposit"
  | "withdrawal"
  | "adjustment";

export interface LedgerEntry {
  id: string;
  userId: string;
  accountType: LedgerAccountType;
  entryType: string;
  amount: number | string;
  referenceType: string;
  referenceId: string;
  createdAt: string | Date;
}

export interface LedgerEntryInput {
  userId: string;
  accountType: LedgerAccountType;
  entryType: string;
  amount: string | number;
  referenceType: string;
  referenceId: string;
}
