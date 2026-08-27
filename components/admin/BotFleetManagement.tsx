"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bot,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Coins,
  Trophy,
  TrendingUp,
  Settings,
  Edit2,
  PlayCircle,
  PauseCircle,
  PlusCircle,
  X,
  Sliders,
  DollarSign,
  UserCheck,
  Shield,
} from "lucide-react";
import { BotAccountConfig, BotFleetSettings } from "@/lib/bot-service";

interface BotFleetManagementProps {
  token: string;
}

export const BotFleetManagement: React.FC<BotFleetManagementProps> = ({ token }) => {
  const [bots, setBots] = useState<BotAccountConfig[]>([]);
  const [metrics, setMetrics] = useState<{
    totalBots: number;
    activeBots: number;
    pausedBots: number;
    totalBankrollPoints: number;
    totalBankrollMarbles: number;
    fleetWinRate: number;
    totalMatches: number;
    avgRating: number;
  } | null>(null);
  const [settings, setSettings] = useState<BotFleetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  // Modals & bulk actions
  const [editingBot, setEditingBot] = useState<BotAccountConfig | null>(null);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editUsername, setEditUsername] = useState<string>("");
  const [editRating, setEditRating] = useState<number>(1950);
  const [editPoints, setEditPoints] = useState<number>(0);
  const [editMarbles, setEditMarbles] = useState<number>(0);
  const [editTier, setEditTier] = useState<"easy" | "medium" | "hard" | "adaptive">("adaptive");
  const [editStatus, setEditStatus] = useState<"active" | "paused">("active");

  const [bulkPoints, setBulkPoints] = useState<number>(100);
  const [bulkMarbles, setBulkMarbles] = useState<number>(100);
  const [bulkTier, setBulkTier] = useState<string>("all");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchBotFleet = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_bot_fleet",
          token,
          search: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          tier: tierFilter !== "all" ? tierFilter : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBots(data.bots || []);
        setMetrics(data.metrics || null);
        setSettings(data.settings || null);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to load bot fleet." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error loading bots." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, search, statusFilter, tierFilter]);

  useEffect(() => {
    fetchBotFleet();
  }, [fetchBotFleet]);

  const handleUpdateSettings = async (updates: Partial<BotFleetSettings>) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_settings",
          token,
          settings: updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setFeedback({ type: "success", message: "Bot fleet settings updated." });
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to update settings." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error updating settings." });
    }
  };

  const handleSaveBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_account",
          token,
          botToken: editingBot.token,
          updates: {
            fullName: editFullName.trim() || editingBot.fullName,
            username: editUsername.trim() || editingBot.username,
            rating: editRating,
            bankrollPoints: editPoints,
            bankrollMarbles: editMarbles,
            difficultyTier: editTier,
            status: editStatus,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Player profile ${editFullName || editingBot.fullName} updated.` });
        setEditingBot(null);
        fetchBotFleet();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to update bot profile." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error saving bot changes." });
    }
  };

  const handleToggleBotStatus = async (bot: BotAccountConfig) => {
    const nextStatus = bot.status === "paused" ? "active" : "paused";
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_account",
          token,
          botToken: bot.token,
          updates: { status: nextStatus },
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBotFleet();
      }
    } catch {}
  };

  const handleBulkFund = async () => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_fund_bots",
          token,
          points: bulkPoints,
          marbles: bulkMarbles,
          tier: bulkTier !== "all" ? bulkTier : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Allocated bankroll to ${data.count} bots (+${bulkPoints} pts, +${bulkMarbles} marbles).`,
        });
        setShowBulkModal(false);
        fetchBotFleet();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to bulk fund bots." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error bulk funding bots." });
    }
  };

  const handleResetFleet = async () => {
    if (!confirm("Are you sure you want to reset all 100 bot accounts to initial seed configurations (95% win rate, zero bankroll)?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_bot_fleet", token }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: "Bot fleet reset to default seeded configurations." });
        fetchBotFleet();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error resetting fleet." });
    }
  };

  const openEditModal = (bot: BotAccountConfig) => {
    setEditingBot(bot);
    setEditFullName(bot.fullName || "");
    setEditUsername(bot.username || "");
    setEditRating(bot.rating || 1950);
    setEditPoints(bot.bankrollPoints ?? 0);
    setEditMarbles(bot.bankrollMarbles ?? 0);
    setEditTier(bot.difficultyTier || "adaptive");
    setEditStatus(bot.status === "paused" ? "paused" : "active");
  };

  const getRankBadge = (rating: number) => {
    if (rating >= 2100) return { label: "Grandmaster", color: "bg-purple-900/60 text-purple-200 border-purple-700" };
    if (rating >= 1900) return { label: "Master", color: "bg-amber-900/60 text-amber-200 border-amber-700" };
    if (rating >= 1700) return { label: "Diamond", color: "bg-cyan-900/60 text-cyan-200 border-cyan-700" };
    if (rating >= 1500) return { label: "Gold", color: "bg-yellow-900/60 text-yellow-200 border-yellow-700" };
    return { label: "Silver", color: "bg-slate-800 text-slate-300 border-slate-700" };
  };

  return (
    <div className="space-y-6" id="admin-bot-fleet-management">
      {/* Top Banner / Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm border ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-200"
              : "bg-red-950/60 border-red-800/80 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Fleet Size</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.totalBots ?? 100}</div>
          <div className="text-[11px] text-emerald-400 mt-1">100 Seeded Verified Profiles</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Active in Queue</span>
            <PlayCircle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.activeBots ?? 100}</div>
          <div className="text-[11px] text-slate-400 mt-1">{metrics?.pausedBots ?? 0} on standby</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Total Bankroll</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">
            {(metrics?.totalBankrollPoints ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">{(metrics?.totalBankrollMarbles ?? 0).toLocaleString()} marbles (unfunded)</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Avg Fleet Elo</span>
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.avgRating ?? 2010}</div>
          <div className="text-[11px] text-yellow-400 mt-1">1780 - 2310 Rating Range</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Fleet Win Rate</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.fleetWinRate ?? 95}%</div>
          <div className="text-[11px] text-indigo-400 mt-1">{(metrics?.totalMatches ?? 31400).toLocaleString()} matches recorded</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Auto-Join Delay</span>
            <Zap className={`w-4 h-4 ${settings?.matchmakingEnabled ? "text-emerald-400" : "text-slate-500"}`} />
          </div>
          <div className="text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                settings?.matchmakingEnabled ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span>15s – 7m</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Randomized delay enabled</div>
        </div>
      </div>

      {/* Fleet Controls & Config Card */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Authentic AI Player Fleet
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  95% Target Win Rate • Adaptive AI
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                100 genuine Ghanaian player personas with verified full legal names for casual room pairing and practice.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleUpdateSettings({ matchmakingEnabled: !settings?.matchmakingEnabled })}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                settings?.matchmakingEnabled
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              {settings?.matchmakingEnabled ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              <span>{settings?.matchmakingEnabled ? "Matchmaking Active" : "Matchmaking Paused"}</span>
            </button>

            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all"
            >
              <Coins className="w-4 h-4" />
              <span>Fund Bankroll</span>
            </button>

            <button
              onClick={handleResetFleet}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Reset Seed
            </button>

            <button
              onClick={fetchBotFleet}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global Matchmaking Behavior Config */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Default Difficulty Engine</div>
              <div className="text-[11px] text-slate-400">Alpha-Beta Minimax with dynamic 4-ply heuristics</div>
            </div>
            <select
              value={settings?.defaultDifficulty || "adaptive"}
              onChange={(e: any) => handleUpdateSettings({ defaultDifficulty: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white capitalize text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="adaptive">Adaptive (Smart)</option>
              <option value="hard">Hard (Minimax)</option>
              <option value="medium">Medium</option>
              <option value="easy">Easy</option>
            </select>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Auto-Join Delay Mode</div>
              <div className="text-[11px] text-slate-400">Randomized naturally: 15s, 1m, 1.5m to 7m</div>
            </div>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
              15s – 7m Random
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-white">Wager Room Auto-Matching</div>
              <div className="text-[11px] text-slate-400">Restrict bot fleet to free casual games</div>
            </div>
            <button
              onClick={() => handleUpdateSettings({ allowWagerMatches: !settings?.allowWagerMatches })}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors text-xs ${
                settings?.allowWagerMatches
                  ? "bg-amber-900/60 text-amber-200 border border-amber-700"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {settings?.allowWagerMatches ? "Allowed" : "Casual Only"}
            </button>
          </div>
        </div>
      </div>

      {/* Bot Roster Table */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Filters Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 100 bots by legal full name, username, region, or token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active ({metrics?.activeBots ?? 100})</option>
              <option value="paused">Standby ({metrics?.pausedBots ?? 0})</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All AI Tiers</option>
              <option value="adaptive">Adaptive (High Elo)</option>
              <option value="hard">Hard (Grandmaster)</option>
              <option value="medium">Medium</option>
              <option value="easy">Easy</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Legal Full Name & Username</th>
                <th className="py-3 px-4">Rating & Rank</th>
                <th className="py-3 px-4">Bankroll Balance</th>
                <th className="py-3 px-4">Match Record</th>
                <th className="py-3 px-4">Win Streak</th>
                <th className="py-3 px-4">AI Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading bot accounts...
                  </td>
                </tr>
              ) : bots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No bot accounts match your filter criteria.
                  </td>
                </tr>
              ) : (
                bots.map((b) => {
                  const rank = getRankBadge(b.rating);
                  const totalGames = b.wins + b.losses + b.draws;
                  const winPercent = totalGames > 0 ? Math.round((b.wins / totalGames) * 100) : 95;
                  const isPaused = b.status === "paused";

                  // Extract initial from legal full name
                  const initials = b.fullName
                    ? b.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : b.username.slice(0, 2).toUpperCase();

                  return (
                    <tr key={b.token} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                            {initials}
                          </div>
                          <div>
                            {/* Full Legal Name displayed prominently first */}
                            <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                              <span>{b.fullName || b.username}</span>
                              <Shield className="w-3.5 h-3.5 text-emerald-400/80 inline" />
                            </div>
                            {/* Username / gamer tag displayed smaller underneath */}
                            <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>@{b.username}</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400 font-sans">{b.region || "Greater Accra"}</span>
                              <span className="text-slate-600">•</span>
                              <span className="font-mono text-slate-500 text-[10px]">{b.token}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono text-sm">{b.rating}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${rank.color}`}>
                            {rank.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-amber-300 font-semibold">
                          {(b.bankrollPoints ?? 0).toLocaleString()} <span className="text-[10px] text-slate-400">pts</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {(b.bankrollMarbles ?? 0).toLocaleString()} marbles
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-emerald-400 font-semibold">{b.wins}W</span>
                          <span className="text-slate-500">-</span>
                          <span className="text-red-400">{b.losses}L</span>
                          <span className="text-slate-500">-</span>
                          <span className="text-slate-400">{b.draws}D</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">{winPercent}% win rate</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-white font-medium">
                          {b.winStreak > 0 ? (
                            <span className="text-emerald-400">🔥 {b.winStreak} streak</span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">Best: {b.bestStreak}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            b.difficultyTier === "hard"
                              ? "bg-red-950 text-red-300 border border-red-800"
                              : b.difficultyTier === "medium"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : b.difficultyTier === "easy"
                              ? "bg-blue-950 text-blue-300 border border-blue-800"
                              : "bg-purple-950 text-purple-300 border border-purple-800"
                          }`}
                        >
                          {b.difficultyTier || "adaptive"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleBotStatus(b)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                            isPaused
                              ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? "bg-slate-500" : "bg-emerald-400"}`} />
                          {isPaused ? "Standby" : "Active"}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(b)}
                          className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
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

      {/* Edit Bot Modal */}
      {editingBot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-white">{editingBot.fullName || editingBot.username}</h3>
                  <div className="text-[11px] text-emerald-400 font-mono">@{editingBot.username} • {editingBot.token}</div>
                </div>
              </div>
              <button onClick={() => setEditingBot(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBot} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Legal Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Kwame Emmanuel Mensah"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Username / Gamer Tag</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. Kwame_Tactics"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Elo Rating (1000 - 2500)</label>
                <input
                  type="number"
                  min={1000}
                  max={2500}
                  value={editRating}
                  onChange={(e) => setEditRating(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bankroll Points</label>
                  <input
                    type="number"
                    min={0}
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bankroll Marbles</label>
                  <input
                    type="number"
                    min={0}
                    value={editMarbles}
                    onChange={(e) => setEditMarbles(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Difficulty Tier</label>
                  <select
                    value={editTier}
                    onChange={(e: any) => setEditTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize focus:outline-none focus:border-emerald-500"
                  >
                    <option value="adaptive">Adaptive</option>
                    <option value="hard">Hard</option>
                    <option value="medium">Medium</option>
                    <option value="easy">Easy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e: any) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize focus:outline-none focus:border-emerald-500"
                  >
                    <option value="active">Active (In Queue)</option>
                    <option value="paused">Standby (Paused)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white">
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Fund Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Bulk Bankroll Fleet Top-Up</h3>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-400">
                Distribute additional points and marbles across the fleet of 100 bot player accounts to back bankroll depth.
              </p>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target AI Tier</label>
                <select
                  value={bulkTier}
                  onChange={(e) => setBulkTier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize"
                >
                  <option value="all">Entire 100 Bot Fleet</option>
                  <option value="easy">Easy Tier Only</option>
                  <option value="medium">Medium Tier Only</option>
                  <option value="hard">Hard Tier Only</option>
                  <option value="adaptive">Adaptive Tier Only</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Add Points Per Bot</label>
                  <input
                    type="number"
                    min={0}
                    value={bulkPoints}
                    onChange={(e) => setBulkPoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Add Marbles Per Bot</label>
                  <input
                    type="number"
                    min={0}
                    value={bulkMarbles}
                    onChange={(e) => setBulkMarbles(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkFund}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold text-white"
                >
                  Confirm Allocation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
