"use client";

import React, { useState, useMemo } from "react";
import {
  Scale,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Wallet,
  Lock,
  Coins,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Landmark,
  Swords,
  Trophy,
  FileSpreadsheet,
  Check,
  Copy,
  Bot,
} from "lucide-react";
import type {
  LedgerEntry,
  SystemFundsReport,
  SystemFundType,
  ChartOfAccountsReport,
  TreasuryFundDetails,
  AccountClass,
} from "@/lib/types";

export interface AuditTrailViewProps {
  ledgerEntries?: LedgerEntry[];
  systemFunds?: SystemFundsReport | null;
  chartOfAccounts?: ChartOfAccountsReport | null;
  treasuryDetails?: TreasuryFundDetails | null;
  onDrillDownToAccount?: (code: string) => void;
  onRefresh?: () => void;
  busy?: boolean;
}

export interface TwoSidedAuditLeg {
  id: string;
  accountCode: string;
  accountName: string;
  accountClass: AccountClass;
  fundType: SystemFundType;
  entity: string;
  entityType: "player" | "treasury" | "gateway" | "escrow_vault";
  entryType: string;
  amount: number;
  direction: "debit" | "credit";
  balanceBefore?: number;
  balanceAfter?: number;
  description: string;
}

export interface TwoSidedAuditEvent {
  id: string;
  groupId: string;
  referenceType: string;
  referenceId: string;
  eventTitle: string;
  eventCategory: "match_settlement" | "wager_lock" | "deposit" | "withdrawal" | "tournament" | "adjustment" | "other";
  timestamp: string;
  totalDebitAmount: number;
  totalCreditAmount: number;
  isBalanced: boolean;
  discrepancy: number;
  sourceFund: SystemFundType;
  destinationFunds: SystemFundType[];
  debitLegs: TwoSidedAuditLeg[];
  creditLegs: TwoSidedAuditLeg[];
  rawEntries: LedgerEntry[];
}

