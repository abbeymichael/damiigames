"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowUpRight,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Smartphone,
  Filter,
  Eye,
  Send,
  RotateCcw,
  Ban,
  Download,
  Wallet,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type { WalletTransaction, Profile } from "@/lib/types";

export interface WithdrawalsTableProps {
  transactions: WalletTransaction[];
  users?: Profile[];
  token: string;
  adminSecret?: string;
  busy: boolean;
  onRefresh: () => void;
}

export function WithdrawalsTable({
  transactions,
  users = [],
  token,
  adminSecret,
  busy,
  onRefresh,
}: WithdrawalsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  // Paystack Balance state
  const [paystackBalance, setPaystackBalance] = useState<{
    configured: boolean;
    ghsBalance: number;
    error?: string;
    loading: boolean;
  }>({
    configured: false,
    ghsBalance: 0,
    loading: true,
  });

  // PalmPay Balance state
  const [palmpayBalance, setPalmpayBalance] = useState<{
    configured: boolean;
    availableBalance: number;
    currency: string;
    error?: string;
    loading: boolean;
  }>({
    configured: false,
    availableBalance: 0,
    currency: "GHS",
    loading: true,
  });

  // Modal states
  const [rejectModalTx, setRejectModalTx] = useState<WalletTransaction | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [payoutInProgressId, setPayoutInProgressId] = useState<string | null>(null);
  const [batchInProgress, setBatchInProgress] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter strictly to withdrawals
  const withdrawalTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.type === "withdrawal" || tx.amount < 0);
  }, [transactions]);

  // Create fast user lookup map
  const userMap = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const u of users) {
      map.set(u.token, u);
      if (u.id) map.set(u.id, u);
    }
    return map;
  }, [users]);

  // Fetch real-time Paystack balance
  const fetchPaystackBalance = useCallback(async () => {
    setPaystackBalance((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_paystack_balance",
          token,
          secret: adminSecret,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaystackBalance({
          configured: Boolean(data.configured),
          ghsBalance: Number(data.ghsBalance || 0),
          error: data.error,
          loading: false,
        });
      } else {
        setPaystackBalance({
          configured: false,
          ghsBalance: 0,
          error: data.error || "Failed to query Paystack balance",
          loading: false,
        });
      }
    } catch (err) {
      setPaystackBalance({
        configured: false,
        ghsBalance: 0,
        error: err instanceof Error ? err.message : "Network error",
        loading: false,
      });
    }
  }, [token, adminSecret]);

  // Fetch real-time PalmPay balance
  const fetchPalmpayBalance = useCallback(async () => {
    setPalmpayBalance((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_palmpay_balance",
          token,
          secret: adminSecret,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && !data.error) {
        setPalmpayBalance({
          configured: true,
          availableBalance: Number(data.availableBalance || 0),
          currency: data.currency || "GHS",
          error: undefined,
          loading: false,
        });
      } else {
        setPalmpayBalance({
          configured: false,
          availableBalance: 0,
          currency: "GHS",
          error: data.error || data.respMsg || "PalmPay balance unconfigured",
          loading: false,
        });
      }
    } catch (err) {
      setPalmpayBalance({
        configured: false,
        availableBalance: 0,
        currency: "GHS",
        error: err instanceof Error ? err.message : "Network error",
        loading: false,
      });
    }
  }, [token, adminSecret]);

  useEffect(() => {
    fetchPaystackBalance();
    fetchPalmpayBalance();
  }, [fetchPaystackBalance, fetchPalmpayBalance]);

  // Filtered withdrawals list
  const filteredWithdrawals = useMemo(() => {
    return withdrawalTransactions.filter((tx) => {
      // Status filter
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;

      const user = userMap.get(tx.userToken);
      let meta: Record<string, any> = {};
      try {
        meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
      } catch {}

      const provider = meta.momoProvider || meta.provider || user?.momoNetwork || "MTN";

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
        const phoneMatch = (meta.momoNumber || user?.phoneNumber || "").toLowerCase().includes(term);
        const transferCodeMatch = (meta.transferCode || "").toLowerCase().includes(term);
        return refMatch || idMatch || usernameMatch || phoneMatch || transferCodeMatch;
      }

      return true;
    });
  }, [withdrawalTransactions, statusFilter, providerFilter, searchTerm, userMap]);

  // Pending withdrawals
  const pendingWithdrawals = useMemo(() => {
    return withdrawalTransactions.filter((tx) => tx.status === "pending");
  }, [withdrawalTransactions]);

  // Metrics summary
  const metrics = useMemo(() => {
    let totalCompletedGhs = 0;
    let pendingGhs = 0;
    let failedCount = 0;

    for (const tx of withdrawalTransactions) {
      const amount = Math.abs(tx.amount);
      if (tx.status === "completed") {
        totalCompletedGhs += amount;
      } else if (tx.status === "pending") {
        pendingGhs += amount;
      } else if (tx.status === "failed") {
        failedCount++;
      }
    }

    return {
      totalCompletedGhs,
      pendingGhs,
      pendingCount: pendingWithdrawals.length,
      failedCount,
      totalCount: withdrawalTransactions.length,
    };
  }, [withdrawalTransactions, pendingWithdrawals]);

  // Handle single payout execution via Paystack or PalmPay
  async function handleProcessPayout(tx: WalletTransaction, provider?: "paystack" | "palmpay") {
    setPayoutInProgressId(tx.id);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "process_payout",
          token,
          secret: adminSecret,
          transactionId: tx.id,
          reference: tx.reference,
          provider,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to process payout");
      }
      const providerLabel = data.provider === "palmpay" ? "PalmPay" : "Paystack";
      const codeOrRef = data.transfer?.transferCode || data.transfer?.outOrderNo || "Dispatched";
      setActionMessage({
        type: "success",
        text: `Payout initiated successfully via ${providerLabel}! Ref: ${codeOrRef}`,
      });
      onRefresh();
      fetchPaystackBalance();
      fetchPalmpayBalance();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Payout execution error",
      });
    } finally {
      setPayoutInProgressId(null);
    }
  }

  // Handle rejection and automatic Points refund
  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectModalTx || !rejectionReason.trim()) return;

    setActionMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_withdrawal",
          token,
          secret: adminSecret,
          transactionId: rejectModalTx.id,
          reference: rejectModalTx.reference,
          reason: rejectionReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to reject withdrawal");
      }
      setActionMessage({
        type: "success",
        text: `Withdrawal rejected and GH₵ ${Math.abs(rejectModalTx.amount).toFixed(2)} refunded to user balance.`,
      });
      setRejectModalTx(null);
      setRejectionReason("");
      onRefresh();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Withdrawal rejection error",
      });
    }
  }

  // Handle Batch Payout Execution
  async function handleBatchPayout() {
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : pendingWithdrawals.map((t) => t.id);
    if (targetIds.length === 0) return;

    if (!confirm(`Are you sure you want to disburse ${targetIds.length} withdrawal(s) via Paystack?`)) {
      return;
    }

    setBatchInProgress(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch_process_payouts",
          token,
          secret: adminSecret,
          transactionIds: targetIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Batch processing failed");
      }
      setActionMessage({
        type: "success",
        text: `Batch processing finished: ${data.successful} successful, ${data.failed} failed.`,
      });
      setSelectedIds(new Set());
      onRefresh();
      fetchPaystackBalance();
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Batch payout error",
      });
    } finally {
      setBatchInProgress(false);
    }
  }

  // Toggle selection
  function toggleSelectAll() {
    if (selectedIds.size === filteredWithdrawals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWithdrawals.map((t) => t.id)));
    }
  }

  function toggleSelectId(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  // Export CSV
  function handleExportCsv() {
    if (filteredWithdrawals.length === 0) return;
    const headers = ["Transaction ID", "User", "Amount (GHS)", "MoMo Number", "Provider", "Status", "Reference", "Created At"];
    const rows = filteredWithdrawals.map((tx) => {
      const user = userMap.get(tx.userToken);
      let meta: Record<string, any> = {};
      try {
        meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
      } catch {}
      return [
        tx.id,
        user?.username || tx.userToken.slice(0, 8),
        Math.abs(tx.amount).toFixed(2),
        meta.momoNumber || user?.phoneNumber || "",
        meta.momoProvider || user?.momoNetwork || "MTN",
        tx.status,
        tx.reference,
        new Date(tx.createdAt).toISOString(),
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `damii_payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const isBalanceLow = paystackBalance.configured && paystackBalance.ghsBalance < metrics.pendingGhs;

  return (
    <div className="space-y-6">
      {/* Header Banner & Paystack Gateway Status */}
      <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-950/80 border border-amber-800/80 rounded-xl text-[#d6a735]">
                <ArrowUpRight size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#f5efdf]">Withdrawals & Multi-Gateway Payouts</h3>
                <p className="text-xs text-slate-300">
                  Process cashout requests via Paystack (MoMo) or PalmPay (Instant Bank & MoMo) directly from admin controls.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onRefresh();
                fetchPaystackBalance();
                fetchPalmpayBalance();
              }}
              disabled={busy || paystackBalance.loading || palmpayBalance.loading}
              className="px-3 py-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={14} className={busy || paystackBalance.loading || palmpayBalance.loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredWithdrawals.length === 0}
              className="px-3 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
            {pendingWithdrawals.length > 0 && (
              <button
                type="button"
                onClick={handleBatchPayout}
                disabled={batchInProgress || isBalanceLow}
                className="px-3.5 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
              >
                <Send size={14} className={batchInProgress ? "animate-spin" : ""} />
                {selectedIds.size > 0 ? `Process Selected (${selectedIds.size})` : `Process All Pending (${pendingWithdrawals.length})`}
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

        {/* Paystack Balance & Float Warning */}
        {isBalanceLow && (
          <div className="p-3 bg-amber-950/80 border border-amber-700 text-amber-200 rounded-xl text-xs flex items-center gap-2 shadow-md">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <div>
              <strong>Low Paystack Float Balance:</strong> Your available Paystack balance (GH₵ {paystackBalance.ghsBalance.toFixed(2)}) is less than total pending cashouts (GH₵ {metrics.pendingGhs.toFixed(2)}). Payouts exceeding available balance will be rejected by the telecom networks.
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Paystack Balance Card */}
          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Paystack Float</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-lg font-black text-[#d6a735]">
              {paystackBalance.loading ? "Loading..." : `GH₵ ${paystackBalance.ghsBalance.toFixed(2)}`}
            </p>
            <p className="text-[10px] text-slate-300 font-medium">Available for MoMo transfers</p>
          </div>

          {/* PalmPay Balance Card */}
          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">PalmPay Balance</span>
              <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
            </div>
            <p className="text-lg font-black text-teal-300">
              {palmpayBalance.loading
                ? "Loading..."
                : palmpayBalance.configured
                ? `${palmpayBalance.currency === "GHS" ? "GH₵" : palmpayBalance.currency} ${palmpayBalance.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "Not Configured"}
            </p>
            <p className="text-[10px] text-slate-300 font-medium">Available merchant balance</p>
          </div>

          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Pending Queue</span>
            <p className="text-lg font-black text-amber-400">
              GH₵ {metrics.pendingGhs.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-300">({metrics.pendingCount})</span>
            </p>
            <p className="text-[10px] text-slate-300 font-medium">Awaiting cashout</p>
          </div>

          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Total Disbursed</span>
            <p className="text-lg font-black text-emerald-400">GH₵ {metrics.totalCompletedGhs.toFixed(2)}</p>
            <p className="text-[10px] text-slate-300 font-medium">Transferred to player wallets</p>
          </div>

          <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-300 tracking-wider">Failed / Refunded</span>
            <p className="text-lg font-black text-red-400">{metrics.failedCount}</p>
            <p className="text-[10px] text-slate-300 font-medium">Declined or rejected</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
            <input
              type="text"
              placeholder="Search reference, player, phone, or transfer code..."
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
                <option value="pending" className="bg-[#081c15] text-amber-400">Pending Queue</option>
                <option value="completed" className="bg-[#081c15] text-emerald-400">Completed Payouts</option>
                <option value="failed" className="bg-[#081c15] text-red-400">Failed / Declined</option>
              </select>
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-1.5 bg-[#041c17] border border-[#1a5e48] rounded-xl px-2 py-1 text-xs">
              <Smartphone size={13} className="text-slate-300" />
              <span className="text-slate-300 text-[11px]">Provider:</span>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="bg-transparent text-[#d6a735] font-bold focus:outline-none text-xs cursor-pointer"
              >
                <option value="all" className="bg-[#081c15] text-[#f5efdf]">All Providers</option>
                <option value="mtn" className="bg-[#081c15] text-[#f5efdf]">MTN Mobile Money</option>
                <option value="vodafone" className="bg-[#081c15] text-[#f5efdf]">Telecel / Vodafone</option>
                <option value="airteltigo" className="bg-[#081c15] text-[#f5efdf]">AirtelTigo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Withdrawals Table */}
        <div className="overflow-x-auto rounded-xl border border-[#1a5e48]">
          <table className="w-full text-left text-xs text-[#f5efdf]">
            <thead className="bg-[#041c17] text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-[#1a5e48]">
              <tr>
                <th className="py-3 px-3 w-8">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-slate-300 hover:text-white"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredWithdrawals.length ? (
                      <CheckSquare size={16} className="text-[#d6a735]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3.5">Reference & Date</th>
                <th className="py-3 px-3.5">Player / Phone</th>
                <th className="py-3 px-3.5">Payout Amount</th>
                <th className="py-3 px-3.5">Destination MoMo</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a5e48]/50 bg-[#081c15]">
              {filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-300 italic">
                    No withdrawal requests found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredWithdrawals.map((tx) => {
                  const user = userMap.get(tx.userToken);
                  let meta: Record<string, any> = {};
                  try {
                    meta = tx.metaJson ? JSON.parse(tx.metaJson) : {};
                  } catch {}

                  const isPending = tx.status === "pending";
                  const isCompleted = tx.status === "completed";
                  const isFailed = tx.status === "failed";
                  const momoNumber = meta.momoNumber || user?.phoneNumber || "N/A";
                  const momoProvider = meta.momoProvider || user?.momoNetwork || "MTN";
                  const isProcessingThis = payoutInProgressId === tx.id;
                  const isSelected = selectedIds.has(tx.id);

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-[#0c3b2e]/60 transition-colors ${
                        isSelected ? "bg-[#0c3b2e]/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectId(tx.id)}
                          className="text-slate-300 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-[#d6a735]" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      {/* Reference & Date */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-[#d6a735] text-[11px]">
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
                          Balance: GH₵ {user?.points ?? 0}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-3.5">
                        <span className="text-sm font-black text-amber-400">
                          GH₵ {Math.abs(tx.amount).toFixed(2)}
                        </span>
                        <div className="text-[10px] text-slate-300">{Math.abs(tx.amount)} Points Debited</div>
                      </td>

                      {/* Destination MoMo */}
                      <td className="py-3 px-3.5">
                        <div className="font-mono font-bold text-[#f5efdf] text-[11px]">
                          {momoNumber}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#041c17] text-slate-200 border border-[#1a5e48]">
                          {momoProvider}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/40">
                            <CheckCircle2 size={11} /> Disbursed
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600/40 animate-pulse">
                            <Clock size={11} /> Pending Payout
                          </span>
                        )}
                        {isFailed && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-600/40">
                            <XCircle size={11} /> Refunded
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleProcessPayout(tx, "paystack")}
                                disabled={isProcessingThis || busy}
                                className="px-2.5 py-1.5 bg-[#082a20] hover:bg-[#0e3b2e] text-[#d6a735] border border-[#d6a735]/40 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-sm transition-colors disabled:opacity-50"
                                title="Transfer money directly via Paystack"
                              >
                                <Send size={11} className={isProcessingThis ? "animate-spin" : ""} />
                                Paystack
                              </button>
                              <button
                                type="button"
                                onClick={() => handleProcessPayout(tx, "palmpay")}
                                disabled={isProcessingThis || busy}
                                className="px-2.5 py-1.5 bg-[#062922] hover:bg-[#0c3830] text-teal-300 border border-teal-500/40 font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-sm transition-colors disabled:opacity-50"
                                title="Transfer money directly via PalmPay"
                              >
                                <Send size={11} className={isProcessingThis ? "animate-spin" : ""} />
                                PalmPay
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModalTx(tx)}
                                disabled={isProcessingThis || busy}
                                className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Decline request and refund Points to user"
                              >
                                <Ban size={12} />
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTx(tx)}
                            className="px-2 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Eye size={12} />
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

      {/* Reject Withdrawal Modal */}
      {rejectModalTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#081c15] border border-red-800 text-[#f5efdf] max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-red-800/60 pb-3">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
                <Ban size={18} /> Reject & Refund Withdrawal Request
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRejectModalTx(null);
                  setRejectionReason("");
                }}
                className="text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-[#041c17] rounded-xl border border-[#1a5e48] space-y-1">
                <p>User: <strong>{userMap.get(rejectModalTx.userToken)?.username || "Player"}</strong></p>
                <p>Refund Amount: <strong className="text-emerald-400">GH₵ {Math.abs(rejectModalTx.amount).toFixed(2)}</strong></p>
                <p>Reference: <span className="font-mono text-slate-300">{rejectModalTx.reference}</span></p>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">Audit Rejection Reason (Required)</label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State reason for declining (e.g. Unverified recipient number, daily security flag, requested by user)..."
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-slate-300 mt-1">
                  Upon rejection, GH₵ {Math.abs(rejectModalTx.amount).toFixed(2)} Points will immediately be refunded back into the player&apos;s wallet balance, and an audit ledger entry will be recorded.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1a5e48]">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalTx(null);
                    setRejectionReason("");
                  }}
                  className="px-3 py-2 bg-[#041c17] text-slate-200 rounded-xl hover:bg-[#0c3b2e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  Confirm Rejection & Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Inspector Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-lg w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-950 border border-amber-800 rounded-lg text-amber-400">
                  <ArrowUpRight size={16} />
                </span>
                <h3 className="font-bold text-sm text-[#f5efdf]">Withdrawal Payout Inspector</h3>
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
                  <span className="font-black text-amber-400 text-sm">GH₵ {Math.abs(selectedTx.amount).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-300 text-[10px] block">Date</span>
                  <span className="text-slate-200">{new Date(selectedTx.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-300 text-[10px] block font-bold mb-1">User & Recipient Details</span>
                <div className="p-3 bg-[#041c17] rounded-xl border border-[#1a5e48] space-y-1">
                  <p>Username: <strong className="text-[#f5efdf]">{userMap.get(selectedTx.userToken)?.username || "Unknown"}</strong></p>
                  <p>User Token: <span className="font-mono text-slate-300">{selectedTx.userToken}</span></p>
                  <p>Verified Phone: <strong className="text-[#d6a735]">{userMap.get(selectedTx.userToken)?.phoneNumber || "N/A"}</strong></p>
                </div>
              </div>

              <div>
                <span className="text-slate-300 text-[10px] block font-bold mb-1">Paystack Transfer Metadata</span>
                <pre className="p-2.5 bg-[#041c17] rounded-xl border border-[#1a5e48] text-[10px] font-mono text-slate-300 overflow-x-auto max-h-32">
                  {selectedTx.metaJson || "No extra metadata recorded."}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1a5e48]">
              {selectedTx.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleProcessPayout(selectedTx, "paystack");
                      setSelectedTx(null);
                    }}
                    className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs shadow-md flex items-center gap-1"
                  >
                    <Send size={12} /> Paystack
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleProcessPayout(selectedTx, "palmpay");
                      setSelectedTx(null);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1"
                  >
                    <Send size={12} /> PalmPay
                  </button>
                </>
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
