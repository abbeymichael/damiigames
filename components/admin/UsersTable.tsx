"use client";

import React from "react";
import { Users, Search, Coins, Ban, X } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import type { Role } from "@/lib/types";

export interface UserProfileItem {
  token: string;
  username: string;
  role: Role;
  points: number;
  status?: "active" | "banned";
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  phoneNumber?: string;
  createdAt?: string;
}

export interface UsersTableProps {
  users: UserProfileItem[];
  userSearch: string;
  setUserSearch: (value: string) => void;
  onAdjustBalance: (user: UserProfileItem) => void;
  onToggleBan: (targetToken: string, currentStatus?: string) => void;
  onDeleteUser: (targetToken: string, username: string) => void;
}

export function UsersTable({
  users,
  userSearch,
  setUserSearch,
  onAdjustBalance,
  onToggleBan,
  onDeleteUser,
}: UsersTableProps) {
  return (
    <section className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#114232]">
        <div>
          <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
            <Users size={18} className="text-[#d6a735]" /> Registered Player Directory &amp; Elo Rankings
          </h3>
          <p className="text-xs text-slate-300">
            View registered game players, track Elo ratings, manage account standing, and adjust wallet balances. (Administrative staff are strictly segregated).
          </p>
        </div>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-300" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search players..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
              <th className="py-2.5 px-3">Player Username</th>
              <th className="py-2.5 px-3">Role</th>
              <th className="py-2.5 px-3">Elo Rating</th>
              <th className="py-2.5 px-3">Wallet Balance</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232]">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-300 italic">
                  No player accounts found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.username} className="hover:bg-[#0c3b2e]/50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-bold text-[#f5efdf] text-sm">{u.username}</div>
                    {u.phoneNumber && (
                      <div className="text-[10px] text-slate-300 font-mono">{u.phoneNumber}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold uppercase text-cyan-300">{u.role}</td>
                  <td className="py-3 px-3 font-bold text-[#d6a735]">{u.rating || 1200} Elo</td>
                  <td className="py-3 px-3 font-bold text-emerald-400">
                    GH₵ {typeof u.points === "number" ? u.points.toFixed(2) : u.points || 0}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                        u.status === "banned"
                          ? "bg-red-950 text-red-300 border border-red-500/40"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {u.status || "active"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onAdjustBalance(u)}
                        className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] text-[11px] font-bold rounded-lg transition-colors border border-[#d6a735]/30"
                      >
                        Adjust Balance
                      </button>
                      <ActionMenu
                        items={[
                          {
                            label: "Adjust Balance",
                            icon: Coins,
                            onClick: () => onAdjustBalance(u),
                          },
                          {
                            label: u.status === "banned" ? "Unban Account" : "Ban Account",
                            icon: Ban,
                            onClick: () => onToggleBan(u.token, u.status),
                          },
                          {
                            label: "Delete User",
                            icon: X,
                            onClick: () => onDeleteUser(u.token, u.username),
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
