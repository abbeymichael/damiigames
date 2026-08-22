"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Shield,
  Coins,
  History,
  Swords,
  Trophy,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Ban,
  LogOut,
  PhoneCall,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  MapPin,
  Mail,
  Award,
  Lock,
  Unlock,
  Edit3,
} from "lucide-react";
import type { Role, UserDetailPayload } from "@/lib/types";

export interface UserDetailModalProps {
  userToken: string;
  adminToken: string;
  onClose: () => void;
  onRefreshParent: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function UserDetailModal({
  userToken,
  adminToken,
  onClose,
  onRefreshParent,
  showToast,
}: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "ledger" | "matches" | "tournaments" | "audit">("overview");
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [data, setData] = useState<UserDetailPayload | null>(null);

  // Form states for quick actions
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustCurrency, setAdjustCurrency] = useState<"points" | "marbles">("points");
  const [adjustType, setAdjustType] = useState<"deposit" | "withdrawal" | "wager_refund" | "league_prize">("deposit");
  const [adjustReason, setAdjustReason] = useState("");

  const [selectedRole, setSelectedRole] = useState<Role>("user");
  const [roleReason, setRoleReason] = useState("");

  const [statusReason, setStatusReason] = useState("");
  const [phoneResetReason, setPhoneResetReason] = useState("");

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_user_details",
          token: adminToken,
          targetToken: userToken,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || "Failed to load user details");
      }
      setData(result);
      if (result.profile?.role) {
        setSelectedRole(result.profile.role);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error loading user details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userToken) {
      fetchUserDetails();
    }
  }, [userToken]);

  // Action: Adjust Balance
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(adjustAmount);
    if (isNaN(num) || num <= 0) {
      showToast("Please enter a valid positive amount", "error");
      return;
    }
    if (!adjustReason.trim()) {
      showToast("Please provide a reason for the adjustment", "error");
      return;
    }

    setActionBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_ledger_entry",
          token: adminToken,
          targetToken: userToken,
          type: adjustType,
          currency: adjustCurrency,
          amount: num,
          reference: `SUPPORT_MANUAL_${Date.now()}`,
          reason: adjustReason.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Failed to adjust balance");
      showToast(`Balance adjusted: ${adjustType} ${num} ${adjustCurrency}`, "success");
      setAdjustAmount("");
      setAdjustReason("");
      await fetchUserDetails();
      onRefreshParent();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Adjustment error", "error");
    } finally {
      setActionBusy(false);
    }
  };

  // Action: Change Status (Suspend, Reactivate, Ban, Unban)
  const handleChangeStatus = async (newStatus: "active" | "suspended" | "banned") => {
    if (newStatus !== "active" && !statusReason.trim()) {
      showToast("Please provide a reason for the status change", "error");
      return;
    }

    setActionBusy(true);
    try {
      let actionName = "reactivate_user";
      if (newStatus === "suspended") actionName = "suspend_user";
      else if (newStatus === "banned") actionName = "ban_user";

      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionName,
          token: adminToken,
          targetToken: userToken,
          reason: statusReason.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Status update failed");
      showToast(`User account status updated to ${newStatus.toUpperCase()}`, "success");
      setStatusReason("");
      await fetchUserDetails();
      onRefreshParent();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Status update error", "error");
    } finally {
      setActionBusy(false);
    }
  };

  // Action: Change Role
  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleReason.trim()) {
      showToast("Please provide an administrative reason for the role change", "error");
      return;
    }

    setActionBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_user_role",
          token: adminToken,
          targetToken: userToken,
          newRole: selectedRole,
          reason: roleReason.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Role update failed");
      showToast(`User role successfully changed to ${selectedRole.toUpperCase()}`, "success");
      setRoleReason("");
      await fetchUserDetails();
      onRefreshParent();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Role update error", "error");
    } finally {
      setActionBusy(false);
    }
  };

  // Action: Force Logout
  const handleForceLogout = async () => {
    if (!confirm("Are you sure you want to force logout this user and revoke all active sessions?")) return;

    setActionBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "force_logout_user",
          token: adminToken,
          targetToken: userToken,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Force logout failed");
      showToast(`All active sessions revoked for user (${result.revokedCount ?? 1} session(s))`, "success");
      await fetchUserDetails();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Logout error", "error");
    } finally {
      setActionBusy(false);
    }
  };

  // Action: Reset Phone Number
  const handleResetPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneResetReason.trim()) {
      showToast("Please provide a support reason to reset/unlink phone number", "error");
      return;
    }
    if (!confirm("This will remove the current phone number and require the player to re-verify. Proceed?")) return;

    setActionBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlink_reset_phone",
          token: adminToken,
          targetToken: userToken,
          reason: phoneResetReason.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "Phone reset failed");
      showToast("Phone number unlinked & reset successfully", "success");
      setPhoneResetReason("");
      await fetchUserDetails();
      onRefreshParent();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Phone reset error", "error");
    } finally {
      setActionBusy(false);
    }
  };

  const profile = data?.profile;
  const balances = data?.balances;
  const winRate = profile
    ? Math.round((profile.wins / Math.max(1, profile.wins + profile.losses + profile.draws)) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#06261f] border border-[#1a5e48] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-[#041d17] border-b border-[#1a5e48] flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d6a735] to-[#8a6814] flex items-center justify-center text-[#06261f] font-black text-2xl shadow-lg border border-[#f5efdf]/20 shrink-0">
              {profile?.username ? profile.username.slice(0, 2).toUpperCase() : <User size={28} />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-[#f5efdf] tracking-tight">{profile?.username || "Player Details"}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40">
                  {profile?.role || "user"}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    profile?.status === "banned"
                      ? "bg-red-950 text-red-300 border border-red-500/50"
                      : profile?.status === "suspended"
                      ? "bg-amber-950 text-amber-300 border border-amber-500/50"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-500/50"
                  }`}
                >
                  {profile?.status || "active"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5">
                {profile?.fullName && (
                  <span className="font-semibold text-slate-200">{profile.fullName}</span>
                )}
                {profile?.phoneNumber ? (
                  <span className="flex items-center gap-1 font-mono text-emerald-400">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    {profile.phoneNumber}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400/80 italic">
                    <AlertTriangle size={12} /> No Phone Linked
                  </span>
                )}
                {profile?.email && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <Mail size={12} />
                    {profile.email}
                  </span>
                )}
                {profile?.region && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <MapPin size={12} />
                    {profile.region} {profile.city ? `(${profile.city})` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchUserDetails}
              disabled={loading || actionBusy}
              className="p-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#1a5e48] rounded-xl text-xs font-bold transition-colors"
              title="Refresh User Data"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-[#041c17] hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-[#1a5e48] rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Financial & Performance Summary Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#05201a] border-b border-[#1a5e48] text-xs">
          <div className="p-3 bg-[#081c15] border border-[#114232] rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">Available Points / GH₵</span>
            <span className="text-base font-bold text-emerald-400">
              GH₵ {balances ? balances.availablePoints.toFixed(2) : "0.00"}
            </span>
          </div>
          <div className="p-3 bg-[#081c15] border border-[#114232] rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">Marbles Balance</span>
            <span className="text-base font-bold text-[#d6a735] flex items-center gap-1">
              <Coins size={14} />
              {balances ? balances.availableMarbles : 0} Marbles
            </span>
          </div>
          <div className="p-3 bg-[#081c15] border border-[#114232] rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">Escrow Locked</span>
            <span className="text-base font-bold text-amber-400">
              GH₵ {balances ? balances.escrowPoints.toFixed(2) : "0.00"}
            </span>
          </div>
          <div className="p-3 bg-[#081c15] border border-[#114232] rounded-xl">
            <span className="text-[11px] text-slate-400 block font-medium">Rating &amp; Win Rate</span>
            <span className="text-base font-bold text-[#f5efdf]">
              {profile?.rating || 1200} Elo <span className="text-xs text-slate-400 font-normal">({winRate}% W)</span>
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#1a5e48] bg-[#041c17] px-4 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Actions", icon: Shield },
            { id: "ledger", label: `Ledger History (${data?.ledgerEntries?.length || 0})`, icon: History },
            { id: "matches", label: `Matches (${data?.matches?.length || 0})`, icon: Swords },
            { id: "tournaments", label: `Tournaments (${(data?.tournamentEntries?.length || 0) + (data?.organizedTournaments?.length || 0)})`, icon: Trophy },
            { id: "audit", label: `Audit Trail (${data?.auditLogs?.length || 0})`, icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                  isSelected
                    ? "border-[#d6a735] text-[#d6a735] bg-[#081c15]"
                    : "border-transparent text-slate-300 hover:text-slate-100 hover:bg-[#081c15]/50"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-[#06261f] space-y-5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={24} className="animate-spin text-[#d6a735]" />
              <p className="text-sm font-medium">Loading user detail and historical records...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & ACTIONS */}
              {activeTab === "overview" && profile && (
                <div className="space-y-6">
                  {/* Detailed Profile Meta */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* User Identity Info */}
                    <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                        <User size={14} /> Identity &amp; Verification Status
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Username</span>
                          <span className="font-bold text-slate-100">{profile.username}</span>
                        </div>
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Role</span>
                          <span className="font-bold text-cyan-300 uppercase">{profile.role}</span>
                        </div>
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Phone Verification</span>
                          <span className="font-bold text-emerald-400">
                            {profile.phoneNumber ? "Verified Mobile" : "Unverified"}
                          </span>
                        </div>
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Region / Location</span>
                          <span className="font-bold text-slate-200">{profile.region || "Greater Accra"}</span>
                        </div>
                        <div className="p-2 bg-[#041c17] rounded-lg col-span-2">
                          <span className="text-slate-400 text-[10px] block">User Token / ID</span>
                          <span className="font-mono text-[11px] text-slate-300 select-all break-all">{profile.token}</span>
                        </div>
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Account Created</span>
                          <span className="text-slate-300 font-mono text-[11px]">
                            {new Date(profile.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Last Profile Update</span>
                          <span className="text-slate-300 font-mono text-[11px]">
                            {new Date(profile.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance & Win/Loss */}
                    <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                      <h4 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                        <Award size={14} /> Competitive Statistics
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 bg-[#041c17] rounded-lg border border-emerald-500/20">
                          <span className="text-[10px] text-emerald-400 font-bold block uppercase">Victories</span>
                          <span className="text-base font-black text-emerald-300">{profile.wins}</span>
                        </div>
                        <div className="p-2.5 bg-[#041c17] rounded-lg border border-red-500/20">
                          <span className="text-[10px] text-red-400 font-bold block uppercase">Defeats</span>
                          <span className="text-base font-black text-red-300">{profile.losses}</span>
                        </div>
                        <div className="p-2.5 bg-[#041c17] rounded-lg border border-amber-500/20">
                          <span className="text-[10px] text-amber-400 font-bold block uppercase">Draws</span>
                          <span className="text-base font-black text-amber-300">{profile.draws}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Current Win Streak</span>
                          <span className="font-bold text-[#d6a735]">{profile.winStreak || 0} consecutive</span>
                        </div>
                        <div className="p-2 bg-[#041c17] rounded-lg">
                          <span className="text-slate-400 text-[10px] block">Best All-Time Streak</span>
                          <span className="font-bold text-slate-200">{profile.bestStreak || profile.winStreak || 0} matches</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Administrative Quick Actions Box */}
                  <div className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl space-y-4">
                    <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                      <Shield size={16} className="text-[#d6a735]" /> Administrative Intervention Controls
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                      {/* ACTION: Adjust Balance */}
                      <form onSubmit={handleAdjustBalance} className="p-4 bg-[#041c17] border border-[#114232] rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <Coins size={14} /> Manually Adjust Balance (Double-Entry)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Executes an audited ledger entry for customer support or error correction.
                        </p>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-300 block mb-1">Currency</label>
                            <select
                              value={adjustCurrency}
                              onChange={(e) => setAdjustCurrency(e.target.value as "points" | "marbles")}
                              className="w-full px-2 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-200"
                            >
                              <option value="points">Points (GH₵)</option>
                              <option value="marbles">Marbles</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-300 block mb-1">Entry Type</label>
                            <select
                              value={adjustType}
                              onChange={(e) => setAdjustType(e.target.value as typeof adjustType)}
                              className="w-full px-2 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-200"
                            >
                              <option value="deposit">Deposit (+)</option>
                              <option value="withdrawal">Withdrawal (-)</option>
                              <option value="wager_refund">Wager Refund (+)</option>
                              <option value="league_prize">League Prize (+)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-300 block mb-1">Amount</label>
                            <input
                              type="number"
                              step="any"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              placeholder="e.g. 50"
                              className="w-full px-2 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-100"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Mandatory Audit Reason</label>
                          <input
                            type="text"
                            value={adjustReason}
                            onChange={(e) => setAdjustReason(e.target.value)}
                            placeholder="e.g., Momo deposit reconciliation ticket #4092"
                            className="w-full px-2.5 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-100"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={actionBusy}
                          className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
                        >
                          <Coins size={13} /> Apply Ledger Adjustment
                        </button>
                      </form>

                      {/* ACTION: Account Standing & Moderation */}
                      <div className="p-4 bg-[#041c17] border border-[#114232] rounded-xl space-y-3 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Ban size={14} /> Account Standing &amp; Security Controls
                          </h4>
                          <p className="text-[11px] text-slate-400 mb-2">
                            Suspend to temporarily prevent match creation/wagers, or ban permanently.
                          </p>

                          <div className="space-y-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-300 block mb-1">Status Action Reason</label>
                              <input
                                type="text"
                                value={statusReason}
                                onChange={(e) => setStatusReason(e.target.value)}
                                placeholder="e.g., Suspected collusion in room DAMII-928"
                                className="w-full px-2.5 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-100"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                              {profile.status === "suspended" ? (
                                <button
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={() => handleChangeStatus("active")}
                                  className="flex-1 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <Unlock size={12} /> Reactivate Account
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={() => handleChangeStatus("suspended")}
                                  className="flex-1 py-1.5 bg-amber-900/80 hover:bg-amber-800 text-amber-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <Lock size={12} /> Suspend Account
                                </button>
                              )}

                              {profile.status === "banned" ? (
                                <button
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={() => handleChangeStatus("active")}
                                  className="flex-1 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <Unlock size={12} /> Unban Account
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={actionBusy}
                                  onClick={() => handleChangeStatus("banned")}
                                  className="flex-1 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 border border-red-500/40 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <Ban size={12} /> Permanent Ban
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Force Logout */}
                        <div className="pt-2 border-t border-[#114232] flex items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">Session Management</span>
                            <span className="text-[10px] text-slate-400">Kill active browser/device tokens.</span>
                          </div>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={handleForceLogout}
                            className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <LogOut size={12} /> Force Logout
                          </button>
                        </div>
                      </div>

                      {/* ACTION: Change Role */}
                      <form onSubmit={handleChangeRole} className="p-4 bg-[#041c17] border border-[#114232] rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                          <Edit3 size={14} /> Manually Assign Role
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Directly override user role with system audit logging.
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-slate-300 block mb-1">Target Role</label>
                            <select
                              value={selectedRole}
                              onChange={(e) => setSelectedRole(e.target.value as Role)}
                              className="w-full px-2 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-200"
                            >
                              <option value="user">User (Standard)</option>
                              <option value="player">Player (Rated)</option>
                              <option value="organizer">Organizer</option>
                              <option value="facilitator">Facilitator</option>
                              <option value="treasurer">Treasurer</option>
                              <option value="admin">Admin</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-300 block mb-1">Audit Reason</label>
                            <input
                              type="text"
                              value={roleReason}
                              onChange={(e) => setRoleReason(e.target.value)}
                              placeholder="e.g. Approved tournament organizer"
                              className="w-full px-2 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-100"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={actionBusy}
                          className="w-full py-2 bg-cyan-800 hover:bg-cyan-700 disabled:opacity-50 text-cyan-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Shield size={13} /> Update Assigned Role
                        </button>
                      </form>

                      {/* ACTION: Reset / Unlink Phone */}
                      <form onSubmit={handleResetPhone} className="p-4 bg-[#041c17] border border-[#114232] rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                          <PhoneCall size={14} /> Unlink / Reset Phone Number
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Support case: user lost SIM or switched numbers. Requires verification reason.
                        </p>

                        <div>
                          <label className="text-[10px] font-bold text-slate-300 block mb-1">Support Case Reason</label>
                          <input
                            type="text"
                            value={phoneResetReason}
                            onChange={(e) => setPhoneResetReason(e.target.value)}
                            placeholder="e.g. Identity verified via Ghana Card support ticket #8201"
                            className="w-full px-2.5 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-100"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={actionBusy || !profile.phoneNumber}
                          className="w-full py-2 bg-purple-900 hover:bg-purple-800 disabled:opacity-50 text-purple-100 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <PhoneCall size={13} /> Unlink Phone Number
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LEDGER HISTORY */}
              {activeTab === "ledger" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                      <History size={16} className="text-[#d6a735]" /> Double-Entry Ledger History
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">{data?.ledgerEntries?.length || 0} entries</span>
                  </div>

                  <div className="overflow-x-auto border border-[#114232] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#041d17] border-b border-[#114232] text-slate-300 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Account</th>
                          <th className="py-2.5 px-3">Direction</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3">Metadata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#114232]">
                        {!data?.ledgerEntries || data.ledgerEntries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                              No ledger entries recorded for this user.
                            </td>
                          </tr>
                        ) : (
                          data.ledgerEntries.map((entry, idx) => (
                            <tr key={`${entry.id || "entry"}-${idx}`} className="hover:bg-[#0c3b2e]/40 transition-colors">
                              <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                                {new Date(entry.recordedAt).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 font-semibold uppercase text-cyan-300">
                                {entry.referenceType}
                              </td>
                              <td className="py-2 px-3 text-slate-300 capitalize">{entry.accountType}</td>
                              <td className="py-2 px-3 font-bold">
                                {entry.direction === "credit" ? (
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <ArrowDownLeft size={12} /> Credit
                                  </span>
                                ) : (
                                  <span className="text-red-400 flex items-center gap-1">
                                    <ArrowUpRight size={12} /> Debit
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-bold text-slate-100">
                                {entry.currency === "marbles" ? `${entry.amount} Marbles` : `GH₵ ${entry.amount}`}
                              </td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-400">{entry.referenceId}</td>
                              <td className="py-2 px-3 text-[11px] text-slate-400 max-w-[200px] truncate">
                                {entry.metadataJson}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: MATCH HISTORY */}
              {activeTab === "matches" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                      <Swords size={16} className="text-[#d6a735]" /> Match History &amp; Active Arenas
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">{data?.matches?.length || 0} matches</span>
                  </div>

                  <div className="overflow-x-auto border border-[#114232] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#041d17] border-b border-[#114232] text-slate-300 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Room Code</th>
                          <th className="py-2.5 px-3">Format</th>
                          <th className="py-2.5 px-3">Opponent</th>
                          <th className="py-2.5 px-3">Wager Pot</th>
                          <th className="py-2.5 px-3">Result</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#114232]">
                        {!data?.matches || data.matches.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                              No match records found.
                            </td>
                          </tr>
                        ) : (
                          data.matches.map((m, idx) => (
                            <tr key={`${m.id || "match"}-${idx}`} className="hover:bg-[#0c3b2e]/40 transition-colors">
                              <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                                {new Date(m.playedAt).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-[#d6a735]">{m.roomCode}</td>
                              <td className="py-2 px-3 text-slate-200">{m.gameType || "10x10 Damii"}</td>
                              <td className="py-2 px-3 font-bold text-slate-100">{m.opponentName}</td>
                              <td className="py-2 px-3 font-bold text-emerald-400">
                                {m.wagerPoints ? `GH₵ ${m.wagerPoints.toFixed(2)}` : "Casual"}
                              </td>
                              <td className="py-2 px-3 font-bold">
                                {m.result === "win" ? (
                                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 rounded text-[10px]">
                                    Victory
                                  </span>
                                ) : m.result === "loss" ? (
                                  <span className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-500/30 rounded text-[10px]">
                                    Defeat
                                  </span>
                                ) : m.result === "draw" ? (
                                  <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/30 rounded text-[10px]">
                                    Draw
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]">
                                    {m.status}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-slate-400 capitalize">{m.status}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: TOURNAMENTS */}
              {activeTab === "tournaments" && (
                <div className="space-y-6">
                  {/* Joined Tournaments */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                      <Trophy size={16} className="text-[#d6a735]" /> Joined Tournaments &amp; Brackets
                    </h3>
                    <div className="overflow-x-auto border border-[#114232] rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#041d17] border-b border-[#114232] text-slate-300 font-bold uppercase">
                            <th className="py-2.5 px-3">Tournament</th>
                            <th className="py-2.5 px-3">Joined Date</th>
                            <th className="py-2.5 px-3">Seed</th>
                            <th className="py-2.5 px-3">Checked In</th>
                            <th className="py-2.5 px-3">Entry Fee</th>
                            <th className="py-2.5 px-3">Roster Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#114232]">
                          {!data?.tournamentEntries || data.tournamentEntries.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                                No tournament participation records found.
                              </td>
                            </tr>
                          ) : (
                            data.tournamentEntries.map((te, idx) => (
                              <tr key={idx} className="hover:bg-[#0c3b2e]/40 transition-colors">
                                <td className="py-2 px-3 font-bold text-slate-100">{te.leagueTitle}</td>
                                <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                                  {new Date(te.joinedAt).toLocaleDateString()}
                                </td>
                                <td className="py-2 px-3 text-[#d6a735] font-bold">#{te.seed || "Unseeded"}</td>
                                <td className="py-2 px-3">
                                  {te.checkedIn ? (
                                    <span className="text-emerald-400 font-bold">Yes</span>
                                  ) : (
                                    <span className="text-slate-400">No</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 font-bold text-emerald-400">
                                  GH₵ {te.entryFeePoints.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 uppercase text-[10px] font-bold text-cyan-300">
                                  {te.status}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Organized Tournaments */}
                  {data?.organizedTournaments && data.organizedTournaments.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-[#114232]">
                      <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                        <Award size={16} className="text-cyan-400" /> Tournaments Created as Organizer
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.organizedTournaments.map((l, idx) => (
                          <div key={`${l.id || "tourn"}-${idx}`} className="p-3 bg-[#041c17] border border-[#114232] rounded-xl space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-100">{l.title}</span>
                              <span className="px-2 py-0.5 bg-[#0c3b2e] text-[#d6a735] font-bold rounded text-[10px] uppercase">
                                {l.status}
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px]">Format: {l.format} | Max: {l.maxParticipants} players</div>
                            <div className="text-emerald-400 font-bold">Prize Pool: GH₵ {l.prizePoolPoints.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: AUDIT TRAIL */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                      <FileText size={16} className="text-[#d6a735]" /> Administrative Audit Trail
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">{data?.auditLogs?.length || 0} records</span>
                  </div>

                  <div className="overflow-x-auto border border-[#114232] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#041d17] border-b border-[#114232] text-slate-300 font-bold uppercase">
                          <th className="py-2.5 px-3">Date / Time</th>
                          <th className="py-2.5 px-3">Admin</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Reason / Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#114232]">
                        {!data?.auditLogs || data.auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                              No administrative audit entries found for this user.
                            </td>
                          </tr>
                        ) : (
                          data.auditLogs.map((log, idx) => (
                            <tr key={`${log.id || "log"}-${idx}`} className="hover:bg-[#0c3b2e]/40 transition-colors">
                              <td className="py-2 px-3 text-slate-300 font-mono text-[11px]">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 font-bold text-[#d6a735]">{log.adminName}</td>
                              <td className="py-2 px-3 font-mono font-semibold uppercase text-cyan-300">
                                {log.action}
                              </td>
                              <td className="py-2 px-3 text-slate-300 text-[11px] max-w-xs break-words">
                                {log.metadataJson}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#041d17] border-t border-[#1a5e48] flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            User Token: <span className="text-slate-200 select-all">{userToken}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#f5efdf] text-xs font-bold rounded-xl border border-[#1a5e48] transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserDetailModal;
