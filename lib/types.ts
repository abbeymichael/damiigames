export type Player = "white" | "black";

export type Role = "user" | "player" | "organizer" | "facilitator" | "admin" | "super_admin" | "treasurer";

export type BaseRole = "player" | "organizer" | "admin";

export type OrganizerStatus = "none" | "pending" | "approved" | "rejected" | "revoked";

export type OrganizerApplicationStatus = "draft" | "pending" | "approved" | "rejected" | "needs_info" | "revoked";
export type OrganizerApplicantType = "individual" | "organization";

export interface User {
  id: string;
  token?: string;
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
  applicantType?: OrganizerApplicantType | null;
  organizationName?: string | null;
  organizationRegNumber?: string | null;
  ghanaCardFrontUrl?: string | null;
  ghanaCardBackUrl?: string | null;
  selfieUrl?: string | null;
  physicalAddress?: string | null;
  proofOfAddressUrl?: string | null;
  intendedGameTypes?: string | null;
  expectedTournamentSize?: number | null;
  expectedFrequency?: string | null;
  priorExperience?: string | null;
  termsAcceptedAt?: string | Date | null;
  status: OrganizerApplicationStatus;
  previousApplicationId?: string | null;
  submittedAt?: string | Date | null;
  needsInfoRequestedAt?: string | Date | null;
  needsInfoNote?: string | null;
  reviewedByAdminId?: string | null;
  reviewedByAdminName?: string | null;
  reviewedAt?: string | Date | null;
  reviewNote?: string | null;
  createdAt: string | Date;
}

export interface OrganizerRevocation {
  id: string;
  userId: string;
  revokedByAdminId: string;
  reason: string;
  evidenceUrl?: string | null;
  reapplyEligibleAt?: string | Date | null;
  createdAt: string | Date;
}

export interface OrganizerApplicationDetailPayload {
  application: OrganizerApplication;
  applicant: Profile | null;
  userAccount?: User | null;
  previousApplication?: OrganizerApplication | null;
  revocationHistory?: OrganizerRevocation[];
  applicantContext: {
    totalMatches: number;
    winRate: number;
    rating: number;
    accountAgeDays: number;
    pointsBalance: number;
    marblesBalance: number;
    activeTournamentsCount: number;
    completedTournamentsCount: number;
  };
  activeTournaments: League[];
}

export type AdminPermission =
  | "manage_users"          // suspend/ban accounts, view PII
  | "manage_organizers"     // approve/reject/revoke organizer requests
  | "manage_tournaments"    // edit/cancel any tournament, override brackets
  | "manage_wallet"         // view wallet ledger, approve manual adjustments
  | "manage_payouts"        // execute/approve cashouts (treasurer-tier)
  | "manage_payments"       // configure Paystack keys, gateways, webhook secrets
  | "payments.view"         // view payment gateway settings and status
  | "payments.manage"       // update Paystack keys, mode, and configurations
  | "payments.delete"       // delete/reset payment gateway credentials
  | "resolve_disputes"      // access dispute resolver, rule on matches
  | "manage_admins"         // grant/revoke admin roles & permissions (super_admin only)
  | "run_seeder"            // execute seeder / system maintenance actions
  | "view_audit_log"        // read-only access to audit trail
  | string;

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
  id?: string;
  token: string;
  username: string;
  fullName?: string;
  email?: string;
  avatarUrl?: string | null;
  phoneNumber?: string;
  region?: string;
  city?: string;
  phoneVerifiedAt?: string | null;
  emailVerifiedAt?: string | null;
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
  roleTitle?: string;
  isSuperAdmin?: boolean;
  permissionKeys?: string[];
  roleNames?: string[];
  momoNumber?: string;
  momoNetwork?: string;
  status?: "active" | "suspended" | "banned";
  bannedAt?: string;
  bannedReason?: string;
  // Multi-Factor Authentication (MFA / 2FA)
  mfaEnabled?: boolean;
  mfaEnrolledAt?: string;
  mfaPreferredMethod?: "passkey" | "biometric" | "authenticator" | "sms";
  totpSecret?: string;
  totpEnabled?: boolean;
  totpVerifiedAt?: string;
  passkeys?: UserPasskey[];
  backupCodes?: string[];
  createdAt: string;
  updatedAt?: string | Date;
};

