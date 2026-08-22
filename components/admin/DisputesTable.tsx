"use client";

import React from "react";
import { Gavel } from "lucide-react";

export interface MoveItem {
  from: number;
  to: number;
  turn?: string;
  isCapture?: boolean;
  timestamp?: string;
  note?: string;
}

export interface RoomItem {
  code: string;
  hostName: string;
  guestName: string | null;
  hostToken: string;
  guestToken: string | null;
  mode: string;
  status: string;
  winner: string | null;
  wagerAmount?: number;
  moves?: MoveItem[];
  createdAt?: string;
}

export interface DisputesTableProps {
  rooms: RoomItem[];
  onInspectRoom: (room: RoomItem) => void;
}

export function DisputesTable({ rooms, onInspectRoom }: DisputesTableProps) {
  return (
    <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
      <div className="pb-3 border-b border-[#1a5e48]">
        <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
          <Gavel size={18} className="text-[#d6a735]" /> Match Dispute Resolver &amp; Escrow Pot Releases
        </h3>
        <p className="text-xs text-slate-200">
          Review disputed wager rooms, inspect in-flight move history logs, and rule on official match outcomes.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
              <th className="py-2.5 px-3">Room Code</th>
              <th className="py-2.5 px-3">Host / Guest</th>
              <th className="py-2.5 px-3">Mode / Wager</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Winner</th>
              <th className="py-2.5 px-3 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]">
            {rooms.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-300 italic">
                  No match rooms found.
                </td>
              </tr>
            ) : (
              rooms.map((r, idx) => (
                <tr key={`${r.code || "room"}-${idx}`} className="hover:bg-[#0c3b2e]/50">
                  <td className="py-3 px-3 font-mono font-bold text-[#d6a735]">{r.code}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-[#f5efdf]">
                      {r.hostName} vs {r.guestName || "Waiting..."}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="uppercase text-[10px] font-bold text-cyan-300">{r.mode}</span>
                    {r.wagerAmount ? (
                      <div className="text-[11px] text-[#d6a735] font-bold">{r.wagerAmount} Marbles</div>
                    ) : null}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#06261f] border border-[#1a5e48] text-slate-200">
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-semibold text-[#f5efdf]">{r.winner || "—"}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectRoom(r)}
                      className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] text-[11px] font-bold rounded-lg border border-[#d6a735]/30"
                    >
                      Inspect Moves
                    </button>
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

export default DisputesTable;
