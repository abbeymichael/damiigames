import type {
  AdminProfile,
  AdminSettings,
  GameTypeLimit,
  League,
  LeagueParticipant,
  OrganizerProfile,
  Profile,
  Region,
} from "../types";
import { securityService } from "../security";

/**
 * Canonical seed dataset shared by every storage backend.
 *
 * Both the local file store and the MySQL store build their default data from
 * this single source, so `npm run seed` produces byte-identical accounts
 * regardless of dialect.
 *
 * Passwords are hashed with a fresh PBKDF2 salt on every call — the plaintext
 * defaults below are development credentials and MUST be rotated in production
 * (the deployment guide covers this).
 */

export const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
export const DEFAULT_PLAYER_PASSWORD = process.env.SEED_PLAYER_PASSWORD || "123456";

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  wagerFeePercent: 5,
  tournamentFeePercent: 10,
  pointsPerGhsBuy: 1,
  pointsPerGhsWithdraw: 1,
  minDepositGhs: 5,
  maxDepositGhs: 5000,
  minWithdrawalGhs: 10,
  maxWithdrawalGhs: 2000,
  maxDailyWithdrawalGhs: 5000,
  turnTimerSeconds: 60,
  disconnectGraceSeconds: 90,
  unjoinedRoomExpiryMinutes: 10,
  maintenanceMode: false,
  maintenanceNotice: "Scheduled maintenance in progress. Matchmaking is temporarily paused.",
  disableWagers: false,
  disableWithdrawals: false,
  publicSpectatingEnabled: true,
  defaultRating: 1200,
  ratingKFactor: 32,
  minWagerGhs: 5,
  maxWagerGhs: 1000,
  updatedAt: new Date(0).toISOString(),
  updatedBy: "System",
};

export const DEFAULT_REGIONS: Region[] = [
  { id: "reg-greater-accra", name: "Greater Accra", code: "GA", sortOrder: 1, active: true },
  { id: "reg-ashanti", name: "Ashanti", code: "AS", sortOrder: 2, active: true },
  { id: "reg-western", name: "Western", code: "WP", sortOrder: 3, active: true },
  { id: "reg-eastern", name: "Eastern", code: "EP", sortOrder: 4, active: true },
  { id: "reg-central", name: "Central", code: "CP", sortOrder: 5, active: true },
  { id: "reg-northern", name: "Northern", code: "NP", sortOrder: 6, active: true },
  { id: "reg-volta", name: "Volta", code: "VR", sortOrder: 7, active: true },
  { id: "reg-upper-east", name: "Upper East", code: "UE", sortOrder: 8, active: true },
  { id: "reg-upper-west", name: "Upper West", code: "UW", sortOrder: 9, active: true },
  { id: "reg-bono", name: "Bono", code: "BO", sortOrder: 10, active: true },
  { id: "reg-bono-east", name: "Bono East", code: "BE", sortOrder: 11, active: true },
  { id: "reg-ahafo", name: "Ahafo", code: "AH", sortOrder: 12, active: true },
  { id: "reg-western-north", name: "Western North", code: "WN", sortOrder: 13, active: true },
  { id: "reg-oti", name: "Oti", code: "OT", sortOrder: 14, active: true },
  { id: "reg-savannah", name: "Savannah", code: "SV", sortOrder: 15, active: true },
  { id: "reg-north-east", name: "North East", code: "NE", sortOrder: 16, active: true },
];

export const DEFAULT_GAME_TYPE_LIMITS: GameTypeLimit[] = [
  {
    id: "limit-damii-10x10",
    gameType: "damii_10x10",
    minWager: "1.00",
    maxWager: "1000.00",
    minTournamentPrizePool: "10.00",
    maxTournamentPrizePool: "10000.00",
    platformFeePercent: "0.0500",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "limit-draughts-classic",
    gameType: "draughts_classic",
    minWager: "1.00",
    maxWager: "500.00",
    minTournamentPrizePool: "10.00",
    maxTournamentPrizePool: "5000.00",
    platformFeePercent: "0.0500",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "limit-rapid-damii",
    gameType: "rapid_damii",
    minWager: "2.00",
    maxWager: "1500.00",
    minTournamentPrizePool: "20.00",
    maxTournamentPrizePool: "15000.00",
    platformFeePercent: "0.0500",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "limit-tournament-blitz",
    gameType: "tournament_blitz",
    minWager: "5.00",
    maxWager: "2000.00",
    minTournamentPrizePool: "50.00",
    maxTournamentPrizePool: "20000.00",
    platformFeePercent: "0.0500",
    updatedAt: new Date(0).toISOString(),
  },
];

const ALL_PERMISSIONS: AdminProfile["permissions"] = [
  "manage_users",
  "manage_organizers",
  "manage_tournaments",
  "manage_wallet",
  "manage_payouts",
  "resolve_disputes",
  "manage_admins",
  "run_seeder",
  "view_audit_log",
];

export interface SeedDataset {
  profiles: Profile[];
  adminProfiles: AdminProfile[];
  organizerProfiles: OrganizerProfile[];
  leagues: League[];
  leagueParticipants: LeagueParticipant[];
  adminSettings: AdminSettings;
  regions: Region[];
  gameTypeLimits: GameTypeLimit[];
}