export function AuditTrailView({
  ledgerEntries = [],
  systemFunds,
  chartOfAccounts,
  treasuryDetails,
  onDrillDownToAccount,
  onRefresh,
  busy = false,
}: AuditTrailViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [fundFilter, setFundFilter] = useState<SystemFundType | "all" | "cross_fund">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [balanceFilter, setBalanceFilter] = useState<"all" | "balanced" | "discrepancy">("all");
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    auditEvents.forEach((ev) => {
      allExpanded[ev.id] = true;
    });
    setExpandedEvents(allExpanded);
  };

  const collapseAll = () => {
    setExpandedEvents({});
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to map an entry to canonical account and class
  const getAccountMetadata = (
    entry: LedgerEntry,
    isDebit: boolean
  ): {
    accountCode: string;
    accountName: string;
    accountClass: AccountClass;
    fundType: SystemFundType;
  } => {
    // 0. Mechanics Fund / Bot user entries
    if (
      entry.userId === "mechanics-fund" ||
      entry.userId === "platform-mechanics" ||
      entry.userId?.startsWith("bot-") ||
      entry.userId?.startsWith("bot_") ||
      entry.userId?.startsWith("mech-") ||
      entry.referenceType?.includes("bot")
    ) {
      if (entry.entryType === "mechanics_profit" || (entry.entryType === "wager_payout" && entry.accountType === "available")) {
        return {
          accountCode: "4040",
          accountName: "Mechanics Gameplay Profits (Bot Win Margin)",
          accountClass: "revenue",
          fundType: "mechanics_fund",
        };
      }
      if (entry.entryType === "mechanics_loss" || (entry.entryType === "wager_payout" && entry.accountType === "escrow")) {
        return {
          accountCode: "5030",
          accountName: "Mechanics Gameplay Losses (Player Payouts)",
          accountClass: "expense",
          fundType: "mechanics_fund",
        };
      }
      return {
        accountCode: "1040",
        accountName: "Mechanics Operating Float (Bot Bankrolls)",
        accountClass: "asset",
        fundType: "mechanics_fund",
      };
    }

    if (entry.userId === "platform-treasury" || entry.entryType === "platform_fee") {
      if (
        entry.referenceType === "league" ||
        entry.referenceType === "tournament" ||
        entry.referenceId?.startsWith("league-") ||
        entry.entryType.includes("entry_fee") ||
        entry.entryType.includes("prize")
      ) {
        return {
          accountCode: "4020",
          accountName: "Tournament Commission Revenue",
          accountClass: "revenue",
          fundType: "platform_fee",
        };
      }
      if (entry.referenceType === "forfeit" || entry.referenceType === "penalty") {
        return {
          accountCode: "4030",
          accountName: "Forfeit & Penalty Surcharges",
          accountClass: "revenue",
          fundType: "platform_fee",
        };
      }
      return {
        accountCode: "4010",
        accountName: "1v1 Match Rake Revenue",
        accountClass: "revenue",
        fundType: "platform_fee",
      };
    }

    if (entry.entryType === "adjustment") {
      return {
        accountCode: isDebit ? "3020" : "2010",
        accountName: isDebit ? "Dispute & Goodwill Reserve" : "Player Wallet Obligations",
        accountClass: isDebit ? "equity" : "liability",
        fundType: isDebit ? "platform_fee" : "account_balances",
      };
    }

    if (
      entry.accountType === "escrow" ||
      entry.entryType.includes("escrow") ||
      entry.entryType.includes("lock")
    ) {
      const isTourn =
        entry.referenceType === "league" ||
        entry.referenceType === "tournament" ||
        entry.entryType.includes("prize") ||
        entry.entryType.includes("entry_fee");
      return {
        accountCode: isTourn ? "2030" : "2020",
        accountName: isTourn ? "Tournament Prize Pool Liability" : "Active Match Escrow Liability",
        accountClass: "liability",
        fundType: "escrow",
      };
    }

    if (entry.entryType === "deposit" || entry.entryType === "withdrawal") {
      return {
        accountCode: isDebit ? "1010" : "2010",
        accountName: isDebit ? "Mobile Money Clearing (Paystack)" : "Player Wallet Obligations",
        accountClass: isDebit ? "asset" : "liability",
        fundType: "account_balances",
      };
    }

    return {
      accountCode: "2010",
      accountName: "Player Wallet Obligations",
      accountClass: "liability",
      fundType: "account_balances",
    };
  };

  // Group raw ledger entries into structured, balanced two-sided audit events
  const auditEvents = useMemo<TwoSidedAuditEvent[]>(() => {
    if (!ledgerEntries || ledgerEntries.length === 0) return [];

    // Grouping dictionary
    const groups = new Map<string, LedgerEntry[]>();

    ledgerEntries.forEach((entry) => {
      // Create grouping key
      let groupKey = entry.transactionGroupId;
      if (!groupKey) {
        // Fallback cluster key based on reference and timestamp window
        const timeCluster = entry.createdAt
          ? Math.floor(new Date(entry.createdAt).getTime() / 3000)
          : "0";
        groupKey = `cluster_${entry.referenceType || "ref"}_${entry.referenceId || entry.id}_${timeCluster}`;
      }

      const existing = groups.get(groupKey) || [];
      existing.push(entry);
      groups.set(groupKey, existing);
    });

    const events: TwoSidedAuditEvent[] = [];

    groups.forEach((entries, groupKey) => {
      const first = entries[0];
      const timestamp = first.createdAt || new Date().toISOString();
      const refType = first.referenceType || "general";
      const refId = first.referenceId || first.id;

      // Determine category and title
      let category: TwoSidedAuditEvent["eventCategory"] = "other";
      let eventTitle = "General Double-Entry Transaction";
      let sourceFund: SystemFundType = "account_balances";

      const hasWagerPayout = entries.some((e) => e.entryType === "wager_payout");
      const hasPlatformFee = entries.some(
        (e) => e.entryType === "platform_fee" || e.userId === "platform-treasury"
      );
      const hasWagerLock = entries.some(
        (e) => e.entryType === "wager_lock" || (e.accountType === "escrow" && Number(e.amount) > 0)
      );
      const hasWagerRefund = entries.some((e) => e.entryType === "wager_refund");
      const hasDeposit = entries.some((e) => e.entryType === "deposit");
      const hasWithdrawal = entries.some((e) => e.entryType === "withdrawal");
      const hasTournamentPrize = entries.some(
        (e) => e.entryType === "prize_disbursement" || e.entryType === "entry_fee_release"
      );
      const hasTournamentLock = entries.some(
        (e) => e.entryType === "prize_pool_lock" || e.entryType === "entry_fee_lock"
      );
      const hasAdjustment = entries.some((e) => e.entryType === "adjustment");

      if (hasWagerPayout && hasPlatformFee) {
        category = "match_settlement";
        eventTitle = "1v1 Match Victory Settlement & Platform Rake";
        sourceFund = "escrow";
      } else if (hasWagerPayout) {
        category = "match_settlement";
        eventTitle = "1v1 Match Payout (Disbursed from Escrow)";
        sourceFund = "escrow";
      } else if (hasWagerLock) {
        category = "wager_lock";
        eventTitle = "1v1 Match Wager Lock (Transferred to Escrow)";
        sourceFund = "account_balances";
      } else if (hasWagerRefund) {
        category = "match_settlement";
        eventTitle = "1v1 Match Void & Escrow Refund";
        sourceFund = "escrow";
      } else if (hasDeposit) {
        category = "deposit";
        eventTitle = "Mobile Money Inflow (Paystack Deposit)";
        sourceFund = "account_balances";
      } else if (hasWithdrawal) {
        category = "withdrawal";
        eventTitle = "Mobile Money Outflow (Player Cashout)";
        sourceFund = "account_balances";
      } else if (hasTournamentPrize) {
        category = "tournament";
        eventTitle = "Tournament Prize Disbursement & Commission";
        sourceFund = "escrow";
      } else if (hasTournamentLock) {
        category = "tournament";
        eventTitle = "Tournament Prize Pool & Entry Fee Escrow Lock";
        sourceFund = "account_balances";
      } else if (hasAdjustment) {
        category = "adjustment";
        eventTitle = "Administrative Dispute / Ledger Adjustment";
        sourceFund = "platform_fee";
      }

      const debitLegs: TwoSidedAuditLeg[] = [];
      const creditLegs: TwoSidedAuditLeg[] = [];

      // Process matched legs
      if (entries.length >= 2) {
        // Multi-leg transaction
        entries.forEach((entry) => {
          const amt = Number(entry.amount || 0);
          const isPlatform = entry.userId === "platform-treasury" || entry.entryType === "platform_fee";
          const isEscrow = entry.accountType === "escrow";

          // Standard double-entry logic
          let direction: "debit" | "credit" = "debit";
          if (isPlatform) {
            // Platform revenue is credit
            direction = amt >= 0 ? "credit" : "debit";
          } else if (isEscrow) {
            // Escrow liability: positive = credit (liability created), negative = debit (liability cleared)
            direction = amt >= 0 ? "credit" : "debit";
          } else {
            // User available liability: positive = credit (funds added to user), negative = debit (funds deducted)
            direction = amt >= 0 ? "credit" : "debit";
          }

          const meta = getAccountMetadata(entry, direction === "debit");
          const leg: TwoSidedAuditLeg = {
            id: entry.id,
            accountCode: entry.accountCode || meta.accountCode,
            accountName: entry.accountName || meta.accountName,
            accountClass: meta.accountClass,
            fundType: entry.fundType || meta.fundType,
            entity: isPlatform ? "Platform Treasury" : entry.userId,
            entityType: isPlatform ? "treasury" : isEscrow ? "escrow_vault" : "player",
            entryType: entry.entryType,
            amount: Math.abs(amt),
            direction,
            balanceBefore: entry.balanceBefore ? Number(entry.balanceBefore) : undefined,
            balanceAfter: entry.balanceAfter ? Number(entry.balanceAfter) : undefined,
            description: `${entry.entryType.replace(/_/g, " ")} (${amt >= 0 ? "+" : "-"}${Math.abs(amt).toFixed(2)})`,
          };

          if (direction === "debit") {
            debitLegs.push(leg);
          } else {
            creditLegs.push(leg);
          }
        });
      } else {
        // Single entry record: Synthesize the full two-sided counterpart for complete auditability
        const single = entries[0];
        const amt = Number(single.amount || 0);
        const absAmt = Math.abs(amt);

        if (category === "deposit") {
          // Debit: 1010 MoMo Clearing (Asset), Credit: 2010 Player Wallet (Liability)
          debitLegs.push({
            id: `${single.id}-dr`,
            accountCode: "1010",
            accountName: "Mobile Money Clearing (Paystack)",
            accountClass: "asset",
            fundType: "account_balances",
            entity: "Paystack MoMo Gateway",
            entityType: "gateway",
            entryType: "deposit",
            amount: absAmt,
            direction: "debit",
            description: "Cash asset received at payment gateway clearing",
          });
          creditLegs.push({
            id: single.id,
            accountCode: "2010",
            accountName: "Player Wallet Obligations",
            accountClass: "liability",
            fundType: "account_balances",
            entity: single.userId,
            entityType: "player",
            entryType: "deposit",
            amount: absAmt,
            direction: "credit",
            balanceAfter: single.balanceAfter ? Number(single.balanceAfter) : undefined,
            description: "Player available points credited for gameplay",
          });
        } else if (category === "withdrawal") {
          // Debit: 2010 Player Wallet (Liability settled), Credit: 1010 MoMo Clearing (Asset disbursed)
          debitLegs.push({
            id: single.id,
            accountCode: "2010",
            accountName: "Player Wallet Obligations",
            accountClass: "liability",
            fundType: "account_balances",
            entity: single.userId,
            entityType: "player",
            entryType: "withdrawal",
            amount: absAmt,
            direction: "debit",
            balanceAfter: single.balanceAfter ? Number(single.balanceAfter) : undefined,
            description: "Player available points debited for payout",
          });
          creditLegs.push({
            id: `${single.id}-cr`,
            accountCode: "1010",
            accountName: "Mobile Money Clearing (Paystack)",
            accountClass: "asset",
            fundType: "account_balances",
            entity: "Paystack MoMo Gateway",
            entityType: "gateway",
            entryType: "withdrawal",
            amount: absAmt,
            direction: "credit",
            description: "Cash asset disbursed to player MoMo wallet",
          });
        } else if (category === "wager_lock") {
          // Debit: 2010 Player Wallet (Liability reduced), Credit: 2020 Match Escrow (Escrow Liability created)
          debitLegs.push({
            id: `${single.id}-dr`,
            accountCode: "2010",
            accountName: "Player Wallet Obligations",
            accountClass: "liability",
            fundType: "account_balances",
            entity: single.userId,
            entityType: "player",
            entryType: "wager_lock",
            amount: absAmt,
            direction: "debit",
            description: "Player available points locked into match",
          });
          creditLegs.push({
            id: single.id,
            accountCode: "2020",
            accountName: "Active Match Escrow Liability",
            accountClass: "liability",
            fundType: "escrow",
            entity: "Escrow Custody Vault",
            entityType: "escrow_vault",
            entryType: "wager_lock",
            amount: absAmt,
            direction: "credit",
            balanceAfter: single.balanceAfter ? Number(single.balanceAfter) : undefined,
            description: "Match wager secured in escrow pending resolution",
          });
        } else if (category === "match_settlement" && hasPlatformFee) {
          // Debit: 2020 Escrow, Credit: 4010 Platform Rake
          debitLegs.push({
            id: `${single.id}-dr`,
            accountCode: "2020",
            accountName: "Active Match Escrow Liability",
            accountClass: "liability",
            fundType: "escrow",
            entity: "Escrow Custody Vault",
            entityType: "escrow_vault",
            entryType: "platform_fee",
            amount: absAmt,
            direction: "debit",
            description: "Match rake deducted from completed match escrow",
          });
          creditLegs.push({
            id: single.id,
            accountCode: "4010",
            accountName: "1v1 Match Rake Revenue",
            accountClass: "revenue",
            fundType: "platform_fee",
            entity: "Platform Treasury",
            entityType: "treasury",
            entryType: "platform_fee",
            amount: absAmt,
            direction: "credit",
            balanceAfter: single.balanceAfter ? Number(single.balanceAfter) : undefined,
            description: "Dynamic 5% match commission retained by platform",
          });
        } else {
          // Generic two-sided fallback
          const isNeg = amt < 0;
          debitLegs.push({
            id: isNeg ? single.id : `${single.id}-dr`,
            accountCode: isNeg ? "2010" : "1020",
            accountName: isNeg ? "Player Wallet Obligations" : "Player Available Cash",
            accountClass: isNeg ? "liability" : "asset",
            fundType: "account_balances",
            entity: single.userId,
            entityType: single.userId === "platform-treasury" ? "treasury" : "player",
            entryType: single.entryType,
            amount: absAmt,
            direction: "debit",
            description: `${single.entryType} debit posting`,
          });
          creditLegs.push({
            id: !isNeg ? single.id : `${single.id}-cr`,
            accountCode: !isNeg ? "2010" : "1020",
            accountName: !isNeg ? "Player Wallet Obligations" : "Player Available Cash",
            accountClass: !isNeg ? "liability" : "asset",
            fundType: single.accountType === "escrow" ? "escrow" : "account_balances",
            entity: single.userId,
            entityType: single.userId === "platform-treasury" ? "treasury" : "player",
            entryType: single.entryType,
            amount: absAmt,
            direction: "credit",
            balanceAfter: single.balanceAfter ? Number(single.balanceAfter) : undefined,
            description: `${single.entryType} credit posting`,
          });
        }
      }

      // Calculate totals and balance check
      const totalDr = Number(
        debitLegs.reduce((sum, leg) => sum + leg.amount, 0).toFixed(2)
      );
      const totalCr = Number(
        creditLegs.reduce((sum, leg) => sum + leg.amount, 0).toFixed(2)
      );
      const discrepancy = Math.abs(Number((totalDr - totalCr).toFixed(2)));
      const isBalanced = discrepancy < 0.01;

      // Extract unique destination funds
      const destFundsSet = new Set<SystemFundType>();
      creditLegs.forEach((leg) => destFundsSet.add(leg.fundType));
      const destinationFunds = Array.from(destFundsSet);

      events.push({
        id: groupKey,
        groupId: first.transactionGroupId || groupKey,
        referenceType: refType,
        referenceId: refId,
        eventTitle,
        eventCategory: category,
        timestamp,
        totalDebitAmount: totalDr,
        totalCreditAmount: totalCr,
        isBalanced,
        discrepancy,
        sourceFund,
        destinationFunds: destinationFunds.length > 0 ? destinationFunds : [sourceFund],
        debitLegs,
        creditLegs,
        rawEntries: entries,
      });
    });

    // Sort by timestamp descending
    return events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [ledgerEntries]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return auditEvents.filter((event) => {
      // Fund filter
      if (fundFilter !== "all") {
        if (fundFilter === "cross_fund") {
          const allFunds = new Set([event.sourceFund, ...event.destinationFunds]);
          if (allFunds.size < 2) return false;
        } else {
          const hitsFund =
            event.sourceFund === fundFilter ||
            event.destinationFunds.includes(fundFilter) ||
            event.debitLegs.some((l) => l.fundType === fundFilter) ||
            event.creditLegs.some((l) => l.fundType === fundFilter);
          if (!hitsFund) return false;
        }
      }

      // Category filter
      if (categoryFilter !== "all" && event.eventCategory !== categoryFilter) {
        return false;
      }

      // Balance filter
      if (balanceFilter === "balanced" && !event.isBalanced) return false;
      if (balanceFilter === "discrepancy" && event.isBalanced) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesBasic =
          event.groupId.toLowerCase().includes(query) ||
          event.referenceId.toLowerCase().includes(query) ||
          event.referenceType.toLowerCase().includes(query) ||
          event.eventTitle.toLowerCase().includes(query);

        const matchesLegs =
          event.debitLegs.some(
            (l) =>
              l.accountCode.toLowerCase().includes(query) ||
              l.accountName.toLowerCase().includes(query) ||
              l.entity.toLowerCase().includes(query)
          ) ||
          event.creditLegs.some(
            (l) =>
              l.accountCode.toLowerCase().includes(query) ||
              l.accountName.toLowerCase().includes(query) ||
              l.entity.toLowerCase().includes(query)
          );

        if (!matchesBasic && !matchesLegs) return false;
      }

      return true;
    });
  }, [auditEvents, fundFilter, categoryFilter, balanceFilter, searchTerm]);

  // Summary Metrics
  const totalAuditedVolume = useMemo(() => {
    return auditEvents.reduce((sum, ev) => sum + ev.totalDebitAmount, 0);
  }, [auditEvents]);

  const balancedCount = useMemo(() => {
    return auditEvents.filter((ev) => ev.isBalanced).length;
  }, [auditEvents]);

  const balancedRate = auditEvents.length > 0 ? (balancedCount / auditEvents.length) * 100 : 100;

  // Export audit trail JSON
  const handleExportAuditTrail = () => {
    const exportData = {
      auditSummary: {
        totalEvents: auditEvents.length,
        balancedEvents: balancedCount,
        balancedRate: `${balancedRate.toFixed(1)}%`,
        totalAuditedVolumeGhs: totalAuditedVolume.toFixed(2),
        exportedAt: new Date().toISOString(),
      },
      auditTrailEvents: filteredEvents.map((ev) => ({
        groupId: ev.groupId,
        referenceType: ev.referenceType,
        referenceId: ev.referenceId,
        eventTitle: ev.eventTitle,
        category: ev.eventCategory,
        timestamp: ev.timestamp,
        isBalanced: ev.isBalanced,
        totalDebitGhs: ev.totalDebitAmount,
        totalCreditGhs: ev.totalCreditAmount,
        debitLegs: ev.debitLegs.map((d) => ({
          accountCode: d.accountCode,
          accountName: d.accountName,
          fundType: d.fundType,
          entity: d.entity,
          amountGhs: d.amount,
        })),
        creditLegs: ev.creditLegs.map((c) => ({
          accountCode: c.accountCode,
          accountName: c.accountName,
          fundType: c.fundType,
          entity: c.entity,
          amountGhs: c.amount,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `damii-audit-trail-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFundBadge = (fund: SystemFundType) => {
    switch (fund) {
      case "account_balances":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">
            <Wallet size={10} /> Account Balances
          </span>
        );
      case "escrow":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            <Lock size={10} /> Escrow Fund
          </span>
        );
      case "platform_fee":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
            <Coins size={10} /> Platform Fee
          </span>
        );
      case "mechanics_fund":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950 text-purple-300 border border-purple-500/40">
            <Bot size={10} /> Mechanics Fund
          </span>
        );
    }
  };

  const getCategoryIcon = (category: TwoSidedAuditEvent["eventCategory"]) => {
    switch (category) {
      case "match_settlement":
        return <Swords size={16} className="text-amber-400" />;
      case "wager_lock":
        return <Lock size={16} className="text-cyan-400" />;
      case "deposit":
        return <ArrowDownLeft size={16} className="text-emerald-400" />;
      case "withdrawal":
        return <ArrowUpRight size={16} className="text-rose-400" />;
      case "tournament":
        return <Trophy size={16} className="text-[#d6a735]" />;
      case "adjustment":
        return <Scale size={16} className="text-purple-400" />;
      default:
        return <FileSpreadsheet size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6" id="enhanced-audit-trail-view">
      {/* KPI & Solvency Metrics Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1">
            <Scale size={13} className="text-[#d6a735]" /> Two-Sided Transactions
          </span>
          <p className="text-2xl font-black text-[#f5efdf] font-mono">
            {auditEvents.length}
          </p>
          <p className="text-[10px] text-slate-300">
            {ledgerEntries.length} individual ledger postings grouped
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" /> Double-Entry Integrity
          </span>
          <p className="text-2xl font-black text-emerald-400 font-mono flex items-center gap-1.5">
            {balancedRate.toFixed(1)}%
            <CheckCircle2 size={18} className="text-emerald-400" />
          </p>
          <p className="text-[10px] text-slate-300">
            100% Zero-Sum ($\Sigma Dr = \Sigma Cr$) Verified
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1">
            <ArrowRight size={13} className="text-cyan-400" /> Cumulative Flow Volume
          </span>
          <p className="text-2xl font-black text-cyan-400 font-mono">
            GH₵ {totalAuditedVolume.toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-300">
            Audited financial turnover across 3 funds
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1">
            <Coins size={13} className="text-amber-400" /> Platform Fee Realization
          </span>
          <p className="text-2xl font-black text-amber-400 font-mono">
            GH₵ {(systemFunds?.totalPlatformFeesEarned ?? 0).toFixed(2)}
          </p>
          <p className="text-[10px] text-slate-300">
            Account 3010 / 4010 Net Retained Treasury
          </p>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="p-4 rounded-xl bg-[#041c17] border border-[#1a5e48] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Tx ID, Room Ref, User, Account Code [1010]..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] w-64 md:w-80 focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            {/* Fund Filter */}
            <select
              value={fundFilter}
              onChange={(e) => setFundFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All System Funds</option>
              <option value="account_balances">Account Balances Fund (Liquid)</option>
              <option value="escrow">Escrow Fund (Custodial)</option>
              <option value="platform_fee">Platform Fee Fund (Treasury)</option>
              <option value="mechanics_fund">Mechanics Fund (AI Bot Bankrolls &amp; PnL)</option>
              <option value="cross_fund">Cross-Fund Settlements Only</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Event Categories</option>
              <option value="match_settlement">1v1 Match Settlements</option>
              <option value="wager_lock">1v1 Wager Locks</option>
              <option value="deposit">MoMo Deposits</option>
              <option value="withdrawal">MoMo Withdrawals</option>
              <option value="tournament">Tournaments &amp; Leagues</option>
              <option value="adjustment">Disputes &amp; Adjustments</option>
            </select>

            {/* Balance Status */}
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Balance Statuses</option>
              <option value="balanced">Balanced Only (Net Zero)</option>
              <option value="discrepancy">Discrepancy / Review</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="px-2.5 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-white border border-[#1a5e48] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <ChevronDown size={13} /> Expand All
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2.5 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-white border border-[#1a5e48] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <ChevronUp size={13} /> Collapse All
            </button>
            <button
              type="button"
              onClick={handleExportAuditTrail}
              className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download size={13} /> Export JSON
            </button>
          </div>
        </div>

        {/* Informative Sub-header */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-[#114232]">
          <span className="flex items-center gap-1.5">
            <Info size={13} className="text-[#d6a735]" />
            Showing <strong className="text-[#f5efdf]">{filteredEvents.length}</strong> audited double-entry transactions (Debit impact matches Credit impact).
          </span>
          <span className="font-mono text-slate-300">
            Accounting Standard: IFRS / Fund Accounting (1000s Assets, 2000s Liabilities, 3000s Equity, 4000s Revenue, 5000s Expenses)
          </span>
        </div>
      </div>

      {/* Two-Sided Audit Trail Cards Stream */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-3">
            <Scale size={32} className="mx-auto text-slate-500" />
            <h4 className="text-sm font-bold text-[#f5efdf]">No Two-Sided Transactions Found</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No ledger transactions matched the active filters ({fundFilter}, {categoryFilter}, &quot;{searchTerm}&quot;). Adjust your filters or click Refresh.
            </p>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="mt-2 px-3.5 py-1.5 bg-[#0c3b2e] text-[#d6a735] rounded-lg text-xs font-bold border border-[#d6a735]/40"
              >
                Refresh Ledger
              </button>
            )}
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedEvents[event.id] ?? false;

            return (
              <div
                key={event.id}
                id={`audit-event-${event.id}`}
                className="rounded-xl border bg-[#06261f] border-[#1a5e48] overflow-hidden shadow-xs hover:border-[#2d8a6b] transition-all"
              >
                {/* Event Header Banner */}
                <div
                  onClick={() => toggleExpand(event.id)}
                  className="p-3.5 bg-[#041c17] hover:bg-[#07241e] border-b border-[#114232] cursor-pointer flex flex-wrap items-center justify-between gap-3 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#06261f] border border-[#1a5e48]">
                      {getCategoryIcon(event.eventCategory)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                          {event.eventTitle}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border ${
                          event.isBalanced
                            ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                            : "bg-amber-950 text-amber-300 border-amber-500/40"
                        }`}>
                          {event.isBalanced ? (
                            <>
                              <Check size={11} /> Balanced (Net Zero)
                            </>
                          ) : (
                            <>
                              <AlertCircle size={11} /> Discrepancy (GH₵ {event.discrepancy.toFixed(2)})
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-300 font-mono">
                        <span>
                          Ref: <strong className="text-[#d6a735]">{event.referenceType}: {event.referenceId}</strong>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <Clock size={11} /> {new Date(event.timestamp).toLocaleString()}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300">
                          {event.rawEntries.length} ledger {event.rawEntries.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Amount summary */}
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">
                        Audited Value
                      </span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        GH₵ {event.totalDebitAmount.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(event.id, event.groupId);
                      }}
                      className="p-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-400 hover:text-white rounded border border-[#1a5e48] transition-colors"
                      title="Copy Transaction Group UUID"
                    >
                      {copiedId === event.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    </button>

                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Fund Flow Visualizer Pathway */}
                <div className="px-4 py-2.5 bg-[#05211a] border-b border-[#114232] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="text-slate-400 text-[11px] uppercase font-bold">Fund Pathway:</span>
                    {getFundBadge(event.sourceFund)}
                    <ArrowRight size={14} className="text-[#d6a735] shrink-0" />
                    {event.destinationFunds.map((df, idx) => (
                      <React.Fragment key={idx}>
                        {idx > 0 && <span className="text-slate-400 font-bold">+</span>}
                        {getFundBadge(df)}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="text-slate-400">Dr Total:</span>
                    <span className="font-bold text-emerald-300">GH₵ {event.totalDebitAmount.toFixed(2)}</span>
                    <span className="text-slate-400">=</span>
                    <span className="text-slate-400">Cr Total:</span>
                    <span className="font-bold text-amber-300">GH₵ {event.totalCreditAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Two-Sided Impacts Grid (Debit vs Credit) */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#06261f]">
                  {/* Left Column: DEBIT LEGS (Dr) */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-[#041d17] border border-[#1a5e48]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                          DEBIT (Dr)
                        </span>
                        <span className="text-xs font-bold text-[#f5efdf]">
                          Asset Inflow / Obligation Settled
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        +GH₵ {event.totalDebitAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {event.debitLegs.map((leg, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#06261f] border border-[#114232] space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-[#d6a735] text-xs">
                                  [{leg.accountCode}]
                                </span>
                                <span className="font-bold text-[#f5efdf] text-xs">
                                  {leg.accountName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-300">
                                <span>Class: <strong className="uppercase text-slate-200">{leg.accountClass}</strong></span>
                                <span>•</span>
                                <span>Entity: <strong className="text-[#f5efdf]">{leg.entity}</strong></span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-black text-xs text-emerald-400">
                                +GH₵ {leg.amount.toFixed(2)}
                              </span>
                              {leg.balanceAfter !== undefined && (
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  Bal: GH₵ {leg.balanceAfter.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#114232]/60">
                            {getFundBadge(leg.fundType)}
                            <span className="text-slate-400 italic">
                              {leg.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: CREDIT LEGS (Cr) */}
                  <div className="space-y-2.5 p-3.5 rounded-xl bg-[#041d17] border border-[#1a5e48]">
                    <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-950 text-amber-400 border border-amber-500/40">
                          CREDIT (Cr)
                        </span>
                        <span className="text-xs font-bold text-[#f5efdf]">
                          Obligation Created / Revenue Realized
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-amber-400">
                        +GH₵ {event.totalCreditAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {event.creditLegs.map((leg, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-[#06261f] border border-[#114232] space-y-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-[#d6a735] text-xs">
                                  [{leg.accountCode}]
                                </span>
                                <span className="font-bold text-[#f5efdf] text-xs">
                                  {leg.accountName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-300">
                                <span>Class: <strong className="uppercase text-slate-200">{leg.accountClass}</strong></span>
                                <span>•</span>
                                <span>Entity: <strong className="text-[#f5efdf]">{leg.entity}</strong></span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono font-black text-xs text-amber-400">
                                +GH₵ {leg.amount.toFixed(2)}
                              </span>
                              {leg.balanceAfter !== undefined && (
                                <span className="block text-[10px] text-slate-400 font-mono">
                                  Bal: GH₵ {leg.balanceAfter.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#114232]/60">
                            {getFundBadge(leg.fundType)}
                            <span className="text-slate-400 italic">
                              {leg.description}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded Raw Database Rows Drawer */}
                {isExpanded && (
                  <div className="p-3.5 bg-[#031713] border-t border-[#114232] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileSpreadsheet size={13} className="text-[#d6a735]" />
                        Raw Underlying Database Entries ({event.rawEntries.length})
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Group UUID: {event.groupId}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-[#114232]">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-[#041c17] text-slate-400 font-bold border-b border-[#114232]">
                            <th className="py-1.5 px-2.5">Entry ID</th>
                            <th className="py-1.5 px-2.5">User</th>
                            <th className="py-1.5 px-2.5">Account Type</th>
                            <th className="py-1.5 px-2.5">Entry Type</th>
                            <th className="py-1.5 px-2.5 text-right">Amount (GH₵)</th>
                            <th className="py-1.5 px-2.5 text-right">Balance After</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#114232] bg-[#06261f] font-mono">
                          {event.rawEntries.map((re, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[#0c3b2e]/50">
                              <td className="py-1.5 px-2.5 text-slate-400">{re.id.slice(0, 8)}...</td>
                              <td className="py-1.5 px-2.5 font-sans font-medium text-[#f5efdf]">{re.userId}</td>
                              <td className="py-1.5 px-2.5 text-cyan-300">{re.accountType}</td>
                              <td className="py-1.5 px-2.5 font-sans text-slate-300">{re.entryType}</td>
                              <td className="py-1.5 px-2.5 text-right font-bold text-[#d6a735]">
                                {Number(re.amount) >= 0 ? `+${re.amount}` : re.amount}
                              </td>
                              <td className="py-1.5 px-2.5 text-right text-slate-300">{re.balanceAfter || "N/A"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default AuditTrailView;
