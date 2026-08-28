"use client";

import React, { useState } from "react";
import { Swords, ListOrdered, Check, Copy, FileText, ChevronDown, ChevronUp, Clock, Sparkles } from "lucide-react";
import type { Player, NotationStyle } from "@/lib/types";

interface PairedMove {
  turnNum: number;
  white?: {
    notation: string;
    algNotation?: string;
    sqNotation?: string;
    isCapture?: boolean;
  };
  black?: {
    notation: string;
    algNotation?: string;
    sqNotation?: string;
    isCapture?: boolean;
  };
}

interface GameIntelligenceHubProps {
  whiteDisplayName: string;
  blackDisplayName: string;
  whiteRating?: number;
  blackRating?: number;
  captures: { white: number; black: number };
  turn: Player;
  winner: Player | "draw" | null;
  secondsLeft: number;
  turnTimerLimit: number;
  winProbability: { whiteProb: number; blackProb: number };
  pairedMoves: PairedMove[];
  activeMovesCount: number;
  notationStyle: NotationStyle;
  onSetNotationStyle: (style: NotationStyle) => void;
  onCopyHistory: () => void;
  copiedHistory: boolean;
  historyScrollRef: React.RefObject<HTMLDivElement | null>;
  showTrainingIntel?: boolean;
  onToggleTrainingIntel?: () => void;
  suggestedHint?: {
    from: number;
    to: number;
    notation: string;
    algNotation?: string;
    sqNotation?: string;
    isCapture?: boolean;
  } | null;
}

