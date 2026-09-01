"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldAlert,
  Sliders,
  Clock,
  Coins,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Lock,
  Unlock,
  Radio,
  Trash2,
  Eye,
  SlidersHorizontal,
  Scale,
  Zap,
  Save,
  Check,
  Bell,
  RadioTower,
  Gamepad2,
} from "lucide-react";
import type { AdminSettings, GameCatalogItem } from "@/lib/types";
import { NotificationSettings } from "@/components/admin/NotificationSettings";
import { GamesCatalogTable } from "@/components/admin/GamesCatalogTable";
import { GameLimitsTable } from "@/components/admin/GameLimitsTable";

interface PlatformSettingsProps {
  token: string;
  adminSecret?: string;
  initialSettings?: AdminSettings;
  onSettingsUpdated?: (newSettings: AdminSettings) => void;
  games?: GameCatalogItem[];
  onRefreshGames?: () => void;
  initialSection?: "fees" | "games" | "game_limits" | "timers" | "limits" | "breakers" | "rating" | "notifications" | "maintenance";
}

export function PlatformSettings({
  token,
  adminSecret,
  initialSettings,
  onSettingsUpdated,
  games,
  onRefreshGames,
  initialSection,
}: PlatformSettingsProps) {
  const [activeSection, setActiveSection] = useState<
    "fees" | "games" | "game_limits" | "timers" | "limits" | "breakers" | "rating" | "notifications" | "maintenance"
  >(initialSection || "fees");

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [wagerFeePercent, setWagerFeePercent] = useState<number>(5);
  const [tournamentFeePercent, setTournamentFeePercent] = useState<number>(10);
  const [pointsPerGhsBuy, setPointsPerGhsBuy] = useState<number>(1);
  const [pointsPerGhsWithdraw, setPointsPerGhsWithdraw] = useState<number>(1);

  const [minDepositGhs, setMinDepositGhs] = useState<number>(5);
  const [maxDepositGhs, setMaxDepositGhs] = useState<number>(5000);
  const [minWithdrawalGhs, setMinWithdrawalGhs] = useState<number>(10);
  const [maxWithdrawalGhs, setMaxWithdrawalGhs] = useState<number>(2000);
  const [maxDailyWithdrawalGhs, setMaxDailyWithdrawalGhs] = useState<number>(5000);

  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number>(60);
  const [disconnectGraceSeconds, setDisconnectGraceSeconds] = useState<number>(90);
  const [unjoinedRoomExpiryMinutes, setUnjoinedRoomExpiryMinutes] = useState<number>(10);

  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [maintenanceNotice, setMaintenanceNotice] = useState<string>(
    "Scheduled platform maintenance in progress. Matchmaking is temporarily paused."
  );
  const [disableWagers, setDisableWagers] = useState<boolean>(false);
  const [disableWithdrawals, setDisableWithdrawals] = useState<boolean>(false);
  const [publicSpectatingEnabled, setPublicSpectatingEnabled] = useState<boolean>(true);

  const [defaultRating, setDefaultRating] = useState<number>(1200);
  const [ratingKFactor, setRatingKFactor] = useState<number>(32);
  const [minWagerGhs, setMinWagerGhs] = useState<number>(5);
  const [maxWagerGhs, setMaxWagerGhs] = useState<number>(1000);

  // Diagnostics & Tool states
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [toolResultMsg, setToolResultMsg] = useState<string>("");

  useEffect(() => {
    if (initialSettings) {
      if (initialSettings.wagerFeePercent !== undefined) setWagerFeePercent(initialSettings.wagerFeePercent);
      if (initialSettings.tournamentFeePercent !== undefined) setTournamentFeePercent(initialSettings.tournamentFeePercent);
      if (initialSettings.pointsPerGhsBuy !== undefined) setPointsPerGhsBuy(initialSettings.pointsPerGhsBuy);
      if (initialSettings.pointsPerGhsWithdraw !== undefined) setPointsPerGhsWithdraw(initialSettings.pointsPerGhsWithdraw);

      if (initialSettings.minDepositGhs !== undefined) setMinDepositGhs(initialSettings.minDepositGhs);
      if (initialSettings.maxDepositGhs !== undefined) setMaxDepositGhs(initialSettings.maxDepositGhs);
      if (initialSettings.minWithdrawalGhs !== undefined) setMinWithdrawalGhs(initialSettings.minWithdrawalGhs);
      if (initialSettings.maxWithdrawalGhs !== undefined) setMaxWithdrawalGhs(initialSettings.maxWithdrawalGhs);
      if (initialSettings.maxDailyWithdrawalGhs !== undefined) setMaxDailyWithdrawalGhs(initialSettings.maxDailyWithdrawalGhs);

      if (initialSettings.turnTimerSeconds !== undefined) setTurnTimerSeconds(initialSettings.turnTimerSeconds);
      if (initialSettings.disconnectGraceSeconds !== undefined) setDisconnectGraceSeconds(initialSettings.disconnectGraceSeconds);
      if (initialSettings.unjoinedRoomExpiryMinutes !== undefined) setUnjoinedRoomExpiryMinutes(initialSettings.unjoinedRoomExpiryMinutes);

      if (initialSettings.maintenanceMode !== undefined) setMaintenanceMode(initialSettings.maintenanceMode);
      if (initialSettings.maintenanceNotice !== undefined) setMaintenanceNotice(initialSettings.maintenanceNotice);
      if (initialSettings.disableWagers !== undefined) setDisableWagers(initialSettings.disableWagers);
      if (initialSettings.disableWithdrawals !== undefined) setDisableWithdrawals(initialSettings.disableWithdrawals);
      if (initialSettings.publicSpectatingEnabled !== undefined) setPublicSpectatingEnabled(initialSettings.publicSpectatingEnabled);

      if (initialSettings.defaultRating !== undefined) setDefaultRating(initialSettings.defaultRating);
      if (initialSettings.ratingKFactor !== undefined) setRatingKFactor(initialSettings.ratingKFactor);
      if (initialSettings.minWagerGhs !== undefined) setMinWagerGhs(initialSettings.minWagerGhs);
      if (initialSettings.maxWagerGhs !== undefined) setMaxWagerGhs(initialSettings.maxWagerGhs);
    }
  }, [initialSettings]);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          token,
          wagerFeePercent,
          tournamentFeePercent,
          pointsPerGhsBuy,
          pointsPerGhsWithdraw,
          minDepositGhs,
          maxDepositGhs,
          minWithdrawalGhs,
          maxWithdrawalGhs,
          maxDailyWithdrawalGhs,
          turnTimerSeconds,
          disconnectGraceSeconds,
          unjoinedRoomExpiryMinutes,
          maintenanceMode,
          maintenanceNotice,
          disableWagers,
          disableWithdrawals,
          publicSpectatingEnabled,
          defaultRating,
          ratingKFactor,
          minWagerGhs,
          maxWagerGhs,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update platform settings");

      setSuccess("Platform configuration & controls saved successfully!");
      if (onSettingsUpdated && data.settings) {
        onSettingsUpdated(data.settings);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setBusy(false);
    }
  };

  const handlePurgeExpiredRooms = async () => {
    setBusy(true);
    setError("");
    setToolResultMsg("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge_expired_rooms", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to purge rooms");
      setToolResultMsg(`Cleaned ${data.purgedCount || 0} stale/unjoined rooms (> ${data.thresholdMinutes} mins old).`);
    } catch (err: any) {
      setError(err.message || "Error running room cleanup");
    } finally {
      setBusy(false);
    }
  };

  const handleRunReconciliationAudit = async () => {
    setBusy(true);
    setError("");
    setToolResultMsg("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile_all_balances", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setReconciliationData(data);
      setToolResultMsg(
        `Ledger audit complete: ${data.matchedCount} accounts verified, ${data.discrepancyCount} discrepancies detected.`
      );
    } catch (err: any) {
      setError(err.message || "Error running ledger reconciliation");
    } finally {
      setBusy(false);
    }
  };

  const handleFetchDiagnostics = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "system_diagnostics", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Diagnostics query failed");
      setDiagnostics(data.diagnostics);
    } catch (err: any) {
      setError(err.message || "Failed to load diagnostics");
    } finally {
      setBusy(false);
    }
  };

  const handleExportSystemSnapshot = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_system_snapshot", token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Export failed");

      const blob = new Blob([JSON.stringify(data.snapshot, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `damii-system-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccess("System state JSON export downloaded successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to export system snapshot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* SECTION NAV TABS */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#081c15] border border-[#1a5e48] rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSection("fees")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "fees"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Coins size={14} /> House Fees & Rates
        </button>

        <button
          type="button"
          id="btn-tab-games-catalog"
          onClick={() => setActiveSection("games")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "games"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Gamepad2 size={14} /> Game Catalog
        </button>

        <button
          type="button"
          id="btn-tab-game-limits"
          onClick={() => setActiveSection("game_limits")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "game_limits"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <SlidersHorizontal size={14} /> Game Limits & Escrow
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("timers")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "timers"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Clock size={14} /> Game Engine & Timers
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("limits")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "limits"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Scale size={14} /> Financial Limits
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("breakers")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "breakers"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <ShieldAlert size={14} /> Emergency Switches
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("rating")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "rating"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Zap size={14} /> Rating & Stakes
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("notifications")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "notifications"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Bell size={14} /> Notification Providers
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection("maintenance");
            if (!diagnostics) handleFetchDiagnostics();
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeSection === "maintenance"
              ? "bg-[#d6a735] text-[#06261f] shadow-md font-bold"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Database size={14} /> Maintenance & Tools
        </button>
      </div>

      {/* STATUS BANNERS */}
      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0" /> {error}
          </span>
          <button type="button" onClick={() => setError("")} className="text-red-400 hover:text-white font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> {success}
          </span>
          <button type="button" onClick={() => setSuccess("")} className="text-emerald-400 hover:text-white font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* SECTION CONTENT ROUTING */}
      {activeSection === "games" ? (
        <GamesCatalogTable
          games={games || []}
          busy={busy}
          onRefresh={onRefreshGames || (() => {})}
          token={token}
        />
      ) : activeSection === "game_limits" ? (
        <GameLimitsTable
          token={token}
          adminSecret={adminSecret || ""}
        />
      ) : activeSection === "notifications" ? (
        <NotificationSettings token={token} />
      ) : (
        /* FORM CONTAINER FOR PLATFORM SETTINGS */
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* TAB 1: HOUSE FEES & EXCHANGE RATES */}
          {activeSection === "fees" && (
          <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-5">
            <div className="border-b border-[#1a5e48] pb-3">
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Coins size={18} className="text-[#d6a735]" /> Platform House Fees & Exchange Rates
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                Configure platform fee percentages deducted automatically from real-money match wager pots and tournament prize pools upon match resolution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Single Match Wager Pot Fee (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={wagerFeePercent}
                    onChange={(e) => setWagerFeePercent(Number(e.target.value))}
                    className="w-28 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                  <span className="text-xs font-bold text-[#d6a735]">% per match</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Deducted from the total wager escrow pot when disbursing winnings to the match victor (default: 5%).
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Tournament League Prize Pool Fee (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={tournamentFeePercent}
                    onChange={(e) => setTournamentFeePercent(Number(e.target.value))}
                    className="w-28 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                  <span className="text-xs font-bold text-[#d6a735]">% per tournament</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Platform fee deducted from the total tournament prize pool when payouts are distributed (default: 10%).
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Marble Top-Up Conversion Rate
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-semibold">1 GH₵ =</span>
                  <span className="px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-emerald-400 font-bold">
                    1 Marble
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Fixed treasury standard rate for Mobile Money deposits (1:1 Cedi Parity).
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Tournament Facilitator Cancellation Fee
                </label>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-amber-400 font-bold">
                    5% penalty fee
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Charged on total tournament prize pool when a facilitator cancels a registered league.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GAME ENGINE & TIMERS */}
        {activeSection === "timers" && (
          <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-5">
            <div className="border-b border-[#1a5e48] pb-3">
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Clock size={18} className="text-[#d6a735]" /> Match Turn Timers & Reconnection Rules
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                Configure move clocks, disconnection pause grace periods, and auto-expiry for unjoined arena rooms.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Standard Move Turn Clock
                </label>
                <select
                  value={turnTimerSeconds}
                  onChange={(e) => setTurnTimerSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                >
                  <option value={30}>30 Seconds (Blitz)</option>
                  <option value={45}>45 Seconds (Fast)</option>
                  <option value={60}>60 Seconds (Standard)</option>
                  <option value={90}>90 Seconds (Deep Think)</option>
                  <option value={120}>120 Seconds (Classic)</option>
                </select>
                <p className="text-[11px] text-slate-300">
                  Maximum time permitted per move before turn forfeiture.
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Disconnection Grace Period
                </label>
                <select
                  value={disconnectGraceSeconds}
                  onChange={(e) => setDisconnectGraceSeconds(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                >
                  <option value={45}>45 Seconds</option>
                  <option value={60}>60 Seconds</option>
                  <option value={90}>90 Seconds (Default Policy)</option>
                  <option value={120}>120 Seconds</option>
                </select>
                <p className="text-[11px] text-slate-300">
                  Board state preserved and disconnected player's turn clock paused during network drop.
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Unjoined Room Auto-Expiry
                </label>
                <select
                  value={unjoinedRoomExpiryMinutes}
                  onChange={(e) => setUnjoinedRoomExpiryMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                >
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes (Default Policy)</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                </select>
                <p className="text-[11px] text-slate-300">
                  Waiting rooms without a joined opponent auto-expire and release wager escrow back to host.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex items-start gap-3">
              <ShieldAlert size={18} className="text-[#d6a735] shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-[#f5efdf]">DAMII 10x10 Flying King Engine:</span>
                <p className="text-slate-300">
                  Active ruleset enforces standard draughts regulations: 10x10 board, 20 pieces per side, compulsory capture with mandatory selection of longest jumping sequence, and flying king moves across open diagonals.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FINANCIAL LIMITS */}
        {activeSection === "limits" && (
          <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-5">
            <div className="border-b border-[#1a5e48] pb-3">
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Scale size={18} className="text-[#d6a735]" /> Mobile Money Deposit & Cashout Limits
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                Protect treasury liquidity and enforce AML transaction thresholds for Mobile Money (MTN, Telecel, AT).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* DEPOSIT LIMITS */}
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block border-b border-[#1a5e48] pb-1">
                  Top-Up Limits (GH₵)
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">Minimum Deposit per Tx</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold">GH₵</span>
                    <input
                      type="number"
                      min={1}
                      value={minDepositGhs}
                      onChange={(e) => setMinDepositGhs(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">Maximum Deposit per Tx</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold">GH₵</span>
                    <input
                      type="number"
                      min={minDepositGhs + 1}
                      value={maxDepositGhs}
                      onChange={(e) => setMaxDepositGhs(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>
                </div>
              </div>

              {/* WITHDRAWAL LIMITS */}
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block border-b border-[#1a5e48] pb-1">
                  Mobile Money Cashout Limits (GH₵)
                </span>
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">Minimum Withdrawal</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold">GH₵</span>
                    <input
                      type="number"
                      min={1}
                      value={minWithdrawalGhs}
                      onChange={(e) => setMinWithdrawalGhs(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">Max Single Withdrawal</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold">GH₵</span>
                    <input
                      type="number"
                      min={minWithdrawalGhs + 1}
                      value={maxWithdrawalGhs}
                      onChange={(e) => setMaxWithdrawalGhs(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1">Max 24h Daily Cumulative Cap</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-bold">GH₵</span>
                    <input
                      type="number"
                      min={maxWithdrawalGhs}
                      value={maxDailyWithdrawalGhs}
                      onChange={(e) => setMaxDailyWithdrawalGhs(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EMERGENCY SWITCHES & CIRCUIT BREAKERS */}
        {activeSection === "breakers" && (
          <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-5">
            <div className="border-b border-[#1a5e48] pb-3">
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-400" /> Platform Circuit Breakers & Emergency Switches
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                Instantly control critical platform features during security audits, treasury maintenance, or high-traffic tournaments.
              </p>
            </div>

            <div className="space-y-4">
              {/* MAINTENANCE MODE */}
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio size={16} className={maintenanceMode ? "text-red-400 animate-pulse" : "text-slate-300"} />
                    <span className="text-xs font-bold text-[#f5efdf]">Emergency Maintenance Mode</span>
                    {maintenanceMode && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded text-[10px] font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-xl">
                    When enabled, player matchmaking and new match creation are suspended, and a system broadcast banner is displayed across all player views.
                  </p>
                  {maintenanceMode && (
                    <div className="pt-2">
                      <label className="block text-[11px] text-[#d6a735] font-semibold mb-1">
                        Broadcast Maintenance Notice:
                      </label>
                      <input
                        type="text"
                        value={maintenanceNotice}
                        onChange={(e) => setMaintenanceNotice(e.target.value)}
                        placeholder="Maintenance notification message..."
                        className="w-full px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    maintenanceMode
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-[#081c15] border border-[#1a5e48] text-slate-300 hover:text-white"
                  }`}
                >
                  {maintenanceMode ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
                </button>
              </div>

              {/* DISABLE WAGERS */}
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock size={16} className={disableWagers ? "text-amber-400" : "text-slate-300"} />
                    <span className="text-xs font-bold text-[#f5efdf]">Disable Real-Money Match Wagers</span>
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-xl">
                    Temporarily forces all game room creation to friendly/casual mode without Marble escrow deduction.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisableWagers(!disableWagers)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    disableWagers
                      ? "bg-amber-600 hover:bg-amber-700 text-[#06261f]"
                      : "bg-[#081c15] border border-[#1a5e48] text-slate-300 hover:text-white"
                  }`}
                >
                  {disableWagers ? "Wagers Disabled (Unlock)" : "Allow Wagers (Default)"}
                </button>
              </div>

              {/* DISABLE CASHOUTS */}
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className={disableWithdrawals ? "text-red-400" : "text-slate-300"} />
                    <span className="text-xs font-bold text-[#f5efdf]">Emergency Pause on Mobile Money Cashouts</span>
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-xl">
                    Freezes outbound withdrawal requests during treasury audits or ledger reconciliations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisableWithdrawals(!disableWithdrawals)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    disableWithdrawals
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-[#081c15] border border-[#1a5e48] text-slate-300 hover:text-white"
                  }`}
                >
                  {disableWithdrawals ? "Cashouts Paused (Resume)" : "Cashouts Enabled (Default)"}
                </button>
              </div>

              {/* PUBLIC SPECTATING */}
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className={publicSpectatingEnabled ? "text-emerald-400" : "text-slate-300"} />
                    <span className="text-xs font-bold text-[#f5efdf]">Public Live Arena Spectator Access</span>
                  </div>
                  <p className="text-[11px] text-slate-300 max-w-xl">
                    Permits guests and tournament viewers to spectate active draughts matches in real-time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicSpectatingEnabled(!publicSpectatingEnabled)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    publicSpectatingEnabled
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-[#081c15] border border-[#1a5e48] text-slate-300 hover:text-white"
                  }`}
                >
                  {publicSpectatingEnabled ? "Spectating Enabled" : "Spectating Restricted"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RATING & STAKES */}
        {activeSection === "rating" && (
          <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-5">
            <div className="border-b border-[#1a5e48] pb-3">
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Zap size={18} className="text-[#d6a735]" /> Competitive Rating & Match Stakes
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                Configure baseline DPI / Elo ratings, K-factor calculation volatility, and match stake boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Baseline Starting DPI Rating
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={500}
                    max={3000}
                    value={defaultRating}
                    onChange={(e) => setDefaultRating(Number(e.target.value))}
                    className="w-32 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                  <span className="text-xs text-[#d6a735] font-bold">DPI</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Initial skill score assigned to newly registered player profiles (default: 1200 DPI).
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Rating K-Factor (Volatility)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={10}
                    max={64}
                    value={ratingKFactor}
                    onChange={(e) => setRatingKFactor(Number(e.target.value))}
                    className="w-32 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                  <span className="text-xs text-slate-300">Standard Elo K-factor</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Controls the magnitude of rating points gained or lost after each match (default: 32).
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Minimum Match Wager Stake
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-bold">GH₵</span>
                  <input
                    type="number"
                    min={1}
                    value={minWagerGhs}
                    onChange={(e) => setMinWagerGhs(Number(e.target.value))}
                    className="w-32 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
                <p className="text-[11px] text-slate-300">
                  Minimum stakes required to create an online wager match room.
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Maximum Match Wager Stake
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 font-bold">GH₵</span>
                  <input
                    type="number"
                    min={minWagerGhs + 1}
                    value={maxWagerGhs}
                    onChange={(e) => setMaxWagerGhs(Number(e.target.value))}
                    className="w-32 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
                <p className="text-[11px] text-slate-300">
                  Maximum cap on single match stakes to safeguard casual players.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MAINTENANCE & TOOLS */}
        {activeSection === "maintenance" && (
          <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-6">
            <div className="border-b border-[#1a5e48] pb-3">
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Database size={18} className="text-[#d6a735]" /> Database Maintenance & Audit Operations
              </h3>
              <p className="text-xs text-slate-200 mt-1">
                Diagnostic health queries, state backups, expired room purges, and automated balance reconciliation.
              </p>
            </div>

            {toolResultMsg && (
              <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-cyan-200 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                {toolResultMsg}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                    <Trash2 size={14} className="text-amber-400" /> Purge Expired Rooms
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Cancels waiting rooms older than {unjoinedRoomExpiryMinutes} minutes and unlocks held host wager pots.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handlePurgeExpiredRooms}
                  className="w-full py-2 bg-[#081c15] hover:bg-[#1a5e48]/40 border border-[#1a5e48] text-xs font-bold text-amber-400 rounded-lg transition-all"
                >
                  Run Room Cleanup
                </button>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                    <Scale size={14} className="text-emerald-400" /> Audit Ledger Balances
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Verifies user profile balances against sum of ledger entries to detect accounting discrepancies.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRunReconciliationAudit}
                  className="w-full py-2 bg-[#081c15] hover:bg-[#1a5e48]/40 border border-[#1a5e48] text-xs font-bold text-emerald-400 rounded-lg transition-all"
                >
                  Run Balance Audit
                </button>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                    <Download size={14} className="text-cyan-400" /> Export System State
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Downloads a full JSON backup of metrics, leagues, transactions, and audit logs.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleExportSystemSnapshot}
                  className="w-full py-2 bg-[#081c15] hover:bg-[#1a5e48]/40 border border-[#1a5e48] text-xs font-bold text-cyan-300 rounded-lg transition-all"
                >
                  Download Backup JSON
                </button>
              </div>
            </div>

            {/* DIAGNOSTICS CARD */}
            {diagnostics && (
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#1a5e48] pb-2">
                  <h4 className="text-xs font-bold text-[#d6a735] flex items-center gap-2">
                    <Activity size={14} /> System & Database Diagnostics
                  </h4>
                  <button
                    type="button"
                    onClick={handleFetchDiagnostics}
                    className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Refresh
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-300 text-[11px] block">Database Dialect:</span>
                    <strong className="text-emerald-400 uppercase font-mono">{diagnostics.dialect}</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[11px] block">Query Latency:</span>
                    <strong className="text-[#f8fafc] font-mono">{diagnostics.pingLatencyMs} ms</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[11px] block">Total Registered Profiles:</span>
                    <strong className="text-[#f8fafc] font-mono">{diagnostics.counts?.totalProfiles}</strong>
                  </div>
                  <div>
                    <span className="text-slate-300 text-[11px] block">Active / Waiting Rooms:</span>
                    <strong className="text-[#f8fafc] font-mono">{diagnostics.counts?.activeRooms}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* RECONCILIATION RESULTS TABLE */}
            {reconciliationData && reconciliationData.results && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                  <Check size={14} className="text-emerald-400" /> Reconciliation Audit Results
                </h4>
                <div className="overflow-x-auto max-h-60 rounded-xl border border-[#1a5e48] bg-[#041c17] p-2 text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1a5e48] text-[11px] text-slate-300 uppercase">
                        <th className="py-1.5 px-2">User</th>
                        <th className="py-1.5 px-2">Balance Points</th>
                        <th className="py-1.5 px-2">Ledger Sum</th>
                        <th className="py-1.5 px-2">Entries</th>
                        <th className="py-1.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a5e48]/40">
                      {reconciliationData.results.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#081c15]/50">
                          <td className="py-1.5 px-2 font-medium text-[#f5efdf]">{r.username}</td>
                          <td className="py-1.5 px-2 font-mono text-[#d6a735]">{r.points} Pts</td>
                          <td className="py-1.5 px-2 font-mono text-slate-300">
                            {r.reconciliation?.computedSum ?? "-"}
                          </td>
                          <td className="py-1.5 px-2 font-mono text-slate-300">
                            {r.reconciliation?.entryCount ?? "-"}
                          </td>
                          <td className="py-1.5 px-2">
                            {r.reconciliation?.matches ? (
                              <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                <Check size={12} /> OK
                              </span>
                            ) : (
                              <span className="text-red-400 font-bold text-[11px]">
                                Discrepancy (Δ {r.reconciliation?.discrepancyAmount})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

          {/* SAVE BUTTON BAR */}
          <div className="p-4 bg-[#081c15] border border-[#1a5e48] rounded-2xl flex items-center justify-between shadow-xl">
            <div className="text-xs text-slate-200">
              Changes take effect immediately across all arena and tournament matches.
            </div>
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Save size={16} /> Save Platform Configuration
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default PlatformSettings;
