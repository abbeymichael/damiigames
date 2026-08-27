import type {
  AdminProfile,
  AdminSettings,
  GameTypeLimit,
  League,
  LeagueParticipant,
  OrganizerApplication,
  OrganizerProfile,
  Profile,
  Region,
} from "../types";
import { securityService } from "../security";
import { BOT_ACCOUNTS } from "../bot-service";

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

export const DEFAULT_ADMIN_PASSWORD =
  process.env.ADMIN_PASSCODE || process.env.SEED_ADMIN_PASSWORD || "admin123";
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
  organizerApplications: OrganizerApplication[];
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
      rating: 1200,
      marbles: 0,
      points: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      role: "super_admin",
    }),
    ...BOT_ACCOUNTS.map((bot) =>
      profile(bot.token, bot.username, playerCreds, {
        fullName: bot.fullName,
        region: bot.region,
        rating: bot.rating,
        marbles: 0,
        points: 0,
        wins: bot.wins,
        losses: bot.losses,
        draws: bot.draws,
        winStreak: bot.winStreak,
        bestStreak: bot.bestStreak,
        matchesLast7Days: Math.floor(Math.random() * 8) + 1,
        opponentRatingAvg: bot.rating - 15 + Math.floor(Math.random() * 30),
        totalOpponentsFaced: bot.wins + bot.losses + bot.draws,
        role: "user",
      })
    ),
  ];

  const adminProfiles: AdminProfile[] = [
    {
      userId: "admin-token-001",
      isSuperAdmin: true,
      permissions: [...ALL_PERMISSIONS],
      grantedBy: "system",
      grantedAt: now,
    },
  ];

  const organizerProfiles: OrganizerProfile[] = [];
  const organizerApplications: OrganizerApplication[] = [];
  const leagues: League[] = [];
  const leagueParticipants: LeagueParticipant[] = [];

  return {
    profiles,
    adminProfiles,
    organizerProfiles,
    organizerApplications,
    leagues,
    leagueParticipants,
    adminSettings: { ...DEFAULT_ADMIN_SETTINGS, updatedAt: now },
    regions: [...DEFAULT_REGIONS],
    gameTypeLimits: [...DEFAULT_GAME_TYPE_LIMITS],
  };
}