export interface UserPasskey {
  id: string; // credential ID
  name: string;
  type: "passkey" | "biometric";
  publicKey?: string;
  counter?: number;
  transports?: string[];
  createdAt: string;
  lastUsedAt?: string;
  deviceType?: "platform" | "cross-platform";
}

export interface UserMfaSettings {
  enabled: boolean;
  preferredMethod: "passkey" | "biometric" | "authenticator" | "sms";
  enrolledAt?: string;
  totpEnabled: boolean;
  totpVerifiedAt?: string;
  passkeysCount: number;
  biometricsCount: number;
  hasBackupCodes: boolean;
  passkeys: UserPasskey[];
}

export interface UserDetailPayload {
  profile: Profile;
  balances: {
    availablePoints: number;
    availableMarbles: number;
    escrowPoints: number;
    escrowMarbles: number;
  };
  ledgerEntries: LedgerEntry[];
  transactions: WalletTransaction[];
  matches: Array<{
    id: string;
    roomCode?: string;
    gameType?: string;
    opponentName: string;
    isHost: boolean;
    result: "win" | "loss" | "draw" | "pending" | "cancelled";
    wagerPoints: number;
    status: string;
    playedAt: string;
  }>;
  tournamentEntries: Array<{
    leagueId: string;
    leagueTitle: string;
    status: string;
    seed: number;
    checkedIn: boolean;
    entryFeePoints: number;
    joinedAt: string;
  }>;
  organizedTournaments: League[];
  auditLogs: AdminLog[];
  activeSessionsCount: number;
}

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
  pointsPerCediDeposit?: number;
  pointsPerCediWithdrawal?: number;
  minDepositGhs?: number;        // Default: 5 GHS
  maxDepositGhs?: number;        // Default: 5000 GHS
  minWithdrawalGhs?: number;     // Default: 10 GHS
  maxWithdrawalGhs?: number;     // Default: 2000 GHS
  maxDailyWithdrawalGhs?: number; // Default: 5000 GHS
  turnTimerSeconds?: number;    // Default: 60 seconds
  disconnectGraceSeconds?: number; // Default: 90 seconds
  unjoinedRoomExpiryMinutes?: number; // Default: 10 minutes
  maintenanceMode?: boolean;    // Emergency maintenance switch
  maintenanceNotice?: string;   // Broadcast message during maintenance
  disableWagers?: boolean;      // Emergency lock on real-money wager escrow
  disableWithdrawals?: boolean; // Emergency pause on cashouts
  publicSpectatingEnabled?: boolean; // Default: true
  defaultRating?: number;       // Default: 1200 DPI
  ratingKFactor?: number;       // Default: 32
  minWagerGhs?: number;         // Default: 5 GHS
  maxWagerGhs?: number;         // Default: 1000 GHS
  paystackSecretKey?: string;
  paystackPublicKey?: string;
  paystackMode?: "test" | "live";
  paystackWebhookSecret?: string;
  paystackCurrency?: string;
  // Payment Gateways (Paystack & PalmPay Integration)
  activeDepositProvider?: "paystack" | "palmpay";
  depositProvidersEnabled?: {
    paystack?: boolean;
    palmpay?: boolean;
  };
  activePayoutProvider?: "paystack" | "palmpay";
  payoutProvidersEnabled?: {
    paystack?: boolean;
    palmpay?: boolean;
  };
  palmpayMerchantId?: string;
  palmpayBearerToken?: string;
  palmpayAppSecret?: string;
  palmpaySignature?: string;
  palmpayMode?: "sandbox" | "live";
  palmpayCountryCode?: string;
  palmpayCurrency?: string;
  palmpayBaseUrl?: string;
  updatedAt?: string | Date;
  updatedBy?: string;
};

export type GameMode = "casual" | "wager" | "league";

export type RoomStatus = "waiting" | "playing" | "completed" | "abandoned" | "forfeited" | "draw" | "cancelled" | "under_review" | "disputed" | "finished" | "expired" | "pending_review" | "approved" | "rejected" | "paused" | string;

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

export type ChatMessage = {
  id: string;
  roomCode?: string;
  sender: string;
  senderRole: "white" | "black" | "spectator" | "system";
  text: string;
  timestamp: number;
};

