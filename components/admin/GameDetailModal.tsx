"use client";

import React, { useState } from "react";
import {
  X,
  Trophy,
  Swords,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  FileText,
  Printer,
  Download,
  ShieldCheck,
  DollarSign,
  Gavel,
  CheckCircle2,
  XCircle,
  RotateCcw,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { ComprehensiveMatch, Player } from "@/lib/types";
import { exportMatchPdf, printMatchDossier } from "@/lib/pdf-export";

export interface GameDetailModalProps {
  match: ComprehensiveMatch | null;
  onClose: () => void;
  token: string;
  adminSecret?: string;
  onRefresh?: () => void;
}

export function GameDetailModal({
  match,
  onClose,
  token,
  adminSecret,
  onRefresh,
}: GameDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "moves" | "network" | "ledger" | "arbitrate">("overview");
  const [rulingDecision, setRulingDecision] = useState<"confirm" | "correct" | "void">("confirm");
  const [rulingWinnerToken, setRulingWinnerToken] = useState<string>("");
  const [rulingNotes, setRulingNotes] = useState("");
  const [rulingBusy, setRulingBusy] = useState(false);
  const [rulingMessage, setRulingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!match) return null;

  async function handleDisputeRuling(e: React.FormEvent) {
    e.preventDefault();
    if (!match) return;

    setRulingBusy(true);
    setRulingMessage(null);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "review_dispute",
          roomCode: match.roomCode,
          decision: rulingDecision,
          winnerToken: rulingDecision === "correct" ? rulingWinnerToken : undefined,
          reviewNotes: rulingNotes.trim() || `Administrative ruling executed via Match Detail Dossier.`,
          adminSecret,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to submit administrative dispute ruling");
      }

      setRulingMessage({ type: "success", text: `Dispute ruling '${rulingDecision}' successfully executed and financial escrow reconciled.` });
      if (onRefresh) onRefresh();
    } catch (err) {
      setRulingMessage({ type: "error", text: err instanceof Error ? err.message : "Error executing ruling" });
    } finally {
      setRulingBusy(false);
    }
  }

  // Render 8x8 Board Snapshot
  const boardPieces = match.board || (function () {
    try {
      return match.boardJson ? JSON.parse(match.boardJson) : null;
    } catch {
      return null;
    }
  })();

  const lossReasonBadgeConfig: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    disconnect_timeout: { label: "Disconnection Forfeit", bg: "bg-red-950/80 border-red-500/50", text: "text-red-300", icon: WifiOff },
    clock_timeout: { label: "Clock Timeout", bg: "bg-amber-950/80 border-amber-500/50", text: "text-amber-300", icon: Clock },
    voluntary_resignation: { label: "Voluntary Resignation", bg: "bg-purple-950/80 border-purple-500/50", text: "text-purple-300", icon: RotateCcw },
    board_win: { label: "Board Checkmate / Wipeout", bg: "bg-emerald-950/80 border-emerald-500/50", text: "text-emerald-300", icon: Trophy },
    draw_agreed: { label: "Mutual Draw", bg: "bg-blue-950/80 border-blue-500/50", text: "text-blue-300", icon: Swords },
    admin_ruling: { label: "Administrative Ruling", bg: "bg-yellow-950/80 border-yellow-500/50", text: "text-yellow-300", icon: Gavel },
    cancelled_unjoined: { label: "Cancelled / Expired", bg: "bg-slate-900 border-slate-700", text: "text-slate-400", icon: XCircle },
    abandoned: { label: "Mutual Abandonment", bg: "bg-red-950/80 border-red-500/50", text: "text-red-300", icon: AlertTriangle },
    unknown: { label: "Standard Match", bg: "bg-slate-900 border-slate-700", text: "text-slate-300", icon: Swords },
  };

  const lossMeta = lossReasonBadgeConfig[match.terminationReason] || lossReasonBadgeConfig.unknown;
  const LossIcon = lossMeta.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-5 bg-[#041d17] border-b border-[#1a5e48] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#d6a735] to-[#8a6816] flex items-center justify-center text-slate-950 shadow-md">
              <Swords size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-[#f5efdf] tracking-wide">
                  Match Dossier • Room <span className="font-mono text-[#d6a735]">{match.roomCode}</span>
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/30">
                  {match.mode}
                </span>
                {match.tournamentTitle && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    🏆 {match.tournamentTitle}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Match ID: <span className="font-mono text-slate-200">{match.matchId || match.id}</span> • Started {new Date(match.startedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Quick Actions (PDF, Print, Close) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportMatchPdf(match)}
              className="px-3 py-1.5 rounded-xl bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] hover:text-[#f5efdf] border border-[#d6a735]/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Download Official Audit PDF"
            >
              <Download size={14} />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={() => printMatchDossier(match)}
              className="px-3 py-1.5 rounded-xl bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 border border-[#1a5e48] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print Dossier Certificate"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#06261f] hover:bg-red-950 text-slate-300 hover:text-red-300 border border-[#1a5e48] flex items-center justify-center transition-colors cursor-pointer ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 bg-[#06221b] border-b border-[#1a5e48] flex items-center gap-2 overflow-x-auto">
          {[
            { key: "overview", label: "Overview & Verdict", icon: Trophy },
            { key: "moves", label: `Move Ledger (${match.moveCount})`, icon: FileText },
            { key: "network", label: `Network Audit (${match.connectionEvents.length})`, icon: match.hasConnectionIssues ? WifiOff : Wifi },
            { key: "ledger", label: `Financial Ledger (${match.ledgerEntries?.length || 0})`, icon: DollarSign },
            { key: "arbitrate", label: "Dispute Ruling", icon: Gavel },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? "border-[#d6a735] text-[#d6a735]"
                    : "border-transparent text-slate-300 hover:text-white"
                }`}
              >
                <Icon size={14} className={isCurrent ? "text-[#d6a735]" : "text-slate-400"} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">

          {/* TAB 1: OVERVIEW & VERDICT */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
              {/* Contestants Head-to-Head */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Host Player Card */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    match.winner === "white"
                      ? "bg-[#0c3b2e]/60 border-emerald-500/50 shadow-lg shadow-emerald-950/30"
                      : "bg-[#06261f] border-[#1a5e48]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-slate-900 uppercase">
                      White (Host)
                    </span>
                    {match.winner === "white" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <Trophy size={11} /> Winner
                      </span>
                    ) : match.isDraw ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Draw
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/30">
                        Defeated
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-900 font-black text-sm flex items-center justify-center border-2 border-slate-300">
                      {match.hostName ? match.hostName.charAt(0).toUpperCase() : "W"}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#f5efdf]">{match.hostName}</div>
                      <div className="text-[11px] text-slate-300">
                        Rating: <strong className="text-[#d6a735]">{match.hostRating || 1200} DPI</strong> • {match.hostPhone || "No Phone"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                        {match.hostToken}
                      </div>
                    </div>
                  </div>

                  {match.winner === "white" && match.netPayout > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                      <span className="text-slate-300">Net Prize Disbursed:</span>
                      <strong className="text-emerald-300 font-mono text-sm">GH₵ {match.netPayout.toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                {/* Guest Player Card */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    match.winner === "black"
                      ? "bg-[#0c3b2e]/60 border-emerald-500/50 shadow-lg shadow-emerald-950/30"
                      : "bg-[#06261f] border-[#1a5e48]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-200 border border-slate-700 uppercase">
                      Black (Guest)
                    </span>
                    {match.winner === "black" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <Trophy size={11} /> Winner
                      </span>
                    ) : match.isDraw ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Draw
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-500/30">
                        Defeated
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-950 text-white font-black text-sm flex items-center justify-center border-2 border-slate-700">
                      {match.guestName ? match.guestName.charAt(0).toUpperCase() : "B"}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#f5efdf]">{match.guestName || "Guest (Waiting)"}</div>
                      <div className="text-[11px] text-slate-300">
                        Rating: <strong className="text-[#d6a735]">{match.guestRating || 1200} DPI</strong> • {match.guestPhone || "No Phone"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                        {match.guestToken || "N/A"}
                      </div>
                    </div>
                  </div>

                  {match.winner === "black" && match.netPayout > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                      <span className="text-slate-300">Net Prize Disbursed:</span>
                      <strong className="text-emerald-300 font-mono text-sm">GH₵ {match.netPayout.toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Loss Classification & Verdict Box */}
              <div className={`p-5 rounded-2xl border ${lossMeta.bg} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LossIcon size={18} className={lossMeta.text} />
                    <span className={`text-xs font-black uppercase tracking-wider ${lossMeta.text}`}>
                      Loss &amp; Termination Verdict: {lossMeta.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Duration: {match.durationFormatted} ({match.moveCount} moves)
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {match.lossExplanation}
                </p>
                {match.disputeNotes && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-[#d6a735] flex items-center gap-1.5">
                    <Gavel size={13} />
                    <span>Dispute Record: {match.disputeNotes}</span>
                  </div>
                )}
              </div>

              {/* Financial & Match Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-center">
                  <div className="text-[10px] text-slate-300 uppercase font-bold">Wager Stake</div>
                  <div className="text-base font-black text-[#d6a735] mt-1 font-mono">
                    GH₵ {match.wagerAmount.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Per Contestant</div>
                </div>

                <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-center">
                  <div className="text-[10px] text-slate-300 uppercase font-bold">Gross Pot</div>
                  <div className="text-base font-black text-[#f5efdf] mt-1 font-mono">
                    GH₵ {match.potAmount.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Escrowed Stake</div>
                </div>

                <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-center">
                  <div className="text-[10px] text-slate-300 uppercase font-bold">Platform Fee</div>
                  <div className="text-base font-black text-amber-400 mt-1 font-mono">
                    GH₵ {match.platformFee.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">5% Regulatory Rake</div>
                </div>

                <div className="p-3.5 bg-[#0c3b2e] border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold">Net Payout</div>
                  <div className="text-base font-black text-emerald-300 mt-1 font-mono">
                    GH₵ {match.netPayout.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">Disbursed to Winner</div>
                </div>
              </div>

              {/* Final Board Snapshot */}
              {boardPieces && Array.isArray(boardPieces) && boardPieces.length === 64 && (
                <div className="p-4 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                      <Sparkles size={14} className="text-[#d6a735]" /> Final Board State Snapshot (8x8 Damii)
                    </h4>
                    <span className="text-[10px] text-slate-300 font-mono">
                      Square Notation: 1 to 64
                    </span>
                  </div>

                  <div className="max-w-[340px] mx-auto aspect-square bg-[#03140f] border-4 border-[#1a5e48] rounded-xl p-1 shadow-inner">
                    <div className="grid grid-cols-8 grid-rows-8 h-full w-full gap-0.5">
                      {boardPieces.map((piece, idx) => {
                        const row = Math.floor(idx / 8);
                        const col = idx % 8;
                        const isDarkSquare = (row + col) % 2 === 1;

                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-center relative rounded-xs transition-all ${
                              isDarkSquare ? "bg-[#114232]" : "bg-[#f5efdf]/90"
                            }`}
                          >
                            <span className="absolute top-0.5 left-0.5 text-[7px] text-slate-400 opacity-60 leading-none">
                              {idx + 1}
                            </span>
                            {piece && (
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shadow-md ${
                                  piece === "white" || piece === "W"
                                    ? "bg-slate-100 text-slate-900 border border-slate-300"
                                    : piece === "black" || piece === "B"
                                    ? "bg-slate-950 text-white border border-slate-700"
                                    : piece.toLowerCase() === "wk"
                                    ? "bg-amber-100 text-amber-900 border-2 border-amber-400 font-black"
                                    : "bg-slate-900 text-amber-300 border-2 border-amber-400 font-black"
                                }`}
                              >
                                {piece.toLowerCase().includes("k") ? "👑" : ""}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MOVE LEDGER */}
          {activeTab === "moves" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1a5e48]">
                <div>
                  <h3 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                    Full Algebraic Move Ledger ({match.moves?.length || 0} moves recorded)
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Chronological step-by-step audit of piece displacements, jumps, multi-captures, and turn timestamps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => exportMatchPdf(match)}
                  className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] text-[11px] font-bold rounded-lg border border-[#d6a735]/30 flex items-center gap-1 cursor-pointer"
                >
                  <Download size={12} /> Export Ledger
                </button>
              </div>

              {!match.moves || match.moves.length === 0 ? (
                <div className="p-8 text-center bg-[#06261f] border border-[#1a5e48] rounded-2xl text-slate-400 text-xs italic">
                  No move log entries recorded for this match room.
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#041d17] border border-[#1a5e48] rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="border-b border-[#1a5e48] text-slate-300 uppercase font-bold tracking-wider bg-[#06221b]">
                        <th className="py-2.5 px-3 w-16">#</th>
                        <th className="py-2.5 px-3">Player</th>
                        <th className="py-2.5 px-3">Move (From → To)</th>
                        <th className="py-2.5 px-3">Notation</th>
                        <th className="py-2.5 px-3">Action Type</th>
                        <th className="py-2.5 px-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#114232]">
                      {match.moves.map((m, idx) => (
                        <tr key={idx} className="hover:bg-[#0c3b2e]/40 transition-colors">
                          <td className="py-2 px-3 font-bold text-[#d6a735]">{m.moveNumber || idx + 1}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                m.player === "white"
                                  ? "bg-slate-200 text-slate-900"
                                  : "bg-slate-900 text-slate-200 border border-slate-700"
                              }`}
                            >
                              {m.player === "white" ? "White" : "Black"}
                            </span>{" "}
                            <span className="font-sans text-slate-300 ml-1">{m.playerName}</span>
                          </td>
                          <td className="py-2 px-3 font-bold text-[#f5efdf]">
                            Sq {m.from} <ArrowRight size={11} className="inline mx-1 text-slate-400" /> Sq {m.to}
                          </td>
                          <td className="py-2 px-3 text-cyan-300 font-bold">{m.notation || `${m.from}-${m.to}`}</td>
                          <td className="py-2 px-3">
                            {m.isCapture ? (
                              <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/40 text-[10px] font-bold">
                                💥 Capture
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Step</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NETWORK AUDIT */}
          {activeTab === "network" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1a5e48]">
                <div>
                  <h3 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                    Network Disconnection &amp; Heartbeat Audit Trail
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Real-time connection event timeline, heartbeat latency drops, and reconnect recovery logs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                      match.hasConnectionIssues
                        ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {match.hasConnectionIssues ? <WifiOff size={13} /> : <Wifi size={13} />}
                    {match.hasConnectionIssues
                      ? `${match.reconnectCount} Reconnects • ${match.totalDisconnectedSeconds}s Offline`
                      : "100% Stable Connection"}
                  </span>
                </div>
              </div>

              {match.connectionEvents.length === 0 && !match.hasConnectionIssues ? (
                <div className="p-8 text-center bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-400 mx-auto" />
                  <h4 className="text-xs font-bold text-emerald-300">Flawless Network Performance</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Zero disconnection events, WebSocket drops, or grace period triggers were logged during this match. Both contestants maintained continuous 1.5s heartbeats.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {match.connectionEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#06261f] border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 mt-0.5">
                          {evt.event === "disconnect" ? <WifiOff size={16} /> : <Wifi size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#f5efdf]">
                              {evt.playerName} ({evt.player === "white" ? "Host" : "Guest"})
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#041d17] border border-[#1a5e48] text-amber-300">
                              {evt.event.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {evt.formattedTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 font-sans">
                            {evt.note}
                          </p>
                        </div>
                      </div>

                      {evt.durationSeconds !== undefined && evt.durationSeconds > 0 && (
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-bold">Latency / Offline Window</div>
                          <div className="text-xs font-bold font-mono text-amber-400">
                            {evt.durationSeconds}s Duration
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FINANCIAL LEDGER */}
          {activeTab === "ledger" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1a5e48]">
                <div>
                  <h3 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                    Linked Double-Entry Financial Ledger Journals
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Escrow locks, regulatory commissions, and prize payouts tied to Escrow ID <span className="font-mono text-[#d6a735]">{match.escrowId || "N/A"}</span>.
                  </p>
                </div>
              </div>

              {!match.ledgerEntries || match.ledgerEntries.length === 0 ? (
                <div className="p-8 text-center bg-[#06261f] border border-[#1a5e48] rounded-2xl text-slate-400 text-xs italic">
                  No dedicated double-entry ledger journals found for this match reference.
                </div>
              ) : (
                <div className="overflow-x-auto bg-[#041d17] border border-[#1a5e48] rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1a5e48] text-slate-300 uppercase font-bold tracking-wider bg-[#06221b]">
                        <th className="py-2.5 px-3">Entry ID</th>
                        <th className="py-2.5 px-3">Account</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Direction</th>
                        <th className="py-2.5 px-3 text-right">Recorded At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#114232]">
                      {match.ledgerEntries.map((le, idx) => (
                        <tr key={idx} className="hover:bg-[#0c3b2e]/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#d6a735]">{le.id.slice(0, 14)}</td>
                          <td className="py-2.5 px-3 capitalize text-slate-300">{le.accountType}</td>
                          <td className="py-2.5 px-3 font-bold text-[#f5efdf]">{le.entryType}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                            GH₵ {Number(le.amount).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-400">
                            {le.direction || "credit"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                            {le.recordedAt ? new Date(le.recordedAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DISPUTE RULING & ARBITRATION */}
          {activeTab === "arbitrate" && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="p-4 bg-[#041d17] border border-[#1a5e48] rounded-2xl space-y-1">
                <h3 className="text-xs font-bold text-[#d6a735] flex items-center gap-2">
                  <Gavel size={16} /> Administrative Dispute Arbitrator &amp; Escrow Settlement
                </h3>
                <p className="text-[11px] text-slate-300">
                  Review move notations, board captures, and connection timestamps above before executing a binding financial outcome.
                </p>
              </div>

              {rulingMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-bold ${
                    rulingMessage.type === "success"
                      ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                      : "bg-red-950/80 border-red-500/50 text-red-300"
                  }`}
                >
                  {rulingMessage.text}
                </div>
              )}

              <form onSubmit={handleDisputeRuling} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200">Arbitration Decision</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRulingDecision("confirm")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        rulingDecision === "confirm"
                          ? "bg-emerald-600 text-white border-emerald-400 shadow-md"
                          : "bg-[#06261f] text-slate-300 border-[#1a5e48] hover:bg-[#0c3b2e]"
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      <span>Confirm Result</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRulingDecision("correct")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        rulingDecision === "correct"
                          ? "bg-amber-600 text-white border-amber-400 shadow-md"
                          : "bg-[#06261f] text-slate-300 border-[#1a5e48] hover:bg-[#0c3b2e]"
                      }`}
                    >
                      <RotateCcw size={16} />
                      <span>Overturn / Correct</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRulingDecision("void")}
                      className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        rulingDecision === "void"
                          ? "bg-red-600 text-white border-red-400 shadow-md"
                          : "bg-[#06261f] text-slate-300 border-[#1a5e48] hover:bg-[#0c3b2e]"
                      }`}
                    >
                      <XCircle size={16} />
                      <span>Void &amp; 100% Refund</span>
                    </button>
                  </div>
                </div>

                {rulingDecision === "correct" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-200">Select Corrected Winner</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRulingWinnerToken(match.hostToken)}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer ${
                          rulingWinnerToken === match.hostToken
                            ? "bg-[#0c3b2e] border-[#d6a735] text-[#f5efdf]"
                            : "bg-[#06261f] border-[#1a5e48] text-slate-300"
                        }`}
                      >
                        <span>White: {match.hostName}</span>
                        {rulingWinnerToken === match.hostToken && <CheckCircle2 size={14} className="text-[#d6a735]" />}
                      </button>

                      {match.guestToken && (
                        <button
                          type="button"
                          onClick={() => setRulingWinnerToken(match.guestToken!)}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer ${
                            rulingWinnerToken === match.guestToken
                              ? "bg-[#0c3b2e] border-[#d6a735] text-[#f5efdf]"
                              : "bg-[#06261f] border-[#1a5e48] text-slate-300"
                          }`}
                        >
                          <span>Black: {match.guestName || "Guest"}</span>
                          {rulingWinnerToken === match.guestToken && <CheckCircle2 size={14} className="text-[#d6a735]" />}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200">Arbitration Audit Statement / Notes</label>
                  <textarea
                    rows={3}
                    value={rulingNotes}
                    onChange={(e) => setRulingNotes(e.target.value)}
                    placeholder="Provide detailed justification (e.g. Move #24 capture verification, verified disconnection latency, player agreement)..."
                    className="w-full px-3.5 py-2.5 bg-[#041d17] border border-[#1a5e48] rounded-xl text-xs text-[#f5efdf] placeholder:text-slate-500 focus:outline-none focus:border-[#d6a735]"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={rulingBusy || (rulingDecision === "correct" && !rulingWinnerToken)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Gavel size={14} />
                    <span>{rulingBusy ? "Submitting Ruling..." : "Execute Binding Dispute Ruling"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#041d17] border-t border-[#1a5e48] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Encrypted Audit Ledger ID: DAMII-{match.roomCode}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 rounded-xl text-xs font-bold border border-[#1a5e48] cursor-pointer"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
}

export default GameDetailModal;
