"use client";

import React, { useState, useMemo } from "react";
import {
  Gavel,
  Search,
  Filter,
  Trophy,
  Swords,
  Clock,
  Wifi,
  WifiOff,
  DollarSign,
  FileText,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import type { ComprehensiveMatch, MatchLossReason } from "@/lib/types";
import { exportMatchPdf, printMatchDossier } from "@/lib/pdf-export";

export interface DisputesTableProps {
  matches: ComprehensiveMatch[];
  onInspectMatch: (match: ComprehensiveMatch) => void;
  token?: string;
  adminSecret?: string;
  onRefresh?: () => void;
}

export function DisputesTable({
  matches = [],
  onInspectMatch,
  token,
  adminSecret,
  onRefresh,
}: DisputesTableProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "tournament" | "wager" | "casual">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "disputed" | "forfeited" | "playing" | "draw">("all");
  const [lossReasonFilter, setLossReasonFilter] = useState<"all" | MatchLossReason>("all");
  const [connectionFilter, setConnectionFilter] = useState<"all" | "with_issues" | "stable">("all");
  const [sortBy, setSortBy] = useState<"newest" | "wager" | "duration" | "moves" | "reconnects">("newest");

  // Summary Metrics Calculation
  const metrics = useMemo(() => {
    const totalMatches = matches.length;
    const tournamentMatches = matches.filter((m) => m.mode === "tournament").length;
    const wagerMatches = matches.filter((m) => m.mode === "wager" || m.mode === "custom_wager").length;
    const disputedMatches = matches.filter((m) => m.disputeStatus === "under_review" || m.status === "disputed").length;
    const disconnectForfeits = matches.filter((m) => m.terminationReason === "disconnect_timeout").length;
    const totalWagerVolume = matches.reduce((sum, m) => sum + (m.wagerAmount * 2), 0);
    const totalNetPrizes = matches.reduce((sum, m) => sum + m.netPayout, 0);

    return {
      totalMatches,
      tournamentMatches,
      wagerMatches,
      disputedMatches,
      disconnectForfeits,
      totalWagerVolume,
      totalNetPrizes,
    };
  }, [matches]);

  // Filtered and Sorted Match List
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      // 1. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchText = [
          m.roomCode,
          m.matchId,
          m.id,
          m.hostName,
          m.guestName,
          m.tournamentTitle,
          m.escrowId,
          m.hostPhone,
          m.guestPhone,
          m.hostToken,
          m.guestToken,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!matchText.includes(q)) return false;
      }

      // 2. Mode Filter
      if (modeFilter !== "all") {
        if (modeFilter === "tournament" && m.mode !== "tournament") return false;
        if (modeFilter === "wager" && m.mode !== "wager" && m.mode !== "custom_wager") return false;
        if (modeFilter === "casual" && m.mode !== "casual") return false;
      }

      // 3. Status Filter
      if (statusFilter !== "all") {
        if (statusFilter === "disputed" && m.disputeStatus !== "under_review" && m.status !== "disputed") return false;
        if (statusFilter === "completed" && m.status !== "completed") return false;
        if (statusFilter === "forfeited" && m.status !== "forfeited") return false;
        if (statusFilter === "playing" && m.status !== "playing") return false;
        if (statusFilter === "draw" && !m.isDraw && m.status !== "draw") return false;
      }

      // 4. Loss Reason Filter
      if (lossReasonFilter !== "all") {
        if (m.terminationReason !== lossReasonFilter) return false;
      }

      // 5. Connection Stability Filter
      if (connectionFilter !== "all") {
        if (connectionFilter === "with_issues" && !m.hasConnectionIssues) return false;
        if (connectionFilter === "stable" && m.hasConnectionIssues) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "wager") return b.wagerAmount - a.wagerAmount;
      if (sortBy === "duration") return b.durationSeconds - a.durationSeconds;
      if (sortBy === "moves") return b.moveCount - a.moveCount;
      if (sortBy === "reconnects") return b.reconnectCount - a.reconnectCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [matches, searchTerm, modeFilter, statusFilter, lossReasonFilter, connectionFilter, sortBy]);

  const lossReasonBadge = (reason: MatchLossReason) => {
    switch (reason) {
      case "disconnect_timeout":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950/80 text-red-300 border border-red-500/40 flex items-center gap-1">
            <WifiOff size={10} /> Disconnect Forfeit (90s)
          </span>
        );
      case "clock_timeout":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Clock size={10} /> Clock Timeout
          </span>
        );
      case "voluntary_resignation":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-950/80 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <RotateCcw size={10} /> Resignation
          </span>
        );
      case "board_win":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <Trophy size={10} /> Board Wipeout
          </span>
        );
      case "draw_agreed":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950/80 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <Swords size={10} /> Mutual Draw
          </span>
        );
      case "admin_ruling":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-950/80 text-yellow-300 border border-yellow-500/40 flex items-center gap-1">
            <Gavel size={10} /> Admin Arbitrated
          </span>
        );
      case "cancelled_unjoined":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 text-slate-400 border border-slate-700">
            Cancelled / Expired
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#06261f] text-slate-300 border border-[#1a5e48]">
            Standard Result
          </span>
        );
    }
  };

  return (
    <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-3xl shadow-2xl space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1a5e48]">
        <div>
          <h3 className="text-base font-black text-[#f5efdf] flex items-center gap-2.5 tracking-wide">
            <Gavel size={20} className="text-[#d6a735]" /> Match History &amp; Dispute Resolution Intelligence Center
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Comprehensive audit logs for all tournament and wager matches, loss classifications, reconnection timelines, financial escrows, and printable certificates.
          </p>
        </div>

        {metrics.disputedMatches > 0 && (
          <div className="px-3.5 py-1.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold flex items-center gap-2 animate-pulse">
            <AlertTriangle size={14} />
            <span>{metrics.disputedMatches} Open Dispute{metrics.disputedMatches > 1 ? "s" : ""} Pending Review</span>
          </div>
        )}
      </div>

      {/* Intelligence KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-slate-300 uppercase">Total Matches</div>
          <div className="text-lg font-black text-[#f5efdf] mt-1 font-mono">{metrics.totalMatches}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Recorded In System</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-slate-300 uppercase">Tournament Games</div>
          <div className="text-lg font-black text-amber-300 mt-1 font-mono">{metrics.tournamentMatches}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Championships</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-slate-300 uppercase">Wager Volume</div>
          <div className="text-lg font-black text-[#d6a735] mt-1 font-mono">GH₵ {metrics.totalWagerVolume.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Gross Pot Escrow</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-slate-300 uppercase">Prizes Disbursed</div>
          <div className="text-lg font-black text-emerald-300 mt-1 font-mono">GH₵ {metrics.totalNetPrizes.toFixed(2)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Net Winner Payouts</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-slate-300 uppercase">Disconnect Forfeits</div>
          <div className="text-lg font-black text-red-400 mt-1 font-mono">{metrics.disconnectForfeits}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">90s Grace Timeouts</div>
        </div>

        <div className="p-3.5 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-2xl">
          <div className="text-[10px] font-bold text-amber-300 uppercase">Dispute Queue</div>
          <div className="text-lg font-black text-[#f5efdf] mt-1 font-mono">{metrics.disputedMatches}</div>
          <div className="text-[10px] text-amber-300/80 mt-0.5">Requiring Ruling</div>
        </div>
      </div>

      {/* Search & Multi-Filter Control Bar */}
      <div className="p-4 bg-[#041d17] border border-[#1a5e48] rounded-2xl space-y-3">
        {/* Search Row */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Room Code, Match ID, Tournament Name, Player Username, Phone, or Escrow Ref..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-xs text-[#f5efdf] placeholder:text-slate-500 focus:outline-none focus:border-[#d6a735]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735] font-bold"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="wager">Sort: Highest Wager / Pot</option>
              <option value="duration">Sort: Longest Duration</option>
              <option value="moves">Sort: Most Moves</option>
              <option value="reconnects">Sort: Most Reconnects</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#114232] text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
            <SlidersHorizontal size={13} /> Filters:
          </span>

          {/* Mode */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as any)}
            className="px-2.5 py-1 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f5efdf]"
          >
            <option value="all">All Modes</option>
            <option value="tournament">🏆 Tournament Games</option>
            <option value="wager">💰 Wager Games</option>
            <option value="casual">🎮 Casual / Free</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f5efdf]"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed Wins</option>
            <option value="disputed">⚠️ Disputed / Under Review</option>
            <option value="forfeited">Forfeited (Timeout/Resign)</option>
            <option value="draw">🤝 Draws</option>
            <option value="playing">Active / In-Play</option>
          </select>

          {/* Loss Reason */}
          <select
            value={lossReasonFilter}
            onChange={(e) => setLossReasonFilter(e.target.value as any)}
            className="px-2.5 py-1 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f5efdf]"
          >
            <option value="all">All Loss Reasons</option>
            <option value="disconnect_timeout">🔴 Disconnect Timeout (90s)</option>
            <option value="clock_timeout">⏱️ Clock Timeout</option>
            <option value="voluntary_resignation">🏳️ Resignation</option>
            <option value="board_win">🏁 Board Checkmate</option>
            <option value="admin_ruling">⚖️ Admin Arbitrated</option>
          </select>

          {/* Connection */}
          <select
            value={connectionFilter}
            onChange={(e) => setConnectionFilter(e.target.value as any)}
            className="px-2.5 py-1 bg-[#06261f] border border-[#1a5e48] rounded-lg text-xs text-[#f5efdf]"
          >
            <option value="all">All Connection States</option>
            <option value="with_issues">⚠️ With Connection Incidents</option>
            <option value="stable">🟢 100% Stable Connection</option>
          </select>

          {(modeFilter !== "all" || statusFilter !== "all" || lossReasonFilter !== "all" || connectionFilter !== "all" || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setModeFilter("all");
                setStatusFilter("all");
                setLossReasonFilter("all");
                setConnectionFilter("all");
              }}
              className="ml-auto px-2.5 py-1 text-slate-400 hover:text-white text-[11px] underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Comprehensive Match History Table */}
      <div className="overflow-x-auto bg-[#041d17] border border-[#1a5e48] rounded-2xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-slate-300 uppercase font-bold tracking-wider bg-[#06221b]">
              <th className="py-3 px-3.5">Match &amp; Mode</th>
              <th className="py-3 px-3.5">Contestants (Host vs Guest)</th>
              <th className="py-3 px-3.5">Winner &amp; Net Prize</th>
              <th className="py-3 px-3.5">Loss / Termination Reason</th>
              <th className="py-3 px-3.5">Duration &amp; Moves</th>
              <th className="py-3 px-3.5">Connection Audit</th>
              <th className="py-3 px-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]">
            {filteredMatches.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                  No matching tournament or wager match records found.
                </td>
              </tr>
            ) : (
              filteredMatches.map((m) => {
                const isWinnerWhite = m.winner === "white";
                const isWinnerBlack = m.winner === "black";

                return (
                  <tr key={m.id} className="hover:bg-[#0c3b2e]/40 transition-colors group">
                    
                    {/* Match & Mode */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-[#d6a735]">{m.roomCode}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-[#06261f] border border-[#1a5e48] text-cyan-300">
                          {m.mode}
                        </span>
                      </div>
                      {m.tournamentTitle && (
                        <div className="text-[11px] text-amber-300/90 font-bold truncate max-w-[180px] mt-0.5">
                          🏆 {m.tournamentTitle}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {new Date(m.startedAt).toLocaleDateString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    {/* Contestants */}
                    <td className="py-3.5 px-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isWinnerWhite ? "bg-emerald-400 ring-2 ring-emerald-400/40" : "bg-slate-400"}`} />
                          <span className={`font-bold ${isWinnerWhite ? "text-[#f5efdf]" : "text-slate-300"}`}>
                            {m.hostName}
                          </span>
                          <span className="text-[10px] text-[#d6a735]">({m.hostRating || 1200})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isWinnerBlack ? "bg-emerald-400 ring-2 ring-emerald-400/40" : "bg-slate-400"}`} />
                          <span className={`font-bold ${isWinnerBlack ? "text-[#f5efdf]" : "text-slate-300"}`}>
                            {m.guestName || "Guest (Waiting)"}
                          </span>
                          {m.guestRating && <span className="text-[10px] text-[#d6a735]">({m.guestRating})</span>}
                        </div>
                      </div>
                    </td>

                    {/* Winner & Net Prize */}
                    <td className="py-3.5 px-3.5">
                      {m.winnerName ? (
                        <div>
                          <div className="font-black text-xs text-emerald-300 flex items-center gap-1">
                            <Trophy size={12} /> {m.winnerName}
                          </div>
                          {m.netPayout > 0 && (
                            <div className="text-xs font-mono font-bold text-[#d6a735] mt-0.5">
                              +GH₵ {m.netPayout.toFixed(2)}
                            </div>
                          )}
                          {m.wagerAmount > 0 && (
                            <div className="text-[10px] text-slate-400">
                              (Stake: GH₵ {m.wagerAmount})
                            </div>
                          )}
                        </div>
                      ) : m.isDraw ? (
                        <div className="text-xs font-bold text-amber-300">🤝 Mutual Draw</div>
                      ) : (
                        <div className="text-xs font-bold text-slate-400 uppercase">{m.status}</div>
                      )}
                    </td>

                    {/* Loss / Termination Reason */}
                    <td className="py-3.5 px-3.5">
                      <div className="space-y-1">
                        {lossReasonBadge(m.terminationReason)}
                        {m.disputeStatus === "under_review" && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-red-500/20 text-red-300 border border-red-500/40 block w-fit">
                            Dispute Open
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Duration & Moves */}
                    <td className="py-3.5 px-3.5 font-mono">
                      <div className="text-xs text-[#f5efdf] font-bold flex items-center gap-1">
                        <Clock size={11} className="text-slate-400" /> {m.durationFormatted}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {m.moveCount} moves
                      </div>
                    </td>

                    {/* Connection Audit */}
                    <td className="py-3.5 px-3.5">
                      {m.hasConnectionIssues ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
                            <WifiOff size={10} /> {m.reconnectCount} Reconnect{m.reconnectCount > 1 ? "s" : ""}
                          </span>
                          <div className="text-[10px] font-mono text-amber-400/80">
                            {m.totalDisconnectedSeconds}s offline
                          </div>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
                          <Wifi size={10} /> 100% Stable
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onInspectMatch(m)}
                          className="px-2.5 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] hover:text-[#f5efdf] text-xs font-bold rounded-xl border border-[#d6a735]/40 flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          title="Inspect full match dossier and board state"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => exportMatchPdf(m)}
                          className="p-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-[#d6a735] rounded-xl border border-[#1a5e48] transition-colors cursor-pointer"
                          title="Download PDF Match Report"
                        >
                          <Download size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => printMatchDossier(m)}
                          className="p-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-white rounded-xl border border-[#1a5e48] transition-colors cursor-pointer"
                          title="Print Match Certificate"
                        >
                          <Printer size={13} />
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

      {/* Footer Info */}
      <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-400">
        <div>
          Showing <strong className="text-[#f5efdf]">{filteredMatches.length}</strong> of <strong className="text-[#f5efdf]">{matches.length}</strong> recorded games
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span>Real-time Double-Entry Ledger and Disconnection Tracking Active</span>
        </div>
      </div>

    </section>
  );
}

export default DisputesTable;