export type Room = {
  code: string;
  hostName: string;
  hostToken: string;
  hostFullName?: string | null;
  hostRankTitle?: string | null;
  hostRankBadge?: string | null;
  hostRating?: number | null;
  guestName: string | null;
  guestToken: string | null;
  guestFullName?: string | null;
  guestRankTitle?: string | null;
  guestRankBadge?: string | null;
  guestRating?: number | null;
  boardJson: string;
  turn: Player;
  forcedFrom: number | null;
  winner: Player | "draw" | null;
  status: RoomStatus;
  mode: GameMode;
  wagerAmount: number;
  isCustomWager?: boolean;
  isPrivate?: boolean;
  hostReady?: boolean;
  guestReady?: boolean;
  escrowId: string | null;
  leagueId: string | null;
  matchId: string | null;
  leagueMatchId?: string | null;
  moveCount: number;
  resultApplied: number;
  lastMoveTime: number;
  disconnectTime: number | null;
  disconnectedPlayer: Player | null;
  drawOfferedBy?: Player | string | null;
  disputeStatus?: "none" | "under_review" | "resolved" | "voided" | string;
  disputeNotes?: string;
  isDisputed?: boolean;
  disputeReason?: string;
  ruleVariations?: TournamentRuleVariations;
  customConstraints?: TournamentCustomConstraints;
  movesJson?: string;
  moves?: MoveLogEntry[];
  chatJson?: string;
  chat?: ChatMessage[];
  role?: "white" | "black" | "spectator";
  timerState?: any;
  board?: (Player | null)[];
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
  | "league_fee"
  | "participation_reward";

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

/* ------------------------------------------------------------------------- */
/* Dedicated Deposits Table & Lifecycle Types                                */
/* ------------------------------------------------------------------------- */
export type DepositStatus =
  | "pending"
  | "verifying"
  | "verified"
  | "approved"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

export type DepositMethod = "momo" | "card" | "bank_transfer" | "manual";

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: DepositMethod | string;
  provider: string; // e.g. "Paystack", "MTN", "Telecel", "AT"
  reference: string;
  gatewayReference?: string | null;
  status: DepositStatus;
  phoneNumber?: string | null;
  accountName?: string | null;
  fee: number;
  netAmount: number;
  gatewayResponse?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  processedAt?: string | null;
  processedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  metadataJson?: string | null;
  ledgerEntryId?: string | null;
  walletTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepositAction {
  id: string;
  depositId: string;
  action: "create" | "verify" | "approve" | "process" | "reject" | "cancel" | "gateway_webhook" | string;
  actorId: string;
  actorName?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  metadataJson?: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------------- */
/* Dedicated Withdrawals Table & Lifecycle Types                             */
/* ------------------------------------------------------------------------- */
export type WithdrawalStatus =
  | "pending"
  | "verifying"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled"
  | "reversed";

export type WithdrawalMethod = "momo" | "bank" | "manual";

export interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: WithdrawalMethod | string;
  provider: string; // e.g. "MTN", "Telecel", "AT", "Paystack"
  accountNumber: string;
  accountName?: string | null;
  phoneNumber?: string | null;
  bankCode?: string | null;
  recipientCode?: string | null;
  transferCode?: string | null;
  transferId?: string | null;
  reference: string;
  status: WithdrawalStatus;
  fee: number;
  netAmount: number;
  gatewayResponse?: string | null;
  failureReason?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  processedAt?: string | null;
  processedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  disbursedAt?: string | null;
  metadataJson?: string | null;
  ledgerEntryId?: string | null;
  walletTransactionId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalAction {
  id: string;
  withdrawalId: string;
  action: "create" | "verify" | "approve" | "process" | "disburse" | "reject" | "refund" | "cancel" | "gateway_webhook" | "retry" | string;
  actorId: string;
  actorName?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  notes?: string | null;
  metadataJson?: string | null;
  createdAt: string;
}

export type LeagueStatus = "draft" | "registration" | "active" | "in_progress" | "pending" | "completed" | "cancelled" | "under_review";

export type PrizeDistribution = {
  first: number; // Percentage e.g. 50%
  second: number; // Percentage e.g. 30%
  third: number; // Percentage e.g. 20%
};

export type CaptureRuleVariation = "standard_compulsory" | "maximum_quantity" | "free_choice";
export type FlyingKingVariation = "unlimited_diagonal" | "restricted_steps" | "classic_single";
export type PromotionVariation = "immediate" | "next_turn";
export type SeriesFormatVariation = "bo1" | "bo3" | "bo5";

export interface TournamentRuleVariations {
  captureRule?: CaptureRuleVariation;
  flyingKings?: FlyingKingVariation;
  kingCapturePromotion?: PromotionVariation;
  backwardMenCapture?: boolean;
  allowDrawOffer?: boolean;
  repetitionDrawLimit?: number;
  matchSeries?: SeriesFormatVariation;
}

export interface TournamentCustomConstraints {
  minRatingRequired?: number;
  maxRatingCap?: number;
  minRating?: number;
  maxRating?: number;
  timeLimitSeconds?: number;
  turnLimitSeconds?: number;
  turnTimerSeconds?: number;
  checkInWindowMinutes?: number;
  disconnectionGraceSeconds?: number;
  matchTimeCapMinutes?: number;
  allowSpectators?: boolean;
  organizerDirectives?: string;
}

export type League = {
  id: string;
  title: string;
  description: string;
  entryFeeMarbles: number;
  entryFeePoints: number;
  prizePool?: number;
  prizePoolPoints: number;
  status: LeagueStatus;
  format: TournamentFormat;
  facilitatorToken: string;
  facilitatorName: string;
  organizerToken?: string;
  minParticipants?: number; // Published minimum viable player quorum
  maxParticipants: number;
  maxPlayers?: number;
  participants?: number | LeagueParticipant[];
  participantCount: number;
  winnerToken: string | null;
  winnerName: string | null;
  runnerUpToken?: string | null;
  runnerUpName?: string | null;
  thirdPlaceToken?: string | null;
  thirdPlaceName?: string | null;
  unawardedReason?: string;
  platformFeeCharged?: boolean;
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
  ruleVariations?: TournamentRuleVariations;
  customConstraints?: TournamentCustomConstraints;
  createdAt: string;
  updatedAt: string;
};

export type TournamentLeague = League;

export type LeagueParticipant = {
  id: string;
  leagueId: string;
  userToken: string;
  username: string;
  status?: "approved" | "pending" | "rejected" | "disqualified";
  disqualificationReason?: string;
  disqualificationEvidence?: string;
  disqualifiedAt?: string;
  seed?: number;
  checkedIn?: boolean;
  pointsScore?: number; // For Round Robin / Swiss (Wins: 3pts, Draws: 1pt, Loss: 0)
  winsCount?: number;
  lossesCount?: number;
  drawsCount?: number;
  joinedAt: string;
  createdAt?: string | Date;
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
  status: "pending" | "in_progress" | "completed" | "disputed" | "under_review" | "voided";
  disputeStatus?: "none" | "under_review" | "resolved" | "voided";
  disputeNotes?: string;
  reviewNotes?: string;
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
  details?: string;
  timestamp?: string | Date;
  targetUser?: string;
  metadataJson?: string;
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
  placement?: number | null;
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
/* System Funds & Triple-Ledger Types                                        */
/* ------------------------------------------------------------------------- */
export type SystemFundType = "account_balances" | "escrow" | "platform_fee" | "mechanics_fund";

export interface SystemFundSummary {
  fundType: SystemFundType;
  name: string;
  description: string;
  balance: number;
  entryCount: number;
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  activeHoldersCount?: number;
  lastActivityAt?: string;
}

export interface SystemFundsReport {
  accountBalancesFund: SystemFundSummary;
  escrowFund: SystemFundSummary;
  platformFeeFund: SystemFundSummary;
  mechanicsFund: SystemFundSummary;
  totalPlatformAssets: number;
  totalUserAvailable: number;
  totalEscrowLocked: number;
  totalPlatformFeesEarned: number;
  totalMechanicsCapital: number;
  totalMechanicsProfits: number;
  totalMechanicsLosses: number;
  totalMechanicsNetPnL: number;
  totalDeposits: number;
  totalWithdrawals: number;
  reconciliationStatus: "balanced" | "discrepancy";
  discrepancyAmount: number;
  generatedAt: string;
}

export interface FundLedgerConnection {
  fromFund?: SystemFundType;
  toFund?: SystemFundType;
  description: string;
}

/* ------------------------------------------------------------------------- */
/* Chart of Accounts (COA) & Treasury Analytics Types                         */
/* ------------------------------------------------------------------------- */
export type AccountClass = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalBalance = "debit" | "credit";

export interface ChartOfAccount {
  code: string; // e.g. "1010", "1020", "1030", "1040", "1045", "2010", "2020", "2030", "2040", "3010", "3020", "3030", "4010", "4020", "4030", "4040", "5010", "5020", "5030", "5040"
  name: string;
  accountClass: AccountClass;
  fundType: SystemFundType;
  normalBalance: NormalBalance;
  description: string;
  balance: number;
  totalDebits: number;
  totalCredits: number;
  entryCount: number;
  lastActivityAt?: string;
}

export interface ChartOfAccountsReport {
  accounts: ChartOfAccount[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  accountingEquationBalanced: boolean;
  discrepancyAmount: number;
  generatedAt: string;
}

export interface TreasuryFundDetails {
  treasuryBalance: number;
  lifetimeRevenue: number;
  lifetimeExpenses: number;
  netTreasuryFlow: number;
  rake1v1Revenue: number;
  tournamentCommissionRevenue: number;
  penaltyRevenue: number;
  gatewayExpenses: number;
  promotionalExpenses: number;
  disputeReserveBalance: number;
  recentTreasuryEntries: LedgerEntry[];
  lastUpdated: string;
}

export interface MechanicsFundDetails {
  mechanicsFundBalance: number;
  totalOperatingFloat: number;
  totalReserveVault: number;
  lifetimeFunded: number;
  lifetimeWithdrawn: number;
  netMechanicsCapital: number;
  mechanicsGameplayProfits: number;
  mechanicsGameplayLosses: number;
  netGameplayPnL: number;
  activeBotsCount: number;
  recentMechanicsEntries: LedgerEntry[];
  lastUpdated: string;
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
  description?: string;
  transactionGroupId?: string;
  currency?: string;
  direction?: "credit" | "debit";
  balanceBefore?: string;
  balanceAfter?: string;
  metadataJson?: string;
  fundType?: SystemFundType | string;
  accountCode?: string;
  accountName?: string;
  recordedAt?: string;
  createdAt: string | Date;
}

export interface LedgerEntryInput {
  userId: string;
  accountType: LedgerAccountType;
  entryType: string;
  amount: string | number;
  referenceType: string;
  referenceId: string;
  currency?: string;
  direction?: "credit" | "debit";
  metadataJson?: string;
  fundType?: SystemFundType | string;
}

/* ------------------------------------------------------------------------- */
/* Formal Ledger Verification & System-Level Bot Funding Types               */
/* ------------------------------------------------------------------------- */
export type SystemBotTransferType =
  | "system_bot_funding"
  | "system_bot_reclaim"
  | "admin_bot_allocation"
  | "paystack_bot_funding"
  | "paystack_bulk_bot_funding";

export interface FormalLedgerTransferResult {
  success: boolean;
  transactionId: string;
  transactionGroupId: string;
  transferType: SystemBotTransferType;
  botToken: string;
  botUsername: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  sourceAccount: string;
  targetAccount: string;
  adminExecutor: string;
  invariantsChecked: {
    nonNegativeBalanceGuaranteed: boolean;
    doubleEntryBalanced: boolean;
    transferAmountPositive: boolean;
    adminAuthorized: boolean;
  };
  ledgerEntries: LedgerEntry[];
  verificationHash: string;
  timestamp: string;
  note?: string;
}

export interface FormalLedgerAuditEntry {
  id: string;
  timestamp: string;
  entryType: string;
  referenceType: string;
  referenceId: string;
  amount: number;
  direction: "credit" | "debit";
  balanceBefore: number;
  balanceAfter: number;
  nonNegativeInvariantHeld: boolean;
  isSystemFunding: boolean;
  transactionGroupId?: string;
}

export interface FormalLedgerAuditReport {
  isValid: boolean;
  botToken: string;
  botUsername: string;
  botFullName: string;
  currentReportedBalance: number;
  verifiedLedgerBalance: number;
  balanceDiscrepancy: number;
  totalCredits: number;
  totalDebits: number;
  totalSystemFunded: number;
  totalSystemReclaimed: number;
  totalWagerProfits: number;
  totalWagerLosses: number;
  entriesCount: number;
  nonNegativeInvariantPassed: boolean;
  doubleEntryInvariantPassed: boolean;
  violations: string[];
  chronologicalAuditTrail: FormalLedgerAuditEntry[];
  verifiedAt: string;
  auditChecksum: string;
}

export interface FleetLedgerAuditReport {
  totalBotsAudited: number;
  totalValidLedgers: number;
  totalDeficitViolations: number;
  fleetTotalSystemFunded: number;
  fleetTotalSystemReclaimed: number;
  fleetNetSystemCapital: number;
  fleetTotalReportedBalance: number;
  fleetTotalLedgerBalance: number;
  fleetReconciliationStatus: "balanced" | "discrepancy";
  discrepancyAmount: number;
  allInvariantsSatisfied: boolean;
  verifiedAt: string;
  botAuditSummaries: Array<{
    token: string;
    username: string;
    fullName: string;
    tier: string;
    balance: number;
    ledgerBalance: number;
    isValid: boolean;
    nonNegativeProof: boolean;
    violationsCount: number;
  }>;
}

/* ------------------------------------------------------------------------- */
/* RBAC & Granular Permissions Types (Section 1)                             */
/* ------------------------------------------------------------------------- */
export type PermissionCategory =
  | "players"
  | "tournaments"
  | "organizers"
  | "games"
  | "deposits"
  | "withdrawals"
  | "payments"
  | "ledger"
  | "disputes"
  | "admins"
  | "communications"
  | "audit"
  | "mechanics"
  | "system"
  | "review"
  | "operations"
  | "admin"
  | string;

export interface Permission {
  id: string;
  key: string;
  category: PermissionCategory;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppRole {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  createdAt: string;
  updatedAt?: string;
  permissions?: Permission[];
  permissionKeys?: string[];
  adminCount?: number;
}

export interface AdminUserRoleAssignment {
  userId: string;
  roleId: string;
  roleName?: string;
  assignedByAdminId: string;
  assignedAt: string;
}

export interface AdminAccount {
  id?: string;
  userId: string;
  username: string;
  phoneNumber?: string;
  role: string;
  status: "active" | "inactive" | "banned" | "suspended";
  roles: { id: string; name: string; isSystemRole: boolean }[];
  isSuperAdmin: boolean;
  isDefaultCredentials?: boolean;
  forcePasswordReset?: boolean;
  createdAt: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------------------- */
/* Game Catalog Types (Section 2.2)                                          */
/* ------------------------------------------------------------------------- */
export type GameStatus = "enabled" | "disabled";

export interface GameCatalogItem {
  id: string;
  name: string;
  slug: string;
  boardSize?: number;
  minTimerSeconds?: number;
  maxTimerSeconds?: number;
  iconUrl?: string;
  status: GameStatus;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------------------- */
/* Tournament Action Requests Queue (Section 2.3)                            */
/* ------------------------------------------------------------------------- */
export type TournamentActionRequestType = "cancel_tournament" | "disqualify_player" | "result_override";
export type TournamentActionRequestStatus = "pending" | "approved" | "rejected";

export interface TournamentActionRequest {
  id: string;
  tournamentId: string;
  tournamentTitle?: string;
  organizerId: string;
  organizerName?: string;
  requestType: TournamentActionRequestType;
  targetUserId?: string;
  targetUsername?: string;
  matchId?: string;
  reason: string;
  status: TournamentActionRequestStatus;
  reviewedByAdminId?: string;
  reviewedByAdminName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt?: string;
}

/* ------------------------------------------------------------------------- */
/* System Settings Categories & Payloads (Section 2.7)                       */
/* ------------------------------------------------------------------------- */
export type SystemSettingsCategory = "sms" | "email" | "whatsapp" | "notifications" | "general" | "backup" | "security" | "payments" | "platform" | string;

export interface SystemSettingEntry {
  id: string;
  category: SystemSettingsCategory;
  key: string;
  value: any;
  valueJson?: string;
  updatedByAdminId?: string;
  updatedAt: string;
}

export interface SmsSettings {
  provider: "hubtel" | "arkesel" | "twilio" | "mock";
  senderId: string;
  apiKey?: string;
  apiKeyMasked?: string;
  clientId?: string;
  clientSecret?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  otpTemplate: string;
  matchInviteTemplate: string;
  tournamentAlertTemplate: string;
  enabled: boolean;
}

export interface EmailSettings {
  provider: "smtp" | "sendgrid" | "postmark" | "ses" | "mock";
  senderEmail: string;
  senderName: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  passwordMasked?: string;
  apiKey?: string;
  apiKeyMasked?: string;
  secure?: boolean;
  // Template: Game Request (1v1 Challenge)
  gameRequestSubject?: string;
  gameRequestTemplate?: string;
  // Template: Tournament Match Approaching
  tournamentApproachingSubject?: string;
  tournamentApproachingTemplate?: string;
  // Additional transactional templates
  welcomeSubject?: string;
  welcomeTemplate: string;
  payoutAlertSubject?: string;
  payoutAlertTemplate: string;
  matchInviteSubject?: string;
  matchInviteTemplate?: string;
  tournamentAlertSubject?: string;
  tournamentAlertTemplate?: string;
  enabled: boolean;
}

export interface WhatsAppSettings {
  provider: "whatsapp_cloud_api" | "twilio_whatsapp" | "mock";
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  accessTokenMasked?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  gameRequestTemplate: string;
  tournamentAlertTemplate: string;
  turnReminderTemplate: string;
  enabled: boolean;
}

export interface InAppNotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0 to 100
  soundTheme: "classic" | "subtle" | "arcade" | "minimal";
  toastPosition: "top-right" | "top-center" | "bottom-right";
  autoDismissSeconds: number;
}

export interface NotificationChannelRouting {
  [key: string]: NotificationChannel[];
}

export interface NotificationDispatchedLog {
  id: string;
  recipientToken?: string;
  recipientContact?: string;
  recipient?: string;
  channel: NotificationChannel;
  title: string;
  message?: string;
  actionUrl?: string;
  type?: NotificationType;
  providerMessageId?: string;
  status: "delivered" | "sent" | "queued" | "failed" | "mock_sent";
  error?: string;
  timestamp: string;
}

export interface GeneralConfigurations {
  appName: string;
  supportPhone: string;
  supportEmail: string;
  defaultCurrency: string;
  timezone: string;
  maintenanceMode: boolean;
  maintenanceNotice: string;
  featureFlags: {
    wagerEscrowEnabled: boolean;
    cashoutsEnabled: boolean;
    spectatingEnabled: boolean;
    referralsEnabled: boolean;
  };
}

export interface SecurityPolicySettings {
  minPasscodeLength: number;
  adminSessionTimeoutHours: number;
  enforce2FAForAdmins: boolean;
  maxLoginAttempts: number;
  ipAllowlist: string[];
  flagDefaultCredentials: boolean;
}

/* ------------------------------------------------------------------------- */
/* Notification System & Multi-Channel Delivery (Section 3.0)               */
/* ------------------------------------------------------------------------- */
export type NotificationType =
  | "game_request"
  | "tournament_match"
  | "tournament_alert"
  | "turn_reminder"
  | "league_invite"
  | "wager_settlement"
  | "system"
  | "admin"
  | "account_alert"
  | "wager_result"
  | "system_alert"
  | "admin_notice"
  | "payout_alert"
  | "payout"
  | "dispute_alert"
  | string;

export type NotificationChannel = "in_app" | "whatsapp" | "sms" | "email";

export type NotificationUrgency = "urgent" | "high" | "normal" | "low";

export interface NotificationItem {
  id: string;
  recipientId?: string;
  recipientToken?: string;
  recipientUsername?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  senderId?: string;
  senderName?: string;
  type: NotificationType;
  urgency?: NotificationUrgency;
  title: string;
  message: string;
  timestamp: string;
  link?: string; // Direct link to action or game room
  actionLabel?: string;
  actionPayload?: {
    roomCode?: string;
    leagueId?: string;
    matchId?: string;
    wagerAmount?: number;
    gameMode?: string;
    senderUsername?: string;
    [key: string]: any;
  };
  channels?: NotificationChannel[];
  read?: boolean;
  expiresAt?: string;
  deliveryStatus?: {
    in_app: "delivered" | "read";
    whatsapp?: "queued" | "sent" | "failed" | "disabled";
    sms?: "queued" | "sent" | "failed" | "disabled";
    email?: "queued" | "sent" | "failed" | "disabled";
  };
}

export interface UserNotificationPreferences {
  inAppSound?: boolean;
  inAppToast?: boolean;
  gameRequestsInApp: boolean;
  tournamentAlertsInApp: boolean;
  turnRemindersInApp: boolean;
  whatsappEnabled: boolean;
  whatsappNumber?: string;
  whatsappGameRequests: boolean;
  whatsappTournamentAlerts: boolean;
  smsEnabled: boolean;
  smsNumber?: string;
  smsTournamentAlerts: boolean;
  emailEnabled: boolean;
  emailAddress?: string;
  emailTournamentAlerts: boolean;
  emailSettlements: boolean;
}

/* ------------------------------------------------------------------------- */
/* Comprehensive Match History, Network Disconnect Logs & Game Requests     */
/* ------------------------------------------------------------------------- */
export type MatchLossReason =
  | "board_win"
  | "voluntary_resignation"
  | "disconnect_timeout"
  | "clock_timeout"
  | "draw_agreed"
  | "admin_ruling"
  | "cancelled_unjoined"
  | "abandoned"
  | "unknown";

export interface ConnectionEventLog {
  event: "disconnect" | "reconnect" | "timeout_warning" | "forfeit_timeout" | "ping_drop";
  player: Player;
  playerName: string;
  playerToken?: string;
  timestamp: number;
  formattedTime?: string;
  durationSeconds?: number;
  remainingGraceSeconds?: number;
  note?: string;
}

export interface ComprehensiveMatch {
  id: string;
  roomCode: string;
  matchId?: string | null;
  leagueId?: string | null;
  leagueMatchId?: string | null;
  tournamentTitle?: string | null;
  tournamentRound?: number | string | null;
  mode: GameMode | "custom_wager" | "tournament";
  status: RoomStatus;
  hostName: string;
  hostToken: string | null;
  hostPhone?: string | null;
  hostRating?: number | null;
  guestName: string | null;
  guestToken: string | null;
  guestPhone?: string | null;
  guestRating?: number | null;
  winner: Player | "draw" | null;
  winnerName: string | null;
  winnerToken: string | null;
  loserName: string | null;
  loserToken: string | null;
  isDraw: boolean;
  wagerAmount: number;
  potAmount: number;
  platformFee: number;
  netPayout: number;
  escrowId: string | null;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  durationFormatted: string;
  moveCount: number;
  moves: MoveLogEntry[];
  terminationReason: MatchLossReason;
  lossExplanation: string;
  connectionEvents: ConnectionEventLog[];
  reconnectCount: number;
  totalDisconnectedSeconds: number;
  hasConnectionIssues: boolean;
  disputeStatus: "none" | "under_review" | "resolved" | "voided" | string;
  disputeNotes?: string | null;
  boardJson: string;
  board?: (Player | null)[];
  ledgerEntries?: LedgerEntry[];
  walletTransactions?: WalletTransaction[];
  ruleVariations?: TournamentRuleVariations;
  customConstraints?: TournamentCustomConstraints;
  createdAt: string;
  updatedAt: string;
}

export interface GameRequestItem {
  id: string;
  type: "wager_challenge" | "open_lobby" | "tournament_action" | "bracket_match";
  title: string;
  creatorName: string;
  creatorToken: string;
  creatorPhone?: string;
  targetOpponentName?: string | null;
  targetOpponentToken?: string | null;
  wagerAmount: number;
  currency: string;
  mode: GameMode;
  roomCode?: string | null;
  tournamentId?: string | null;
  tournamentTitle?: string | null;
  status: "waiting" | "playing" | "completed" | "cancelled" | "expired" | "pending_review" | "approved" | "rejected" | "draw" | string;
  timeLimitSeconds?: number;
  turnLimitSeconds?: number;
  disconnectionGraceSeconds?: number;
  ruleVariations?: TournamentRuleVariations;
  reason?: string;
  actionRequestId?: string;
  createdAt: string;
  expiresAt?: string;
}

