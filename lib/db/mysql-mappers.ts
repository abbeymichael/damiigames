import type {
  AdminLog,
  AdminPermission,
  AdminProfile,
  AdminSettings,
  League,
  LeagueMatch,
  LeagueParticipant,
  MoveLogEntry,
  OrganizerProfile,
  OrganizerStatus,
  PrizeDistribution,
  Profile,
  Role,
  Room,
  Session,
  WagerEscrow,
  WalletTransaction,
} from "../types";
import type * as schema from "../../db/schema.mysql";

/**
 * Row <-> domain object mappers.
 *
 * The domain types in lib/types.ts use `undefined` for "absent" and plain
 * booleans/objects, whereas MySQL stores `NULL`, `tinyint` and JSON strings.
 * Keeping all of that translation in one file means the store code stays
 * readable and the conversions stay consistent in both directions.
 */

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];

export type ProfileRow = Row<typeof schema.profiles>;
export type SessionRow = Row<typeof schema.sessions>;
export type AdminProfileRow = Row<typeof schema.adminProfiles>;
export type OrganizerProfileRow = Row<typeof schema.organizerProfiles>;
export type RoomRow = Row<typeof schema.rooms>;
export type WalletTransactionRow = Row<typeof schema.walletTransactions>;
export type EscrowRow = Row<typeof schema.escrows>;
export type LeagueRow = Row<typeof schema.leagues>;
export type LeagueParticipantRow = Row<typeof schema.leagueParticipants>;
export type LeagueMatchRow = Row<typeof schema.leagueMatches>;
export type AdminLogRow = Row<typeof schema.adminLogs>;
export type AdminSettingsRow = Row<typeof schema.adminSettings>;

/* --------------------------- primitive helpers --------------------------- */

/** MySQL NULL -> undefined (domain types use optional properties). */
export const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value);

/** tinyint(0/1) -> boolean */
export const toBool = (value: number | null): boolean => value === 1;

/** boolean -> tinyint(0/1) */
export const fromBool = (value: boolean | undefined): number => (value ? 1 : 0);

/** undefined -> null for insert/update payloads. */
export const orNull = <T>(value: T | undefined | null): T | null => (value === undefined ? null : value);

/** Trims to a column's max length so oversized input can never break an insert. */
export const clamp = (value: string | undefined | null, max: number): string | null => {
  if (value === undefined || value === null) return null;
  return value.length > max ? value.slice(0, max) : value;
};

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* -------------------------------- profiles ------------------------------- */

