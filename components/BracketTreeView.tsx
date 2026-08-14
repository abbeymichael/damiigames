"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Trophy,
  Play,
  Eye,
  CheckCircle,
  Clock,
  Shield,
  Zap,
  Maximize2,
  Minimize2,
  Sparkles,
  Grid,
  GitBranch,
  Crown,
  ChevronRight,
  Settings,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { LeagueMatch, LeagueParticipant, TournamentFormat } from "@/lib/types";

interface BracketTreeViewProps {
  matches: LeagueMatch[];
  participants?: LeagueParticipant[];
  format?: TournamentFormat;
  userToken?: string;
  isFacilitator?: boolean;
  onStartMatch?: (matchId: string) => void;
  onSetScore?: (match: LeagueMatch) => void;
  title?: string;
}

export function BracketTreeView({
  matches,
  participants = [],
  format = "single_elimination",
  userToken = "",
  isFacilitator = false,
  onStartMatch,
  onSetScore,
  title,
}: BracketTreeViewProps) {
  const [viewMode, setViewMode] = useState<"tree" | "grid">("tree");
  const [highlightedPlayerToken, setHighlightedPlayerToken] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group matches by bracket type (Winners, Losers, Round Robin, Swiss)
  const winnersMatches = useMemo(() => {
    return matches.filter((m) => !m.bracketType || m.bracketType === "winners" || m.bracketType === "final");
  }, [matches]);

  const losersMatches = useMemo(() => {
    return matches.filter((m) => m.bracketType === "losers");
  }, [matches]);

  // Distinct rounds
  const winnersRounds = useMemo(() => {
    const rounds = Array.from(new Set(winnersMatches.map((m) => m.round))).sort((a, b) => a - b);
    return rounds;
  }, [winnersMatches]);

  const losersRounds = useMemo(() => {
    const rounds = Array.from(new Set(losersMatches.map((m) => m.round))).sort((a, b) => a - b);
    return rounds;
  }, [losersMatches]);

  // Helper for round title labels
  const getRoundLabel = (round: number, totalRounds: number) => {
    if (round === totalRounds) return "🏆 Finals";
    if (round === totalRounds - 1 && totalRounds >= 2) return "Semifinals";
    if (round === totalRounds - 2 && totalRounds >= 3) return "Quarterfinals";
    return `Round ${round}`;
  };

  // Check if player is involved in match
  const isPlayerHighlighted = (m: LeagueMatch) => {
    if (!highlightedPlayerToken) return false;
    return m.player1Token === highlightedPlayerToken || m.player2Token === highlightedPlayerToken;
  };

  // Layout parameters for SVG Tree connector lines
  const cardWidth = 240;
  const cardHeight = 110;
  const colGap = 80;
  const rowGap = 30;

  // Calculate coordinates for visual SVG connections
  const renderSingleTreeSVGConnections = (roundMatches: LeagueMatch[][]) => {
    if (roundMatches.length < 2) return null;

    const paths: React.JSX.Element[] = [];

    for (let r = 0; r < roundMatches.length - 1; r++) {
      const currentRMatches = roundMatches[r];
      const nextRMatches = roundMatches[r + 1];

      currentRMatches.forEach((match, idx) => {
        // Target match index in next round (usually Math.floor(idx / 2))
        const targetIdx = Math.floor(idx / 2);
        if (targetIdx >= nextRMatches.length) return;

        // Calculate x, y positions for starting match card and ending match card
        const x1 = r * (cardWidth + colGap) + cardWidth;
        // Estimate Y based on slot position
        const y1 = idx * (cardHeight + rowGap) + cardHeight / 2;

        const x2 = (r + 1) * (cardWidth + colGap);
        const y2 = targetIdx * (cardHeight * 2 + rowGap * 2) + cardHeight / 2;

        const isMatchHighlighted = isPlayerHighlighted(match);

        // Bezier curve path
        const pathD = `M ${x1} ${y1} C ${x1 + colGap / 2} ${y1}, ${x2 - colGap / 2} ${y2}, ${x2} ${y2}`;

        paths.push(
          <path
            key={`link-${match.id}-r${r}`}
            d={pathD}
            fill="none"
            stroke={isMatchHighlighted ? "#f59e0b" : "#334155"}
            strokeWidth={isMatchHighlighted ? 3 : 1.5}
            strokeDasharray={match.status === "pending" ? "4 4" : undefined}
            className="transition-all duration-300"
          />
        );
      });
    }

    return paths;
  };

  return (
    <div
      ref={containerRef}
      className={`bracket-tree-container bg-[#06261f] border border-[#114232] rounded-3xl p-4 sm:p-6 shadow-2xl transition-all relative text-[#f5efdf] ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none overflow-auto bg-[#081c15] p-8" : ""
      }`}
    >
      {/* Header Controls & View Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#114232] mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#d6a735]/15 text-[#d6a735] border border-[#d6a735]/35 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
              <Trophy size={12} /> Interactive Bracket Studio
            </span>
            <span className="text-xs font-mono text-[#d6a735] font-bold bg-[#0c3b2e] px-2 py-0.5 rounded border border-[#d6a735]/30">
              {format.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <h3 className="text-lg font-black text-[#f5efdf] mt-1">
            {title || "Tournament Bracket & Progression Visualizer"}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switches */}
          <div className="bg-[#081c15] p-1 rounded-xl border border-[#114232] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "tree"
                  ? "bg-[#d6a735] text-[#06261f] font-black shadow"
                  : "text-[#a3b8b0] hover:text-[#f5efdf]"
              }`}
            >
              <GitBranch size={14} /> Tree Diagram
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-[#d6a735] text-[#06261f] font-black shadow"
                  : "text-[#a3b8b0] hover:text-[#f5efdf]"
              }`}
            >
              <Grid size={14} /> Grid Cards
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#f5efdf] rounded-xl border border-[#d6a735]/30 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {matches.length === 0 ? (
        <div className="p-12 text-center text-[#a3b8b0] italic bg-[#081c15] rounded-2xl border border-[#114232] my-4 space-y-2">
          <Clock size={32} className="mx-auto text-[#d6a735] animate-pulse" />
          <p className="text-sm font-semibold text-[#f5efdf]">Tournament matches have not been generated yet.</p>
          <p className="text-xs text-[#a3b8b0]">
            Bracket automatically seeds once participant registrations are finalized by the organizer.
          </p>
        </div>
      ) : (
        <>
          {/* Highlight Indicator Bar if a player is selected */}
          {highlightedPlayerToken && (
            <div className="mb-4 p-2.5 bg-[#d6a735]/15 border border-[#d6a735]/40 rounded-xl flex items-center justify-between text-xs text-[#d6a735]">
              <span className="flex items-center gap-1.5 font-bold">
                <Sparkles size={14} /> Highlighting Match Path for Player
              </span>
              <button
                onClick={() => setHighlightedPlayerToken(null)}
                className="text-[11px] bg-[#d6a735]/20 hover:bg-[#d6a735]/30 font-bold px-2 py-0.5 rounded transition-colors text-[#f5efdf]"
              >
                Clear Highlight
              </button>
            </div>
          )}

          {/* TREE VIEW MODE */}
          {viewMode === "tree" && (
            <div className="space-y-8 overflow-x-auto pb-6 pt-2">
              {/* WINNERS / MAIN BRACKET TREE */}
              <div className="space-y-3">
                {losersMatches.length > 0 && (
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5 bg-[#0c3b2e] px-3 py-1.5 rounded-xl border border-[#d6a735]/40 w-fit">
                    <Crown size={14} /> Winners Bracket
                  </h4>
                )}

                <div className="relative flex gap-12 min-w-max items-stretch pt-2">
                  {winnersRounds.map((roundNum, rIdx) => {
                    const roundMatches = winnersMatches.filter((m) => m.round === roundNum);
                    const totalRounds = winnersRounds.length;

                    return (
                      <div
                        key={`w-round-${roundNum}`}
                        className="flex flex-col justify-around min-w-[240px] space-y-6 relative z-10"
                      >
                        {/* Round Header */}
                        <div className="text-xs font-black uppercase text-[#d6a735] tracking-wider bg-[#081c15] px-3 py-2 rounded-xl border border-[#114232] text-center shadow-lg flex items-center justify-center gap-1.5">
                          <span>{getRoundLabel(roundNum, totalRounds)}</span>
                          <span className="text-[10px] text-[#a3b8b0] font-mono">({roundMatches.length} matches)</span>
                        </div>

                        {/* Match Cards Stack */}
                        <div className="flex flex-col justify-around flex-1 space-y-6">
                          {roundMatches.map((match) => {
                            const isP1Highlighted = highlightedPlayerToken && match.player1Token === highlightedPlayerToken;
                            const isP2Highlighted = highlightedPlayerToken && match.player2Token === highlightedPlayerToken;
                            const isP1User = userToken && match.player1Token === userToken;
                            const isP2User = userToken && match.player2Token === userToken;

                            return (
                              <div
                                key={match.id}
                                className={`match-node p-3 bg-[#081c15] border rounded-2xl shadow-xl transition-all relative space-y-2 group hover:border-[#d6a735]/60 ${
                                  match.status === "completed"
                                    ? "border-[#114232] opacity-95"
                                    : match.status === "in_progress"
                                    ? "border-[#d6a735] bg-[#0c3b2e] ring-1 ring-[#d6a735]/50"
                                    : "border-[#114232]"
                                } ${isP1Highlighted || isP2Highlighted ? "ring-2 ring-[#d6a735] border-[#d6a735] bg-[#0c3b2e]" : ""}`}
                              >
                                {/* Status Chip Overlay */}
                                <div className="flex items-center justify-between text-[10px] font-bold text-[#a3b8b0] pb-1 border-b border-[#114232]">
                                  <span className="font-mono">Match #{match.matchNumber}</span>
                                  {match.status === "in_progress" ? (
                                    <span className="text-[#d6a735] font-extrabold flex items-center gap-1 animate-pulse">
                                      <Zap size={10} /> IN PROGRESS
                                    </span>
                                  ) : match.status === "completed" ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <CheckCircle size={10} /> COMPLETED
                                    </span>
                                  ) : (
                                    <span className="text-[#a3b8b0] font-medium">UPCOMING</span>
                                  )}
                                </div>

                                {/* Player 1 Row */}
                                <div
                                  onClick={() => match.player1Token && setHighlightedPlayerToken(match.player1Token)}
                                  className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                    match.winnerToken === match.player1Token && match.winnerToken
                                      ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50"
                                      : isP1User
                                      ? "bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40"
                                      : "bg-[#06261f] hover:bg-[#0c3b2e] text-[#f5efdf]"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Shield size={12} className={match.player1Token ? "text-[#d6a735]" : "text-[#a3b8b0]"} />
                                    <span className="truncate">{match.player1Name || "TBD"}</span>
                                    {isP1User && (
                                      <span className="text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1 rounded">YOU</span>
                                    )}
                                  </div>
                                  {match.winnerToken === match.player1Token && match.winnerToken && (
                                    <Crown size={14} className="text-[#d6a735] shrink-0" />
                                  )}
                                </div>

                                {/* VS Divider & Action Bar */}
                                <div className="flex items-center justify-between px-1 text-[10px] font-mono">
                                  <span className="text-[#a3b8b0] font-bold">VS</span>

                                  <div className="flex items-center gap-1.5">
                                    {/* Play / Launch Match */}
                                    {match.status === "pending" && (isP1User || isP2User) && onStartMatch && (
                                      <button
                                        type="button"
                                        onClick={() => onStartMatch(match.id)}
                                        className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg transition-all shadow flex items-center gap-1 text-[10px]"
                                      >
                                        <Play size={10} /> Launch
                                      </button>
                                    )}

                                    {/* Spectate Live */}
                                    {match.roomCode && (
                                      <a
                                        href={`/arena?code=${match.roomCode}&mode=league&spectate=1`}
                                        className="px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold rounded border border-[#d6a735]/30 flex items-center gap-1"
                                      >
                                        <Eye size={10} /> Watch
                                      </a>
                                    )}

                                    {/* Host/Facilitator Score Override */}
                                    {isFacilitator && match.status !== "completed" && onSetScore && (
                                      <button
                                        type="button"
                                        onClick={() => onSetScore(match)}
                                        className="px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#d6a735] hover:text-[#06261f] text-[#f5efdf] font-bold rounded border border-[#114232] transition-colors"
                                      >
                                        Score
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Player 2 Row */}
                                <div
                                  onClick={() => match.player2Token && setHighlightedPlayerToken(match.player2Token)}
                                  className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                    match.winnerToken === match.player2Token && match.winnerToken
                                      ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50"
                                      : isP2User
                                      ? "bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40"
                                      : "bg-[#06261f] hover:bg-[#0c3b2e] text-[#f5efdf]"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Shield size={12} className={match.player2Token ? "text-[#d6a735]" : "text-[#a3b8b0]"} />
                                    <span className="truncate">{match.player2Name || "TBD"}</span>
                                    {isP2User && (
                                      <span className="text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1 rounded">YOU</span>
                                    )}
                                  </div>
                                  {match.winnerToken === match.player2Token && match.winnerToken && (
                                    <Crown size={14} className="text-[#d6a735] shrink-0" />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LOSERS BRACKET TREE (IF DOUBLE ELIMINATION) */}
              {losersMatches.length > 0 && (
                <div className="space-y-3 pt-6 border-t border-[#114232]">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-800/50 w-fit">
                    <GitBranch size={14} /> Losers Bracket (Elimination Matches)
                  </h4>

                  <div className="relative flex gap-12 min-w-max items-stretch pt-2">
                    {losersRounds.map((roundNum) => {
                      const roundMatches = losersMatches.filter((m) => m.round === roundNum);

                      return (
                        <div
                          key={`l-round-${roundNum}`}
                          className="flex flex-col justify-around min-w-[240px] space-y-6 relative z-10"
                        >
                          <div className="text-xs font-black uppercase text-rose-400 tracking-wider bg-[#081c15] px-3 py-2 rounded-xl border border-[#114232] text-center shadow-lg">
                            Losers Round {roundNum}
                          </div>

                          <div className="flex flex-col justify-around flex-1 space-y-6">
                            {roundMatches.map((match) => {
                              const isP1User = userToken && match.player1Token === userToken;
                              const isP2User = userToken && match.player2Token === userToken;

                              return (
                                <div
                                  key={match.id}
                                  className="match-node p-3 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-2"
                                >
                                  {/* Player 1 */}
                                  <div
                                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                                      match.winnerToken === match.player1Token && match.winnerToken
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                        : "bg-[#06261f] text-[#f5efdf]"
                                    }`}
                                  >
                                    <span className="truncate">{match.player1Name || "TBD"}</span>
                                    {match.winnerToken === match.player1Token && (
                                      <CheckCircle size={14} className="text-rose-400 shrink-0" />
                                    )}
                                  </div>

                                  <div className="text-[10px] text-center font-mono text-[#a3b8b0]">VS</div>

                                  {/* Player 2 */}
                                  <div
                                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold ${
                                      match.winnerToken === match.player2Token && match.winnerToken
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                        : "bg-[#06261f] text-[#f5efdf]"
                                    }`}
                                  >
                                    <span className="truncate">{match.player2Name || "TBD"}</span>
                                    {match.winnerToken === match.player2Token && (
                                      <CheckCircle size={14} className="text-rose-400 shrink-0" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GRID VIEW MODE */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {matches.map((match) => {
                const isP1User = userToken && match.player1Token === userToken;
                const isP2User = userToken && match.player2Token === userToken;

                return (
                  <div
                    key={match.id}
                    className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3 shadow-lg hover:border-[#d6a735]/40 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs border-b border-[#114232] pb-2">
                      <span className="font-extrabold uppercase text-[#d6a735]">
                        Round {match.round} • Match #{match.matchNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          match.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : match.status === "in_progress"
                            ? "bg-[#d6a735]/20 text-[#d6a735] animate-pulse"
                            : "bg-[#0c3b2e] text-[#a3b8b0]"
                        }`}
                      >
                        {match.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div
                        className={`p-2.5 rounded-xl font-bold flex items-center justify-between ${
                          match.winnerToken === match.player1Token && match.winnerToken
                            ? "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40"
                            : "bg-[#06261f] text-[#f5efdf]"
                        }`}
                      >
                        <span>{match.player1Name || "TBD"}</span>
                        {match.winnerToken === match.player1Token && <Crown size={14} className="text-[#d6a735]" />}
                      </div>

                      <div className="text-center font-mono text-[10px] text-[#a3b8b0]">VS</div>

                      <div
                        className={`p-2.5 rounded-xl font-bold flex items-center justify-between ${
                          match.winnerToken === match.player2Token && match.winnerToken
                            ? "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40"
                            : "bg-[#06261f] text-[#f5efdf]"
                        }`}
                      >
                        <span>{match.player2Name || "TBD"}</span>
                        {match.winnerToken === match.player2Token && <Crown size={14} className="text-[#d6a735]" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#114232] text-xs">
                      {match.roomCode ? (
                        <a
                          href={`/arena?code=${match.roomCode}&mode=league&spectate=1`}
                          className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold rounded-lg border border-[#d6a735]/30 flex items-center gap-1 text-xs"
                        >
                          <Eye size={12} /> Watch Match Arena
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#a3b8b0]">No active arena room yet</span>
                      )}

                      {isFacilitator && match.status !== "completed" && onSetScore && (
                        <button
                          type="button"
                          onClick={() => onSetScore(match)}
                          className="px-3 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-lg text-xs transition-colors"
                        >
                          Set Score
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
