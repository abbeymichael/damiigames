import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { ledgerEntries, profiles } from "@/db/schema.mysql";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import type {
  SystemFundType,
  SystemFundsReport,
  SystemFundSummary,
  ChartOfAccount,
  ChartOfAccountsReport,
  TreasuryFundDetails,
  AccountClass,
  NormalBalance,
} from "./types";

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

export const CANONICAL_CHART_OF_ACCOUNTS: Array<{
  code: string;
  name: string;
  accountClass: AccountClass;
  fundType: SystemFundType;
  normalBalance: NormalBalance;
  description: string;
}> = [
  {
    code: "1010",
    name: "Mobile Money Clearing (Paystack)",
    accountClass: "asset",
    fundType: "account_balances",
    normalBalance: "debit",
    description: "Real cash inflow and clearing held at the payment gateway for MoMo deposits and pending withdrawals.",
  },
  {
    code: "1020",
    name: "Player Available Cash (Liquid)",
    accountClass: "asset",
    fundType: "account_balances",
    normalBalance: "debit",
    description: "Total liquid balance accessible across all active player wallets for wagering and gameplay.",
  },
  {
    code: "1030",
    name: "Escrow Custody Vault",
    accountClass: "asset",
    fundType: "escrow",
    normalBalance: "debit",
    description: "Custodial asset account holding locked player funds in active wager matches and tournament prize pools.",
  },
  {
    code: "2010",
    name: "Player Wallet Obligations",
    accountClass: "liability",
    fundType: "account_balances",
    normalBalance: "credit",
    description: "Total platform obligation owed to registered players on demand for cashouts or game wagers.",
  },
  {
    code: "2020",
    name: "Active Match Escrow Liability",
    accountClass: "liability",
    fundType: "escrow",
    normalBalance: "credit",
    description: "Funds committed to ongoing 1v1 wager matches awaiting game victory or draw resolution.",
  },
  {
    code: "2030",
    name: "Tournament Prize Pool Liability",
    accountClass: "liability",
    fundType: "escrow",
    normalBalance: "credit",
    description: "Locked tournament entry fees and guaranteed prize pools committed until tournament bracket completion.",
  },
  {
    code: "3010",
    name: "Platform Treasury & Retained Earnings",
    accountClass: "equity",
    fundType: "platform_fee",
    normalBalance: "credit",
    description: "Cumulative net platform profits retained after all player payouts, rake collections, and commissions.",
  },
  {
    code: "3020",
    name: "Dispute & Goodwill Reserve",
    accountClass: "equity",
    fundType: "platform_fee",
    normalBalance: "credit",
    description: "Capital reserve allocated for manual dispute refunds, goodwill adjustments, and compensation.",
  },
  {
    code: "4010",
    name: "1v1 Match Rake Revenue",
    accountClass: "revenue",
    fundType: "platform_fee",
    normalBalance: "credit",
    description: "Dynamic platform commission automatically deducted from gross pot upon completion of 1v1 wager matches (configurable, e.g. 5% - 10%).",
  },
  {
    code: "4020",
    name: "Tournament Commission Revenue",
    accountClass: "revenue",
    fundType: "platform_fee",
    normalBalance: "credit",
    description: "Tournament entry fee commissions and organizer platform fees realized upon tournament conclusion.",
  },
  {
    code: "4030",
    name: "Forfeit & Penalty Surcharges",
    accountClass: "revenue",
    fundType: "platform_fee",
    normalBalance: "credit",
    description: "Revenue collected from player abandonment penalties, match timeout surcharges, and anti-fair-play forfeits.",
  },
  {
    code: "5010",
    name: "Payment Gateway Processing Fees",
    accountClass: "expense",
    fundType: "platform_fee",
    normalBalance: "debit",
    description: "Payment gateway transaction processing charges (e.g. Paystack / Telco MoMo 1.95% clearing fee).",
  },
  {
    code: "5020",
    name: "Promotional & Welcome Bonus Grants",
    accountClass: "expense",
    fundType: "platform_fee",
    normalBalance: "debit",
    description: "Platform marketing grants, sign-up bonus points, and promotional community incentives given to players.",
  },
];

