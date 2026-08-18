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
} from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import type { LedgerEntry, SystemFundsReport, SystemFundType } from "@/lib/types";

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
  txFilter,
  setTxFilter,
  busy,
  onRefresh,
  onReconcileFunds,
  onAddLedgerClick,
  onUpdateTransactionStatus,
  onVoidTransaction,
}: LedgerTableProps) {
  const [viewMode, setViewMode] = useState<"ledger" | "transactions">("ledger");
  const [fundFilter, setFundFilter] = useState<SystemFundType | "all">("all");
  const [ledgerSearch, setLedgerSearch] = useState("");

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
      le.id.toLowerCase().includes(ledgerSearch.toLowerCase());

    return matchesFund && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 3 System Funds Cards */}
      {systemFunds && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-[#d6a735]" /> 3 Core System Funds Breakdown
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border ${
                  systemFunds.reconciliationStatus === "balanced"
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                    : "bg-amber-950/80 text-amber-300 border-amber-500/50"
                }`}
              >
                <ShieldCheck size={12} />
                Status: {systemFunds.reconciliationStatus}
              </span>
              {onReconcileFunds && (
                <button
                  type="button"
                  onClick={onReconcileFunds}
                  disabled={busy}
                  className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Activity size={12} className={busy ? "animate-spin" : ""} /> Run Audit &amp; Reconcile
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Fund 1: Account Balances Fund */}
            <div
              onClick={() => setFundFilter(fundFilter === "account_balances" ? "all" : "account_balances")}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                fundFilter === "account_balances"
                  ? "bg-[#0c3b2e] border-emerald-400 ring-1 ring-emerald-400"
                  : "bg-[#06261f] border-[#1a5e48] hover:border-emerald-500/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#f5efdf]">Account Balances Fund</h5>
                    <span className="text-[10px] text-slate-300">Liquid User Balances</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#041c17] text-slate-300 border border-[#1a5e48]">
                  {systemFunds.accountBalancesFund.entryCount} entries
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-emerald-400 font-mono">
                  GH₵ {systemFunds.accountBalancesFund.balance.toFixed(2)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 mt-2 pt-2 border-t border-[#114232]">
                  <span className="flex items-center gap-0.5 text-emerald-300">
                    <ArrowDownLeft size={10} /> Inflow: GH₵ {systemFunds.accountBalancesFund.totalInflow.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400">
                    <ArrowUpRight size={10} /> Outflow: GH₵ {systemFunds.accountBalancesFund.totalOutflow.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fund 2: Escrow Fund */}
            <div
              onClick={() => setFundFilter(fundFilter === "escrow" ? "all" : "escrow")}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                fundFilter === "escrow"
                  ? "bg-[#0c3b2e] border-cyan-400 ring-1 ring-cyan-400"
                  : "bg-[#06261f] border-[#1a5e48] hover:border-cyan-500/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-700/50">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#f5efdf]">Escrow Fund</h5>
                    <span className="text-[10px] text-slate-300">Locked Wagers &amp; Prizes</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#041c17] text-slate-300 border border-[#1a5e48]">
                  {systemFunds.escrowFund.entryCount} entries
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-cyan-400 font-mono">
                  GH₵ {systemFunds.escrowFund.balance.toFixed(2)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 mt-2 pt-2 border-t border-[#114232]">
                  <span className="flex items-center gap-0.5 text-cyan-300">
                    <ArrowDownLeft size={10} /> Locked: GH₵ {systemFunds.escrowFund.totalInflow.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400">
                    <ArrowUpRight size={10} /> Disbursed: GH₵ {systemFunds.escrowFund.totalOutflow.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Fund 3: Platform Fee Fund */}
            <div
              onClick={() => setFundFilter(fundFilter === "platform_fee" ? "all" : "platform_fee")}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                fundFilter === "platform_fee"
                  ? "bg-[#0c3b2e] border-amber-400 ring-1 ring-amber-400"
                  : "bg-[#06261f] border-[#1a5e48] hover:border-amber-500/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-700/50">
                    <Coins size={16} />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#f5efdf]">Platform Fee Fund</h5>
                    <span className="text-[10px] text-slate-300">House Commissions &amp; Revenue</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#041c17] text-slate-300 border border-[#1a5e48]">
                  {systemFunds.platformFeeFund.entryCount} entries
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl font-black text-amber-400 font-mono">
                  GH₵ {systemFunds.platformFeeFund.balance.toFixed(2)}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 mt-2 pt-2 border-t border-[#114232]">
                  <span className="flex items-center gap-0.5 text-amber-300">
                    <ArrowDownLeft size={10} /> Earned: GH₵ {systemFunds.platformFeeFund.totalInflow.toFixed(2)}
                  </span>
                  <span className="flex items-center gap-0.5 text-slate-400">
                    Net Revenue: GH₵ {systemFunds.platformFeeFund.netFlow.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Switcher & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("ledger")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === "ledger"
                ? "bg-[#d6a735] text-[#06261f] shadow-md"
                : "bg-[#06261f] text-slate-300 hover:text-white border border-[#1a5e48]"
            }`}
          >
            <Layers size={14} /> Double-Entry Ledger ({filteredLedger.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("transactions")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
              viewMode === "transactions"
                ? "bg-[#d6a735] text-[#06261f] shadow-md"
                : "bg-[#06261f] text-slate-300 hover:text-white border border-[#1a5e48]"
            }`}
          >
            <FileText size={14} /> Wallet Transaction Logs ({filteredTransactions.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === "ledger" && (
            <div className="flex items-center gap-1 bg-[#041c17] p-1 rounded-xl border border-[#1a5e48]">
              <button
                type="button"
                onClick={() => setFundFilter("all")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                  fundFilter === "all" ? "bg-[#114232] text-[#d6a735]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Funds
              </button>
              <button
                type="button"
                onClick={() => setFundFilter("account_balances")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                  fundFilter === "account_balances" ? "bg-emerald-900/60 text-emerald-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Account Balances
              </button>
              <button
                type="button"
                onClick={() => setFundFilter("escrow")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                  fundFilter === "escrow" ? "bg-cyan-900/60 text-cyan-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Escrow
              </button>
              <button
                type="button"
                onClick={() => setFundFilter("platform_fee")}
                className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                  fundFilter === "platform_fee" ? "bg-amber-900/60 text-amber-300" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Platform Fee
              </button>
            </div>
          )}

          {viewMode === "transactions" && (
            <select
              value={txFilter}
              onChange={(e) => setTxFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#041c17] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={onAddLedgerClick}
            className="px-3.5 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <Plus size={15} /> ＋ Manual Entry
          </button>
        </div>
      </div>

      {/* VIEW: DOUBLE-ENTRY LEDGER (Fund Connected) */}
      {viewMode === "ledger" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              placeholder="Search by User, Entry Type, Reference ID..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="w-full max-w-sm px-3 py-1.5 bg-[#041c17] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
            />
            <span className="text-xs text-slate-300 font-mono">
              Showing {filteredLedger.length} double-entry postings
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                  <th className="py-2.5 px-3">Entry ID &amp; Ref</th>
                  <th className="py-2.5 px-3">System Fund</th>
                  <th className="py-2.5 px-3">Account &amp; User</th>
                  <th className="py-2.5 px-3">Entry Type</th>
                  <th className="py-2.5 px-3">Amount (GH₵)</th>
                  <th className="py-2.5 px-3">Balance After</th>
                  <th className="py-2.5 px-3">Recorded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232] bg-[#06261f]">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-300 italic">
                      No double-entry ledger records found matching this fund filter.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((le) => {
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
                      <tr key={le.id} className="hover:bg-[#0c3b2e]/50 transition-colors font-mono">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-[#f8fafc] text-[11px] truncate max-w-[140px]">
                            {le.id.slice(0, 8)}...
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {le.referenceType ? `${le.referenceType}: ` : ""}
                            {le.referenceId || "N/A"}
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
                          <div className="font-bold text-[#f5efdf] text-xs truncate max-w-[130px]">
                            {le.userId === "platform-treasury" ? "Platform Treasury" : le.userId}
                          </div>
                          <div className="text-[10px] text-slate-300 uppercase font-semibold">
                            Acc: {le.accountType}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="font-semibold text-slate-200 uppercase text-[11px]">
                            {le.entryType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={isCredit ? "text-emerald-400" : "text-red-400"}>
                            {isCredit ? `+GH₵ ${Math.abs(amtNum).toFixed(2)}` : `-GH₵ ${Math.abs(amtNum).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-bold">
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

      {/* VIEW: WALLET TRANSACTIONS */}
      {viewMode === "transactions" && (
        <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                <th className="py-2.5 px-3">Ref ID / ID</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Amount &amp; Currency</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Date &amp; Time</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#114232] bg-[#06261f]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-300 italic">
                    No ledger transaction records found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#0c3b2e]/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200 font-semibold">
                      {tx.reference || tx.id}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-xs text-[#f8fafc]">
                      {tx.userToken}
                    </td>
                    <td className="py-2.5 px-3 font-bold uppercase text-cyan-300">
                      {tx.type}
                    </td>
                    <td className="py-2.5 px-3 font-bold">
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
      )}
    </div>
  );
}
