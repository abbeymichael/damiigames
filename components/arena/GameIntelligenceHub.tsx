"use client";

import React, { useState } from "react";
import { Swords, ListOrdered, Check, Copy, FileText, ChevronDown, ChevronUp } from "lucide-react";
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
}: GameIntelligenceHubProps) {
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  return (
    <div className="w-full flex flex-col gap-3.5 select-none">
      {/* 1. PLAYER STATUS / INTELLIGENCE HUB CARD */}
      <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-3.5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#184d3c]">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#d6a735] uppercase tracking-wider">
            <Swords size={14} />
            <span>Game Intelligence Hub</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase">Live Match</span>
          </div>
        </div>

        {/* Player Dual Status Panels */}
        <div className="space-y-2">
          {/* Player 1 (White) */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              turn === "white" && !winner
                ? "bg-[#0c3b2e] border-[#d6a735] shadow-md shadow-[#d6a735]/15 ring-1 ring-[#d6a735]/30"
                : "bg-[#041913] border-[#184d3c] opacity-85"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 border border-amber-200 shadow-sm flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
                  ♔
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <strong className="text-xs text-[#f5efdf] font-bold truncate max-w-[120px]">
                      {whiteDisplayName}
                    </strong>
                    <span className="text-[10px] text-amber-300 font-mono font-semibold">(White)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-300">
                    <span className="text-slate-400">ELO: <b className="text-slate-200">{whiteRating}</b></span>
                    <span>•</span>
                    <span className="text-slate-400">Takes: <b className="text-[#d6a735]">{captures.white}</b></span>
                  </div>
                </div>
              </div>

              {/* Animated Live Equalizer Bars */}
              <div className="flex items-end gap-0.5 h-4 px-1.5 py-0.5 bg-[#06261f] border border-[#184d3c] rounded-md">
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" style={{ height: "60%" }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" style={{ height: "100%" }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce" style={{ height: "75%" }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.45s]" style={{ height: "90%" }} />
              </div>
            </div>
          </div>

          {/* Player 2 (Black) */}
          <div
            className={`p-2.5 rounded-xl border transition-all ${
              turn === "black" && !winner
                ? "bg-[#0c3b2e] border-emerald-500 shadow-md shadow-emerald-500/15 ring-1 ring-emerald-500/30"
                : "bg-[#041913] border-[#184d3c] opacity-85"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-800 to-emerald-950 border border-emerald-500/60 shadow-sm flex items-center justify-center text-emerald-300 font-black text-xs shrink-0">
                  ♚
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <strong className="text-xs text-[#f5efdf] font-bold truncate max-w-[120px]">
                      {blackDisplayName}
                    </strong>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">(Black)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-300">
                    <span className="text-slate-400">ELO: <b className="text-slate-200">{blackRating}</b></span>
                    <span>•</span>
                    <span className="text-slate-400">Takes: <b className="text-emerald-400">{captures.black}</b></span>
                  </div>
                </div>
              </div>

              {/* Animated Live Equalizer Bars */}
              <div className="flex items-end gap-0.5 h-4 px-1.5 py-0.5 bg-[#06261f] border border-[#184d3c] rounded-md">
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.2s]" style={{ height: "70%" }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.4s]" style={{ height: "95%" }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.1s]" style={{ height: "60%" }} />
                <span className="w-1 bg-emerald-400 rounded-full animate-bounce" style={{ height: "85%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Turn Countdown Clock Bar */}
        {turnTimerLimit > 0 && !winner && (
          <div className="p-2 bg-[#041913] border border-[#184d3c] rounded-xl space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-300 flex items-center gap-1">
                <span>Turn Clock ({turn === "white" ? whiteDisplayName : blackDisplayName})</span>
              </span>
              <span className={`font-mono font-black ${secondsLeft < 10 ? "text-red-400 animate-pulse" : "text-[#d6a735]"}`}>
                {secondsLeft}s
              </span>
            </div>
            <div className="w-full bg-[#06261f] h-1.5 rounded-full overflow-hidden">
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
      <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-3.5 shadow-xl space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-[#184d3c]">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#d6a735] uppercase tracking-wider">
            <ListOrdered size={14} />
            <span>Move History & Win Prob</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onCopyHistory}
              disabled={activeMovesCount === 0}
              className="px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#144435] text-slate-200 disabled:opacity-40 rounded-lg text-[10px] font-semibold border border-[#184d3c] flex items-center gap-1 transition-colors"
            >
              {copiedHistory ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copiedHistory ? "Copied" : "Export"}</span>
            </button>
            <button
              type="button"
              onClick={() => setHistoryCollapsed((v) => !v)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              title={historyCollapsed ? "Expand" : "Collapse"}
            >
              {historyCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {/* Win Probability Segmented Bar */}
        <div className="p-2 bg-[#041913] border border-[#184d3c] rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-amber-300 font-mono">White: {winProbability.whiteProb}%</span>
            <span className="text-slate-400 uppercase text-[9px]">Win Probability</span>
            <span className="text-emerald-400 font-mono">{winProbability.blackProb}% Black</span>
          </div>
          <div className="w-full bg-[#06261f] h-2 rounded-full overflow-hidden flex">
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
            <div className="py-1 flex items-center gap-1 border-b border-[#184d3c]/80 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => onSetNotationStyle("alg")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors whitespace-nowrap ${
                  notationStyle === "alg" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Algebraic
              </button>
              <button
                type="button"
                onClick={() => onSetNotationStyle("sq")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors whitespace-nowrap ${
                  notationStyle === "sq" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Squares
              </button>
              <button
                type="button"
                onClick={() => onSetNotationStyle("both")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors whitespace-nowrap ${
                  notationStyle === "both" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Both
              </button>
            </div>

            {/* Scrollable Move List */}
            <div
              ref={historyScrollRef as React.RefObject<HTMLDivElement>}
              className="h-[160px] xl:h-[180px] overflow-y-auto py-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-800 pr-1 text-xs"
            >
              {pairedMoves.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-3 text-slate-500 space-y-1">
                  <FileText size={20} className="opacity-30 text-[#d6a735]" />
                  <p className="text-[11px] font-medium">No moves played yet.</p>
                  <span className="text-[9px]">Coordinates will record here live.</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[28px_1fr_1fr] text-[9px] font-bold text-slate-400 uppercase px-1.5 py-0.5 border-b border-[#184d3c]/50">
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
                      className="grid grid-cols-[28px_1fr_1fr] items-center text-[11px] px-1.5 py-1 rounded-md bg-[#041913]/60 hover:bg-[#0c3b2e]/60 border border-[#184d3c]/40 transition-colors font-mono"
                    >
                      <span className="text-slate-500 font-bold text-[9px]">{pair.turnNum}.</span>
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
                            {pair.white.isCapture && <span className="text-[9px]">💥</span>}
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
                            {pair.black.isCapture && <span className="text-[9px]">💥</span>}
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