/** Builds the full default dataset with freshly hashed credentials. */
export function buildSeedDataset(now = new Date().toISOString()): SeedDataset {
  const adminCreds = securityService.hashPassword(DEFAULT_ADMIN_PASSWORD);
  const playerCreds = securityService.hashPassword(DEFAULT_PLAYER_PASSWORD);

  const profile = (
    token: string,
    username: string,
    creds: { hash: string; salt: string },
    overrides: Partial<Profile> = {},
  ): Profile => ({
    token,
    username,
    passcode: creds.hash,
    passwordSalt: creds.salt,
    rating: 1000,
    marbles: 0,
    points: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winStreak: 0,
    bestStreak: 0,
    matchesLast7Days: 0,
    opponentRatingAvg: 0,
    totalOpponentsFaced: 0,
    role: "user",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const profiles: Profile[] = [
    profile("admin-token-001", "admin", adminCreds, {
      rating: 1900,
      marbles: 1000,
      points: 10000,
      wins: 50,
      losses: 2,
      draws: 1,
      role: "super_admin",
    }),
    profile("admin-token-002", "superadmin", adminCreds, {
      rating: 2000,
      marbles: 2000,
      points: 15000,
      wins: 80,
      losses: 1,
      draws: 0,
      role: "super_admin",
    }),
    profile("admin-token-003", "DAMII Facilitator", adminCreds, {
      rating: 1850,
      marbles: 1000,
      points: 5000,
      wins: 42,
      losses: 5,
      draws: 2,
      role: "admin",
    }),
    profile("organizer-kofi-token", "Organizer_Kofi", playerCreds, {
      rating: 1750,
      marbles: 1000,
      points: 8000,
      wins: 30,
      losses: 10,
      draws: 2,
      role: "organizer",
    }),
    profile("organizer-token-002", "Premier_Damii_Org", playerCreds, {
      rating: 1820,
      marbles: 1500,
      points: 12000,
      wins: 45,
      losses: 8,
      draws: 3,
      role: "organizer",
    }),
    profile("player-kwame-token", "Kwame_Master", playerCreds, {
      rating: 1420,
      marbles: 250,
      points: 2000,
      wins: 18,
      losses: 6,
      draws: 1,
    }),
    profile("player-ama-token", "Ama_Queen", playerCreds, {
      rating: 1390,
      marbles: 180,
      points: 1500,
      wins: 14,
      losses: 4,
      draws: 3,
    }),
    profile("player-kofi-token", "Kofi_Grandmaster", playerCreds, {
      rating: 1650,
      marbles: 400,
      points: 3500,
      wins: 28,
      losses: 8,
      draws: 2,
    }),
    profile("player-1-token", "player1", playerCreds, {
      rating: 1200,
      marbles: 100,
      points: 800,
      wins: 5,
      losses: 3,
      draws: 0,
    }),
  ];

  const adminProfiles: AdminProfile[] = [
    {
      userId: "admin-token-001",
      isSuperAdmin: true,
      permissions: [...ALL_PERMISSIONS],
      grantedBy: "system",
      grantedAt: now,
    },
    {
      userId: "admin-token-002",
      isSuperAdmin: true,
      permissions: [...ALL_PERMISSIONS],
      grantedBy: "system",
      grantedAt: now,
    },
    {
      userId: "admin-token-003",
      isSuperAdmin: false,
      permissions: ["manage_tournaments", "resolve_disputes", "view_audit_log"],
      grantedBy: "admin-token-001",
      grantedAt: now,
    },
  ];

  const organizerProfiles: OrganizerProfile[] = [
    {
      userId: "organizer-kofi-token",
      username: "Organizer_Kofi",
      status: "approved",
      requestedAt: now,
      reviewedBy: "admin-token-001",
      reviewedAt: now,
      organizationName: "Kofi Draughts Club",
      bio: "Premier Draughts League organizer in Accra",
      contactPhone: "+233240001122",
    },
    {
      userId: "organizer-token-002",
      username: "Premier_Damii_Org",
      status: "approved",
      requestedAt: now,
      reviewedBy: "admin-token-001",
      reviewedAt: now,
      organizationName: "Damii Association",
      bio: "Official circuit tournament organizer",
      contactPhone: "+233500003344",
    },
    {
      userId: "player-kwame-token",
      username: "Kwame_Master",
      status: "pending",
      requestedAt: now,
      organizationName: "Kwame Arena",
      bio: "Organizing local regional tournaments",
      contactPhone: "+233241234567",
    },
  ];

  const leagueId = "league-open-2026";
  const leagues: League[] = [
    {
      id: leagueId,
      title: "Championship Open 2026",
      description: "Official 10x10 Damii Tournament. Compete for 10,000 Points prize pool!",
      entryFeeMarbles: 0,
      entryFeePoints: 50,
      prizePoolPoints: 10000,
      status: "registration",
      format: "single_elimination",
      facilitatorToken: "admin-token-001",
      facilitatorName: "admin",
      maxParticipants: 8,
      participantCount: 3,
      winnerToken: null,
      winnerName: null,
      turnTimerSeconds: 60,
      roundsCount: 3,
      prizeDistribution: { first: 60, second: 30, third: 10 },
      createdAt: now,
      updatedAt: now,
    },
  ];

  const participant = (
    id: string,
    userToken: string,
    username: string,
    seed: number,
    checkedIn: boolean,
  ): LeagueParticipant => ({
    id,
    leagueId,
    userToken,
    username,
    status: "approved",
    seed,
    checkedIn,
    pointsScore: 0,
    winsCount: 0,
    lossesCount: 0,
    drawsCount: 0,
    joinedAt: now,
  });

  const leagueParticipants: LeagueParticipant[] = [
    participant("part-1", "admin-token-001", "admin", 1, true),
    participant("part-2", "player-kwame-token", "Kwame_Master", 2, true),
    participant("part-3", "player-ama-token", "Ama_Queen", 3, false),
  ];

  return {
    profiles,
    adminProfiles,
    organizerProfiles,
    leagues,
    leagueParticipants,
    adminSettings: { ...DEFAULT_ADMIN_SETTINGS, updatedAt: now },
    regions: [...DEFAULT_REGIONS],
    gameTypeLimits: [...DEFAULT_GAME_TYPE_LIMITS],
  };
}
