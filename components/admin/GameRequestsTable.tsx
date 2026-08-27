"use client";

import React, { useState, useMemo } from "react";
import {
  Gamepad2,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Swords,
  DollarSign,
  Trophy,
  User,
  Wifi,
  WifiOff,
  Eye,
  Trash2,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import type { GameRequestItem, TournamentActionRequest, Room } from "@/lib/types";

export interface GameRequestsTableProps {
  gameRequests: GameRequestItem[];
  tournamentRequests?: TournamentActionRequest[];
  token: string;
  adminSecret?: string;
  onRefresh: () => void;
  onInspectRoomCode?: (roomCode: string) => void;
  busy?: boolean;
}

export function GameRequestsTable({
  gameRequests = [],
  tournamentRequests = [],
  token,
  adminSecret,
  onRefresh,
  onInspectRoomCode,
  busy = false,
}: GameRequestsTableProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "wager_challenge" | "open_lobby" | "tournament_action" | "bracket_match">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "waiting" | "playing" | "pending_review" | "completed" | "expired" | "approved" | "rejected">("all");

  // Review Modal State (For tournament action requests)
  const [selectedActionReq, setSelectedActionReq] = useState<GameRequestItem | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [reviewNote, setReviewNote] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  // Counts
  const counts = useMemo(() => {
    const total = gameRequests.length;
    const wager = gameRequests.filter((r) => r.type === "wager_challenge").length;
    const lobby = gameRequests.filter((r) => r.type === "open_lobby").length;
    const actions = gameRequests.filter((r) => r.type === "tournament_action").length;
    const pending = gameRequests.filter((r) => r.status === "waiting" || r.status === "pending_review").length;
    const playing = gameRequests.filter((r) => r.status === "playing").length;

    return { total, wager, lobby, actions, pending, playing };
  }, [gameRequests]);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return gameRequests.filter((r) => {
      // 1. Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const text = [
          r.id,
          r.title,
          r.creatorName,
          r.creatorPhone,
          r.targetOpponentName,
          r.roomCode,
          r.tournamentTitle,
          r.reason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!text.includes(q)) return false;
      }

      // 2. Type Filter
      if (typeFilter !== "all" && r.type !== typeFilter) return false;

      // 3. Status Filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      return true;
    });
  }, [gameRequests, searchTerm, typeFilter, statusFilter]);

  // Handle Review Submission
  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedActionReq || !selectedActionReq.actionRequestId) return;

    setActionBusy(true);
    setActionError("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "review_tournament_request",
          requestId: selectedActionReq.actionRequestId,
          decision,
          reviewNote: reviewNote.trim() || undefined,
          adminSecret,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to process request review");
      }

      setSelectedActionReq(null);
      onRefresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error processing action");
    } finally {
      setActionBusy(false);
    }
  }

  // Quick Cancel / Terminate Stale Game Request
  async function handleCancelStaleRoom(roomCode: string) {
    if (!confirm(`Are you sure you want to cancel and refund waiting game room ${roomCode}?`)) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "force_cancel_room",
          roomCode,
          adminSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to cancel room");
      }
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error cancelling room");
    }
  }

  const typeBadge = (type: GameRequestItem["type"]) => {
    switch (type) {
      case "wager_challenge":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40 flex items-center gap-1">
            <DollarSign size={10} /> Wager Challenge
          </span>
        );
      case "open_lobby":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-950 text-blue-300 border border-blue-500/40 flex items-center gap-1">
            <Gamepad2 size={10} /> Free Lobby Game
          </span>
        );
      case "tournament_action":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-950 text-purple-300 border border-purple-500/40 flex items-center gap-1">
            <AlertTriangle size={10} /> Tournament Action
          </span>
        );
      case "bracket_match":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Trophy size={10} /> Bracket Match
          </span>
        );
    }
  };

  const statusBadge = (status: GameRequestItem["status"]) => {
    switch (status) {
      case "waiting":
      case "pending_review":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-950/80 text-amber-300 border border-amber-500/50 flex items-center gap-1">
            <Clock size={10} /> Waiting / Pending
          </span>
        );
      case "playing":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 flex items-center gap-1 animate-pulse">
            <Swords size={10} /> In-Progress
          </span>
        );
      case "completed":
      case "approved":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30">
            {status}
          </span>
        );
      case "cancelled":
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-950 text-red-400 border border-red-500/30">
            {status}
          </span>
        );
      case "expired":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 text-slate-400 border border-slate-700">
            Expired
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#f5efdf] flex items-center gap-2.5 tracking-wide">
            <Gamepad2 size={20} className="text-[#d6a735]" />
            Game Requests &amp; Wager Lobby Tracker
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Real-time management of user-requested wager challenges, free casual matches, lobby queues, and facilitator tournament action requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            className="px-3 py-1.5 rounded-xl bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] text-xs font-bold transition-all cursor-pointer"
          >
            {busy ? "Refreshing..." : "Refresh Requests"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-slate-300 uppercase">Total Requests</div>
          <div className="text-lg font-black text-[#f5efdf] mt-1 font-mono">{counts.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All Categories</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-[#d6a735] uppercase">Wager Challenges</div>
          <div className="text-lg font-black text-[#d6a735] mt-1 font-mono">{counts.wager}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Stakes Requested</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-blue-300 uppercase">Free Lobby Games</div>
          <div className="text-lg font-black text-blue-300 mt-1 font-mono">{counts.lobby}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Casual Play</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
          <div className="text-[10px] font-bold text-purple-300 uppercase">Organizer Actions</div>
          <div className="text-lg font-black text-purple-300 mt-1 font-mono">{counts.actions}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Tournament Reviews</div>
        </div>

        <div className="p-3.5 bg-[#0c3b2e] border border-amber-500/40 rounded-2xl">
          <div className="text-[10px] font-bold text-amber-300 uppercase">Waiting / Pending</div>
          <div className="text-lg font-black text-amber-300 mt-1 font-mono">{counts.pending}</div>
          <div className="text-[10px] text-amber-400/80 mt-0.5">Awaiting Opponent/Admin</div>
        </div>

        <div className="p-3.5 bg-[#06261f] border border-emerald-500/40 rounded-2xl">
          <div className="text-[10px] font-bold text-emerald-300 uppercase">Currently Playing</div>
          <div className="text-lg font-black text-emerald-300 mt-1 font-mono">{counts.playing}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Live In Arena</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-[#081c15] border border-[#1a5e48] rounded-2xl space-y-3 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Request Title, Room Code, Creator Username, Target Opponent, or Reason..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-xs text-[#f5efdf] font-bold focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Request Types</option>
              <option value="wager_challenge">💰 Wager Challenges</option>
              <option value="open_lobby">🎮 Free Lobby Games</option>
              <option value="tournament_action">🏆 Tournament Actions</option>
              <option value="bracket_match">⚔️ Bracket Matches</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-xs text-[#f5efdf] font-bold focus:outline-none focus:border-[#d6a735]"
            >
              <option value="all">All Statuses</option>
              <option value="waiting">⏳ Waiting in Lobby</option>
              <option value="playing">⚔️ Live Playing</option>
              <option value="pending_review">⚠️ Pending Review</option>
              <option value="completed">✓ Completed</option>
              <option value="expired">⌛ Expired</option>
              <option value="cancelled">✕ Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                <th className="py-3 px-3.5">Category &amp; Room</th>
                <th className="py-3 px-3.5">Game Title / Challenge</th>
                <th className="py-3 px-3.5">Creator &amp; Opponent</th>
                <th className="py-3 px-3.5">Wager / Stakes</th>
                <th className="py-3 px-3.5">Constraints &amp; Grace</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#114232]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    No game requests found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#0c3b2e]/40 transition-colors">
                    
                    {/* Category & Room */}
                    <td className="py-3.5 px-3.5">
                      <div className="space-y-1">
                        {typeBadge(req.type)}
                        {req.roomCode && (
                          <div className="font-mono text-xs font-bold text-[#d6a735]">
                            Room: {req.roomCode}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(req.createdAt).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </td>

                    {/* Game Title */}
                    <td className="py-3.5 px-3.5 max-w-xs">
                      <div className="font-bold text-xs text-[#f5efdf] line-clamp-1">
                        {req.title}
                      </div>
                      {req.reason && (
                        <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 italic bg-[#06261f] p-1.5 rounded border border-[#114232]">
                          &ldquo;{req.reason}&rdquo;
                        </p>
                      )}
                      {req.tournamentTitle && (
                        <div className="text-[10px] text-amber-300 font-bold mt-1">
                          🏆 {req.tournamentTitle}
                        </div>
                      )}
                    </td>

                    {/* Creator & Opponent */}
                    <td className="py-3.5 px-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 font-bold text-xs text-[#f5efdf]">
                          <User size={11} className="text-[#d6a735]" /> {req.creatorName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          vs: <strong className="text-slate-200">{req.targetOpponentName || "Public Queue"}</strong>
                        </div>
                      </div>
                    </td>

                    {/* Wager / Stakes */}
                    <td className="py-3.5 px-3.5">
                      {req.wagerAmount > 0 ? (
                        <div>
                          <div className="text-xs font-black text-[#d6a735] font-mono">
                            GH₵ {req.wagerAmount.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            Pot: GH₵ {(req.wagerAmount * 2).toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Free Match</span>
                      )}
                    </td>

                    {/* Constraints & Grace */}
                    <td className="py-3.5 px-3.5 text-[11px] font-mono text-slate-300">
                      <div>Clock: {req.timeLimitSeconds ? `${Math.floor(req.timeLimitSeconds / 60)}m` : "10m"}</div>
                      <div>Turn: {req.turnLimitSeconds || 45}s</div>
                      <div className="text-amber-400/90">Grace: {req.disconnectionGraceSeconds || 90}s</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3.5">
                      {statusBadge(req.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.type === "tournament_action" && req.status === "pending_review" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedActionReq(req);
                              setDecision("approved");
                              setReviewNote("");
                              setActionError("");
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl cursor-pointer shadow"
                          >
                            Review Action
                          </button>
                        )}

                        {req.roomCode && onInspectRoomCode && (
                          <button
                            type="button"
                            onClick={() => onInspectRoomCode(req.roomCode!)}
                            className="px-2.5 py-1 bg-[#06261f] hover:bg-[#0c3b2e] text-[#d6a735] font-bold text-xs rounded-xl border border-[#1a5e48] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} /> Inspect
                          </button>
                        )}

                        {req.status === "waiting" && req.roomCode && (
                          <button
                            type="button"
                            onClick={() => handleCancelStaleRoom(req.roomCode!)}
                            className="p-1.5 bg-[#06261f] hover:bg-red-950 text-slate-400 hover:text-red-300 rounded-xl border border-[#1a5e48] transition-colors cursor-pointer"
                            title="Cancel and void waiting room"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal for Tournament Actions */}
      {selectedActionReq && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-lg w-full rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                <AlertTriangle size={18} /> Review Tournament Action Request
              </h3>
              <button
                type="button"
                onClick={() => setSelectedActionReq(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-[#041d17] border border-[#1a5e48] rounded-xl text-xs space-y-1.5">
              <div>Type: <strong className="text-[#f5efdf] uppercase">{selectedActionReq.title}</strong></div>
              <div>Submitted By: <strong className="text-emerald-400">{selectedActionReq.creatorName}</strong></div>
              {selectedActionReq.reason && (
                <div>Justification: <span className="text-slate-300 italic">&ldquo;{selectedActionReq.reason}&rdquo;</span></div>
              )}
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-300 text-xs font-bold">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200">Administrative Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision("approved")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      decision === "approved"
                        ? "bg-emerald-600 text-white border-emerald-400"
                        : "bg-[#06261f] text-slate-300 border-[#1a5e48]"
                    }`}
                  >
                    <CheckCircle2 size={16} /> Approve Action
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("rejected")}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      decision === "rejected"
                        ? "bg-red-600 text-white border-red-400"
                        : "bg-[#06261f] text-slate-300 border-[#1a5e48]"
                    }`}
                  >
                    <XCircle size={16} /> Reject Action
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200">Review Note / Audit Statement</label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Provide audit reason or notes for the tournament organizer..."
                  className="w-full px-3 py-2 bg-[#041d17] border border-[#1a5e48] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedActionReq(null)}
                  className="px-4 py-2 bg-[#06261f] text-slate-300 rounded-xl text-xs font-bold border border-[#1a5e48] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-lg cursor-pointer"
                >
                  {actionBusy ? "Submitting..." : "Submit Review Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default GameRequestsTable;
