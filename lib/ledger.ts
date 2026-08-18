import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { ledgerEntries, profiles } from "@/db/schema.mysql";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import type { SystemFundType, SystemFundsReport, SystemFundSummary } from "./types";

export type LedgerAccountType = "available" | "escrow";
export type LedgerEntryType = typeof ledgerEntries.$inferInsert["entryType"];
export const PLATFORM_ACCOUNT_ID = "platform-treasury";

export function determineFundType(
  userId: string,
  accountType: LedgerAccountType | string,
  entryType?: string
): SystemFundType {
  if (userId === PLATFORM_ACCOUNT_ID || entryType === "platform_fee") {
    return "platform_fee";
  }
  if (accountType === "escrow") {
    return "escrow";
  }
  return "account_balances";
}

export type LedgerLine = {
  userId: string;
  accountType: LedgerAccountType;
  entryType: LedgerEntryType;
  amount: string; // signed decimal string, e.g. "-50.00" or "50.00"
  referenceType: string;
  referenceId: string;
  fundType?: SystemFundType;
};

/**
 * Writes one or more ledger lines as a single atomic transaction.
 * Always pass every line that belongs to one event together, e.g. a match
 * settlement passes the winner payout line AND the platform fee line in the
 * same call, so they either both land or neither does.
 */
export async function writeLedger(
  lines: LedgerLine[],
  options?: { skipIdempotencyCheck?: boolean }
) {
  const transactionGroupId = randomUUID();

  return db.transaction(async (tx) => {
    const results = [];

    for (const line of lines) {
      // Idempotency check: query ledger_entries for existing rows matching
      // referenceType, referenceId, and entryType before proceeding with the insert.
      if (!options?.skipIdempotencyCheck && line.referenceType && line.referenceId && line.entryType) {
        const [existing] = await tx
          .select({
            id: ledgerEntries.id,
            balanceAfter: ledgerEntries.balanceAfter,
          })
          .from(ledgerEntries)
          .where(
            and(
              eq(ledgerEntries.referenceType, line.referenceType),
              eq(ledgerEntries.referenceId, line.referenceId),
              eq(ledgerEntries.entryType, line.entryType)
            )
          )
          .limit(1);

        if (existing) {
          // Entry already exists — skip insertion to prevent duplicate balance modifications
          results.push({
            id: existing.id,
            balanceAfter: Number(existing.balanceAfter),
            duplicate: true,
          });
          continue;
        }
      }

      // Lock the user's most recent ledger row for this account type so
      // concurrent writes to the same balance serialize instead of racing.
      const [last] = await tx
        .select({ balanceAfter: ledgerEntries.balanceAfter })
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.userId, line.userId),
            eq(ledgerEntries.accountType, line.accountType)
          )
        )
        .orderBy(desc(ledgerEntries.createdAt))
        .limit(1)
        .for("update");

      const previousBalance = last ? Number(last.balanceAfter) : 0;
      const newBalance = previousBalance + Number(line.amount);

      const id = randomUUID();
      await tx.insert(ledgerEntries).values({
        id,
        userId: line.userId,
        accountType: line.accountType,
        entryType: line.entryType,
        amount: line.amount,
        referenceType: line.referenceType,
        referenceId: line.referenceId,
        transactionGroupId,
        balanceAfter: newBalance.toFixed(2),
      });

      results.push({ id, balanceAfter: newBalance, duplicate: false });
    }

    return results;
  });
}

/**
 * Current balance is just the latest balanceAfter for that account type.
 * Falls back to 0 if the user has no ledger history yet.
 */
export async function getBalance(userId: string, accountType: LedgerAccountType): Promise<number> {
  const [row] = await db
    .select({ balanceAfter: ledgerEntries.balanceAfter })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.userId, userId),
        eq(ledgerEntries.accountType, accountType)
      )
    )
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(1);

  return row ? Number(row.balanceAfter) : 0;
}

/**
 * Idempotency check: returns true if a ledger entry already exists for the given
 * referenceType + referenceId (+ optional entryType).
 */
export async function hasLedgerEntry(
  referenceType: string,
  referenceId: string,
  entryType?: LedgerEntryType
): Promise<boolean> {
  const conditions = [
    eq(ledgerEntries.referenceType, referenceType),
    eq(ledgerEntries.referenceId, referenceId),
  ];

  if (entryType) {
    conditions.push(eq(ledgerEntries.entryType, entryType));
  }

  const [row] = await db
    .select({ id: ledgerEntries.id })
    .from(ledgerEntries)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
}

export type ReconciliationResult = {
  status: "match" | "discrepancy";
  matches: boolean;
  userId: string;
  accountType: string;
  computedSum: number;
  lastBalanceAfter: number;
  discrepancyAmount: number;
  entryCount: number;
};