export function GameIntelligenceHub({
  whiteDisplayName,
  blackDisplayName,
  whiteRating = 1850,
  blackRating = 1820,
  captures,
  turn,
  winner,
  secondsLeft,
  turnTimerLimit,
  winProbability,
  pairedMoves,
  activeMovesCount,
  notationStyle,
  onSetNotationStyle,
  onCopyHistory,
  copiedHistory,
  historyScrollRef,
  showTrainingIntel = false,
  onToggleTrainingIntel,
  suggestedHint,
}: GameIntelligenceHubProps) {
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  return (
    <div className="w-full flex flex-col gap-2.5 select-none">
      {/* 1. PLAYER STATUS CARD */}
      <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-xl p-2.5 sm:p-3 shadow-lg space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#184d3c]">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#d6a735] uppercase tracking-wider">
            <Swords size={13} />
            <span>Player Status</span>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-extrabold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Player Dual Status Panels */}
        <div className="space-y-1.5">
          {/* Player 1 (White / Red) */}
          <div
            className={`p-2 rounded-lg border transition-all ${
              turn === "white" && !winner
                ? "bg-[#0c3b2e] border-[#d6a735] shadow-sm ring-1 ring-[#d6a735]/30"
                : "bg-[#041913] border-[#184d3c] opacity-90"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border border-amber-200 shadow-sm flex items-center justify-center text-slate-950 font-black text-[11px] shrink-0">
                  ♔
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <strong className="text-[11px] text-[#f5efdf] font-bold truncate max-w-[110px]">
                      {whiteDisplayName}
                    </strong>
                    <span className="text-[9px] text-amber-300 font-mono font-semibold">(Red)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-300">
                    <span className="text-slate-400">ELO: <b className="text-slate-200">{whiteRating}</b></span>
                    <span>|</span>
                    <span className="text-slate-400">Takes: <b className="text-[#d6a735]">{captures.white}</b></span>
                  </div>
                </div>
              </div>

              {/* Animated Live Signal Bars */}
              <div className="flex items-end gap-0.5 h-3.5 px-1 py-0.5 bg-[#06261f] border border-[#184d3c] rounded">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ height: "60%" }} />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ height: "100%" }} />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce" style={{ height: "75%" }} />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.45s]" style={{ height: "90%" }} />
              </div>
            </div>
          </div>

          {/* Player 2 (Black) */}
          <div
            className={`p-2 rounded-lg border transition-all ${
              turn === "black" && !winner
                ? "bg-[#0c3b2e] border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                : "bg-[#041913] border-[#184d3c] opacity-90"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-800 to-emerald-950 border border-emerald-500/60 shadow-sm flex items-center justify-center text-emerald-300 font-black text-[11px] shrink-0">
                  ♚
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <strong className="text-[11px] text-[#f5efdf] font-bold truncate max-w-[110px]">
                      {blackDisplayName}
                    </strong>
                    <span className="text-[9px] text-emerald-400 font-mono font-semibold">(Black)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-300">
                    <span className="text-slate-400">ELO: <b className="text-slate-200">{blackRating}</b></span>
                    <span>|</span>
                    <span className="text-slate-400">Takes: <b className="text-emerald-400">{captures.black}</b></span>
                  </div>
                </div>
              </div>

              {/* Animated Live Signal Bars */}
              <div className="flex items-end gap-0.5 h-3.5 px-1 py-0.5 bg-[#06261f] border border-[#184d3c] rounded">
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s]" style={{ height: "70%" }} />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.4s]" style={{ height: "95%" }} />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.1s]" style={{ height: "60%" }} />
                <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce" style={{ height: "85%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Turn Countdown Clock Bar */}
        {turnTimerLimit > 0 && !winner && (
          <div className="p-1.5 bg-[#041913] border border-[#184d3c] rounded-lg space-y-0.5">
            <div className="flex items-center justify-between text-[9px] font-bold">
              <span className="text-slate-300 flex items-center gap-1">
                <Clock size={10} className="text-[#d6a735]" />
                <span>Turn Clock ({turn === "white" ? whiteDisplayName : blackDisplayName})</span>
              </span>
              <span className={`font-mono font-bold ${secondsLeft < 10 ? "text-red-400 animate-pulse" : "text-[#d6a735]"}`}>
                {secondsLeft}s
              </span>
            </div>
            <div className="w-full bg-[#06261f] h-1 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  secondsLeft < 10 ? "bg-red-500 animate-pulse" : "bg-[#d6a735]"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (secondsLeft / turnTimerLimit) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. MOVE HISTORY & WIN PROBABILITY CARD */}
      <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-xl p-2.5 sm:p-3 shadow-lg space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#184d3c]">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-[#d6a735] uppercase tracking-wider">
            <ListOrdered size={13} />
            <span>Move History &amp; Win Prob</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onCopyHistory}
              disabled={activeMovesCount === 0}
              className="px-1.5 py-0.2 bg-[#0c3b2e] hover:bg-[#144435] text-slate-200 disabled:opacity-40 rounded text-[9px] font-semibold border border-[#184d3c] flex items-center gap-0.5 transition-colors"
            >
              {copiedHistory ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
              <span>{copiedHistory ? "Copied" : "Export"}</span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryCollapsed((v) => !v)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title={historyCollapsed ? "Expand" : "Collapse"}
            >
              {historyCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
          </div>
        </div>

        {/* Win Probability Segmented Bar */}
        <div className="p-1.5 bg-[#041913] border border-[#184d3c] rounded-lg space-y-0.5">
          <div className="flex items-center justify-between text-[9px] font-bold">
            <span className="text-amber-300 font-mono">Red: {winProbability.whiteProb}%</span>
            <span className="text-slate-400 uppercase text-[8px]">Win Probability</span>
            <span className="text-emerald-400 font-mono">{winProbability.blackProb}% Black</span>
          </div>
          <div className="w-full bg-[#06261f] h-1.5 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: `${winProbability.whiteProb}%` }}
            />
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${winProbability.blackProb}%` }}
            />
          </div>
        </div>

        {!historyCollapsed && (
          <>
            {/* Notation Style Tabs */}
            <div className="py-0.5 flex items-center gap-1 border-b border-[#184d3c]/80 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => onSetNotationStyle("alg")}
                className={`px-1.5 py-0.2 text-[8px] font-bold rounded transition-colors whitespace-nowrap ${
                  notationStyle === "alg" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Algebraic
              </button>
              <button
                type="button"
                onClick={() => onSetNotationStyle("sq")}
                className={`px-1.5 py-0.2 text-[8px] font-bold rounded transition-colors whitespace-nowrap ${
                  notationStyle === "sq" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Squares
              </button>
              <button
                type="button"
                onClick={() => onSetNotationStyle("both")}
                className={`px-1.5 py-0.2 text-[8px] font-bold rounded transition-colors whitespace-nowrap ${
                  notationStyle === "both" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Both
              </button>
            </div>

            {/* Scrollable Move List */}
            <div
              ref={historyScrollRef as React.RefObject<HTMLDivElement>}
              className="h-[130px] xl:h-[150px] overflow-y-auto py-0.5 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800 pr-0.5 text-[10px]"
            >
              {pairedMoves.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-2 text-slate-500 space-y-0.5">
                  <FileText size={16} className="opacity-30 text-[#d6a735]" />
                  <p className="text-[10px] font-medium">No moves played yet.</p>
                  <span className="text-[8px]">Coordinates record here live.</span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="grid grid-cols-[24px_1fr_1fr] text-[8px] font-bold text-slate-400 uppercase px-1 py-0.5 border-b border-[#184d3c]/50">
                    <span>#</span>
                    <span className="truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300" /> {whiteDisplayName}
                    </span>
                    <span className="truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {blackDisplayName}
                    </span>
                  </div>

                  {pairedMoves.map((pair) => (
                    <div
                      key={pair.turnNum}
                      className="grid grid-cols-[24px_1fr_1fr] items-center text-[10px] px-1 py-0.5 rounded bg-[#041913]/60 hover:bg-[#0c3b2e]/60 border border-[#184d3c]/40 transition-colors font-mono"
                    >
                      <span className="text-slate-500 font-bold text-[8px]">{pair.turnNum}.</span>
                      <div>
                        {pair.white ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              pair.white.isCapture ? "text-amber-300" : "text-slate-200"
                            }`}
                          >
                            {notationStyle === "alg"
                              ? pair.white.algNotation
                              : notationStyle === "sq"
                              ? pair.white.sqNotation
                              : pair.white.notation}
                            {pair.white.isCapture && <span className="text-[8px]">💥</span>}
                          </span>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
                      </div>
                      <div>
                        {pair.black ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              pair.black.isCapture ? "text-emerald-300" : "text-slate-200"
                            }`}
                          >
                            {notationStyle === "alg"
                              ? pair.black.algNotation
                              : notationStyle === "sq"
                              ? pair.black.sqNotation
                              : pair.black.notation}
                            {pair.black.isCapture && <span className="text-[8px]">💥</span>}
                          </span>
                        ) : (
                          <span className="text-slate-700">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

