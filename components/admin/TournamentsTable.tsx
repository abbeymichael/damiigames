"use client";

import React from "react";
import { Trophy, RefreshCw, Plus, Eye, Play, Ban, X } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import type { TournamentLeague } from "@/lib/types";

export interface TournamentsTableProps {
  leagues: TournamentLeague[];
  leagueStatusFilter: string;
  setLeagueStatusFilter: (status: string) => void;
  busy: boolean;
  onRefresh: () => void;
  onCreateClick: () => void;
  onInspectLeague: (league: TournamentLeague) => void;
  onGenerateBracket: (leagueId: string) => void;
  onCancelTournament: (leagueId: string) => void;
  onDeleteTournament: (leagueId: string, title: string) => void;
}

export function TournamentsTable({
  leagues,
  leagueStatusFilter,
  setLeagueStatusFilter,
  busy,
  onRefresh,
  onCreateClick,
  onInspectLeague,
  onGenerateBracket,
  onCancelTournament,
  onDeleteTournament,
}: TournamentsTableProps) {
  const filteredLeagues = leagues.filter(
    (l) => leagueStatusFilter === "all" || l.status === leagueStatusFilter
  );

  return (
    <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
        <div>
          <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
            <Trophy size={18} className="text-[#d6a735]" /> Tournament Control Center &amp; Bracket Oversight
          </h3>
          <p className="text-xs text-slate-200 mt-0.5">
            Create, inspect, watch live matches, and manage single/double elimination, round-robin, and swiss tournament brackets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={onCreateClick}
            className="px-3.5 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
          >
            <Plus size={15} /> Create Tournament
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(["all", "registration", "active", "completed", "cancelled"] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setLeagueStatusFilter(st)}
            className={`px-3 py-1 rounded-xl font-bold capitalize transition-all border ${
              leagueStatusFilter === st
                ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                : "bg-[#06261f] text-slate-200 border-[#1a5e48] hover:text-white"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Tournaments List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
              <th className="py-2.5 px-3">Tournament Title</th>
              <th className="py-2.5 px-3">Format</th>
              <th className="py-2.5 px-3">Organiser</th>
              <th className="py-2.5 px-3">Entry Fee / Prize</th>
              <th className="py-2.5 px-3">Participants</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]">
            {filteredLeagues.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-300 italic">
                  No tournament leagues found. Click "Create Tournament" to launch one.
                </td>
              </tr>
            ) : (
              filteredLeagues.map((l, idx) => (
                <tr key={`${l.id || "league"}-${idx}`} className="hover:bg-[#0c3b2e]/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-[#f5efdf] text-sm">{l.title}</div>
                    <div className="text-[10px] text-cyan-300 font-mono">ID: {l.id}</div>
                  </td>
                  <td className="py-3 px-3 uppercase text-[11px] font-bold text-cyan-300">
                    {l.format ? l.format.replace("_", " ") : "Single Elim"}
                  </td>
                  <td className="py-3 px-3 text-[#f5efdf] font-semibold">
                    {l.facilitatorName || "System Admin"}
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-[#d6a735] font-bold">{l.entryFeePoints || 0} Pts Fee</div>
                    <div className="text-emerald-400 font-bold">{l.prizePoolPoints || 0} Pts Prize</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#f5efdf]">
                      {l.participantCount || 0} / {l.maxParticipants || 8}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        l.status === "active"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                          : l.status === "registration"
                          ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                          : l.status === "completed"
                          ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                          : "bg-red-950 text-red-300 border border-red-500/40"
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onInspectLeague(l)}
                        className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                      <ActionMenu
                        items={[
                          {
                            label: "Inspect & Watch",
                            icon: Eye,
                            onClick: () => onInspectLeague(l),
                          },
                          ...(l.status === "registration"
                            ? [
                                {
                                  label: "Start Bracket",
                                  icon: Play,
                                  onClick: () => onGenerateBracket(l.id),
                                },
                              ]
                            : []),
                          ...(l.status !== "cancelled" && l.status !== "completed"
                            ? [
                                {
                                  label: "Cancel Tournament",
                                  icon: Ban,
                                  onClick: () => onCancelTournament(l.id),
                                },
                              ]
                            : []),
                          {
                            label: "Delete Tournament",
                            icon: X,
                            onClick: () => onDeleteTournament(l.id, l.title),
                            danger: true,
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TournamentsTable;
