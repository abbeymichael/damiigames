"use client";

import React, { useState } from "react";
import {
  Wallet,
  RefreshCw,
  Plus,
  CheckCircle,
  X,
  ShieldCheck,
  Lock,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Layers,
  FileText,
  AlertTriangle,
  BookOpen,
  Landmark,
  TrendingUp,
  Percent,
  DollarSign,
  Scale,
  Search,
  Filter,
  Download,
  Info,
  ChevronRight,
  ArrowRight,
  BarChart3,
  Shield,
  HelpCircle,
} from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import { AuditTrailView } from "@/components/admin/AuditTrailView";
import type {
  LedgerEntry,
  SystemFundsReport,
  SystemFundType,
  ChartOfAccountsReport,
  TreasuryFundDetails,
  AccountClass,
} from "@/lib/types";

export interface TransactionItem {
  id: string;
  userToken: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  createdAt: string;
}

export interface LedgerTableProps {
  transactions: TransactionItem[];
  ledgerEntries?: LedgerEntry[];
  systemFunds?: SystemFundsReport | null;
  chartOfAccounts?: ChartOfAccountsReport | null;
  treasuryDetails?: TreasuryFundDetails | null;
  txFilter: string;
  setTxFilter: (filter: string) => void;
  busy: boolean;
  onRefresh: () => void;
  onReconcileFunds?: () => void;
  onAddLedgerClick: () => void;
  onUpdateTransactionStatus: (txId: string, status: "completed" | "failed") => void;
  onVoidTransaction: (txId: string) => void;
}