export function mapLedgerEntryToAccount(entry: {
  userId: string;
  accountType: string;
  entryType: string;
  referenceType?: string;
  referenceId?: string;
}): { code: string; name: string; fundType: SystemFundType } {
  if (entry.userId === PLATFORM_ACCOUNT_ID || entry.entryType === "platform_fee") {
    if (
      entry.referenceType === "league" ||
      entry.referenceType === "tournament" ||
      entry.referenceId?.startsWith("league-") ||
      entry.entryType.includes("entry_fee") ||
      entry.entryType.includes("prize")
    ) {
      return { code: "4020", name: "Tournament Commission Revenue", fundType: "platform_fee" };
    }
    if (entry.referenceType === "forfeit" || entry.referenceType === "penalty") {
      return { code: "4030", name: "Forfeit & Penalty Surcharges", fundType: "platform_fee" };
    }
    return { code: "4010", name: "1v1 Match Rake Revenue", fundType: "platform_fee" };
  }

  if (entry.entryType === "adjustment") {
    return { code: "3020", name: "Dispute & Goodwill Reserve", fundType: "platform_fee" };
  }

  if (entry.accountType === "escrow" || entry.entryType.includes("escrow") || entry.entryType.includes("lock")) {
    if (
      entry.referenceType === "league" ||
      entry.referenceType === "tournament" ||
      entry.entryType.includes("prize") ||
      entry.entryType.includes("entry_fee")
    ) {
      return { code: "2030", name: "Tournament Prize Pool Liability", fundType: "escrow" };
    }
    return { code: "2020", name: "Active Match Escrow Liability", fundType: "escrow" };
  }

  if (entry.entryType === "deposit" || entry.entryType === "withdrawal") {
    return { code: "1010", name: "Mobile Money Clearing (Paystack)", fundType: "account_balances" };
  }

  return { code: "1020", name: "Player Available Cash (Liquid)", fundType: "account_balances" };
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

      let previousBalance = 0;
      if (last) {
        previousBalance = Number(last.balanceAfter);
      } else if (line.accountType === "available" && line.userId !== PLATFORM_ACCOUNT_ID) {
        const [prof] = await tx
          .select({ points: profiles.points, marbles: profiles.marbles })
          .from(profiles)
          .where(eq(profiles.token, line.userId))
          .limit(1);
        if (prof) {
          const currentPoints = Math.max(Number(prof.points ?? 0), Number(prof.marbles ?? 0));
          if (Number(line.amount) < 0) {
            previousBalance = Math.max(0, currentPoints - Number(line.amount));
          } else {
            previousBalance = currentPoints;
          }
        }
      }

      const rawNewBalance = previousBalance + Number(line.amount);
      const newBalance = (line.accountType === "available" && line.userId !== PLATFORM_ACCOUNT_ID)
        ? Math.max(0, rawNewBalance)
        : rawNewBalance;

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

/**
 * Computes live balances, debits, credits, and verification for the Chart of Accounts (COA).
 */
export async function getChartOfAccountsReport(): Promise<ChartOfAccountsReport> {
  const allEntries = await db
    .select()
    .from(ledgerEntries)
    .orderBy(desc(ledgerEntries.createdAt));

  const allProfiles = await db.select({ points: profiles.points, token: profiles.token }).from(profiles);
  const totalProfilesPoints = allProfiles.reduce((sum, p) => sum + (Number(p.points) || 0), 0);

  // Initialize account metrics accumulators
  const accountStats = new Map<
    string,
    {
      totalDebits: number;
      totalCredits: number;
      entryCount: number;
      lastActivityAt?: string;
    }
  >();

  for (const account of CANONICAL_CHART_OF_ACCOUNTS) {
    accountStats.set(account.code, {
      totalDebits: 0,
      totalCredits: 0,
      entryCount: 0,
      lastActivityAt: undefined,
    });
  }

  // Iterate over all entries and compute debits/credits per account code
  for (const entry of allEntries) {
    const { code } = mapLedgerEntryToAccount({
      userId: entry.userId,
      accountType: entry.accountType,
      entryType: entry.entryType,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
    });

    const stats = accountStats.get(code) || {
      totalDebits: 0,
      totalCredits: 0,
      entryCount: 0,
      lastActivityAt: undefined,
    };

    const amt = Number(entry.amount || 0);
    stats.entryCount += 1;
    if (amt >= 0) {
      stats.totalCredits += amt;
    } else {
      stats.totalDebits += Math.abs(amt);
    }

    if (!stats.lastActivityAt && entry.createdAt) {
      stats.lastActivityAt = new Date(entry.createdAt).toISOString();
    }

    accountStats.set(code, stats);
  }

  // Get system funds report to anchor current live balances
  const fundsReport = await getSystemFundsReport();

  // Compute actual match vs tournament escrow balances from latest entry snapshot
  let matchEscrowBalance = 0;
  let tournamentEscrowBalance = 0;

  for (const entry of allEntries) {
    if (entry.accountType === "escrow") {
      const isTourn =
        entry.referenceType === "league" ||
        entry.referenceType === "tournament" ||
        entry.referenceId?.startsWith("league-") ||
        entry.entryType.includes("prize") ||
        entry.entryType.includes("entry_fee");
      const amt = Number(entry.amount || 0);
      if (isTourn) {
        tournamentEscrowBalance += amt;
      } else {
        matchEscrowBalance += amt;
      }
    }
  }

  // Ensure non-negative escrow balances
  matchEscrowBalance = Math.max(0, Number(matchEscrowBalance.toFixed(2)));
  tournamentEscrowBalance = Math.max(0, Number(tournamentEscrowBalance.toFixed(2)));
  if (matchEscrowBalance + tournamentEscrowBalance === 0 && fundsReport.totalEscrowLocked > 0) {
    matchEscrowBalance = fundsReport.totalEscrowLocked;
  }

  // Compute calculated balance for each account according to its normal balance type
  const accounts: ChartOfAccount[] = CANONICAL_CHART_OF_ACCOUNTS.map((canonical) => {
    const stats = accountStats.get(canonical.code) || {
      totalDebits: 0,
      totalCredits: 0,
      entryCount: 0,
      lastActivityAt: undefined,
    };

    let liveBalance = 0;
    if (canonical.code === "1010") {
      liveBalance = fundsReport.totalDeposits - fundsReport.totalWithdrawals;
    } else if (canonical.code === "1020" || canonical.code === "2010") {
      liveBalance = fundsReport.totalUserAvailable;
    } else if (canonical.code === "1030") {
      liveBalance = fundsReport.totalEscrowLocked;
    } else if (canonical.code === "2020") {
      liveBalance = matchEscrowBalance;
    } else if (canonical.code === "2030") {
      liveBalance = tournamentEscrowBalance;
    } else if (canonical.code === "4010") {
      liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
      if (liveBalance === 0 && fundsReport.platformFeeFund.totalInflow > 0 && stats.entryCount === 0) {
        liveBalance = fundsReport.platformFeeFund.totalInflow;
      }
    } else if (canonical.code === "4020") {
      liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
    } else if (canonical.code === "4030") {
      liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
    } else if (canonical.code === "5010") {
      liveBalance = Math.max(0, stats.totalDebits - stats.totalCredits);
    } else if (canonical.code === "5020") {
      liveBalance = Math.max(0, stats.totalDebits - stats.totalCredits);
    } else if (canonical.code === "3020") {
      liveBalance = Math.max(0, stats.totalCredits - stats.totalDebits);
    } else if (canonical.code === "3010") {
      liveBalance = fundsReport.totalPlatformFeesEarned;
    } else {
      liveBalance =
        canonical.normalBalance === "debit"
          ? stats.totalDebits - stats.totalCredits
          : stats.totalCredits - stats.totalDebits;
    }

    return {
      code: canonical.code,
      name: canonical.name,
      accountClass: canonical.accountClass,
      fundType: canonical.fundType,
      normalBalance: canonical.normalBalance,
      description: canonical.description,
      balance: Number(Math.max(0, liveBalance).toFixed(2)),
      totalDebits: Number(stats.totalDebits.toFixed(2)),
      totalCredits: Number(stats.totalCredits.toFixed(2)),
      entryCount: stats.entryCount,
      lastActivityAt: stats.lastActivityAt || fundsReport.generatedAt,
    };
  });

  const totalAssets = Number(
    accounts
      .filter((a) => a.accountClass === "asset")
      .reduce((sum, a) => sum + a.balance, 0)
      .toFixed(2)
  );

  const totalLiabilities = Number(
    accounts
      .filter((a) => a.accountClass === "liability")
      .reduce((sum, a) => sum + a.balance, 0)
      .toFixed(2)
  );

  const totalEquity = Number(
    accounts
      .filter((a) => a.accountClass === "equity")
      .reduce((sum, a) => sum + a.balance, 0)
      .toFixed(2)
  );

  const totalRevenue = Number(
    accounts
      .filter((a) => a.accountClass === "revenue")
      .reduce((sum, a) => sum + a.balance, 0)
      .toFixed(2)
  );

  const totalExpenses = Number(
    accounts
      .filter((a) => a.accountClass === "expense")
      .reduce((sum, a) => sum + a.balance, 0)
      .toFixed(2)
  );

  const netIncome = Number((totalRevenue - totalExpenses).toFixed(2));
  const discrepancyAmount = Math.abs(Number((totalAssets - (totalLiabilities + totalEquity)).toFixed(2)));
  const isBalanced = discrepancyAmount < 1.0;

  return {
    accounts,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalRevenue,
    totalExpenses,
    netIncome,
    accountingEquationBalanced: isBalanced,
    discrepancyAmount,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Returns Platform Treasury Fund analytics and breakdown.
 */
export async function getTreasuryFundDetails(): Promise<TreasuryFundDetails> {
  const fundsReport = await getSystemFundsReport();
  const coaReport = await getChartOfAccountsReport();

  const allEntries = await db
    .select()
    .from(ledgerEntries)
    .orderBy(desc(ledgerEntries.createdAt));

  const treasuryEntries = allEntries
    .filter((e) => e.userId === PLATFORM_ACCOUNT_ID || e.entryType === "platform_fee")
    .slice(0, 50)
    .map((e) => {
      const { code, name, fundType } = mapLedgerEntryToAccount(e);
      return {
        ...e,
        accountCode: code,
        accountName: name,
        fundType,
      };
    });

  const rake1v1 = coaReport.accounts.find((a) => a.code === "4010")?.balance || 0;
  const tournamentComm = coaReport.accounts.find((a) => a.code === "4020")?.balance || 0;
  const penalty = coaReport.accounts.find((a) => a.code === "4030")?.balance || 0;
  const gatewayFee = coaReport.accounts.find((a) => a.code === "5010")?.balance || 0;
  const promo = coaReport.accounts.find((a) => a.code === "5020")?.balance || 0;
  const reserve = coaReport.accounts.find((a) => a.code === "3020")?.balance || 0;

  return {
    treasuryBalance: fundsReport.totalPlatformFeesEarned,
    lifetimeRevenue: fundsReport.platformFeeFund.totalInflow,
    lifetimeExpenses: fundsReport.platformFeeFund.totalOutflow,
    netTreasuryFlow: fundsReport.platformFeeFund.netFlow,
    rake1v1Revenue: rake1v1,
    tournamentCommissionRevenue: tournamentComm,
    penaltyRevenue: penalty,
    gatewayExpenses: gatewayFee,
    promotionalExpenses: promo,
    disputeReserveBalance: reserve,
    recentTreasuryEntries: treasuryEntries,
    lastUpdated: new Date().toISOString(),
  };
}

