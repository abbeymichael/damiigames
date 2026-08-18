import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { ledgerEntries } from "@/db/schema.mysql";
import { and, desc, eq, sql } from "drizzle-orm";

export type LedgerAccountType = "available" | "escrow";
export type LedgerEntryType = typeof ledgerEntries.$inferInsert["entryType"];

export type LedgerLine = {
  userId: string;
  accountType: LedgerAccountType;
  entryType: LedgerEntryType;
  amount: string; // signed decimal string, e.g. "-50.00" or "50.00"
  referenceType: string;
  referenceId: string;
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