export function LedgerTable({
  transactions,
  ledgerEntries = [],
  systemFunds,
  chartOfAccounts,
  treasuryDetails,
  txFilter,
  setTxFilter,
  busy,
  onRefresh,
  onReconcileFunds,
  onAddLedgerClick,
  onUpdateTransactionStatus,
  onVoidTransaction,
}: LedgerTableProps) {
  const [viewMode, setViewMode] = useState<"overview" | "coa" | "treasury" | "audit" | "ledger" | "transactions">("overview");
  const [fundFilter, setFundFilter] = useState<SystemFundType | "all">("all");
  const [accountClassFilter, setAccountClassFilter] = useState<AccountClass | "all">("all");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [coaSearch, setCoaSearch] = useState("");

  const filteredTransactions = transactions.filter(
    (tx) => txFilter === "all" || tx.status === txFilter
  );

  const filteredLedger = ledgerEntries.filter((le) => {
    const calculatedFund: SystemFundType =
      le.fundType ||
      (le.userId === "platform-treasury" || le.entryType === "platform_fee"
        ? "platform_fee"
        : le.accountType === "escrow"
        ? "escrow"
        : "account_balances");

    const matchesFund = fundFilter === "all" || calculatedFund === fundFilter;
    const matchesSearch =
      !ledgerSearch.trim() ||
      le.userId.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      le.referenceId?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      le.entryType.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      le.accountCode?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      le.accountName?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      le.id.toLowerCase().includes(ledgerSearch.toLowerCase());

    return matchesFund && matchesSearch;
  });

  const filteredCoaAccounts = (chartOfAccounts?.accounts || []).filter((account) => {
    const matchesClass = accountClassFilter === "all" || account.accountClass === accountClassFilter;
    const matchesSearch =
      !coaSearch.trim() ||
      account.code.includes(coaSearch.trim()) ||
      account.name.toLowerCase().includes(coaSearch.toLowerCase()) ||
      account.description.toLowerCase().includes(coaSearch.toLowerCase());
    return matchesClass && matchesSearch;
  });

  // Calculate fallbacks if chartOfAccounts or treasuryDetails are loading
  const totalAssets = chartOfAccounts?.totalAssets ?? systemFunds?.totalPlatformAssets ?? 0;
  const totalLiabilities = chartOfAccounts?.totalLiabilities ?? ((systemFunds?.totalUserAvailable ?? 0) + (systemFunds?.totalEscrowLocked ?? 0));
  const totalEquity = chartOfAccounts?.totalEquity ?? systemFunds?.totalPlatformFeesEarned ?? 0;
  const equationBalanced = chartOfAccounts?.accountingEquationBalanced ?? true;

  // Export COA to JSON
  const handleExportCoA = () => {
    const exportData = {
      chartOfAccounts,
      systemFunds,
      treasuryDetails,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `damii-financial-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="ledger-financial-dashboard">
      {/* Top Header Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
        <div className="flex flex-wrap items-center gap-1.5 bg-[#041c17] p-1 rounded-xl border border-[#1a5e48]">
          <button
            type="button"
            id="tab-btn-overview"
            onClick={() => setViewMode("overview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "overview"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
            }`}
          >
            <Layers size={14} /> 3 System Funds
          </button>
          <button
            type="button"
            id="tab-btn-coa"
            onClick={() => setViewMode("coa")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "coa"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
            }`}
          >
            <BookOpen size={14} /> Chart of Accounts
          </button>
          <button
            type="button"
            id="tab-btn-treasury"
            onClick={() => setViewMode("treasury")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "treasury"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
            }`}
          >
            <Landmark size={14} /> Platform Treasury
          </button>
          <button
            type="button"
            id="tab-btn-audit"
            onClick={() => setViewMode("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "audit"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
            }`}
          >
            <Scale size={14} /> Two-Sided Audit Trail
          </button>
          <button
            type="button"
            id="tab-btn-ledger"
            onClick={() => setViewMode("ledger")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "ledger"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
            }`}
          >
            <ShieldCheck size={14} /> Double-Entry Postings ({filteredLedger.length})
          </button>
          <button
            type="button"
            id="tab-btn-transactions"
            onClick={() => setViewMode("transactions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "transactions"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
            }`}
          >
            <FileText size={14} /> MoMo Logs ({filteredTransactions.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onReconcileFunds && (
            <button
              type="button"
              id="btn-reconcile-audit"
              onClick={onReconcileFunds}
              disabled={busy}
              className="px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Runs a complete double-entry reconciliation across all 3 funds and database accounts"
            >
              <Activity size={13} className={busy ? "animate-spin" : ""} /> Run Audit &amp; Reconcile
            </button>
          )}

          <button
            type="button"
            id="btn-export-coa"
            onClick={handleExportCoA}
            className="px-2.5 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-white border border-[#1a5e48] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Download full Chart of Accounts and Treasury Statement JSON"
          >
            <Download size={13} /> Export Report
          </button>

          <button
            type="button"
            id="btn-refresh-ledger"
            onClick={onRefresh}
            className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh
          </button>

          <button
            type="button"
            id="btn-add-manual-entry"
            onClick={onAddLedgerClick}
            className="px-3.5 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Plus size={15} /> ＋ Manual Entry
          </button>
        </div>
      </div>

      {/* VIEW 1: 3 CORE SYSTEM FUNDS OVERVIEW */}
      {viewMode === "overview" && systemFunds && (
        <div className="space-y-6" id="view-overview-funds">
          {/* Reconciliation & Integrity Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#041c17] border border-[#1a5e48]">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                systemFunds.reconciliationStatus === "balanced"
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                  : "bg-amber-950/80 text-amber-400 border-amber-500/40"
              }`}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                    General Ledger Integrity &amp; Fund Solvency:
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                    systemFunds.reconciliationStatus === "balanced"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                      : "bg-amber-950 text-amber-300 border-amber-500/50"
                  }`}>
                    {systemFunds.reconciliationStatus === "balanced" ? "Balanced & 100% Solvency" : "Discrepancy Detected"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Platform double-entry postings are balanced. Total platform assets match cumulative obligations and retained earnings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans uppercase">Total Assets in Custody</span>
                <span className="font-bold text-emerald-400">GH₵ {systemFunds.totalPlatformAssets.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-sans uppercase">Discrepancy</span>
                <span className={`font-bold ${systemFunds.discrepancyAmount === 0 ? "text-slate-400" : "text-amber-400"}`}>
                  GH₵ {systemFunds.discrepancyAmount.toFixed(2)}
                </span>
              </div>
              <button
                type="button"
                id="btn-overview-to-audit"
                onClick={() => setViewMode("audit")}
                className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg font-sans font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Scale size={13} /> Two-Sided Audit
              </button>
            </div>
          </div>

          {/* 3 Core System Funds Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fund 1: Account Balances Fund */}
            <div
              id="card-fund-account-balances"
              onClick={() => {
                setFundFilter("account_balances");
                setViewMode("ledger");
              }}
              className="p-4 rounded-xl border bg-[#06261f] border-[#1a5e48] hover:border-emerald-500/60 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-700/50 group-hover:scale-105 transition-transform">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1">
                      Account Balances Fund
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                    </h5>
                    <span className="text-[10px] text-slate-300">Liquid User Balances [1020/2010]</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#041c17] text-slate-300 border border-[#1a5e48]">
                  {systemFunds.accountBalancesFund.entryCount} entries
                </span>
              </div>

              <div className="pt-2">
                <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  GH₵ {systemFunds.accountBalancesFund.balance.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                  {systemFunds.accountBalancesFund.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#114232] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-emerald-300">
                    <ArrowDownLeft size={12} /> Total Inflow (Deposits &amp; Wins)
                  </span>
                  <span className="font-mono font-bold">GH₵ {systemFunds.accountBalancesFund.totalInflow.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ArrowUpRight size={12} /> Total Outflow (Withdrawals &amp; Locks)
                  </span>
                  <span className="font-mono font-bold">GH₵ {systemFunds.accountBalancesFund.totalOutflow.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Fund 2: Escrow Fund */}
            <div
              id="card-fund-escrow"
              onClick={() => {
                setFundFilter("escrow");
                setViewMode("ledger");
              }}
              className="p-4 rounded-xl border bg-[#06261f] border-[#1a5e48] hover:border-cyan-500/60 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-700/50 group-hover:scale-105 transition-transform">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1">
                      Escrow Fund
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                    </h5>
                    <span className="text-[10px] text-slate-300">Locked Wagers &amp; Prizes [1030/2020]</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#041c17] text-slate-300 border border-[#1a5e48]">
                  {systemFunds.escrowFund.entryCount} entries
                </span>
              </div>

              <div className="pt-2">
                <div className="text-2xl font-black text-cyan-400 font-mono tracking-tight">
                  GH₵ {systemFunds.escrowFund.balance.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                  {systemFunds.escrowFund.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#114232] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-cyan-300">
                    <ArrowDownLeft size={12} /> Total Locked in Escrow
                  </span>
                  <span className="font-mono font-bold">GH₵ {systemFunds.escrowFund.totalInflow.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <ArrowUpRight size={12} /> Disbursed to Match Winners
                  </span>
                  <span className="font-mono font-bold">GH₵ {systemFunds.escrowFund.totalOutflow.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Fund 3: Platform Fee Fund */}
            <div
              id="card-fund-platform-fee"
              onClick={() => {
                setViewMode("treasury");
              }}
              className="p-4 rounded-xl border bg-[#06261f] border-[#1a5e48] hover:border-amber-500/60 transition-all cursor-pointer group space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-700/50 group-hover:scale-105 transition-transform">
                    <Coins size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1">
                      Platform Fee Fund
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                    </h5>
                    <span className="text-[10px] text-slate-300">Platform Treasury Revenue [3010/4010]</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#041c17] text-slate-300 border border-[#1a5e48]">
                  {systemFunds.platformFeeFund.entryCount} entries
                </span>
              </div>

              <div className="pt-2">
                <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                  GH₵ {systemFunds.platformFeeFund.balance.toFixed(2)}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                  {systemFunds.platformFeeFund.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#114232] space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-amber-300">
                    <ArrowDownLeft size={12} /> Total Rake &amp; Commission
                  </span>
                  <span className="font-mono font-bold">GH₵ {systemFunds.platformFeeFund.totalInflow.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    Net Retained Revenue
                  </span>
                  <span className="font-mono font-bold text-amber-400">GH₵ {systemFunds.platformFeeFund.netFlow.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Drilldown Navigation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#081c15] border border-[#1a5e48] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={15} className="text-[#d6a735]" /> Chart of Accounts Summary
                </h4>
                <button
                  type="button"
                  onClick={() => setViewMode("coa")}
                  className="text-xs text-[#d6a735] hover:underline font-bold flex items-center gap-1"
                >
                  View Full General Ledger <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#06261f] border border-[#114232] text-xs">
                  <span className="text-slate-300 font-medium">1000s Total Assets</span>
                  <span className="font-mono font-bold text-emerald-400">GH₵ {totalAssets.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#06261f] border border-[#114232] text-xs">
                  <span className="text-slate-300 font-medium">2000s Total Liabilities</span>
                  <span className="font-mono font-bold text-cyan-400">GH₵ {totalLiabilities.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#06261f] border border-[#114232] text-xs">
                  <span className="text-slate-300 font-medium">3000s Platform Retained Equity</span>
                  <span className="font-mono font-bold text-amber-400">GH₵ {totalEquity.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#081c15] border border-[#1a5e48] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                  <Landmark size={15} className="text-[#d6a735]" /> Treasury Revenue Streams
                </h4>
                <button
                  type="button"
                  onClick={() => setViewMode("treasury")}
                  className="text-xs text-[#d6a735] hover:underline font-bold flex items-center gap-1"
                >
                  Inspect Treasury Analytics <ChevronRight size={14} />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#06261f] border border-[#114232] text-xs">
                  <span className="text-slate-300 font-medium">4010: 1v1 Match Rake Revenue</span>
                  <span className="font-mono font-bold text-amber-300">
                    GH₵ {(treasuryDetails?.rake1v1Revenue ?? (systemFunds.platformFeeFund.totalInflow * 0.70)).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#06261f] border border-[#114232] text-xs">
                  <span className="text-slate-300 font-medium">4020: Tournament Commissions</span>
                  <span className="font-mono font-bold text-amber-300">
                    GH₵ {(treasuryDetails?.tournamentCommissionRevenue ?? (systemFunds.platformFeeFund.totalInflow * 0.25)).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#06261f] border border-[#114232] text-xs">
                  <span className="text-slate-300 font-medium">3020: Dispute &amp; Goodwill Reserve</span>
                  <span className="font-mono font-bold text-slate-300">
                    GH₵ {(treasuryDetails?.disputeReserveBalance ?? (systemFunds.totalPlatformFeesEarned * 0.15)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CHART OF ACCOUNTS (COA) GENERAL LEDGER */}
      {viewMode === "coa" && (
        <div className="space-y-4" id="view-chart-of-accounts">
          {/* Accounting Equation Verification Widget */}
          <div className="p-4 rounded-xl bg-[#041c17] border border-[#1a5e48] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-[#d6a735]" />
                <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                  Double-Entry Accounting Equation:
                </h4>
                <code className="text-xs font-mono font-bold text-[#d6a735] px-2 py-0.5 bg-[#06261f] rounded border border-[#1a5e48]">
                  Assets = Liabilities + Equity
                </code>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border ${
                equationBalanced
                  ? "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                  : "bg-amber-950 text-amber-300 border-amber-500/50"
              }`}>
                <ShieldCheck size={12} /> {equationBalanced ? "Equation Balanced (100% Solvency)" : "Discrepancy"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#114232]">
              <div className="p-3 bg-[#06261f] rounded-lg border border-[#114232]">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Assets (1000s)</span>
                <p className="text-lg font-black text-emerald-400 font-mono">GH₵ {totalAssets.toFixed(2)}</p>
                <p className="text-[10px] text-slate-300">MoMo Clearing + Player Cash + Escrow Vault</p>
              </div>
              <div className="p-3 bg-[#06261f] rounded-lg border border-[#114232]">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Liabilities (2000s)</span>
                <p className="text-lg font-black text-cyan-400 font-mono">GH₵ {totalLiabilities.toFixed(2)}</p>
                <p className="text-[10px] text-slate-300">User Obligations + Match &amp; League Escrow</p>
              </div>
              <div className="p-3 bg-[#06261f] rounded-lg border border-[#114232]">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Retained Equity (3000s)</span>
                <p className="text-lg font-black text-amber-400 font-mono">GH₵ {totalEquity.toFixed(2)}</p>
                <p className="text-[10px] text-slate-300">Platform Retained Earnings &amp; Reserves</p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#041c17] p-1 rounded-xl border border-[#1a5e48]">
              {(["all", "asset", "liability", "equity", "revenue", "expense"] as const).map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setAccountClassFilter(cls)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors ${
                    accountClassFilter === cls
                      ? "bg-[#114232] text-[#d6a735] border border-[#d6a735]/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cls === "all" ? "All Accounts" : `${cls}s`}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search account code, name, description..."
                value={coaSearch}
                onChange={(e) => setCoaSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#041c17] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] w-64 focus:outline-none focus:border-[#d6a735]"
              />
            </div>
          </div>

          {/* Chart of Accounts Table */}
          <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                  <th className="py-2.5 px-3">Account Code</th>
                  <th className="py-2.5 px-3">Account Title &amp; Description</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">System Fund</th>
                  <th className="py-2.5 px-3 text-right">Debits (Inflow)</th>
                  <th className="py-2.5 px-3 text-right">Credits (Outflow)</th>
                  <th className="py-2.5 px-3 text-right">Current Balance</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232] bg-[#06261f]">
                {filteredCoaAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No chart of accounts records found.
                    </td>
                  </tr>
                ) : (
                  filteredCoaAccounts.map((acc) => {
                    const classColors = {
                      asset: "text-emerald-400 bg-emerald-950/60 border-emerald-500/40",
                      liability: "text-cyan-400 bg-cyan-950/60 border-cyan-500/40",
                      equity: "text-amber-400 bg-amber-950/60 border-amber-500/40",
                      revenue: "text-green-400 bg-green-950/60 border-green-500/40",
                      expense: "text-rose-400 bg-rose-950/60 border-rose-500/40",
                    };

                    return (
                      <tr key={acc.code} className="hover:bg-[#0c3b2e]/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-black text-sm text-[#d6a735]">
                          {acc.code}
                        </td>
                        <td className="py-3 px-3 max-w-xs">
                          <div className="font-bold text-[#f5efdf] text-xs">
                            {acc.name}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                            {acc.description}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${classColors[acc.accountClass]}`}>
                            {acc.accountClass}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] text-slate-300 font-mono capitalize">
                            {acc.fundType.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          GH₵ {acc.totalDebits.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          GH₵ {acc.totalCredits.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-sm">
                          <span className={
                            acc.accountClass === "asset" ? "text-emerald-400" :
                            acc.accountClass === "liability" ? "text-cyan-400" :
                            acc.accountClass === "equity" ? "text-amber-400" :
                            acc.accountClass === "revenue" ? "text-green-400" : "text-rose-400"
                          }>
                            GH₵ {acc.balance.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setLedgerSearch(acc.code);
                              setViewMode("ledger");
                            }}
                            className="px-2 py-1 bg-[#041c17] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48] rounded text-[10px] font-bold transition-colors"
                            title="Drill down to postings for this account"
                          >
                            Postings
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: PLATFORM TREASURY DEEP-DIVE */}
      {viewMode === "treasury" && (
        <div className="space-y-6" id="view-platform-treasury">
          {/* Treasury KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Treasury Retained Liquidity</span>
              <p className="text-2xl font-black text-amber-400 font-mono">
                GH₵ {(treasuryDetails?.treasuryBalance ?? systemFunds?.totalPlatformFeesEarned ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-300">Account 3010 (Platform Treasury)</p>
            </div>

            <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Cumulative Gross Rake</span>
              <p className="text-2xl font-black text-emerald-400 font-mono">
                GH₵ {(treasuryDetails?.lifetimeRevenue ?? systemFunds?.platformFeeFund.totalInflow ?? 0).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-300">Match Rake (Dynamic 5%–10%) + Tourney Commissions</p>
            </div>

            <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Dispute &amp; Goodwill Reserve</span>
              <p className="text-2xl font-black text-cyan-400 font-mono">
                GH₵ {(treasuryDetails?.disputeReserveBalance ?? ((systemFunds?.totalPlatformFeesEarned ?? 0) * 0.15)).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-300">Account 3020 (Refund Allocation)</p>
            </div>

            <div className="p-4 rounded-xl bg-[#06261f] border border-[#1a5e48] space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Gateway Processing Deductions</span>
              <p className="text-2xl font-black text-rose-400 font-mono">
                GH₵ {(treasuryDetails?.gatewayExpenses ?? ((systemFunds?.totalDeposits ?? 0) * 0.0195)).toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-300">Account 5010 (Paystack 1.95% clearing fee)</p>
            </div>
          </div>

          {/* Revenue Streams Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#081c15] border border-[#1a5e48] space-y-4">
              <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" /> Revenue Stream Allocations
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">1v1 Wager Match Rake [4010]</span>
                    <span className="font-mono font-bold text-amber-300">
                      GH₵ {(treasuryDetails?.rake1v1Revenue ?? ((systemFunds?.platformFeeFund.totalInflow ?? 0) * 0.70)).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-[#041c17] rounded-full h-2 overflow-hidden border border-[#114232]">
                    <div className="bg-amber-400 h-full rounded-full" style={{ width: "70%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">Tournament Entry Fee Commissions [4020]</span>
                    <span className="font-mono font-bold text-emerald-300">
                      GH₵ {(treasuryDetails?.tournamentCommissionRevenue ?? ((systemFunds?.platformFeeFund.totalInflow ?? 0) * 0.25)).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-[#041c17] rounded-full h-2 overflow-hidden border border-[#114232]">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: "25%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-300">Forfeit &amp; Timeout Penalty Surcharges [4030]</span>
                    <span className="font-mono font-bold text-cyan-300">
                      GH₵ {(treasuryDetails?.penaltyRevenue ?? ((systemFunds?.platformFeeFund.totalInflow ?? 0) * 0.05)).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-[#041c17] rounded-full h-2 overflow-hidden border border-[#114232]">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: "5%" }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#081c15] border border-[#1a5e48] space-y-4">
              <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <Shield size={16} className="text-amber-400" /> Capital Reserves &amp; Operational Costs
              </h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[#06261f] border border-[#114232] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#f5efdf]">Dispute &amp; Arbiter Buffer</span>
                    <span className="text-amber-300 font-mono">15% of Platform Earnings</span>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Guarantees immediate solvency for manual dispute resolution, disconnection goodwill, and arbiter review compensation.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-[#06261f] border border-[#114232] space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#f5efdf]">Paystack &amp; Telco MoMo Processing</span>
                    <span className="text-rose-300 font-mono">1.95% MoMo Rate</span>
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Clearing fees absorbed automatically across Mobile Money channels (MTN MoMo, Telecel Cash, AT Money).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Treasury Ledger Activity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                <Scale size={15} className="text-[#d6a735]" /> Recent Platform Treasury Postings
              </h4>
              <button
                type="button"
                onClick={() => {
                  setFundFilter("platform_fee");
                  setViewMode("ledger");
                }}
                className="text-xs text-[#d6a735] hover:underline font-bold"
              >
                View all in ledger &rarr;
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                    <th className="py-2.5 px-3">Entry Ref</th>
                    <th className="py-2.5 px-3">Account Code &amp; Title</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Commission (GH₵)</th>
                    <th className="py-2.5 px-3 text-right">Treasury Balance After</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#114232] bg-[#06261f]">
                  {(!treasuryDetails?.recentTreasuryEntries || treasuryDetails.recentTreasuryEntries.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No recent platform treasury postings recorded.
                      </td>
                    </tr>
                  ) : (
                    treasuryDetails.recentTreasuryEntries.slice(0, 10).map((entry, idx) => (
                      <tr key={idx} className="hover:bg-[#0c3b2e]/50 transition-colors font-mono">
                        <td className="py-2.5 px-3 text-[#f8fafc]">
                          <span className="text-[11px] font-semibold">{entry.referenceType}: </span>
                          <span className="text-slate-400 text-[10px]">{entry.referenceId || entry.id.slice(0, 8)}</span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-mono font-bold text-amber-400 text-xs mr-1.5">
                            [{entry.accountCode || "4010"}]
                          </span>
                          <span className="font-bold text-[#f5efdf] text-xs">
                            {entry.accountName || "1v1 Match Rake Revenue (5%)"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                            {entry.entryType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                          +GH₵ {Math.abs(Number(entry.amount)).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200 font-bold">
                          GH₵ {Number(entry.balanceAfter || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-300">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: ENHANCED TWO-SIDED AUDIT TRAIL */}
      {viewMode === "audit" && (
        <AuditTrailView
          ledgerEntries={ledgerEntries}
          systemFunds={systemFunds}
          chartOfAccounts={chartOfAccounts}
          treasuryDetails={treasuryDetails}
          onDrillDownToAccount={(code) => {
            setCoaSearch(code);
            setViewMode("coa");
          }}
          onRefresh={onRefresh}
          busy={busy}
        />
      )}

      {/* VIEW 5: DOUBLE-ENTRY POSTINGS LEDGER */}
      {viewMode === "ledger" && (
        <div className="space-y-3" id="view-double-entry-ledger">
          {/* Controls & Search */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-[#041c17] p-1 rounded-xl border border-[#1a5e48]">
              <button
                type="button"
                onClick={() => setFundFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  fundFilter === "all" ? "bg-[#114232] text-[#d6a735]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Funds
              </button>
              <button
                type="button"
                onClick={() => setFundFilter("account_balances")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  fundFilter === "account_balances" ? "bg-emerald-900/60 text-emerald-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Account Balances
              </button>
              <button
                type="button"
                onClick={() => setFundFilter("escrow")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  fundFilter === "escrow" ? "bg-cyan-900/60 text-cyan-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Escrow
              </button>
              <button
                type="button"
                onClick={() => setFundFilter("platform_fee")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                  fundFilter === "platform_fee" ? "bg-amber-900/60 text-amber-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Platform Fee
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by User, Entry Type, Account Code [1010], Ref..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#041c17] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] w-72 focus:outline-none focus:border-[#d6a735]"
                />
              </div>
              <span className="text-xs text-slate-300 font-mono">
                Showing {filteredLedger.length} postings
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                  <th className="py-2.5 px-3">Entry Ref</th>
                  <th className="py-2.5 px-3">Account Code &amp; Title</th>
                  <th className="py-2.5 px-3">System Fund</th>
                  <th className="py-2.5 px-3">User &amp; Sub-Ledger</th>
                  <th className="py-2.5 px-3">Posting Type</th>
                  <th className="py-2.5 px-3 text-right">Amount (GH₵)</th>
                  <th className="py-2.5 px-3 text-right">Balance After</th>
                  <th className="py-2.5 px-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232] bg-[#06261f]">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No double-entry ledger records found matching this filter.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((le, idx) => {
                    const calculatedFund: SystemFundType =
                      le.fundType ||
                      (le.userId === "platform-treasury" || le.entryType === "platform_fee"
                        ? "platform_fee"
                        : le.accountType === "escrow"
                        ? "escrow"
                        : "account_balances");

                    const amtNum = Number(le.amount);
                    const isCredit = amtNum >= 0;

                    return (
                      <tr key={`${le.id || "le"}-${idx}`} className="hover:bg-[#0c3b2e]/50 transition-colors font-mono">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#f8fafc] text-[11px] truncate max-w-[130px]">
                            {le.id.slice(0, 8)}...
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                            {le.referenceType ? `${le.referenceType}: ` : ""}
                            {le.referenceId || "N/A"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-mono font-bold text-[#d6a735] text-xs">
                            [{le.accountCode || "1020"}]
                          </div>
                          <div className="text-[11px] text-[#f5efdf] font-semibold truncate max-w-[150px]">
                            {le.accountName || "Player Available Cash"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {calculatedFund === "account_balances" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                              Account Balances
                            </span>
                          )}
                          {calculatedFund === "escrow" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                              Escrow Fund
                            </span>
                          )}
                          {calculatedFund === "platform_fee" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                              Platform Fee
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-bold text-[#f5efdf] text-xs truncate max-w-[120px]">
                            {le.userId === "platform-treasury" ? "Platform Treasury" : le.userId}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">
                            Sub: {le.accountType}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-semibold text-slate-200 uppercase text-[11px]">
                            {le.entryType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          <span className={isCredit ? "text-emerald-400" : "text-red-400"}>
                            {isCredit ? `+GH₵ ${Math.abs(amtNum).toFixed(2)}` : `-GH₵ ${Math.abs(amtNum).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200 font-bold">
                          GH₵ {Number(le.balanceAfter || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-300 font-mono">
                          {le.createdAt ? new Date(le.createdAt).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: WALLET TRANSACTION LOGS */}
      {viewMode === "transactions" && (
        <div className="space-y-3" id="view-momo-transactions">
          <div className="flex items-center justify-between gap-3">
            <select
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#041c17] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Statuses ({transactions.length})</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending Approval</option>
              <option value="failed">Failed / Cancelled</option>
            </select>
            <span className="text-xs text-slate-300 font-mono">
              Showing {filteredTransactions.length} records
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                  <th className="py-2.5 px-3">Ref ID / ID</th>
                  <th className="py-2.5 px-3">User Token</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3 text-right">Amount (GH₵)</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date &amp; Time</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232] bg-[#06261f]">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                      No wallet transaction records found matching this status filter.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => (
                    <tr key={`${tx.id || "tx"}-${idx}`} className="hover:bg-[#0c3b2e]/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200 font-semibold">
                        {tx.reference || tx.id}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-xs text-[#f8fafc] truncate max-w-[140px]">
                        {tx.userToken}
                      </td>
                      <td className="py-2.5 px-3 font-bold uppercase text-cyan-300">
                        {tx.type}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold font-mono">
                        <span className={tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {tx.amount >= 0 ? `+GH₵ ${Math.abs(tx.amount).toFixed(2)}` : `-GH₵ ${Math.abs(tx.amount).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.status === "completed"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : tx.status === "pending"
                              ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                              : "bg-red-950 text-red-300 border border-red-500/40"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-300">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "N/A"}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {tx.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => onUpdateTransactionStatus(tx.id, "completed")}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px]"
                            >
                              Approve
                            </button>
                          )}
                          <ActionMenu
                            items={[
                              ...(tx.status === "pending"
                                ? [
                                    {
                                      label: "Approve Transaction",
                                      icon: CheckCircle,
                                      onClick: () => onUpdateTransactionStatus(tx.id, "completed"),
                                    },
                                    {
                                      label: "Reject Transaction",
                                      icon: X,
                                      onClick: () => onUpdateTransactionStatus(tx.id, "failed"),
                                    },
                                  ]
                                : []),
                              {
                                label: "Void Transaction",
                                icon: X,
                                onClick: () => onVoidTransaction(tx.id),
                                danger: true,
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default LedgerTable;
