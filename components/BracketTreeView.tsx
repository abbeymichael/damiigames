"use client";

import React, { useState, useMemo } from "react";
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
  Award,
  Calendar,
} from "lucide-react";
import type { LeagueMatch, LeagueParticipant, TournamentFormat } from "@/lib/types";
import { CountdownTimer } from "./CountdownTimer";

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
    if (round === totalRounds) return "🏆 Championship Final";
    if (round === totalRounds - 1 && totalRounds >= 2) return "Semifinals";
    if (round === totalRounds - 2 && totalRounds >= 3) return "Quarterfinals";
    return `Round ${round}`;
  };

  return (
    <div
      className={`bracket-tree-container bg-[#081c15] border border-[#184d3c] rounded-3xl p-4 sm:p-6 shadow-2xl transition-all relative text-[#f5efdf] ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none overflow-auto bg-[#081c15] p-6 sm:p-10" : ""
      }`}
    >
      {/* Header Controls & View Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#184d3c] mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-[#d6a735]/15 text-[#d6a735] border border-[#d6a735]/40 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
              <Trophy size={12} className="text-[#d6a735]" /> Tournament Bracket
            </span>
            <span className="text-xs font-mono text-[#d6a735] font-bold bg-[#06261f] px-2.5 py-0.5 rounded-full border border-[#184d3c]">
              {format.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#f5efdf] mt-1.5">
            {title || "Bracket Progression & Match Results"}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switches */}
          <div className="bg-[#06261f] p-1 rounded-xl border border-[#184d3c] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "tree"
                  ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                  : "text-slate-300 hover:text-[#f5efdf]"
              }`}
            >
              <GitBranch size={14} /> Tree Diagram
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-[#d6a735] text-[#06261f] font-black shadow-md"
                  : "text-slate-300 hover:text-[#f5efdf]"
              }`}
            >
              <Grid size={14} /> Match Cards
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-[#06261f] hover:bg-[#0c3b2e] text-[#f5efdf] rounded-xl border border-[#184d3c] transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {matches.length === 0 ? (
        <div className="p-12 text-center text-slate-300 italic bg-[#06261f] rounded-2xl border border-[#184d3c] my-4 space-y-3">
          <Clock size={36} className="mx-auto text-[#d6a735] animate-pulse" />
          <p className="text-sm font-bold text-[#f5efdf]">Tournament bracket matches have not been generated yet.</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The organizer will seed the bracket and generate active rounds once player registrations close.
          </p>
        </div>
      ) : (
        <>
          {/* Highlight Indicator Bar if a player is selected */}
          {highlightedPlayerToken && (
            <div className="mb-4 p-3 bg-[#d6a735]/15 border border-[#d6a735]/40 rounded-xl flex items-center justify-between text-xs text-[#d6a735]">
              <span className="flex items-center gap-2 font-bold">
                <Sparkles size={14} /> Highlighting Match Path for Selected Player
              </span>
              <button
                onClick={() => setHighlightedPlayerToken(null)}
                className="text-xs bg-[#d6a735] text-[#06261f] font-bold px-2.5 py-1 rounded-lg hover:bg-[#b88c24] transition-colors"
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
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5 bg-[#06261f] px-3 py-1.5 rounded-xl border border-[#184d3c] w-fit">
                    <Crown size={14} className="text-[#d6a735]" /> Championship Bracket
                  </h4>
                )}

                <div className="relative flex gap-8 sm:gap-12 min-w-max items-stretch pt-2">
                  {winnersRounds.map((roundNum) => {
                    const roundMatches = winnersMatches.filter((m) => m.round === roundNum);
                    const totalRounds = winnersRounds.length;

                    return (
                      <div
                        key={`w-round-${roundNum}`}
                        className="flex flex-col justify-around min-w-[260px] sm:min-w-[280px] space-y-6 relative z-10"
                      >
                        {/* Round Header */}
                        <div className="text-xs font-black uppercase text-[#d6a735] tracking-wider bg-[#06261f] px-4 py-2.5 rounded-xl border border-[#184d3c] text-center shadow-lg flex items-center justify-center gap-2">
                          <span>{getRoundLabel(roundNum, totalRounds)}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({roundMatches.length} {roundMatches.length === 1 ? "match" : "matches"})
                          </span>
                        </div>

                        {/* Match Cards Stack */}
                        <div className="flex flex-col justify-around flex-1 space-y-6">
                          {roundMatches.map((match) => {
                            const isP1Highlighted = highlightedPlayerToken && match.player1Token === highlightedPlayerToken;
                            const isP2Highlighted = highlightedPlayerToken && match.player2Token === highlightedPlayerToken;
                            const isP1User = Boolean(userToken && match.player1Token === userToken);
                            const isP2User = Boolean(userToken && match.player2Token === userToken);
                            const isP1Winner = Boolean(match.winnerToken && match.winnerToken === match.player1Token);
                            const isP2Winner = Boolean(match.winnerToken && match.winnerToken === match.player2Token);

                            return (
                              <div
                                key={match.id}
                                className={`match-node p-3.5 bg-[#06261f] border rounded-2xl shadow-xl transition-all relative space-y-2.5 hover:border-[#d6a735]/60 ${
                                  match.status === "completed"
                                    ? "border-[#184d3c]"
                                    : match.status === "in_progress"
                                    ? "border-[#d6a735] bg-[#0c3b2e] ring-1 ring-[#d6a735]/50"
                                    : "border-[#184d3c]"
                                } ${isP1Highlighted || isP2Highlighted ? "ring-2 ring-[#d6a735] border-[#d6a735] bg-[#0c3b2e]" : ""}`}
                              >
                                {/* Status & Schedule Header Bar */}
                                <div className="flex flex-col gap-1 pb-1.5 border-b border-[#184d3c]">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                                    <span className="font-mono text-[#d6a735]">Match #{match.matchNumber}</span>
                                    {match.status === "in_progress" ? (
                                      <span className="text-amber-300 font-extrabold flex items-center gap-1 animate-pulse">
                                        <Zap size={12} className="text-amber-400" /> LIVE NOW
                                      </span>
                                    ) : match.status === "completed" ? (
                                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle size={12} /> Finished
                                      </span>
                                    ) : match.scheduledTime ? (
                                      <CountdownTimer targetIso={match.scheduledTime} compact />
                                    ) : (
                                      <span className="text-slate-400 font-medium">Pending Schedule</span>
                                    )}
                                  </div>
                                  {match.scheduledTime && match.status !== "completed" && (
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                      <span className="flex items-center gap-1">
                                        <Calendar size={10} className="text-[#d6a735]" />
                                        {new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                      {match.status === "pending" && (
                                        <span className="text-slate-400">
                                          {new Date(match.scheduledTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Player 1 Row */}
                                <div
                                  onClick={() => match.player1Token && setHighlightedPlayerToken(match.player1Token)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                    isP1Winner
                                      ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50 shadow-inner"
                                      : isP1User
                                      ? "bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40"
                                      : "bg-[#081c15] hover:bg-[#0c3b2e] text-[#f5efdf]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Shield
                                      size={14}
                                      className={match.player1Token ? "text-[#d6a735] shrink-0" : "text-slate-500 shrink-0"}
                                    />
                                    <span className="truncate">{match.player1Name || "TBD (Awaiting Match)"}</span>
                                    {isP1User && (
                                      <span className="text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1.5 py-0.2 rounded-full shrink-0">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  {isP1Winner && (
                                    <span className="flex items-center gap-1 text-[11px] text-[#d6a735] font-black shrink-0">
                                      <Crown size={14} className="text-[#d6a735]" /> WIN
                                    </span>
                                  )}
                                </div>

                                {/* VS Divider & Action Controls */}
                                <div className="flex items-center justify-between px-1 text-[10px] font-mono">
                                  <span className="text-slate-400 font-bold">VS</span>

                                  <div className="flex items-center gap-1.5">
                                    {/* Play / Launch Match for player */}
                                    {match.status === "pending" && (isP1User || isP2User) && onStartMatch && (
                                      <button
                                        type="button"
                                        onClick={() => onStartMatch(match.id)}
                                        className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg transition-all shadow flex items-center gap-1 text-[11px]"
                                      >
                                        <Play size={11} className="fill-current" /> Play Match
                                      </button>
                                    )}

                                    {/* Spectate Live in Arena */}
                                    {match.roomCode && (
                                      <a
                                        href={`/arena?code=${match.roomCode}&mode=league&spectate=1`}
                                        className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold rounded-lg border border-[#d6a735]/40 flex items-center gap-1 text-[11px] transition-colors"
                                      >
                                        <Eye size={12} /> Watch Live
                                      </a>
                                    )}

                                    {/* Facilitator / Host Score Result */}
                                    {isFacilitator && match.status !== "completed" && onSetScore && (
                                      <button
                                        type="button"
                                        onClick={() => onSetScore(match)}
                                        className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#d6a735] hover:text-[#06261f] text-[#f5efdf] font-bold rounded-lg border border-[#184d3c] text-[11px] transition-colors"
                                      >
                                        Score
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Player 2 Row */}
                                <div
                                  onClick={() => match.player2Token && setHighlightedPlayerToken(match.player2Token)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                    isP2Winner
                                      ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50 shadow-inner"
                                      : isP2User
                                      ? "bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40"
                                      : "bg-[#081c15] hover:bg-[#0c3b2e] text-[#f5efdf]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Shield
                                      size={14}
                                      className={match.player2Token ? "text-[#d6a735] shrink-0" : "text-slate-500 shrink-0"}
                                    />
                                    <span className="truncate">{match.player2Name || "TBD (Awaiting Match)"}</span>
                                    {isP2User && (
                                      <span className="text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1.5 py-0.2 rounded-full shrink-0">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  {isP2Winner && (
                                    <span className="flex items-center gap-1 text-[11px] text-[#d6a735] font-black shrink-0">
                                      <Crown size={14} className="text-[#d6a735]" /> WIN
                                    </span>
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
                <div className="space-y-3 pt-6 border-t border-[#184d3c]">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-800/50 w-fit">
                    <GitBranch size={14} /> Losers Bracket (Elimination Matches)
                  </h4>

                  <div className="relative flex gap-8 sm:gap-12 min-w-max items-stretch pt-2">
                    {losersRounds.map((roundNum) => {
                      const roundMatches = losersMatches.filter((m) => m.round === roundNum);

                      return (
                        <div
                          key={`l-round-${roundNum}`}
                          className="flex flex-col justify-around min-w-[260px] sm:min-w-[280px] space-y-6 relative z-10"
                        >
                          <div className="text-xs font-black uppercase text-rose-300 tracking-wider bg-[#06261f] px-3 py-2 rounded-xl border border-rose-900/50 text-center shadow-lg">
                            Losers Round {roundNum}
                          </div>

                          <div className="flex flex-col justify-around flex-1 space-y-6">
                            {roundMatches.map((match) => {
                              const isP1Winner = Boolean(match.winnerToken && match.winnerToken === match.player1Token);
                              const isP2Winner = Boolean(match.winnerToken && match.winnerToken === match.player2Token);

                              return (
                                <div
                                  key={match.id}
                                  className="match-node p-3.5 bg-[#06261f] border border-rose-950/60 rounded-2xl shadow-xl space-y-2.5"
                                >
                                  {/* Player 1 */}
                                  <div
                                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold ${
                                      isP1Winner
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                        : "bg-[#081c15] text-[#f5efdf]"
                                    }`}
                                  >
                                    <span className="truncate">{match.player1Name || "TBD"}</span>
                                    {isP1Winner && <CheckCircle size={14} className="text-rose-400 shrink-0" />}
                                  </div>

                                  <div className="text-[10px] text-center font-mono text-slate-400">VS</div>

                                  {/* Player 2 */}
                                  <div
                                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold ${
                                      isP2Winner
                                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                        : "bg-[#081c15] text-[#f5efdf]"
                                    }`}
                                  >
                                    <span className="truncate">{match.player2Name || "TBD"}</span>
                                    {isP2Winner && <CheckCircle size={14} className="text-rose-400 shrink-0" />}
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
                const isP1User = Boolean(userToken && match.player1Token === userToken);
                const isP2User = Boolean(userToken && match.player2Token === userToken);
                const isP1Winner = Boolean(match.winnerToken && match.winnerToken === match.player1Token);
                const isP2Winner = Boolean(match.winnerToken && match.winnerToken === match.player2Token);

                return (
                  <div
                    key={match.id}
                    className="p-4 bg-[#06261f] border border-[#184d3c] rounded-2xl space-y-3.5 shadow-lg hover:border-[#d6a735]/40 transition-all"
                  >
                    <div className="flex flex-col gap-1.5 border-b border-[#184d3c] pb-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold uppercase text-[#d6a735]">
                          Round {match.round} • Match #{match.matchNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            match.status === "completed"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                              : match.status === "in_progress"
                              ? "bg-amber-950 text-amber-300 border border-amber-600 animate-pulse"
                              : "bg-[#081c15] text-slate-400 border border-[#184d3c]"
                          }`}
                        >
                          {match.status.replace("_", " ")}
                        </span>
                      </div>
                      {match.scheduledTime && match.status !== "completed" && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                            <Calendar size={11} className="text-[#d6a735]" />
                            {new Date(match.scheduledTime).toLocaleDateString([], { month: "short", day: "numeric" })} • {new Date(match.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <CountdownTimer targetIso={match.scheduledTime} compact />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-xs">
                      <div
                        className={`p-2.5 rounded-xl font-bold flex items-center justify-between ${
                          isP1Winner
                            ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50"
                            : "bg-[#081c15] text-[#f5efdf]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Shield size={14} className={match.player1Token ? "text-[#d6a735]" : "text-slate-500"} />
                          <span className="truncate">{match.player1Name || "TBD"}</span>
                        </div>
                        {isP1Winner && <Crown size={14} className="text-[#d6a735] shrink-0" />}
                      </div>

                      <div className="text-center font-mono text-[10px] text-slate-400">VS</div>

                      <div
                        className={`p-2.5 rounded-xl font-bold flex items-center justify-between ${
                          isP2Winner
                            ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50"
                            : "bg-[#081c15] text-[#f5efdf]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Shield size={14} className={match.player2Token ? "text-[#d6a735]" : "text-slate-500"} />
                          <span className="truncate">{match.player2Name || "TBD"}</span>
                        </div>
                        {isP2Winner && <Crown size={14} className="text-[#d6a735]" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#184d3c] text-xs">
                      {match.roomCode ? (
                        <a
                          href={`/arena?code=${match.roomCode}&mode=league&spectate=1`}
                          className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold rounded-lg border border-[#d6a735]/30 flex items-center gap-1.5 text-xs transition-colors"
                        >
                          <Eye size={12} /> Watch Arena
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Arena room not active</span>
                      )}

                      {match.status === "pending" && (isP1User || isP2User) && onStartMatch && (
                        <button
                          type="button"
                          onClick={() => onStartMatch(match.id)}
                          className="px-3 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg text-xs transition-colors flex items-center gap-1"
                        >
                          <Play size={11} className="fill-current" /> Play
                        </button>
                      )}

                      {isFacilitator && match.status !== "completed" && onSetScore && (
                        <button
                          type="button"
                          onClick={() => onSetScore(match)}
                          className="px-3 py-1 bg-[#081c15] hover:bg-[#d6a735] hover:text-[#06261f] text-[#f5efdf] font-bold rounded-lg border border-[#184d3c] text-xs transition-colors"
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

export default BracketTreeView;
