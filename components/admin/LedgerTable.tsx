"use client";

import React from "react";
import { Wallet, RefreshCw, Plus, Settings, CheckCircle, X } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";

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
  txFilter: string;
  setTxFilter: (filter: string) => void;
  busy: boolean;
  onRefresh: () => void;
  onAddLedgerClick: () => void;
  onUpdateTransactionStatus: (txId: string, status: "completed" | "failed") => void;
  onVoidTransaction: (txId: string) => void;
}

export function LedgerTable({
  transactions,
  txFilter,
  setTxFilter,
  busy,
  onRefresh,
  onAddLedgerClick,
  onUpdateTransactionStatus,
  onVoidTransaction,
}: LedgerTableProps) {
  const filteredTransactions = transactions.filter(
    (tx) => txFilter === "all" || tx.status === txFilter
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
        <div>
          <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
            <Wallet size={18} className="text-[#d6a735]" /> Financial Ledger &amp; Balance Audit System
          </h3>
          <p className="text-xs text-slate-200 mt-0.5">
            Record manual credits/debits, manage Paystack Mobile Money top-ups, wager pot escrow logs, and payout settlements.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            <Plus size={15} /> ＋ Add Manual Ledger Entry
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#114232] pb-2">
          <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
            Ledger Transaction Logs ({filteredTransactions.length})
          </h4>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        <div className="overflow-x-auto">
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
            <tbody className="divide-y divide-[#114232]">
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
      </div>
    </div>
  );
}
