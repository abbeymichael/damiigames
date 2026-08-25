"use client";

import React, { useState, useMemo } from "react";
import {
  ArrowDownLeft,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Download,
  Filter,
  Eye,
  Smartphone,
  Calendar,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import type { WalletTransaction, Profile } from "@/lib/types";

export interface DepositsTableProps {
  transactions: WalletTransaction[];
  users?: Profile[];
  token: string;
  adminSecret?: string;
  busy: boolean;
  onRefresh: () => void;
  onManualCredit?: () => void;
}

export function DepositsTable({
  transactions,
  users = [],
  token,
  adminSecret,
  busy,
  onRefresh,
  onManualCredit,
}: DepositsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filter strictly to deposits
  const depositTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.type === "deposit" || tx.amount > 0);
  }, [transactions]);

  // Create user lookup map for fast details
  const userMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const u of users) {
      map.set(u.token, u);
      if (u.id) map.set(u.id, u);
    }
    return map;
  }, [users]);

  // Filtered deposits list
  const filteredDeposits = useMemo(() => {
    return depositTransactions.filter((tx) => {
      // Status filter
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;

      const user = userMap.get(tx.userToken);
      let meta: Record<string, any> = {};
      try {
        meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
      } catch {}

      const provider = meta.channel || meta.momoProvider || meta.provider || (tx.reference.includes("MTN") ? "MTN" : "Paystack");

      // Provider filter
      if (providerFilter !== "all") {
        const provLower = String(provider).toLowerCase();
        if (providerFilter === "mtn" && !provLower.includes("mtn")) return false;
        if (providerFilter === "vodafone" && !provLower.includes("vod") && !provLower.includes("telecel")) return false;
        if (providerFilter === "airteltigo" && !provLower.includes("tigo") && !provLower.includes("atl") && !provLower.includes("airtel")) return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const refMatch = (tx.reference || "").toLowerCase().includes(term);
        const idMatch = tx.id.toLowerCase().includes(term);
        const usernameMatch = (user?.username || "").toLowerCase().includes(term);
        const phoneMatch = (user?.phoneNumber || meta.phone || meta.phoneNumber || "").toLowerCase().includes(term);
        const nameMatch = (user?.fullName || "").toLowerCase().includes(term);
        return refMatch || idMatch || usernameMatch || phoneMatch || nameMatch;
      }

      return true;
    });
  }, [depositTransactions, statusFilter, providerFilter, searchTerm, userMap]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalCompletedGhs = 0;
    let pendingCount = 0;
    let todayInflowGhs = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    for (const tx of depositTransactions) {
      const amount = Math.abs(tx.amount);
      if (tx.status === "completed") {
        totalCompletedGhs += amount;
        if (new Date(tx.createdAt) >= startOfToday) {
          todayInflowGhs += amount;
        }
      } else if (tx.status === "pending") {
        pendingCount++;
      }
    }

    return {
      totalCompletedGhs,
      pendingCount,
      todayInflowGhs,
      totalCount: depositTransactions.length,
    };
  }, [depositTransactions]);

  // Action: Verify Paystack Deposit directly
  async function handleVerifyPaystack(reference: string) {
    setVerifyingRef(reference);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_deposit",
          token,
          secret: adminSecret,
          reference,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to verify deposit with Paystack");
      }
      setActionMessage({
        type: "success",
        text: `Deposit verified successfully! Reference: ${reference}`,
      });
      onRefresh();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Paystack deposit verification failed",
      });
    } finally {
      setVerifyingRef(null);
    }
  }

  // Action: Export CSV
  function handleExportCsv() {
    if (filteredDeposits.length === 0) return;
    const headers = ["Transaction ID", "User", "Amount (GHS)", "Status", "Reference", "Created At"];
    const rows = filteredDeposits.map((tx) => {
      const user = userMap.get(tx.userToken);
      return [
        tx.id,
        user?.username || tx.userToken.slice(0, 8),
        Math.abs(tx.amount).toFixed(2),
        tx.status,
        tx.reference,
        new Date(tx.createdAt).toISOString(),
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `damii_deposits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-emerald-400">
                <ArrowDownLeft size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#f5efdf]">Deposit Inflow Management</h3>
                <p className="text-xs text-slate-300">
                  Track Mobile Money deposits, verify real-time Paystack collections, and audit incoming player funds.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={busy}
              className="px-3 py-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh Inflow
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredDeposits.length === 0}
              className="px-3 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
            {onManualCredit && (
              <button
                type="button"
                onClick={onManualCredit}
                className="px-3.5 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
              >
                + Manual Credit
              </button>
            )}
          </div>
        </div>

        {/* Action feedback banner */}
        {actionMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between border ${
              actionMessage.type === "success"
                ? "bg-emerald-950/80 border-emerald-700 text-emerald-200"
                : "bg-red-950/80 border-red-700 text-red-200"
            }`}
          >
            <span>{actionMessage.text}</span>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-slate-300 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Total Inflow Settled</span>
            <p className="text-xl font-black text-emerald-400">GH₵ {metrics.totalCompletedGhs.toFixed(2)}</p>
            <p className="text-[10px] text-slate-300 font-medium">Verified Paystack & MoMo deposits</p>
          </div>

          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Today&apos;s Inflow</span>
            <p className="text-xl font-black text-[#d6a735]">GH₵ {metrics.todayInflowGhs.toFixed(2)}</p>
            <p className="text-[10px] text-slate-300 font-medium">Since 00:00 UTC</p>
          </div>

          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Pending Confirmation</span>
            <p className="text-xl font-black text-amber-400">{metrics.pendingCount}</p>
            <p className="text-[10px] text-slate-300 font-medium">Awaiting MoMo webhook / verify</p>
          </div>

          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Total Deposit Records</span>
            <p className="text-xl font-black text-[#f5efdf]">{metrics.totalCount}</p>
            <p className="text-[10px] text-slate-300 font-medium">All recorded top-up attempts</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
            <input
              type="text"
              placeholder="Search reference, player username, phone, or TX ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 bg-[#041c17] border border-[#1a5e48] rounded-xl px-2 py-1 text-xs">
              <Filter size={13} className="text-slate-300" />
              <span className="text-slate-300 text-[11px]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-[#d6a735] font-bold focus:outline-none text-xs cursor-pointer"
              >
                <option value="all" className="bg-[#081c15] text-[#f5efdf]">All Statuses</option>
                <option value="completed" className="bg-[#081c15] text-emerald-400">Completed</option>
                <option value="pending" className="bg-[#081c15] text-amber-400">Pending</option>
                <option value="failed" className="bg-[#081c15] text-red-400">Failed</option>
              </select>
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-1.5 bg-[#041c17] border border-[#1a5e48] rounded-xl px-2 py-1 text-xs">
              <Smartphone size={13} className="text-slate-300" />
              <span className="text-slate-300 text-[11px]">Network:</span>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="bg-transparent text-[#d6a735] font-bold focus:outline-none text-xs cursor-pointer"
              >
                <option value="all" className="bg-[#081c15] text-[#f5efdf]">All Networks</option>
                <option value="mtn" className="bg-[#081c15] text-[#f5efdf]">MTN MoMo</option>
                <option value="vodafone" className="bg-[#081c15] text-[#f5efdf]">Telecel / Vodafone</option>
                <option value="airteltigo" className="bg-[#081c15] text-[#f5efdf]">AirtelTigo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Deposit Transactions Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
          <table className="w-full text-left text-xs text-[#f5efdf]">
            <thead className="bg-[#041c17] text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-[#1a5e48]">
              <tr>
                <th className="py-3 px-3.5">Reference & Date</th>
                <th className="py-3 px-3.5">Player / Account</th>
                <th className="py-3 px-3.5">Amount (GH₵)</th>
                <th className="py-3 px-3.5">Channel / Gateway</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a5e48]/50 bg-[#081c15]">
              {filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-300 italic">
                    No deposit transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((tx) => {
                  const user = userMap.get(tx.userToken);
                  let meta: Record<string, any> = {};
                  try {
                    meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
                  } catch {}

                  const isPending = tx.status === "pending";
                  const isCompleted = tx.status === "completed";
                  const isFailed = tx.status === "failed";
                  const channelName = meta.momoProvider || meta.channel || "Paystack MoMo";

                  return (
                    <tr key={tx.id} className="hover:bg-[#0c3b2e]/60 transition-colors">
                      {/* Reference & Date */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-[#d6a735] text-[11px] flex items-center gap-1">
                          {tx.reference}
                        </div>
                        <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />
                          {new Date(tx.createdAt).toLocaleString(undefined, {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </div>
                      </td>

                      {/* Player */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-[#f5efdf]">
                          {user?.username || (
                            <span className="font-mono text-slate-300">{tx.userToken.slice(0, 10)}...</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-300">
                          {user?.phoneNumber || meta.phone || "No verified phone"}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5">
                        <span className="text-sm font-black text-emerald-400">
                          +GH₵ {Math.abs(tx.amount).toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-300">{Math.abs(tx.amount)} Points Credited</div>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#041c17] text-slate-200 border border-[#1a5e48]">
                          {channelName}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                            <CheckCircle2 size={11} /> Settled
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600/40 animate-pulse">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-600/40">
                            <XCircle size={11} /> Failed
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleVerifyPaystack(tx.reference)}
                              disabled={verifyingRef === tx.reference || busy}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Re-verify deposit directly with Paystack API"
                            >
                              <RefreshCw size={11} className={verifyingRef === tx.reference ? "animate-spin" : ""} />
                              Verify
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="px-2.5 py-1 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Deposit Inspector Drawer / Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-lg w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-400">
                  <ArrowDownLeft size={16} />
                </span>
                <h3 className="font-bold text-sm text-[#f5efdf]">Deposit Transaction Inspector</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#041c17] rounded-xl border border-[#1a5e48]">
                <div>
                  <span className="text-slate-300 text-[10px] block">Reference</span>
                  <span className="font-mono font-bold text-[#d6a735]">{selectedTx.reference}</span>
                </div>
                <div>
                  <span className="text-slate-300 text-[10px] block">Status</span>
                  <span className="capitalize font-bold text-[#f5efdf]">{selectedTx.status}</span>
                </div>
                <div>
                  <span className="text-slate-300 text-[10px] block">Amount</span>
                  <span className="font-black text-emerald-400 text-sm">GH₵ {Math.abs(selectedTx.amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-300 text-[10px] block">Date</span>
                  <span className="text-slate-200">{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-300 text-[10px] block font-bold mb-1">User Details</span>
                <div className="p-3 bg-[#041c17] rounded-xl border border-[#1a5e48] space-y-1">
                  <p>Username: <strong className="text-[#f5efdf]">{userMap.get(selectedTx.userToken)?.username || "Unknown"}</strong></p>
                  <p>User Token: <span className="font-mono text-slate-300">{selectedTx.userToken}</span></p>
                  <p>Current Balance: <strong className="text-emerald-400">GH₵ {userMap.get(selectedTx.userToken)?.points ?? 0}</strong></p>
                </div>
              </div>

              <div>
                <span className="text-slate-300 text-[10px] block font-bold mb-1">Raw Gateway Payload</span>
                <pre className="p-2.5 bg-[#041c17] rounded-xl border border-[#1a5e48] text-[10px] font-mono text-slate-300 overflow-x-auto max-h-32">
                  {selectedTx.metaJson || "No extra metadata recorded."}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1a5e48]">
              {selectedTx.status === "pending" && (
                <button
                  type="button"
                  onClick={() => {
                    handleVerifyPaystack(selectedTx.reference);
                    setSelectedTx(null);
                  }}
                  className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs shadow-md"
                >
                  Verify With Paystack
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-3 py-1.5 bg-[#041c17] text-slate-200 rounded-xl text-xs hover:bg-[#0c3b2e]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
