"use client";

import React from "react";
import { LayoutGrid, Trophy, Swords, Zap, Users, User, Bot } from "lucide-react";
import type { Room } from "@/lib/types";

interface MatchNavigationCardProps {
  mode: "local" | "online";
  subMode: "pass_play" | "vs_cpu";
  cpuDifficulty: "easy" | "medium" | "hard";
  room: Room | null;
  whiteDisplayName: string;
  blackDisplayName: string;
}

export function MatchNavigationCard({
  mode,
  subMode,
  cpuDifficulty,
  room,
  whiteDisplayName,
  blackDisplayName,
}: MatchNavigationCardProps) {
  const isOnline = mode === "online" && room !== null;
  const isLeagueMatch = isOnline && !!room.leagueId;

  return (
    <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-3.5 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#184d3c]">
        <div className="flex items-center gap-1.5 text-[#d6a735] text-xs font-black uppercase tracking-wider">
          <LayoutGrid size={14} />
          <span>Match Navigation</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.2 bg-[#0c3b2e] border border-[#184d3c] text-emerald-400 font-bold rounded">
          LIVE
        </span>
      </div>

      <div className="space-y-2">
        {/* Active Match Row */}
        <div className="p-2.5 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-extrabold text-[#f5efdf] truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">vs {blackDisplayName}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 bg-[#06261f] text-[#d6a735] font-extrabold rounded shrink-0">
              {isOnline ? (room.wagerAmount > 0 ? "WAGER" : "ARENA") : (subMode === "vs_cpu" ? "AI DUEL" : "LOCAL")}
            </span>
          </div>

          {/* Navigation Sub-Tree */}
          <div className="pl-2 border-l-2 border-[#184d3c] space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Match Mode:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {isOnline
                  ? (room.mode || "Casual Duel")
                  : (subMode === "vs_cpu" ? `Vs AI (${cpuDifficulty})` : "Pass & Play")}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Board Format:</span>
              <span className="font-semibold text-slate-200">10x10 FMJD Damii</span>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Match Code:</span>
              <span className="font-mono font-bold text-[#d6a735]">
                {isOnline ? room.code : "LOCAL"}
              </span>
            </div>

            {isLeagueMatch && (
              <div className="pt-1 border-t border-[#184d3c]/50">
                <a
                  href={`/leagues/${room.leagueId}`}
                  className="inline-flex items-center gap-1 text-[10px] text-[#d6a735] hover:underline font-extrabold"
                >
                  <Trophy size={11} />
                  <span>Tournament Bracket View</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