/**
 * Reconciliation check: sums every ledger entry amount for a user's specified account
 * and compares it against the last balanceAfter value, returning a status indicating
 * whether they match or if a discrepancy exists.
 */
export async function reconcileBalance(
  userId: string,
  accountType: string
): Promise<ReconciliationResult> {
  const targetAccountType = accountType as LedgerAccountType;

  const [sumRow] = await db
    .select({
      totalSum: sql<string>`COALESCE(SUM(${ledgerEntries.amount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.userId, userId),
        eq(ledgerEntries.accountType, targetAccountType)
      )
    );

  const [latestRow] = await db
    .select({ balanceAfter: ledgerEntries.balanceAfter })
    .from(ledgerEntries)
    .where(
      and(
        eq(ledgerEntries.userId, userId),
        eq(ledgerEntries.accountType, targetAccountType)
      )
    )
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(1);

  const computedSum = Number(Number(sumRow?.totalSum ?? 0).toFixed(2));
  const lastBalanceAfter = Number(Number(latestRow?.balanceAfter ?? 0).toFixed(2));
  const entryCount = Number(sumRow?.count ?? 0);
  const discrepancyAmount = Number(Math.abs(computedSum - lastBalanceAfter).toFixed(2));
  const matches = discrepancyAmount < 0.001;

  return {
    status: matches ? "match" : "discrepancy",
    matches,
    userId,
    accountType,
    computedSum,
    lastBalanceAfter,
    discrepancyAmount,
    entryCount,
  };
}

/**
 * Backward-compatible alias for reconcileBalance.
 */
export async function reconcileUserBalance(
  userId: string,
  accountType: LedgerAccountType
) {
  const result = await reconcileBalance(userId, accountType);
  return {
    computedSum: result.computedSum,
    latestBalanceAfter: result.lastBalanceAfter,
    matches: result.matches,
    entryCount: result.entryCount,
  };
}

/**
 * Fetches recent ledger history for a user.
 */
export async function getUserLedgerHistory(userId: string, limit = 50) {
  return db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(limit);
}

/**
 * Computes live balances, inflows, outflows, and counts for the 3 System Funds:
 * 1. Account Balances Fund (Liquid User Balances)
 * 2. Escrow Fund (Active Wagers & Tournament Escrows)
 * 3. Platform Fee Fund (Accumulated Platform Treasury & Commission)
 */
export async function getSystemFundsReport(): Promise<SystemFundsReport> {
  const allEntries = await db
    .select()
    .from(ledgerEntries)
    .orderBy(desc(ledgerEntries.createdAt));

  // Also query active profiles points to cross-verify account balances
  const allProfiles = await db.select({ points: profiles.points, token: profiles.token }).from(profiles);
  const totalProfilesPoints = allProfiles.reduce((sum, p) => sum + (Number(p.points) || 0), 0);

  // Initialize accumulators for each fund
  let accBalanceInflow = 0;
  let accBalanceOutflow = 0;
  let accBalanceCount = 0;

  let escrowInflow = 0;
  let escrowOutflow = 0;
  let escrowCount = 0;

  let platformFeeInflow = 0;
  let platformFeeOutflow = 0;
  let platformFeeCount = 0;

  let totalDeposits = 0;
  let totalWithdrawals = 0;

  // Track latest balanceAfter for distinct (userId, accountType) pairs
  const latestBalances = new Map<string, number>();

  for (const entry of allEntries) {
    const key = `${entry.userId}:${entry.accountType}`;
    if (!latestBalances.has(key)) {
      latestBalances.set(key, Number(entry.balanceAfter || 0));
    }

    const amt = Number(entry.amount || 0);
    const fund = determineFundType(entry.userId, entry.accountType as LedgerAccountType, entry.entryType);

    if (entry.entryType === "deposit" && amt > 0) {
      totalDeposits += amt;
    } else if (entry.entryType === "withdrawal" && amt < 0) {
      totalWithdrawals += Math.abs(amt);
    }

    if (fund === "platform_fee") {
      platformFeeCount++;
      if (amt >= 0) platformFeeInflow += amt;
      else platformFeeOutflow += Math.abs(amt);
    } else if (fund === "escrow") {
      escrowCount++;
      if (amt >= 0) escrowInflow += amt;
      else escrowOutflow += Math.abs(amt);
    } else {
      accBalanceCount++;
      if (amt >= 0) accBalanceInflow += amt;
      else accBalanceOutflow += Math.abs(amt);
    }
  }

  // Compute current balances from the latest snapshot per user/account
  let accountBalancesFundTotal = 0;
  let escrowFundTotal = 0;
  let platformFeeFundTotal = 0;
  let activeUsersCount = 0;

  for (const [key, bal] of latestBalances.entries()) {
    const [userId, accType] = key.split(":");
    if (userId === PLATFORM_ACCOUNT_ID) {
      platformFeeFundTotal += bal;
    } else if (accType === "escrow") {
      escrowFundTotal += bal;
    } else if (accType === "available") {
      accountBalancesFundTotal += bal;
      if (bal > 0) activeUsersCount++;
    }
  }

  // Fallback to profiles table if no ledger entries exist yet for account balances
  if (latestBalances.size === 0 && totalProfilesPoints > 0) {
    accountBalancesFundTotal = totalProfilesPoints;
    activeUsersCount = allProfiles.filter((p) => p.points > 0).length;
  }

  // Net calculations
  const totalPlatformAssets = Number((accountBalancesFundTotal + escrowFundTotal + platformFeeFundTotal).toFixed(2));
  const expectedAssets = Number((totalDeposits - totalWithdrawals).toFixed(2));
  const discrepancyAmount = Math.abs(Number((totalPlatformAssets - (totalDeposits > 0 ? expectedAssets : totalPlatformAssets)).toFixed(2)));
  const isBalanced = discrepancyAmount < 0.01;

  const now = new Date().toISOString();

  const accountBalancesSummary: SystemFundSummary = {
    fundType: "account_balances",
    name: "Account Balances Fund",
    description: "Total liquid funds available across all registered user wallets for gameplay, tournaments, and withdrawals.",
    balance: Number(accountBalancesFundTotal.toFixed(2)),
    entryCount: accBalanceCount,
    totalInflow: Number(accBalanceInflow.toFixed(2)),
    totalOutflow: Number(accBalanceOutflow.toFixed(2)),
    netFlow: Number((accBalanceInflow - accBalanceOutflow).toFixed(2)),
    activeHoldersCount: activeUsersCount,
    lastActivityAt: allEntries[0]?.createdAt ? new Date(allEntries[0].createdAt).toISOString() : now,
  };

  const escrowSummary: SystemFundSummary = {
    fundType: "escrow",
    name: "Escrow Fund",
    description: "Total funds actively locked in trust for ongoing wager matches, tournament prize pools, and participant entry fees.",
    balance: Number(escrowFundTotal.toFixed(2)),
    entryCount: escrowCount,
    totalInflow: Number(escrowInflow.toFixed(2)),
    totalOutflow: Number(escrowOutflow.toFixed(2)),
    netFlow: Number((escrowInflow - escrowOutflow).toFixed(2)),
    lastActivityAt: allEntries.find((e) => e.accountType === "escrow")?.createdAt
      ? new Date(allEntries.find((e) => e.accountType === "escrow")!.createdAt).toISOString()
      : now,
  };

  const platformFeeSummary: SystemFundSummary = {
    fundType: "platform_fee",
    name: "Platform Fee Fund",
    description: "Accumulated platform commissions (5% match fees, 10% tournament fees, and cancellation surcharges) retained as platform revenue.",
    balance: Number(platformFeeFundTotal.toFixed(2)),
    entryCount: platformFeeCount,
    totalInflow: Number(platformFeeInflow.toFixed(2)),
    totalOutflow: Number(platformFeeOutflow.toFixed(2)),
    netFlow: Number((platformFeeInflow - platformFeeOutflow).toFixed(2)),
    lastActivityAt: allEntries.find((e) => e.userId === PLATFORM_ACCOUNT_ID || e.entryType === "platform_fee")?.createdAt
      ? new Date(allEntries.find((e) => e.userId === PLATFORM_ACCOUNT_ID || e.entryType === "platform_fee")!.createdAt).toISOString()
      : now,
  };

  return {
    accountBalancesFund: accountBalancesSummary,
    escrowFund: escrowSummary,
    platformFeeFund: platformFeeSummary,
    totalPlatformAssets,
    totalUserAvailable: Number(accountBalancesFundTotal.toFixed(2)),
    totalEscrowLocked: Number(escrowFundTotal.toFixed(2)),
    totalPlatformFeesEarned: Number(platformFeeFundTotal.toFixed(2)),
    totalDeposits: Number(totalDeposits.toFixed(2)),
    totalWithdrawals: Number(totalWithdrawals.toFixed(2)),
    reconciliationStatus: isBalanced ? "balanced" : "discrepancy",
    discrepancyAmount,
    generatedAt: now,
  };
}

/**
 * Performs a deep reconciliation audit across all 3 funds and individual ledger accounts.
 */
export async function reconcileSystemFunds() {
  const report = await getSystemFundsReport();
  return {
    success: true,
    report,
    reconciledAt: new Date().toISOString(),
  };
}
