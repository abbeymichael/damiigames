"use client";

import { useState, useMemo } from "react";
import {
  Trophy,
  Share2,
  Check,
  X,
  RotateCcw,
  Swords,
  ListOrdered,
  Gamepad2,
  Award,
  Zap,
  ShieldCheck,
  Eye,
  Crown,
  Target,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import {
  rowOf,
  colOf,
  type Board,
  type Player,
} from "@/lib/damii-rules";
import type { Room } from "@/lib/types";

export interface MatchSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: Player | null;
  board: Board;
  totalMoves: number;
  whiteDisplayName: string;
  blackDisplayName: string;
  whiteCaptures: number;
  blackCaptures: number;
  mode: "local" | "online";
  subMode?: "pass_play" | "vs_cpu";
  roomMode?: "casual" | "wager" | "league";
  room?: Room | null;
  cpuDifficulty?: "easy" | "medium" | "hard";
  onRematch?: () => void;
  onNewGame?: () => void;
  onReviewLog?: () => void;
  onLobby?: () => void;
  boardThemeBg?: string;
  playableBg?: string;
  playableAltBg?: string;
  restBg?: string;
}

const COL_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function MatchSummaryModal({
  isOpen,
  onClose,
  winner,
  board,
  totalMoves,
  whiteDisplayName,
  blackDisplayName,
  whiteCaptures,
  blackCaptures,
  mode,
  subMode,
  roomMode,
  room,
  cpuDifficulty = "medium",
  onRematch,
  onNewGame,
  onReviewLog,
  onLobby,
  boardThemeBg = "#0b2b22",
  playableBg = "#184d3c",
  playableAltBg = "#144435",
  restBg = "#d4a373",
}: MatchSummaryModalProps) {
  const [copied, setCopied] = useState(false);

  // Piece counts calculation from final board state
  const { whiteRemaining, blackRemaining, whiteKings, blackKings } = useMemo(() => {
    let wCount = 0;
    let bCount = 0;
    let wKings = 0;
    let bKings = 0;

    for (let i = 0; i < board.length; i++) {
      const piece = board[i];
      if (piece) {
        if (piece.player === "white") {
          wCount++;
          if (piece.king) wKings++;
        } else {
          bCount++;
          if (piece.king) bKings++;
        }
      }
    }
    return {
      whiteRemaining: wCount,
      blackRemaining: bCount,
      whiteKings: wKings,
      blackKings: bKings,
    };
  }, [board]);

  // Actual captures: calculated from opponent's missing pieces (20 starting pieces per player in 10x10)
  const actualWhiteCaptures = Math.max(whiteCaptures, 20 - blackRemaining);
  const actualBlackCaptures = Math.max(blackCaptures, 20 - whiteRemaining);

  // Determine game conclusion reason / subtitle
  const outcomeDetails = useMemo(() => {
    if (winner === "white") {
      const isElimination = blackRemaining === 0;
      return {
        title: `${whiteDisplayName} Wins!`,
        winnerColor: "text-amber-400",
        badgeBg: "bg-amber-500/20 border-amber-500/50 text-amber-300",
        reason: isElimination
          ? "Victory by Complete Elimination of Opponent Pieces"
          : "Victory by Move Blockade / Position Dominance",
      };
    }
    if (winner === "black") {
      const isElimination = whiteRemaining === 0;
      return {
        title: `${blackDisplayName} Wins!`,
        winnerColor: "text-emerald-400",
        badgeBg: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
        reason: isElimination
          ? "Victory by Complete Elimination of Opponent Pieces"
          : "Victory by Move Blockade / Position Dominance",
      };
    }
    const isDraw = room?.status === "draw" || room?.status === "completed";
    return {
      title: isDraw ? "Match Concluded — Draw" : "Match Concluded",
      winnerColor: "text-[#d6a735]",
      badgeBg: "bg-[#d6a735]/20 border-[#d6a735]/40 text-[#d6a735]",
      reason: isDraw
        ? "Match drawn by mutual player agreement"
        : "Match concluded and final board position recorded",
    };
  }, [winner, whiteDisplayName, blackDisplayName, whiteRemaining, blackRemaining, room?.status]);

  // Format mode description badge
  const modeBadge = useMemo(() => {
    if (mode === "online") {
      if (room?.leagueId || roomMode === "league" || room?.mode === "league") {
        return {
          label: "League Tournament",
          icon: Trophy,
          color: "bg-purple-950/90 text-purple-300 border-purple-500/40",
        };
      }
      if (room?.mode === "wager" || roomMode === "wager") {
        const wagerAmount = room?.wagerAmount || 0;
        return {
          label: `Wager Match • GH₵ ${(wagerAmount * 2).toFixed(2)} Pot`,
          icon: Zap,
          color: "bg-amber-950/90 text-amber-300 border-amber-500/50",
        };
      }
      return {
        label: "Online 1v1 Arena",
        icon: ShieldCheck,
        color: "bg-emerald-950/90 text-emerald-300 border-emerald-500/40",
      };
    }
    if (subMode === "vs_cpu") {
      return {
        label: `VS DAMII Bot (${cpuDifficulty.toUpperCase()})`,
        icon: Bot,
        color: "bg-blue-950/90 text-blue-300 border-blue-500/40",
      };
    }
    return {
      label: "Local 2-Player Match",
      icon: User,
      color: "bg-slate-900 text-slate-300 border-slate-700",
    };
  }, [mode, subMode, roomMode, room, cpuDifficulty]);

  // Share result text generator and handler
  const handleShareResult = async () => {
    const winnerName = winner === "white" ? whiteDisplayName : winner === "black" ? blackDisplayName : "Draw";
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const textLines = [
      `🏆 DAMII 10x10 Draughts • Match Summary`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      winner
        ? `👑 Winner: ${winnerName} (${winner === "white" ? "White ♔" : "Black ♚"})`
        : `🤝 Result: Match Drawn (${whiteDisplayName} vs ${blackDisplayName})`,
      `🎮 Mode: ${modeBadge.label}`,
      `⏱ Total Moves: ${totalMoves}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 Player Performance:`,
      `   • ⚪ ${whiteDisplayName}: ${actualWhiteCaptures} captures | ${whiteRemaining} remaining (${whiteKings} 👑)`,
      `   • ⚫ ${blackDisplayName}: ${actualBlackCaptures} captures | ${blackRemaining} remaining (${blackKings} 👑)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      origin ? `Play DAMII Draughts Arena: ${origin}/arena` : `Play DAMII Draughts Arena!`,
    ];

    const shareContent = textLines.join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "DAMII 10x10 Draughts Match Summary",
          text: shareContent,
          url: origin ? `${origin}/arena` : undefined,
        });
      } else {
        await navigator.clipboard.writeText(shareContent);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      try {
        await navigator.clipboard.writeText(shareContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        /* Fallback ignore */
      }
    }
  };

  if (!isOpen) return null;

  const ModeIcon = modeBadge.icon;

  return (
    <div
      id="match-summary-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-summary-title"
    >
      <section
        id="match-summary-modal-card"
        className="w-full max-w-4xl bg-gradient-to-b from-[#06261f] via-[#081c15] to-[#04140f] border-2 border-[#d6a735]/70 rounded-3xl p-4 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative space-y-5 my-4 sm:my-8 text-[#f5efdf] max-h-[92vh] flex flex-col justify-between overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          id="match-summary-close-btn"
          type="button"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-[#0c3b2e] hover:bg-[#144435] border border-[#184d3c] transition-colors z-20"
          onClick={onClose}
          aria-label="Close match summary"
        >
          <X size={18} />
        </button>

        {/* Modal Header: Trophy, Title & Status Badges */}
        <div className="space-y-3 border-b border-[#184d3c] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
                <Trophy size={26} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    id="match-summary-badge"
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${outcomeDetails.badgeBg}`}
                  >
                    Match Summary
                  </span>
                  <span
                    id="match-summary-mode-badge"
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${modeBadge.color}`}
                  >
                    <ModeIcon size={11} />
                    <span>{modeBadge.label}</span>
                  </span>
                </div>
                <h1
                  id="match-summary-title"
                  className={`text-xl sm:text-2xl font-black font-serif mt-1 ${outcomeDetails.winnerColor}`}
                >
                  {outcomeDetails.title}
                </h1>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#d6a735] shrink-0" />
            <span>{outcomeDetails.reason}</span>
          </p>

          {/* Tournament Draw & Sudden Death Tiebreaker Banner */}
          {!winner && (room?.leagueId || roomMode === "league" || room?.mode === "league") && (
            <div
              id="tournament-draw-tiebreaker-alert"
              className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-950/80 via-[#0c3b2e] to-amber-950/80 border-2 border-[#d6a735] rounded-2xl space-y-2 text-left shadow-xl animate-in fade-in"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="px-2.5 py-0.5 bg-[#d6a735] text-[#06261f] font-black text-[10px] uppercase tracking-wider rounded-full flex items-center gap-1">
                  <Zap size={12} /> Sudden Death Tiebreaker
                </span>
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  Tournament Knockout Rules Active
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#f5efdf]">
                ⚡ Knockout Bracket Match Drawn — Sudden Death Blitz Playoff Initiated!
              </h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                In tournament elimination brackets, matches cannot end in a draw. The platform has automatically initiated a <strong>Sudden Death Blitz Playoff (30s turn clock, swapped sides)</strong> to determine who advances to the next round of the tournament bracket!
              </p>
              {room?.leagueId && (
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <a
                    href={`/leagues/${room.leagueId}`}
                    className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl inline-flex items-center gap-1.5 transition-transform hover:scale-105 shadow"
                  >
                    <Trophy size={13} /> View Tournament Bracket &amp; Playoff
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Core Content Grid: Final Board Snapshot + Performance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* LEFT: Final Board State Snapshot (10x10 grid with coordinates) */}
          <div
            id="match-summary-board-container"
            className="lg:col-span-6 bg-[#031812] border-2 border-[#184d3c] rounded-2xl p-3 sm:p-4 space-y-2.5 shadow-xl"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                <Target size={14} /> Final Board State (10x10)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {whiteRemaining + blackRemaining} Pieces on Board
              </span>
            </div>

            {/* Rendered 10x10 Mini Board with Top & Side Coordinates */}
            <div className="relative p-1 bg-[#06261f] rounded-xl border border-[#184d3c]/80 shadow-inner">
              {/* Column coordinate labels (A-J) */}
              <div className="grid grid-cols-10 text-center text-[8px] sm:text-[9px] font-mono font-bold text-slate-400 pb-1">
                {COL_LETTERS.map((col) => (
                  <span key={col}>{col}</span>
                ))}
              </div>

              {/* 10x10 Square Matrix */}
              <div
                id="match-summary-board-grid"
                className="aspect-square grid grid-cols-10 grid-rows-10 border border-[#184d3c] rounded-lg overflow-hidden shadow-2xl"
                style={{
                  backgroundColor: boardThemeBg,
                }}
              >
                {Array.from({ length: 100 }, (_, sq) => {
                  const row = rowOf(sq);
                  const col = colOf(sq);
                  const playable = (row + col) % 2 === 1;
                  const piece = board[sq];

                  return (
                    <div
                      key={sq}
                      className="relative flex items-center justify-center p-0.5 select-none"
                      style={{
                        backgroundColor: playable
                          ? (row + col) % 4 === 1 || (row + col) % 4 === 3
                            ? playableBg
                            : playableAltBg
                          : restBg,
                      }}
                      title={`Square ${sq} (${COL_LETTERS[col]}${10 - row}): ${
                        piece ? `${piece.player.toUpperCase()} ${piece.king ? "KING" : "PIECE"}` : "Empty"
                      }`}
                    >
                      {piece && (
                        <div
                          className={`w-[84%] h-[84%] rounded-full flex items-center justify-center font-black shadow-md border ${
                            piece.player === "white"
                              ? "bg-gradient-to-br from-amber-50 via-amber-200 to-amber-300 border-amber-200 text-slate-950 shadow-amber-900/30"
                              : "bg-gradient-to-br from-slate-800 via-[#0c3b2e] to-slate-950 border-emerald-500/60 text-emerald-200 shadow-black/60"
                          }`}
                        >
                          {piece.king ? (
                            <span className="text-[9px] sm:text-xs leading-none drop-shadow">
                              ♛
                            </span>
                          ) : (
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                piece.player === "white" ? "bg-amber-900/40" : "bg-emerald-400/40"
                              }`}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Board Snapshot Footer Info */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-200 border border-amber-400 inline-block" />
                    White: <strong className="text-[#f5efdf]">{whiteRemaining}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#0c3b2e] border border-emerald-400 inline-block" />
                    Black: <strong className="text-[#f5efdf]">{blackRemaining}</strong>
                  </span>
                </div>
                <span className="text-slate-400 font-mono">10x10 Damii rules</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Match Statistics, Capture Breakdown & Player Scorecards */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Top KPI Badges: Total Moves & Mode */}
            <div className="grid grid-cols-2 gap-2.5">
              <div
                id="match-summary-moves-card"
                className="p-3 bg-[#031812] border border-[#184d3c] rounded-2xl space-y-1 text-left shadow-md"
              >
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Moves Played
                </span>
                <strong className="text-xl sm:text-2xl font-black text-[#f5efdf] flex items-center gap-1.5">
                  <ListOrdered size={18} className="text-[#d6a735]" />
                  <span>{totalMoves}</span>
                  <span className="text-xs font-normal text-slate-400">turns</span>
                </strong>
              </div>

              <div
                id="match-summary-captures-total-card"
                className="p-3 bg-[#031812] border border-[#184d3c] rounded-2xl space-y-1 text-left shadow-md"
              >
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Captures
                </span>
                <strong className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-1.5">
                  <Award size={18} className="text-amber-400" />
                  <span>{actualWhiteCaptures + actualBlackCaptures}</span>
                  <span className="text-xs font-normal text-slate-400">taken</span>
                </strong>
              </div>
            </div>

            {/* Player 1 (White) Scorecard */}
            <div
              id="match-summary-player1-card"
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5 shadow-lg ${
                winner === "white"
                  ? "bg-gradient-to-r from-[#0c3b2e] to-[#081c15] border-[#d6a735] ring-2 ring-[#d6a735]/30"
                  : "bg-[#031812] border-[#184d3c]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border-2 border-amber-200 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                    ♔
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-[#d6a735] uppercase tracking-wider">
                        PLAYER 1 (WHITE)
                      </span>
                      {winner === "white" && (
                        <span className="px-1.5 py-0.2 bg-[#d6a735] text-[#06261f] text-[9px] font-black rounded-full uppercase">
                          WINNER 👑
                        </span>
                      )}
                    </div>
                    <strong className="text-sm sm:text-base font-extrabold text-[#f5efdf] block truncate">
                      {whiteDisplayName}
                    </strong>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Captures</span>
                  <strong className="text-lg font-black text-[#d6a735]">
                    {actualWhiteCaptures}
                    <span className="text-xs font-normal text-slate-400">/20</span>
                  </strong>
                </div>
              </div>

              {/* Progress bar of enemy pieces captured */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Capture Progress: {Math.round((actualWhiteCaptures / 20) * 100)}%</span>
                  <span>
                    Remaining: <strong className="text-[#f5efdf]">{whiteRemaining}</strong>
                    {whiteKings > 0 && <span className="text-amber-400 ml-1">({whiteKings} 👑)</span>}
                  </span>
                </div>
                <div className="w-full bg-[#041913] rounded-full h-2 overflow-hidden border border-[#184d3c]">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (actualWhiteCaptures / 20) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Player 2 (Black) Scorecard */}
            <div
              id="match-summary-player2-card"
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all space-y-2.5 shadow-lg ${
                winner === "black"
                  ? "bg-gradient-to-r from-[#0c3b2e] to-[#081c15] border-emerald-400 ring-2 ring-emerald-500/30"
                  : "bg-[#031812] border-[#184d3c]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0c3b2e] via-[#06261f] to-slate-950 border-2 border-[#184d3c] text-emerald-200 font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                    {subMode === "vs_cpu" ? <Bot size={14} /> : "♚"}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                        PLAYER 2 (BLACK)
                      </span>
                      {winner === "black" && (
                        <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full uppercase">
                          WINNER 👑
                        </span>
                      )}
                    </div>
                    <strong className="text-sm sm:text-base font-extrabold text-[#f5efdf] block truncate">
                      {blackDisplayName}
                    </strong>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Captures</span>
                  <strong className="text-lg font-black text-emerald-400">
                    {actualBlackCaptures}
                    <span className="text-xs font-normal text-slate-400">/20</span>
                  </strong>
                </div>
              </div>

              {/* Progress bar of enemy pieces captured */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Capture Progress: {Math.round((actualBlackCaptures / 20) * 100)}%</span>
                  <span>
                    Remaining: <strong className="text-[#f5efdf]">{blackRemaining}</strong>
                    {blackKings > 0 && <span className="text-emerald-400 ml-1">({blackKings} 👑)</span>}
                  </span>
                </div>
                <div className="w-full bg-[#041913] rounded-full h-2 overflow-hidden border border-[#184d3c]">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (actualBlackCaptures / 20) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Prominent Share Result CTA */}
            <div className="pt-1">
              <button
                id="match-summary-share-btn"
                type="button"
                onClick={handleShareResult}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:brightness-110 text-white font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 hover:scale-[1.01]"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-emerald-300 animate-bounce" />
                    <span>Summary Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Share2 size={18} />
                    <span>Share Match Result</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Action Controls / Footer */}
        <div className="border-t border-[#184d3c] pt-4 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              id="match-summary-examine-board-btn"
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-[#184d3c] flex items-center gap-1.5 transition-colors"
            >
              <Eye size={14} className="text-[#d6a735]" />
              <span>Examine Board</span>
            </button>

            {onReviewLog && (
              <button
                id="match-summary-review-log-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onReviewLog();
                }}
                className="px-3.5 py-2 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-[#184d3c] flex items-center gap-1.5 transition-colors"
              >
                <ListOrdered size={14} className="text-[#d6a735]" />
                <span>Move Log</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onRematch && (
              <button
                id="match-summary-rematch-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onRematch();
                }}
                className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#d6a735]/20 transition-all hover:scale-105"
              >
                <RotateCcw size={14} />
                <span>Play Rematch</span>
              </button>
            )}

            {onNewGame && (
              <button
                id="match-summary-new-game-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onNewGame();
                }}
                className="px-4 py-2 bg-[#144435] hover:bg-[#1f5e4a] text-[#f5efdf] font-bold text-xs rounded-xl border border-[#184d3c] flex items-center gap-1.5 transition-colors"
              >
                <Swords size={14} className="text-[#d6a735]" />
                <span>New Match Setup</span>
              </button>
            )}

            {onLobby && (
              <button
                id="match-summary-lobby-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onLobby();
                }}
                className="px-3.5 py-2 bg-[#081c15] hover:bg-[#0c3b2e] text-slate-300 font-bold text-xs rounded-xl border border-[#184d3c] flex items-center gap-1.5 transition-colors"
              >
                <Gamepad2 size={14} />
                <span>Return to Lobby</span>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
