"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import {
  Trophy,
  Users,
  Shield,
  Award,
  CheckCircle,
  Lock,
  Clock,
  ArrowRight,
  Crown,
  Search,
  Filter,
  Sparkles,
  Flame,
  PlusCircle,
  Building2,
  RefreshCw,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import type { League, TournamentFormat } from "@/lib/types";

export default function LeaguesDirectoryPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<"all" | "registration" | "active" | "completed">("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [userRole, setUserRole] = useState("user");
  const [userToken, setUserToken] = useState("");

  useEffect(() => {
    const syncAuth = () => {
      const savedToken = localStorage.getItem("damii-player-token") || "";
      setUserToken(savedToken);

      const authUser = localStorage.getItem("damii-auth-user");
      if (authUser) {
        try {
          const parsed = JSON.parse(authUser);
          if (parsed.role) setUserRole(parsed.role);
        } catch {
          /* ignore */
        }
      }
    };

    syncAuth();
    loadLeagues();

    window.addEventListener("damii-auth-changed", syncAuth);
    return () => window.removeEventListener("damii-auth-changed", syncAuth);
  }, []);

  async function loadLeagues() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/league");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tournaments");
      setLeagues(data.leagues || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  }

  // Filtered tournament list
  const filteredLeagues = leagues.filter((league) => {
    // Status filter
    if (statusFilter !== "all" && league.status !== statusFilter) {
      return false;
    }
    // Format filter
    if (formatFilter !== "all" && league.format !== formatFilter) {
      return false;
    }
    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = league.title?.toLowerCase().includes(query);
      const matchHost = league.facilitatorName?.toLowerCase().includes(query);
      const matchDesc = league.description?.toLowerCase().includes(query);
      if (!matchTitle && !matchHost && !matchDesc) return false;
    }
    return true;
  });

  // Calculate quick platform totals
  const totalPrizeMarbles = leagues.reduce((sum, l) => sum + (l.prizePoolPoints || 0), 0);
  const liveCount = leagues.filter((l) => l.status === "active").length;
  const regCount = leagues.filter((l) => l.status === "registration").length;

  return (
    <main className="min-h-screen bg-[#081c15] text-[#f5efdf] flex flex-col">
      <SharedHeader />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <section className="p-6 sm:p-10 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                  <Trophy size={13} className="text-[#d6a735]" /> Official Tournament Arena
                </span>
                {liveCount > 0 && (
                  <span className="px-3 py-1 bg-amber-950/80 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse">
                    <Flame size={12} className="text-amber-400" /> {liveCount} Live Now
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-[#f5efdf] tracking-tight">
                DAMII TOURNAMENTS &amp; BRACKETS
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Compete in official 10x10 draughts championships, climb national ranking leaderboards, and win
                marbles in certified Single Elimination, Double Elimination, and Round-Robin leagues.
              </p>
            </div>

            {/* Quick Organizer CTA Button */}
            <div className="shrink-0">
              <Link
                href="/organizer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all active:scale-95"
              >
                <Building2 size={16} /> Host a Tournament
              </Link>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#184d3c] relative z-10">
            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Tournaments
              </small>
              <strong className="text-base sm:text-lg font-black text-[#f5efdf] font-mono block mt-0.5">
                {leagues.length} Events
              </strong>
            </div>

            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Open for Registration
              </small>
              <strong className="text-base sm:text-lg font-black text-emerald-400 font-mono block mt-0.5">
                {regCount} Open
              </strong>
            </div>

            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Live In Progress
              </small>
              <strong className="text-base sm:text-lg font-black text-amber-400 font-mono block mt-0.5">
                {liveCount} Active
              </strong>
            </div>

            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Prize Marbles
              </small>
              <strong className="text-base sm:text-lg font-black text-[#d6a735] font-mono block mt-0.5">
                {totalPrizeMarbles.toLocaleString()} Marbles
              </strong>
            </div>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#06261f] border border-[#184d3c] rounded-2xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === "all"
                    ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                    : "text-slate-300 hover:text-[#f5efdf]"
                }`}
              >
                All Tournaments ({leagues.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("registration")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === "registration"
                    ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                    : "text-slate-300 hover:text-[#f5efdf]"
                }`}
              >
                Registration Open ({regCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === "active"
                    ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                    : "text-slate-300 hover:text-[#f5efdf]"
                }`}
              >
                Live &amp; Active ({liveCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  statusFilter === "completed"
                    ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                    : "text-slate-300 hover:text-[#f5efdf]"
                }`}
              >
                Completed
              </button>
            </div>

            {/* Format Dropdown & Search Input */}
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="relative min-w-[160px]">
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  aria-label="Filter tournaments by format"
                  className="w-full pl-3 pr-8 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] font-bold focus:outline-none focus:border-[#d6a735] transition-colors"
                >
                  <option value="all">All Formats</option>
                  <option value="single_elimination">Single Elimination</option>
                  <option value="double_elimination">Double Elimination</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="swiss">Swiss System</option>
                </select>
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf] placeholder-slate-400 focus:outline-none focus:border-[#d6a735] transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={loadLeagues}
                className="p-2.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-[#f5efdf] rounded-xl border border-[#184d3c] transition-colors shrink-0"
                title="Refresh tournaments list"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-300 hover:text-white font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Tournament Cards Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={36} className="mx-auto text-[#d6a735] animate-spin" />
            <p className="text-xs text-slate-400">Loading tournaments...</p>
          </div>
        ) : filteredLeagues.length === 0 ? (
          <div className="p-12 text-center text-slate-300 bg-[#06261f] rounded-3xl border border-[#184d3c] space-y-4">
            <Trophy size={40} className="mx-auto text-[#d6a735]" />
            <h3 className="text-base font-bold text-[#f5efdf]">No Tournaments Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No tournaments match your current filter criteria. Check back soon or host your own tournament event.
            </p>
            <button
              onClick={() => {
                setStatusFilter("all");
                setFormatFilter("all");
                setSearchQuery("");
              }}
              className="px-4 py-2 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] rounded-xl text-xs font-bold border border-[#184d3c] transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLeagues.map((league) => {
              const entryFeeMarbles = league.entryFeeMarbles || league.entryFeePoints || 0;
              const prizePoolMarbles = league.prizePoolPoints || 0;
              const partCount = league.participantCount || 0;
              const maxPart = league.maxParticipants || 8;
              const progressPct = Math.min(100, Math.round((partCount / maxPart) * 100));

              return (
                <div
                  key={league.id}
                  className="bg-[#06261f] border border-[#184d3c] rounded-3xl p-5 sm:p-6 shadow-xl hover:border-[#d6a735]/50 transition-all flex flex-col justify-between space-y-5 group"
                >
                  {/* Top Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {/* Status Badge */}
                      {league.status === "registration" ? (
                        <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Registration Open
                        </span>
                      ) : league.status === "active" ? (
                        <span className="px-2.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Flame size={10} className="text-amber-400" />
                          Live Rounds
                        </span>
                      ) : league.status === "completed" ? (
                        <span className="px-2.5 py-0.5 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Crown size={10} />
                          Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-slate-900 text-slate-400 border border-slate-700 rounded-full text-[10px] font-bold uppercase">
                          {league.status}
                        </span>
                      )}

                      {/* Format Badge */}
                      <span className="px-2.5 py-0.5 bg-[#081c15] text-[#d6a735] border border-[#184d3c] rounded-full text-[10px] font-mono font-bold capitalize">
                        {league.format?.replace("_", " ") || "Single Elimination"}
                      </span>
                    </div>

                    {/* Tournament Title */}
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-[#f5efdf] group-hover:text-[#d6a735] transition-colors leading-snug line-clamp-1">
                        {league.title}
                      </h2>
                      <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1">
                        <Shield size={12} className="text-[#d6a735]" />
                        <span>Organized by {league.facilitatorName}</span>
                      </p>
                    </div>

                    {league.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {league.description}
                      </p>
                    )}
                  </div>

                  {/* Metrics Box */}
                  <div className="space-y-3 pt-3 border-t border-[#184d3c]">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-[#081c15] border border-[#184d3c] rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Prize Pool</span>
                        <strong className="text-xs font-black text-[#d6a735] font-mono block mt-0.5">
                          {prizePoolMarbles > 0 ? `${prizePoolMarbles.toLocaleString()} Marbles` : "Trophy"}
                        </strong>
                      </div>

                      <div className="p-2.5 bg-[#081c15] border border-[#184d3c] rounded-xl">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Entry Fee</span>
                        <strong className="text-xs font-black text-[#f5efdf] font-mono block mt-0.5">
                          {entryFeeMarbles > 0 ? `${entryFeeMarbles.toLocaleString()} Marbles` : "Free"}
                        </strong>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Users size={12} /> Players
                        </span>
                        <span className="text-[#f5efdf]">
                          {partCount} / {maxPart} Registered
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#081c15] rounded-full overflow-hidden border border-[#184d3c]">
                        <div
                          className="h-full bg-gradient-to-r from-[#d6a735] to-emerald-400 transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Schedule info */}
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {league.scheduleDate || "Weekends"}
                      </span>
                      <span className="font-mono text-[#d6a735] font-bold">
                        {league.turnTimerSeconds || 60}s Clock
                      </span>
                    </div>

                    {/* Winner Callout if Completed */}
                    {league.status === "completed" && league.winnerName && (
                      <div className="p-2 bg-[#081c15] border border-[#d6a735]/30 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Winner</span>
                        <span className="font-black text-[#d6a735] flex items-center gap-1">
                          <Crown size={12} className="text-[#d6a735]" /> {league.winnerName}
                        </span>
                      </div>
                    )}

                    {/* CTA Button */}
                    <Link
                      href={`/leagues/${league.id}`}
                      className="w-full py-2.5 px-4 bg-[#081c15] hover:bg-[#d6a735] text-[#d6a735] hover:text-[#06261f] border border-[#184d3c] hover:border-[#d6a735] rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow group-hover:shadow-lg"
                    >
                      <span>View Details &amp; Bracket</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Host Tournament Organizer Banner */}
        <section className="p-6 sm:p-8 bg-gradient-to-r from-[#06261f] to-[#081c15] border border-[#d6a735]/40 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-black text-[#d6a735] flex items-center justify-center md:justify-start gap-2">
              <Building2 size={20} /> Want to Host an Official DAMII Tournament?
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Certified organizers can create custom single and double elimination tournaments, seed players,
              distribute marble prize pools, and run sanctioned club championships.
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href="/organizer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all active:scale-95"
            >
              <span>Go to Organizer Portal</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
