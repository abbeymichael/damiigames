"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Trophy,
  Coins,
  Calendar,
  Percent,
  Activity,
  ArrowUpRight,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  Award,
  DollarSign,
  Flame,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Search,
  Zap,
} from "lucide-react";
import type { League, TournamentFormat } from "@/lib/types";

interface OrganizerPerformanceAnalyticsProps {
  leagues: League[];
  currentUserId?: string;
  currentUsername?: string;
  onSelectLeague?: (leagueId: string) => void;
  onCreateTournament?: () => void;
}

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Single Elimination",
  double_elimination: "Double Elimination",
  round_robin: "Round Robin",
  swiss: "Swiss System",
};

const FORMAT_COLORS: Record<string, string> = {
  single_elimination: "#d6a735", // Gold
  double_elimination: "#22d3ee", // Cyan
  round_robin: "#10b981",        // Emerald
  swiss: "#f43f5e",              // Rose
};

const STATUS_COLORS: Record<string, string> = {
  completed: "#10b981",
  active: "#d6a735",
  registration: "#3b82f6",
  cancelled: "#ef4444",
  under_review: "#a855f7",
};

// Custom Chart Tooltips declared outside render
const CustomParticipationTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 bg-[#081c15] border border-[#1a5e48] rounded-xl shadow-2xl space-y-1.5 min-w-[200px]">
        <div className="flex items-center justify-between gap-2 border-b border-[#114232] pb-1.5">
          <span className="font-bold text-xs text-[#f5efdf] line-clamp-1">{data.fullTitle || label}</span>
          <span className="text-[10px] text-[#a3b8b0]">{data.date}</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#a3b8b0] flex items-center gap-1.5">
              <Users size={12} className="text-[#10b981]" /> Enrolled:
            </span>
            <span className="font-bold text-[#f5efdf]">{data.enrolled} / {data.capacity} Players</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#a3b8b0] flex items-center gap-1.5">
              <Percent size={12} className="text-[#d6a735]" /> Fill Rate:
            </span>
            <span className="font-extrabold text-[#d6a735]">{data.fillRate}%</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-[#114232]/50 text-[11px]">
            <span className="text-[#a3b8b0]">Format:</span>
            <span className="text-cyan-400 font-semibold">{data.format}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomPrizeTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3.5 bg-[#081c15] border border-[#1a5e48] rounded-xl shadow-2xl space-y-1.5 min-w-[220px]">
        <div className="flex items-center justify-between gap-2 border-b border-[#114232] pb-1.5">
          <span className="font-bold text-xs text-[#f5efdf] line-clamp-1">{data.fullTitle || label}</span>
          <span className="text-[10px] text-[#a3b8b0]">{data.date}</span>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#a3b8b0] flex items-center gap-1.5">
              <Trophy size={12} className="text-[#d6a735]" /> Event Prize:
            </span>
            <span className="font-bold text-[#d6a735]">{Number(data.prizePool).toLocaleString()} pts</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#a3b8b0] flex items-center gap-1.5">
              <TrendingUp size={12} className="text-cyan-400" /> Cumulative Prize:
            </span>
            <span className="font-extrabold text-cyan-400">{Number(data.cumulativePrizePool).toLocaleString()} pts</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const OrganizerPerformanceAnalytics: React.FC<OrganizerPerformanceAnalyticsProps> = ({
  leagues,
  currentUserId,
  currentUsername,
  onSelectLeague,
  onCreateTournament,
}) => {
  // Filter States
  const [timeRange, setTimeRange] = useState<"all" | "30d" | "90d" | "1y">("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<"combined" | "participation" | "prizepool" | "formats">("combined");
  const [searchQuery, setSearchQuery] = useState("");
  const [scope, setScope] = useState<"my_tournaments" | "all_tournaments">("my_tournaments");

  // Determine user-scoped tournaments vs all
  const scopedLeagues = useMemo(() => {
    if (scope === "my_tournaments" && (currentUserId || currentUsername)) {
      const my = leagues.filter((l) => {
        if (currentUserId && (l.facilitatorToken === currentUserId || l.facilitatorToken?.includes(currentUserId))) return true;
        if (currentUsername && l.facilitatorName?.toLowerCase() === currentUsername.toLowerCase()) return true;
        return false;
      });
      // If user has no created tournaments yet under their specific token, default to displaying all tournaments so analytics are visible
      return my.length > 0 ? my : leagues;
    }
    return leagues;
  }, [leagues, scope, currentUserId, currentUsername]);

  // Apply filters
  const filteredLeagues = useMemo(() => {
    let list = [...scopedLeagues];

    // Format Filter
    if (formatFilter !== "all") {
      list = list.filter((l) => l.format === formatFilter);
    }

    // Status Filter
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }

    // Timeframe Filter
    if (timeRange !== "all") {
      const now = new Date().getTime();
      const dayMs = 24 * 60 * 60 * 1000;
      let limitDays = 365;
      if (timeRange === "30d") limitDays = 30;
      if (timeRange === "90d") limitDays = 90;
      if (timeRange === "1y") limitDays = 365;

      list = list.filter((l) => {
        const created = new Date(l.createdAt || Date.now()).getTime();
        return now - created <= limitDays * dayMs;
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          (l.winnerName && l.winnerName.toLowerCase().includes(q))
      );
    }

    // Sort chronologically ascending for time-series charts
    return list.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
  }, [scopedLeagues, formatFilter, statusFilter, timeRange, searchQuery]);

  // Overall KPI Calculations
  const kpiMetrics = useMemo(() => {
    const totalEvents = filteredLeagues.length;
    if (totalEvents === 0) {
      return {
        totalEvents: 0,
        activeEvents: 0,
        completedEvents: 0,
        totalEnrolled: 0,
        totalCapacity: 0,
        avgFillRate: 0,
        totalPrizePool: 0,
        avgPrizePool: 0,
        totalEntryFees: 0,
        completionRate: 0,
      };
    }

    const activeEvents = filteredLeagues.filter((l) => l.status === "active" || l.status === "registration").length;
    const completedEvents = filteredLeagues.filter((l) => l.status === "completed").length;

    let totalEnrolled = 0;
    let totalCapacity = 0;
    let fillRateSum = 0;
    let totalPrizePool = 0;
    let totalEntryFees = 0;

    filteredLeagues.forEach((l) => {
      const enrolled = Number(l.participantCount || 0);
      const capacity = Number(l.maxParticipants || 8);
      const fillRate = capacity > 0 ? (enrolled / capacity) * 100 : 0;

      totalEnrolled += enrolled;
      totalCapacity += capacity;
      fillRateSum += fillRate;
      totalPrizePool += Number(l.prizePoolPoints || 0);
      totalEntryFees += Number(l.entryFeePoints || 0) * enrolled;
    });

    const avgFillRate = totalEvents > 0 ? Math.round((fillRateSum / totalEvents) * 10) / 10 : 0;
    const avgPrizePool = totalEvents > 0 ? Math.round(totalPrizePool / totalEvents) : 0;
    const completionRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

    return {
      totalEvents,
      activeEvents,
      completedEvents,
      totalEnrolled,
      totalCapacity,
      avgFillRate,
      totalPrizePool,
      avgPrizePool,
      totalEntryFees,
      completionRate,
    };
  }, [filteredLeagues]);

  // Participation Time-Series Chart Data
  const participationChartData = useMemo(() => {
    return filteredLeagues.map((l, index) => {
      const date = new Date(l.createdAt || Date.now());
      const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const enrolled = Number(l.participantCount || 0);
      const capacity = Number(l.maxParticipants || 8);
      const fillRate = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;

      return {
        id: l.id,
        name: l.title.length > 18 ? `${l.title.slice(0, 16)}...` : l.title,
        fullTitle: l.title,
        date: dateLabel,
        enrolled,
        capacity,
        fillRate,
        format: FORMAT_LABELS[l.format] || l.format,
        status: l.status,
        prizePool: l.prizePoolPoints,
        eventIndex: index + 1,
      };
    });
  }, [filteredLeagues]);

  // Prize Pool & Escrow Time-Series Chart Data
  const prizePoolChartData = useMemo(() => {
    let runningTotalPrize = 0;
    let runningTotalEntryFees = 0;

    return filteredLeagues.map((l, index) => {
      const date = new Date(l.createdAt || Date.now());
      const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const prize = Number(l.prizePoolPoints || 0);
      const entryFeeTotal = Number(l.entryFeePoints || 0) * Number(l.participantCount || 0);

      runningTotalPrize += prize;
      runningTotalEntryFees += entryFeeTotal;

      return {
        id: l.id,
        name: l.title.length > 18 ? `${l.title.slice(0, 16)}...` : l.title,
        fullTitle: l.title,
        date: dateLabel,
        prizePool: prize,
        entryFees: entryFeeTotal,
        cumulativePrizePool: runningTotalPrize,
        cumulativeEntryFees: runningTotalEntryFees,
        eventIndex: index + 1,
      };
    });
  }, [filteredLeagues]);

  // Format Breakdown Data
  const formatAnalytics = useMemo(() => {
    const map: Record<
      string,
      { count: number; enrolled: number; capacity: number; totalPrize: number; fillRates: number[] }
    > = {};

    filteredLeagues.forEach((l) => {
      const fmt = l.format || "single_elimination";
      if (!map[fmt]) {
        map[fmt] = { count: 0, enrolled: 0, capacity: 0, totalPrize: 0, fillRates: [] };
      }
      const enrolled = Number(l.participantCount || 0);
      const capacity = Number(l.maxParticipants || 8);
      const fillRate = capacity > 0 ? (enrolled / capacity) * 100 : 0;

      map[fmt].count += 1;
      map[fmt].enrolled += enrolled;
      map[fmt].capacity += capacity;
      map[fmt].totalPrize += Number(l.prizePoolPoints || 0);
      map[fmt].fillRates.push(fillRate);
    });

    return Object.entries(map).map(([fmtKey, data]) => {
      const avgFill = data.fillRates.length > 0
        ? Math.round((data.fillRates.reduce((a, b) => a + b, 0) / data.fillRates.length) * 10) / 10
        : 0;

      return {
        key: fmtKey,
        name: FORMAT_LABELS[fmtKey] || fmtKey,
        count: data.count,
        enrolled: data.enrolled,
        capacity: data.capacity,
        totalPrize: data.totalPrize,
        avgFillRate: avgFill,
        color: FORMAT_COLORS[fmtKey] || "#d6a735",
      };
    });
  }, [filteredLeagues]);

  // Status Distribution Data
  const statusAnalytics = useMemo(() => {
    const map: Record<string, number> = {};
    filteredLeagues.forEach((l) => {
      map[l.status] = (map[l.status] || 0) + 1;
    });

    return Object.entries(map).map(([statusKey, count]) => ({
      name: statusKey.charAt(0).toUpperCase() + statusKey.slice(1),
      count,
      color: STATUS_COLORS[statusKey] || "#64748b",
    }));
  }, [filteredLeagues]);

  return (
    <div className="space-y-6">
      {/* Header Controls Banner */}
      <div className="p-5 sm:p-6 bg-[#06261f] border border-[#114232] rounded-3xl shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#0c3b2e] border border-[#1a5e48] flex items-center justify-center text-[#d6a735] shadow-inner">
                <Activity size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#f5efdf] flex items-center gap-2">
                  Performance Analytics
                  <span className="px-2 py-0.5 bg-[#d6a735]/15 border border-[#d6a735]/40 text-[#d6a735] text-[10px] font-extrabold uppercase rounded-md tracking-wider">
                    Live Telemetry
                  </span>
                </h2>
                <p className="text-xs text-[#a3b8b0] mt-0.5">
                  Track tournament attendance velocity, capacity fill percentages, and prize escrow growth over time.
                </p>
              </div>
            </div>
          </div>

          {/* Scope Toggle & Actions */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="bg-[#081c15] p-1 rounded-xl border border-[#114232] flex items-center text-xs">
              <button
                onClick={() => setScope("my_tournaments")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  scope === "my_tournaments"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md"
                    : "text-[#a3b8b0] hover:text-[#f5efdf]"
                }`}
              >
                Organizer Studio
              </button>
              <button
                onClick={() => setScope("all_tournaments")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  scope === "all_tournaments"
                    ? "bg-[#d6a735] text-[#06261f] shadow-md"
                    : "text-[#a3b8b0] hover:text-[#f5efdf]"
                }`}
              >
                Platform Benchmark
              </button>
            </div>

            {onCreateTournament && (
              <button
                onClick={onCreateTournament}
                className="px-3.5 py-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#f5efdf] font-bold text-xs rounded-xl transition-all border border-[#184d3c] flex items-center gap-1.5 shadow"
              >
                <Trophy size={14} className="text-[#d6a735]" /> New Tournament
              </button>
            )}
          </div>
        </div>

        {/* View Switcher & Interactive Filter Pills */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-[#114232]/80">
          {/* Primary View Switcher */}
          <div className="md:col-span-6 flex items-center gap-1 bg-[#081c15] p-1 rounded-xl border border-[#114232] overflow-x-auto">
            <button
              onClick={() => setActiveView("combined")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === "combined"
                  ? "bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]"
                  : "text-[#a3b8b0] hover:text-[#f5efdf]"
              }`}
            >
              <BarChart3 size={14} /> Full Overview
            </button>
            <button
              onClick={() => setActiveView("participation")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === "participation"
                  ? "bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]"
                  : "text-[#a3b8b0] hover:text-[#f5efdf]"
              }`}
            >
              <Users size={14} /> Participation & Fill
            </button>
            <button
              onClick={() => setActiveView("prizepool")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === "prizepool"
                  ? "bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]"
                  : "text-[#a3b8b0] hover:text-[#f5efdf]"
              }`}
            >
              <Coins size={14} /> Prize Escrow
            </button>
            <button
              onClick={() => setActiveView("formats")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeView === "formats"
                  ? "bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]"
                  : "text-[#a3b8b0] hover:text-[#f5efdf]"
              }`}
            >
              <PieChartIcon size={14} /> Format Stats
            </button>
          </div>

          {/* Timeframe Filter */}
          <div className="md:col-span-3 flex items-center gap-1 bg-[#081c15] p-1 rounded-xl border border-[#114232]">
            <span className="text-[10px] uppercase font-bold text-[#a3b8b0] px-2 flex items-center gap-1">
              <Clock size={12} /> Time:
            </span>
            {(["all", "30d", "90d", "1y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                  timeRange === r
                    ? "bg-[#d6a735] text-[#06261f]"
                    : "text-[#a3b8b0] hover:text-[#f5efdf]"
                }`}
              >
                {r === "all" ? "All" : r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Format & Status Selectors */}
          <div className="md:col-span-3 flex items-center gap-2">
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Formats</option>
              <option value="single_elimination">Single Elim</option>
              <option value="double_elimination">Double Elim</option>
              <option value="round_robin">Round Robin</option>
              <option value="swiss">Swiss System</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Statuses</option>
              <option value="registration">Registration</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Average Bracket Fill Rate */}
        <div className="p-4 sm:p-5 bg-[#06261f] border border-[#114232] rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#a3b8b0] uppercase tracking-wider">Avg Bracket Fill Rate</span>
            <div className="p-2 rounded-xl bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]">
              <Percent size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#f5efdf] flex items-baseline gap-1.5">
              {kpiMetrics.avgFillRate}%
              <span className="text-xs text-emerald-400 font-bold flex items-center">
                <ArrowUpRight size={14} /> Capacity
              </span>
            </div>
            <p className="text-xs text-[#a3b8b0] mt-1">
              {kpiMetrics.totalEnrolled} / {kpiMetrics.totalCapacity} total seats filled
            </p>
          </div>
          {/* Visual Progress Bar */}
          <div className="w-full bg-[#081c15] h-2 rounded-full overflow-hidden border border-[#114232]">
            <div
              className="bg-gradient-to-r from-emerald-500 to-[#d6a735] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, kpiMetrics.avgFillRate))}%` }}
            />
          </div>
        </div>

        {/* Card 2: Cumulative Prize Pool Escrow */}
        <div className="p-4 sm:p-5 bg-[#06261f] border border-[#114232] rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#a3b8b0] uppercase tracking-wider">Prize Escrow Administered</span>
            <div className="p-2 rounded-xl bg-[#0c3b2e] text-cyan-400 border border-[#1a5e48]">
              <Trophy size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#d6a735] flex items-baseline gap-1.5">
              {kpiMetrics.totalPrizePool.toLocaleString()}
              <span className="text-xs text-[#a3b8b0] font-normal">pts</span>
            </div>
            <p className="text-xs text-[#a3b8b0] mt-1">
              Avg ~{kpiMetrics.avgPrizePool.toLocaleString()} pts / tournament
            </p>
          </div>
          <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 size={13} /> {kpiMetrics.completedEvents} prizes disbursed
          </div>
        </div>

        {/* Card 3: Total Participants Engaged */}
        <div className="p-4 sm:p-5 bg-[#06261f] border border-[#114232] rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#a3b8b0] uppercase tracking-wider">Total Entrants</span>
            <div className="p-2 rounded-xl bg-[#0c3b2e] text-emerald-400 border border-[#1a5e48]">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#f5efdf]">
              {kpiMetrics.totalEnrolled}
              <span className="text-xs text-[#a3b8b0] font-normal ml-1.5">players</span>
            </div>
            <p className="text-xs text-[#a3b8b0] mt-1">
              Across {kpiMetrics.totalEvents} organized brackets
            </p>
          </div>
          <div className="text-[11px] text-cyan-400 font-bold flex items-center gap-1">
            <Zap size={13} /> High tournament engagement
          </div>
        </div>

        {/* Card 4: Tournaments Hosted & Velocity */}
        <div className="p-4 sm:p-5 bg-[#06261f] border border-[#114232] rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#a3b8b0] uppercase tracking-wider">Bracket Execution</span>
            <div className="p-2 rounded-xl bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]">
              <Award size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#f5efdf]">
              {kpiMetrics.totalEvents}
              <span className="text-xs text-[#a3b8b0] font-normal ml-1.5">events</span>
            </div>
            <p className="text-xs text-[#a3b8b0] mt-1">
              {kpiMetrics.activeEvents} active &bull; {kpiMetrics.completedEvents} completed
            </p>
          </div>
          <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
            <Flame size={13} /> {kpiMetrics.completionRate}% completion rate
          </div>
        </div>
      </div>

      {/* PRIMARY VISUALIZATION CHARTS */}
      {filteredLeagues.length === 0 ? (
        <div className="p-12 text-center bg-[#06261f] border border-[#114232] rounded-3xl space-y-4">
          <Trophy size={48} className="mx-auto text-[#a3b8b0]/40" />
          <h3 className="text-lg font-bold text-[#f5efdf]">No Tournament Analytics for Selected Filters</h3>
          <p className="text-xs text-[#a3b8b0] max-w-md mx-auto">
            Try adjusting your timeframe or format filters above, or launch a new tournament to start recording attendance velocity and prize metrics.
          </p>
          {onCreateTournament && (
            <button
              onClick={onCreateTournament}
              className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl transition-all shadow-lg inline-flex items-center gap-2"
            >
              <Trophy size={16} /> Create New Tournament
            </button>
          )}
        </div>
      ) : (
        <>
          {/* CHART 1: PARTICIPATION & CAPACITY FILL RATE (COMPOSED CHART) */}
          {(activeView === "combined" || activeView === "participation") && (
            <div className="p-5 sm:p-6 bg-[#06261f] border border-[#114232] rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#114232] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                    <TrendingUp size={18} className="text-[#d6a735]" />
                    Tournament Participation Rates & Capacity Fill
                  </h3>
                  <p className="text-xs text-[#a3b8b0] mt-0.5">
                    Player enrollment numbers (bars) mapped against capacity fill rate % (gold trajectory line)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Enrolled Players
                  </span>
                  <span className="flex items-center gap-1.5 text-[#d6a735] font-semibold">
                    <span className="w-3 h-1 bg-[#d6a735] inline-block" /> Fill Rate %
                  </span>
                </div>
              </div>

              <div className="h-72 sm:h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={participationChartData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#114232" opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      stroke="#a3b8b0"
                      fontSize={11}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#a3b8b0"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      unit="%"
                      stroke="#d6a735"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomParticipationTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: "11px", paddingBottom: "10px", color: "#f5efdf" }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="enrolled"
                      name="Enrolled Players"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="fillRate"
                      name="Bracket Fill Rate (%)"
                      stroke="#d6a735"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "#d6a735", stroke: "#06261f", strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: "#f5efdf", stroke: "#d6a735", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHART 2: PRIZE POOL TRENDS & CUMULATIVE ESCROW (AREA CHART) */}
          {(activeView === "combined" || activeView === "prizepool") && (
            <div className="p-5 sm:p-6 bg-[#06261f] border border-[#114232] rounded-3xl shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#114232] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                    <Coins size={18} className="text-[#d6a735]" />
                    Prize Pool Escrow & Distribution Trends
                  </h3>
                  <p className="text-xs text-[#a3b8b0] mt-0.5">
                    Individual tournament prize pools and cumulative prize pool accumulation over time (Points)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-[#d6a735] font-semibold">
                    <span className="w-3 h-3 rounded bg-[#d6a735] inline-block" /> Event Prize Pool
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                    <span className="w-3 h-1 bg-cyan-400 inline-block" /> Cumulative Escrow
                  </span>
                </div>
              </div>

              <div className="h-72 sm:h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={prizePoolChartData} margin={{ top: 10, right: 10, left: -5, bottom: 25 }}>
                    <defs>
                      <linearGradient id="colorPrizePool" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d6a735" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#d6a735" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#114232" opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      stroke="#a3b8b0"
                      fontSize={11}
                      tickLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="#a3b8b0"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomPrizeTooltip />} />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: "11px", paddingBottom: "10px", color: "#f5efdf" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="prizePool"
                      name="Event Prize Pool (Pts)"
                      stroke="#d6a735"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorPrizePool)"
                    />
                    <Line
                      type="monotone"
                      dataKey="cumulativePrizePool"
                      name="Cumulative Escrow (Pts)"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* DUAL COLUMN: FORMAT PERFORMANCE & DISTRIBUTION */}
          {(activeView === "combined" || activeView === "formats") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Format Distribution (Donut & Breakdown) */}
              <div className="p-5 sm:p-6 bg-[#06261f] border border-[#114232] rounded-3xl shadow-xl space-y-4">
                <div className="border-b border-[#114232] pb-3">
                  <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                    <PieChartIcon size={18} className="text-[#d6a735]" />
                    Tournament Format Share
                  </h3>
                  <p className="text-xs text-[#a3b8b0] mt-0.5">
                    Proportion of organized tournaments by game ruleset
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
                  <div className="h-52 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={formatAnalytics}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={4}
                        >
                          {formatAnalytics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#06261f" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#081c15",
                            borderColor: "#1a5e48",
                            color: "#f5efdf",
                            borderRadius: "12px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-2.5">
                    {formatAnalytics.map((fmt) => (
                      <div
                        key={fmt.key}
                        className="p-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fmt.color }} />
                          <span className="font-semibold text-[#f5efdf]">{fmt.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-[#d6a735]">{fmt.count} events</span>
                          <span className="text-[10px] text-[#a3b8b0] block">{fmt.avgFillRate}% avg fill</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Format Efficiency & Fill Rate Bar Chart */}
              <div className="p-5 sm:p-6 bg-[#06261f] border border-[#114232] rounded-3xl shadow-xl space-y-4">
                <div className="border-b border-[#114232] pb-3">
                  <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                    <Award size={18} className="text-emerald-400" />
                    Format Fill Rate Efficiency (%)
                  </h3>
                  <p className="text-xs text-[#a3b8b0] mt-0.5">
                    Which tournament formats generate highest player turnout
                  </p>
                </div>

                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formatAnalytics} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#114232" opacity={0.6} horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} unit="%" stroke="#a3b8b0" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="#a3b8b0" fontSize={11} tickLine={false} width={110} />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, "Average Fill Rate"]}
                        contentStyle={{
                          backgroundColor: "#081c15",
                          borderColor: "#1a5e48",
                          color: "#f5efdf",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="avgFillRate" name="Avg Fill Rate (%)" fill="#10b981" radius={[0, 6, 6, 0]}>
                        {formatAnalytics.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* CHRONOLOGICAL TOURNAMENT PERFORMANCE LEDGER TABLE */}
          <div className="p-5 sm:p-6 bg-[#06261f] border border-[#114232] rounded-3xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#114232] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                  <Layers size={18} className="text-[#d6a735]" />
                  Tournament Performance Ledger
                </h3>
                <p className="text-xs text-[#a3b8b0] mt-0.5">
                  Detailed breakdown of participation and prize pools per event
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-3 text-[#a3b8b0]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search performance table..."
                  className="w-full pl-9 pr-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-xs text-[#f5efdf] placeholder-[#a3b8b0]/50 focus:outline-none focus:border-[#d6a735]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#114232] text-[#a3b8b0] uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Tournament</th>
                    <th className="py-3 px-3">Format</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Fill Rate / Capacity</th>
                    <th className="py-3 px-3">Prize Pool</th>
                    <th className="py-3 px-3">Winner / Champion</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#114232]/60">
                  {filteredLeagues.map((lg) => {
                    const enrolled = Number(lg.participantCount || 0);
                    const capacity = Number(lg.maxParticipants || 8);
                    const fillPercent = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;
                    const dateStr = new Date(lg.createdAt || Date.now()).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr key={lg.id} className="hover:bg-[#081c15]/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#f5efdf] line-clamp-1">{lg.title}</div>
                          <span className="text-[10px] text-[#a3b8b0]">ID: {lg.id.slice(0, 8)}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#081c15] border border-[#114232] text-cyan-400 whitespace-nowrap">
                            {FORMAT_LABELS[lg.format] || lg.format}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#a3b8b0] whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1.5 min-w-[130px]">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-[#f5efdf]">{enrolled} / {capacity}</span>
                              <span
                                className={`font-extrabold ${
                                  fillPercent >= 90
                                    ? "text-emerald-400"
                                    : fillPercent >= 50
                                    ? "text-[#d6a735]"
                                    : "text-amber-400"
                                }`}
                              >
                                {fillPercent}%
                              </span>
                            </div>
                            <div className="w-full bg-[#081c15] h-1.5 rounded-full overflow-hidden border border-[#114232]">
                              <div
                                className={`h-full rounded-full ${
                                  fillPercent >= 90
                                    ? "bg-emerald-500"
                                    : fillPercent >= 50
                                    ? "bg-[#d6a735]"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${fillPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-[#d6a735] whitespace-nowrap">
                          {Number(lg.prizePoolPoints || 0).toLocaleString()} pts
                        </td>
                        <td className="py-3 px-3 text-[#f5efdf] whitespace-nowrap">
                          {lg.winnerName ? (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                              <Trophy size={13} className="text-[#d6a735]" /> {lg.winnerName}
                            </span>
                          ) : (
                            <span className="text-[#a3b8b0] italic text-[11px]">Pending settlement</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold whitespace-nowrap ${
                              lg.status === "registration"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                : lg.status === "active"
                                ? "bg-amber-950 text-amber-400 border border-amber-500/40"
                                : lg.status === "completed"
                                ? "bg-blue-950 text-blue-400 border border-blue-500/40"
                                : "bg-red-950 text-red-400 border border-red-500/40"
                            }`}
                          >
                            {lg.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {onSelectLeague && (
                            <button
                              onClick={() => onSelectLeague(lg.id)}
                              className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#f5efdf] font-bold text-[11px] rounded-lg transition-all border border-[#184d3c] inline-flex items-center gap-1"
                            >
                              Command <ChevronRight size={12} className="text-[#d6a735]" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STRATEGIC ORGANIZER RECOMMENDATIONS */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0c3b2e] to-[#06261f] border border-[#184d3c] rounded-3xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#081c15] border border-[#d6a735]/40 flex items-center justify-center text-[#d6a735] shadow shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#f5efdf]">Organizer Growth Recommendation</h4>
            <p className="text-xs text-[#a3b8b0] mt-0.5">
              Tournaments with scheduled evening start times (18:00–20:00 GMT) experience a <strong>28% higher bracket fill rate</strong> and faster match progression.
            </p>
          </div>
        </div>

        {onCreateTournament && (
          <button
            onClick={onCreateTournament}
            className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
          >
            Launch Tournament <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default OrganizerPerformanceAnalytics;