export function rowToProfile(row: ProfileRow): Profile {
  return {
    token: row.token,
    username: row.username,
    phoneNumber: orUndefined(row.phoneNumber),
    passcode: orUndefined(row.passcode),
    passwordSalt: orUndefined(row.passwordSalt),
    rating: row.rating,
    marbles: row.marbles,
    points: row.points,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    winStreak: row.winStreak,
    bestStreak: row.bestStreak,
    lastMatchAt: orUndefined(row.lastMatchAt),
    matchesLast7Days: row.matchesLast7Days,
    opponentRatingAvg: row.opponentRatingAvg,
    totalOpponentsFaced: row.totalOpponentsFaced,
    role: row.role as Role,
    status: (row.status as Profile["status"]) || "active",
    bannedAt: orUndefined(row.bannedAt),
    bannedReason: orUndefined(row.bannedReason),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function profileToRow(p: Profile): ProfileRow {
  return {
    token: p.token,
    username: p.username,
    usernameLower: p.username.trim().toLowerCase(),
    phoneNumber: clamp(p.phoneNumber, 32),
    passcode: clamp(p.passcode, 255),
    passwordSalt: clamp(p.passwordSalt, 128),
    rating: p.rating ?? 1000,
    marbles: p.marbles ?? 0,
    points: p.points ?? 0,
    wins: p.wins ?? 0,
    losses: p.losses ?? 0,
    draws: p.draws ?? 0,
    winStreak: p.winStreak ?? 0,
    bestStreak: p.bestStreak ?? 0,
    lastMatchAt: orNull(p.lastMatchAt),
    matchesLast7Days: p.matchesLast7Days ?? 0,
    opponentRatingAvg: Math.round(p.opponentRatingAvg ?? 0),
    totalOpponentsFaced: p.totalOpponentsFaced ?? 0,
    role: p.role,
    status: p.status || "active",
    bannedAt: orNull(p.bannedAt),
    bannedReason: clamp(p.bannedReason, 512),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

/* -------------------------------- sessions ------------------------------- */

export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.userId,
    token: row.token,
    role: row.role as Role,
    csrfToken: orUndefined(row.csrfToken),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    ipAddress: orUndefined(row.ipAddress),
    userAgent: orUndefined(row.userAgent),
  };
}

export function sessionToRow(s: Session): SessionRow {
  return {
    token: s.token,
    id: s.id,
    userId: s.userId,
    role: s.role,
    csrfToken: orNull(s.csrfToken),
    ipAddress: clamp(s.ipAddress, 64),
    userAgent: clamp(s.userAgent, 512),
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  };
}

/* ---------------------------- admin profiles ----------------------------- */

export function rowToAdminProfile(row: AdminProfileRow): AdminProfile {
  return {
    userId: row.userId,
    permissions: parseJson<AdminPermission[]>(row.permissionsJson, []),
    isSuperAdmin: toBool(row.isSuperAdmin),
    grantedBy: row.grantedBy,
    grantedAt: row.grantedAt,
  };
}

export function adminProfileToRow(a: AdminProfile): AdminProfileRow {
  return {
    userId: a.userId,
    permissionsJson: JSON.stringify(a.permissions || []),
    isSuperAdmin: fromBool(a.isSuperAdmin),
    grantedBy: a.grantedBy,
    grantedAt: a.grantedAt,
  };
}

/* -------------------------- organizer profiles --------------------------- */

export function rowToOrganizerProfile(row: OrganizerProfileRow): OrganizerProfile {
  return {
    userId: row.userId,
    username: orUndefined(row.username),
    status: row.status as OrganizerStatus,
    requestedAt: row.requestedAt,
    reviewedBy: orUndefined(row.reviewedBy),
    reviewedAt: orUndefined(row.reviewedAt),
    rejectionReason: orUndefined(row.rejectionReason),
    organizationName: orUndefined(row.organizationName),
    bio: orUndefined(row.bio),
    contactPhone: orUndefined(row.contactPhone),
  };
}

export function organizerProfileToRow(o: OrganizerProfile): OrganizerProfileRow {
  return {
    userId: o.userId,
    username: clamp(o.username, 191),
    status: o.status,
    requestedAt: o.requestedAt,
    reviewedBy: clamp(o.reviewedBy, 191),
    reviewedAt: orNull(o.reviewedAt),
    rejectionReason: clamp(o.rejectionReason, 512),
    organizationName: clamp(o.organizationName, 191),
    bio: orNull(o.bio),
    contactPhone: clamp(o.contactPhone, 32),
  };
}

/* --------------------------------- rooms --------------------------------- */

export function rowToRoom(row: RoomRow): Room {
  const movesJson = orUndefined(row.movesJson);
  const room: Room = {
    code: row.code,
    hostName: row.hostName,
    hostToken: row.hostToken,
    guestName: row.guestName,
    guestToken: row.guestToken,
    boardJson: row.boardJson,
    turn: row.turn as Room["turn"],
    forcedFrom: row.forcedFrom,
    winner: row.winner as Room["winner"],
    status: row.status as Room["status"],
    mode: row.mode as Room["mode"],
    wagerAmount: row.wagerAmount,
    escrowId: row.escrowId,
    leagueId: row.leagueId,
    matchId: row.matchId,
    moveCount: row.moveCount,
    resultApplied: row.resultApplied,
    lastMoveTime: Number(row.lastMoveTime ?? 0),
    disconnectTime: row.disconnectTime === null ? null : Number(row.disconnectTime),
    disconnectedPlayer: row.disconnectedPlayer as Room["disconnectedPlayer"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (movesJson) {
    room.movesJson = movesJson;
    room.moves = parseJson<MoveLogEntry[]>(movesJson, []);
  }

  return room;
}

export function roomToRow(r: Room): RoomRow {
  // Prefer the explicit movesJson string; fall back to serialising `moves`.
  const movesJson = r.movesJson ?? (r.moves ? JSON.stringify(r.moves) : null);

  return {
    code: r.code,
    hostName: r.hostName,
    hostToken: r.hostToken,
    guestName: orNull(r.guestName),
    guestToken: orNull(r.guestToken),
    boardJson: r.boardJson,
    movesJson,
    turn: r.turn,
    forcedFrom: orNull(r.forcedFrom),
    winner: orNull(r.winner),
    status: r.status,
    mode: r.mode,
    wagerAmount: r.wagerAmount ?? 0,
    escrowId: orNull(r.escrowId),
    leagueId: orNull(r.leagueId),
    matchId: orNull(r.matchId),
    moveCount: r.moveCount ?? 0,
    resultApplied: r.resultApplied ? 1 : 0,
    lastMoveTime: r.lastMoveTime ?? 0,
    disconnectTime: orNull(r.disconnectTime),
    disconnectedPlayer: orNull(r.disconnectedPlayer),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/* ---------------------------- wallet ledger ------------------------------ */

export function rowToTransaction(row: WalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    userToken: row.userToken,
    type: row.type as WalletTransaction["type"],
    currency: row.currency as WalletTransaction["currency"],
    amount: row.amount,
    reference: row.reference,
    status: row.status as WalletTransaction["status"],
    metaJson: row.metaJson,
    createdAt: row.createdAt,
  };
}

export function transactionToRow(t: WalletTransaction): WalletTransactionRow {
  return {
    id: t.id,
    userToken: t.userToken,
    type: t.type,
    currency: t.currency,
    amount: t.amount,
    reference: t.reference.slice(0, 191),
    status: t.status || "completed",
    metaJson: t.metaJson || "{}",
    createdAt: t.createdAt,
  };
}

/* -------------------------------- escrows -------------------------------- */

export function rowToEscrow(row: EscrowRow): WagerEscrow {
  return {
    id: row.id,
    roomCode: row.roomCode,
    amountMarbles: row.amountMarbles,
    amountPoints: row.amountPoints,
    player1Token: row.player1Token,
    player2Token: row.player2Token,
    lockedAt: row.lockedAt,
    status: row.status as WagerEscrow["status"],
    winnerToken: row.winnerToken,
    disbursedAt: row.disbursedAt,
  };
}

export function escrowToRow(e: WagerEscrow): EscrowRow {
  return {
    id: e.id,
    roomCode: e.roomCode,
    amountMarbles: e.amountMarbles ?? 0,
    amountPoints: e.amountPoints ?? 0,
    player1Token: e.player1Token,
    player2Token: orNull(e.player2Token),
    lockedAt: e.lockedAt,
    status: e.status,
    winnerToken: orNull(e.winnerToken),
    disbursedAt: orNull(e.disbursedAt),
  };
}

/* -------------------------------- leagues -------------------------------- */

const DEFAULT_PRIZE_DISTRIBUTION: PrizeDistribution = { first: 60, second: 30, third: 10 };

export function rowToLeague(row: LeagueRow): League {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    entryFeeMarbles: row.entryFeeMarbles,
    entryFeePoints: row.entryFeePoints,
    prizePoolPoints: row.prizePoolPoints,
    status: row.status as League["status"],
    format: row.format as League["format"],
    facilitatorToken: row.facilitatorToken,
    facilitatorName: row.facilitatorName,
    maxParticipants: row.maxParticipants,
    participantCount: row.participantCount,
    winnerToken: row.winnerToken,
    winnerName: row.winnerName,
    runnerUpToken: row.runnerUpToken,
    runnerUpName: row.runnerUpName,
    thirdPlaceToken: row.thirdPlaceToken,
    thirdPlaceName: row.thirdPlaceName,
    isPrivate: toBool(row.isPrivate),
    inviteCode: orUndefined(row.inviteCode),
    requiresApproval: toBool(row.requiresApproval),
    scheduleDate: orUndefined(row.scheduleDate),
    scheduleTime: orUndefined(row.scheduleTime),
    gameDays: orUndefined(row.gameDays),
    turnTimerSeconds: row.turnTimerSeconds,
    roundsCount: row.roundsCount,
    prizeDistribution: parseJson<PrizeDistribution>(row.prizeDistributionJson, DEFAULT_PRIZE_DISTRIBUTION),
    rulesNotes: orUndefined(row.rulesNotes),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function leagueToRow(l: League): LeagueRow {
  return {
    id: l.id,
    title: l.title.slice(0, 191),
    description: l.description ?? "",
    entryFeeMarbles: l.entryFeeMarbles ?? 0,
    entryFeePoints: l.entryFeePoints ?? 0,
    prizePoolPoints: l.prizePoolPoints ?? 0,
    status: l.status,
    format: l.format,
    facilitatorToken: l.facilitatorToken,
    facilitatorName: l.facilitatorName.slice(0, 191),
    maxParticipants: l.maxParticipants ?? 16,
    participantCount: l.participantCount ?? 0,
    winnerToken: orNull(l.winnerToken),
    winnerName: clamp(l.winnerName, 191),
    runnerUpToken: orNull(l.runnerUpToken),
    runnerUpName: clamp(l.runnerUpName, 191),
    thirdPlaceToken: orNull(l.thirdPlaceToken),
    thirdPlaceName: clamp(l.thirdPlaceName, 191),
    isPrivate: fromBool(l.isPrivate),
    inviteCode: clamp(l.inviteCode, 64),
    requiresApproval: fromBool(l.requiresApproval),
    scheduleDate: clamp(l.scheduleDate, 32),
    scheduleTime: clamp(l.scheduleTime, 32),
    gameDays: clamp(l.gameDays, 191),
    turnTimerSeconds: l.turnTimerSeconds ?? 60,
    roundsCount: l.roundsCount ?? 0,
    prizeDistributionJson: JSON.stringify(l.prizeDistribution || DEFAULT_PRIZE_DISTRIBUTION),
    rulesNotes: orNull(l.rulesNotes),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  };
}

export function rowToParticipant(row: LeagueParticipantRow): LeagueParticipant {
  return {
    id: row.id,
    leagueId: row.leagueId,
    userToken: row.userToken,
    username: row.username,
    status: row.status as LeagueParticipant["status"],
    seed: row.seed,
    checkedIn: toBool(row.checkedIn),
    pointsScore: row.pointsScore,
    winsCount: row.winsCount,
    lossesCount: row.lossesCount,
    drawsCount: row.drawsCount,
    joinedAt: row.joinedAt,
  };
}

export function participantToRow(p: LeagueParticipant): LeagueParticipantRow {
  return {
    id: p.id,
    leagueId: p.leagueId,
    userToken: p.userToken,
    username: p.username.slice(0, 191),
    status: p.status || "approved",
    seed: p.seed ?? 0,
    checkedIn: fromBool(p.checkedIn),
    pointsScore: p.pointsScore ?? 0,
    winsCount: p.winsCount ?? 0,
    lossesCount: p.lossesCount ?? 0,
    drawsCount: p.drawsCount ?? 0,
    joinedAt: p.joinedAt,
  };
}

export function rowToLeagueMatch(row: LeagueMatchRow): LeagueMatch {
  return {
    id: row.id,
    leagueId: row.leagueId,
    round: row.round,
    matchNumber: row.matchNumber,
    bracketType: row.bracketType as LeagueMatch["bracketType"],
    player1Token: row.player1Token,
    player1Name: row.player1Name,
    player1Score: row.player1Score,
    player2Token: row.player2Token,
    player2Name: row.player2Name,
    player2Score: row.player2Score,
    winnerToken: row.winnerToken,
    roomCode: row.roomCode,
    scheduledTime: orUndefined(row.scheduledTime),
    status: row.status as LeagueMatch["status"],
    disputeNotes: orUndefined(row.disputeNotes),
    createdAt: row.createdAt,
  };
}

export function leagueMatchToRow(m: LeagueMatch): LeagueMatchRow {
  return {
    id: m.id,
    leagueId: m.leagueId,
    round: m.round,
    matchNumber: m.matchNumber,
    bracketType: m.bracketType || "winners",
    player1Token: orNull(m.player1Token),
    player1Name: clamp(m.player1Name, 191),
    player1Score: m.player1Score ?? 0,
    player2Token: orNull(m.player2Token),
    player2Name: clamp(m.player2Name, 191),
    player2Score: m.player2Score ?? 0,
    winnerToken: orNull(m.winnerToken),
    roomCode: clamp(m.roomCode, 32),
    scheduledTime: clamp(m.scheduledTime, 64),
    status: m.status || "pending",
    disputeNotes: orNull(m.disputeNotes),
    createdAt: m.createdAt,
  };
}

/* ------------------------------ admin logs ------------------------------- */

export function rowToAdminLog(row: AdminLogRow): AdminLog {
  return {
    id: row.id,
    adminToken: row.adminToken,
    adminName: row.adminName,
    action: row.action,
    target: row.target,
    detailsJson: row.detailsJson,
    createdAt: row.createdAt,
  };
}

export function adminLogToRow(l: AdminLog): AdminLogRow {
  return {
    id: l.id,
    adminToken: l.adminToken,
    adminName: l.adminName.slice(0, 191),
    action: l.action.slice(0, 191),
    target: String(l.target ?? "").slice(0, 191),
    detailsJson: l.detailsJson || "{}",
    createdAt: l.createdAt,
  };
}

/* ---------------------------- admin settings ----------------------------- */

export function rowToAdminSettings(row: AdminSettingsRow): AdminSettings {
  return {
    wagerFeePercent: row.wagerFeePercent,
    tournamentFeePercent: row.tournamentFeePercent,
    pointsPerGhsBuy: row.pointsPerGhsBuy,
    pointsPerGhsWithdraw: row.pointsPerGhsWithdraw,
    minDepositGhs: row.minDepositGhs,
    maxDepositGhs: row.maxDepositGhs,
    minWithdrawalGhs: row.minWithdrawalGhs,
    maxWithdrawalGhs: row.maxWithdrawalGhs,
    maxDailyWithdrawalGhs: row.maxDailyWithdrawalGhs,
    updatedAt: row.updatedAt,
    updatedBy: orUndefined(row.updatedBy),
  };
}
