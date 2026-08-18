import { dbRepository } from "./db-client";
import type {
  GameTypeLimit,
  LedgerAccountType,
  LedgerEntry,
  LedgerEntryInput,
  Match,
  Tournament,
  TournamentEntry,
  TournamentPrize,
} from "./types";

export const PLATFORM_ACCOUNT_ID = "platform-treasury";

export class LedgerValidationError extends Error {
  constructor(message: string, public code: string = "LIMIT_VIOLATION") {
    super(message);
    this.name = "LedgerValidationError";
  }
}

export const ledgerService = {
  PLATFORM_ACCOUNT_ID,

  /**
   * Helper to execute double-entry ledger postings atomically.
   */
  async writeLedger(entries: LedgerEntryInput[]): Promise<LedgerEntry[]> {
    return dbRepository.writeLedger(entries);
  },

  /**
   * Fetch current ledger balance for a given user and account type.
   */
  async getBalance(userId: string, accountType: LedgerAccountType = "available"): Promise<number> {
    return dbRepository.getLedgerBalance(userId, accountType);
  },

  /**
   * Validates amounts against admin configured game-type limits.
   * "Per the decision, limits apply at creation time only."
   */
  async assertWithinLimits(
    gameType: string,
    kind: "wager" | "prizePool",
    amount: number
  ): Promise<GameTypeLimit> {
    const limits = await dbRepository.getGameTypeLimit(gameType);

    if (!limits) {
      // Fallback defaults if game type limit has not yet been seeded/configured
      const minW = 1.0;
      const maxW = 1000.0;
      const minP = 10.0;
      const maxP = 10000.0;
      const fee = 0.05;

      if (kind === "wager") {
        if (amount < minW || amount > maxW) {
          throw new LedgerValidationError(
            `Wager amount ${amount.toFixed(2)} is outside allowed range (${minW.toFixed(2)} - ${maxW.toFixed(2)}) for game type ${gameType}`,
            "WAGER_LIMIT_EXCEEDED"
          );
        }
      } else {
        if (amount < minP || amount > maxP) {
          throw new LedgerValidationError(
            `Prize pool amount ${amount.toFixed(2)} is outside allowed range (${minP.toFixed(2)} - ${maxP.toFixed(2)}) for game type ${gameType}`,
            "PRIZE_POOL_LIMIT_EXCEEDED"
          );
        }
      }

      return {
        id: `limit-${gameType}`,
        gameType,
        minWager: minW,
        maxWager: maxW,
        minTournamentPrizePool: minP,
        maxTournamentPrizePool: maxP,
        platformFeePercent: fee,
        updatedAt: new Date().toISOString(),
      };
    }

    const minWager = Number(limits.minWager);
    const maxWager = Number(limits.maxWager);
    const minPrize = Number(limits.minTournamentPrizePool);
    const maxPrize = Number(limits.maxTournamentPrizePool);

    if (kind === "wager") {
      if (amount < minWager || amount > maxWager) {
        throw new LedgerValidationError(
          `Wager amount GHS ${amount.toFixed(2)} is outside allowed range (GHS ${minWager.toFixed(2)} - GHS ${maxWager.toFixed(2)}) for ${gameType}`,
          "WAGER_LIMIT_EXCEEDED"
        );
      }
    } else {
      if (amount < minPrize || amount > maxPrize) {
        throw new LedgerValidationError(
          `Tournament prize pool GHS ${amount.toFixed(2)} is outside allowed range (GHS ${minPrize.toFixed(2)} - GHS ${maxPrize.toFixed(2)}) for ${gameType}`,
          "PRIZE_POOL_LIMIT_EXCEEDED"
        );
      }
    }

    return limits;
  },

  /**
   * Match Escrow Lifecycle
   */
  async createMatchEscrow(params: {
    matchId?: string;
    gameType: string;
    playerAId: string;
    wagerAmount: number;
  }): Promise<Match> {
    const { gameType, playerAId, wagerAmount } = params;
    const matchId = params.matchId || crypto.randomUUID();

    // 1. Validate limits
    await this.assertWithinLimits(gameType, "wager", wagerAmount);

    // 2. Create match record
    const match: Match = {
      id: matchId,
      gameType,
      playerAId,
      wagerAmount: wagerAmount.toFixed(2),
      status: "open",
      createdAt: new Date(),
    };

    await dbRepository.createMatch(match);

    // 3. Lock Player A wager in double-entry ledger
    await this.writeLedger([
      {
        userId: playerAId,
        accountType: "available",
        entryType: "wager_lock",
        amount: `-${wagerAmount.toFixed(2)}`,
        referenceType: "match",
        referenceId: matchId,
      },
      {
        userId: playerAId,
        accountType: "escrow",
        entryType: "wager_lock",
        amount: wagerAmount.toFixed(2),
        referenceType: "match",
        referenceId: matchId,
      },
    ]);

    return match;
  },

  async joinMatchEscrow(matchId: string, playerBId: string): Promise<Match> {
    const match = await dbRepository.getMatch(matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);
    if (match.status !== "open") throw new Error(`Match ${matchId} is not open for joining (status: ${match.status})`);
    if (match.playerAId === playerBId) throw new Error("Cannot join a match against yourself");

    const wagerAmount = Number(match.wagerAmount);

    // 1. Lock Player B wager in double-entry ledger
    await this.writeLedger([
      {
        userId: playerBId,
        accountType: "available",
        entryType: "wager_lock",
        amount: `-${wagerAmount.toFixed(2)}`,
        referenceType: "match",
        referenceId: matchId,
      },
      {
        userId: playerBId,
        accountType: "escrow",
        entryType: "wager_lock",
        amount: wagerAmount.toFixed(2),
        referenceType: "match",
        referenceId: matchId,
      },
    ]);

    // 2. Update match status to in_progress
    const updated = await dbRepository.updateMatch(matchId, {
      playerBId,
      status: "in_progress",
    });

    return updated!;
  },

  async settleMatchEscrow(matchId: string, winnerId: string): Promise<Match> {
    const match = await dbRepository.getMatch(matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);
    if (match.status !== "in_progress") {
      throw new Error(`Match ${matchId} cannot be settled (current status: ${match.status})`);
    }
    if (!match.playerBId) throw new Error(`Match ${matchId} has no Player B`);
    if (winnerId !== match.playerAId && winnerId !== match.playerBId) {
      throw new Error(`Winner ${winnerId} is not a participant in match ${matchId}`);
    }

    const wagerAmount = Number(match.wagerAmount);
    const totalPot = wagerAmount * 2;

    // Fetch fee percentage
    const limit = await dbRepository.getGameTypeLimit(match.gameType);
    const feePercent = limit ? Number(limit.platformFeePercent) : 0.05;
    const platformFee = totalPot * feePercent;
    const payout = totalPot - platformFee;

    // Double-entry postings
    await this.writeLedger([
      {
        userId: match.playerAId,
        accountType: "escrow",
        entryType: "wager_payout",
        amount: `-${wagerAmount.toFixed(2)}`,
        referenceType: "match",
        referenceId: matchId,
      },
      {
        userId: match.playerBId,
        accountType: "escrow",
        entryType: "wager_payout",
        amount: `-${wagerAmount.toFixed(2)}`,
        referenceType: "match",
        referenceId: matchId,
      },
      {
        userId: winnerId,
        accountType: "available",
        entryType: "wager_payout",
        amount: payout.toFixed(2),
        referenceType: "match",
        referenceId: matchId,
      },
      {
        userId: PLATFORM_ACCOUNT_ID,
        accountType: "available",
        entryType: "platform_fee",
        amount: platformFee.toFixed(2),
        referenceType: "match",
        referenceId: matchId,
      },
    ]);

    const updated = await dbRepository.updateMatch(matchId, {
      status: "completed",
      winnerId,
      settledAt: new Date(),
    });

    return updated!;
  },

  async cancelMatchEscrow(matchId: string): Promise<Match> {
    const match = await dbRepository.getMatch(matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);
    if (match.status === "completed" || match.status === "cancelled") {
      throw new Error(`Match ${matchId} is already ${match.status}`);
    }

    const wagerAmount = Number(match.wagerAmount);
    const postings: LedgerEntryInput[] = [];

    // Refund Player A
    postings.push(
      {
        userId: match.playerAId,
        accountType: "escrow",
        entryType: "wager_refund",
        amount: `-${wagerAmount.toFixed(2)}`,
        referenceType: "match",
        referenceId: matchId,
      },
      {
        userId: match.playerAId,
        accountType: "available",
        entryType: "wager_refund",
        amount: wagerAmount.toFixed(2),
        referenceType: "match",
        referenceId: matchId,
      }
    );

    // If Player B had joined, refund Player B as well
    if (match.playerBId) {
      postings.push(
        {
          userId: match.playerBId,
          accountType: "escrow",
          entryType: "wager_refund",
          amount: `-${wagerAmount.toFixed(2)}`,
          referenceType: "match",
          referenceId: matchId,
        },
        {
          userId: match.playerBId,
          accountType: "available",
          entryType: "wager_refund",
          amount: wagerAmount.toFixed(2),
          referenceType: "match",
          referenceId: matchId,
        }
      );
    }

    await this.writeLedger(postings);

    const updated = await dbRepository.updateMatch(matchId, {
      status: "cancelled",
      settledAt: new Date(),
    });

    return updated!;
  },

  /**
   * Tournament Prize Escrow Lifecycle (Section 7)
   */
  async createTournamentEscrow(params: {
    tournamentId?: string;
    organizerId: string;
    gameType: string;
    entryFee: number;
    totalPrizePool: number;
    prizes?: { placement: number; amount: number | string }[];
  }): Promise<Tournament> {
    const { organizerId, gameType, entryFee, totalPrizePool } = params;
    const tournamentId = params.tournamentId || crypto.randomUUID();

    // 1. Validate limits
    await this.assertWithinLimits(gameType, "prizePool", totalPrizePool);

    // 2. Validate prizes sum up to totalPrizePool
    const prizes = params.prizes || [
      { placement: 1, amount: (totalPrizePool * 0.6).toFixed(2) },
      { placement: 2, amount: (totalPrizePool * 0.3).toFixed(2) },
      { placement: 3, amount: (totalPrizePool * 0.1).toFixed(2) },
    ];

    const sumPrizes = prizes.reduce((acc, p) => acc + Number(p.amount), 0);
    if (Math.abs(sumPrizes - totalPrizePool) > 0.01) {
      throw new Error(`Sum of prize placements (GHS ${sumPrizes.toFixed(2)}) must equal total prize pool (GHS ${totalPrizePool.toFixed(2)})`);
    }

    // 3. Create tournament in DB
    const tournament: Tournament = {
      id: tournamentId,
      organizerId,
      gameType,
      entryFee: entryFee.toFixed(2),
      totalPrizePool: totalPrizePool.toFixed(2),
      status: "open",
      createdAt: new Date(),
    };

    await dbRepository.createTournament(tournament, prizes);

    // 4. Lock organizer prize pool into escrow
    await this.writeLedger([
      {
        userId: organizerId,
        accountType: "available",
        entryType: "prize_pool_lock",
        amount: `-${totalPrizePool.toFixed(2)}`,
        referenceType: "tournament",
        referenceId: tournamentId,
      },
      {
        userId: organizerId,
        accountType: "escrow",
        entryType: "prize_pool_lock",
        amount: totalPrizePool.toFixed(2),
        referenceType: "tournament",
        referenceId: tournamentId,
      },
    ]);

    return tournament;
  },

  async joinTournament(tournamentId: string, userId: string): Promise<TournamentEntry> {
    const tData = await dbRepository.getTournament(tournamentId);
    if (!tData) throw new Error(`Tournament ${tournamentId} not found`);
    if (tData.tournament.status !== "open" && tData.tournament.status !== "in_progress") {
      throw new Error(`Tournament ${tournamentId} is not accepting registrations (status: ${tData.tournament.status})`);
    }

    const alreadyJoined = tData.entries.some((e) => e.userId === userId);
    if (alreadyJoined) throw new Error(`User ${userId} has already joined this tournament`);

    const entryFee = Number(tData.tournament.entryFee);

    // If entry fee > 0, lock fee in escrow
    if (entryFee > 0) {
      await this.writeLedger([
        {
          userId,
          accountType: "available",
          entryType: "entry_fee_lock",
          amount: `-${entryFee.toFixed(2)}`,
          referenceType: "tournament",
          referenceId: tournamentId,
        },
        {
          userId,
          accountType: "escrow",
          entryType: "entry_fee_lock",
          amount: entryFee.toFixed(2),
          referenceType: "tournament",
          referenceId: tournamentId,
        },
      ]);
    }

    const entry: TournamentEntry = {
      id: crypto.randomUUID(),
      tournamentId,
      userId,
      feePaid: entryFee.toFixed(2),
      joinedAt: new Date(),
    };

    await dbRepository.createTournamentEntry(entry);
    return entry;
  },

  async disburseTournament(
    tournamentId: string,
    placements: { placement: number; userId: string }[]
  ): Promise<Tournament> {
    const tData = await dbRepository.getTournament(tournamentId);
    if (!tData) throw new Error(`Tournament ${tournamentId} not found`);
    if (tData.tournament.status === "completed" || tData.tournament.status === "cancelled") {
      throw new Error(`Tournament ${tournamentId} is already ${tData.tournament.status}`);
    }

    const { tournament, prizes, entries } = tData;
    const organizerId = tournament.organizerId;
    const postings: LedgerEntryInput[] = [];

    // 1. Disburse prizes to winners according to placements
    for (const p of placements) {
      const prizeConfig = prizes.find((prz) => prz.placement === p.placement);
      if (!prizeConfig) continue;

      const prizeAmount = Number(prizeConfig.amount);
      if (prizeAmount > 0) {
        postings.push(
          {
            userId: organizerId,
            accountType: "escrow",
            entryType: "prize_disbursement",
            amount: `-${prizeAmount.toFixed(2)}`,
            referenceType: "tournament",
            referenceId: tournamentId,
          },
          {
            userId: p.userId,
            accountType: "available",
            entryType: "prize_disbursement",
            amount: prizeAmount.toFixed(2),
            referenceType: "tournament",
            referenceId: tournamentId,
          }
        );
      }

      // Record final placement in entry row
      const entry = entries.find((e) => e.userId === p.userId);
      if (entry) {
        await dbRepository.updateTournamentEntryPlacement(entry.id, p.placement);
      }
    }

    // 2. Release accumulated entry fees to the organizer
    let totalEntryFees = 0;
    for (const e of entries) {
      const fee = Number(e.feePaid);
      if (fee > 0) {
        totalEntryFees += fee;
        postings.push({
          userId: e.userId,
          accountType: "escrow",
          entryType: "entry_fee_release",
          amount: `-${fee.toFixed(2)}`,
          referenceType: "tournament",
          referenceId: tournamentId,
        });
      }
    }

    if (totalEntryFees > 0) {
      postings.push({
        userId: organizerId,
        accountType: "available",
        entryType: "entry_fee_release",
        amount: totalEntryFees.toFixed(2),
        referenceType: "tournament",
        referenceId: tournamentId,
      });
    }

    if (postings.length > 0) {
      await this.writeLedger(postings);
    }

    const updated = await dbRepository.updateTournament(tournamentId, {
      status: "completed",
      completedAt: new Date(),
    });

    return updated!;
  },

  async cancelTournament(tournamentId: string): Promise<Tournament> {
    const tData = await dbRepository.getTournament(tournamentId);
    if (!tData) throw new Error(`Tournament ${tournamentId} not found`);
    if (tData.tournament.status === "completed" || tData.tournament.status === "cancelled") {
      throw new Error(`Tournament ${tournamentId} is already ${tData.tournament.status}`);
    }

    const { tournament, entries } = tData;
    const organizerId = tournament.organizerId;
    const totalPrizePool = Number(tournament.totalPrizePool);
    const postings: LedgerEntryInput[] = [];

    // 1. Refund prize pool back to organizer
    postings.push(
      {
        userId: organizerId,
        accountType: "escrow",
        entryType: "prize_pool_refund",
        amount: `-${totalPrizePool.toFixed(2)}`,
        referenceType: "tournament",
        referenceId: tournamentId,
      },
      {
        userId: organizerId,
        accountType: "available",
        entryType: "prize_pool_refund",
        amount: totalPrizePool.toFixed(2),
        referenceType: "tournament",
        referenceId: tournamentId,
      }
    );

    // 2. Refund entry fees to all entrants
    for (const e of entries) {
      const fee = Number(e.feePaid);
      if (fee > 0) {
        postings.push(
          {
            userId: e.userId,
            accountType: "escrow",
            entryType: "entry_fee_refund",
            amount: `-${fee.toFixed(2)}`,
            referenceType: "tournament",
            referenceId: tournamentId,
          },
          {
            userId: e.userId,
            accountType: "available",
            entryType: "entry_fee_refund",
            amount: fee.toFixed(2),
            referenceType: "tournament",
            referenceId: tournamentId,
          }
        );
      }
    }

    await this.writeLedger(postings);

    const updated = await dbRepository.updateTournament(tournamentId, {
      status: "cancelled",
      completedAt: new Date(),
    });

    return updated!;
  },
};
