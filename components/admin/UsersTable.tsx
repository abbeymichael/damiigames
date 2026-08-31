"use client";

import React, { useState } from "react";
import { Users, Search, Coins, Ban, X, Eye, Shield, CheckCircle2, AlertTriangle, MapPin, Filter } from "lucide-react";
import { ActionMenu } from "@/components/ActionMenu";
import type { Role } from "@/lib/types";

export interface UserProfileItem {
  token: string;
  username: string;
  fullName?: string;
  email?: string;
  role: Role;
  points: number;
  marbles?: number;
  status?: "active" | "suspended" | "banned";
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  phoneNumber?: string;
  phoneVerifiedAt?: string | null;
  region?: string;
  createdAt?: string;
}

export interface UsersTableProps {
  users: UserProfileItem[];
  userSearch: string;
  setUserSearch: (value: string) => void;
  onInspectUser: (user: UserProfileItem) => void;
  onAdjustBalance: (user: UserProfileItem) => void;
  onToggleBan: (targetToken: string, currentStatus?: string) => void;
  onDeleteUser: (targetToken: string, username: string) => void;
}

export function UsersTable({
  users,
  userSearch,
  setUserSearch,
  onInspectUser,
  onAdjustBalance,
  onToggleBan,
  onDeleteUser,
}: UsersTableProps) {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  const filteredUsers = users.filter((u) => {
    // Search query matches username, fullname, phone, email, or token
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase().trim();
      const matchName = u.username?.toLowerCase().includes(q);
      const matchFull = u.fullName?.toLowerCase().includes(q);
      const matchPhone = u.phoneNumber?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchToken = u.token?.toLowerCase().includes(q);
      if (!matchName && !matchFull && !matchPhone && !matchEmail && !matchToken) {
        return false;
      }
    }

    // Role filter
    if (roleFilter !== "all" && u.role !== roleFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "all") {
      const userStatus = u.status || "active";
      if (userStatus !== statusFilter) return false;
    }

    // Verification filter
    if (verificationFilter === "phone_verified" && !u.phoneNumber) return false;
    if (verificationFilter === "phone_unverified" && u.phoneNumber) return false;

    // Region filter
    if (regionFilter !== "all" && u.region !== regionFilter) return false;

    return true;
  });

  // Extract unique regions for filter
  const availableRegions = Array.from(
    new Set(users.map((u) => u.region).filter(Boolean) as string[])
  );

  return (
    <section className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#114232]">
        <div>
          <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
            <Users size={18} className="text-[#d6a735]" /> User Directory &amp; Player Management Center
          </h3>
          <p className="text-xs text-slate-300">
            Search players, inspect double-entry ledger history, analyze competitive match records, verify identity, and manage account standings.
          </p>
        </div>
        <div className="relative w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search by name, phone, email, or token..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-[#041c17] border border-[#1a5e48]/50 rounded-xl text-xs">
        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider flex items-center gap-1">
            <Filter size={10} /> Role Filter
          </label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-2.5 py-1 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-200"
          >
            <option value="all">All Roles</option>
            <option value="player">Player (Rated)</option>
            <option value="user">User (Standard)</option>
            <option value="organizer">Organizer</option>
            <option value="facilitator">Facilitator</option>
            <option value="treasurer">Treasurer</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Account Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-1 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Verification
          </label>
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="w-full px-2.5 py-1 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-200"
          >
            <option value="all">All Verification</option>
            <option value="phone_verified">Phone Verified</option>
            <option value="phone_unverified">No Phone Linked</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
            Region / Location
          </label>
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="w-full px-2.5 py-1 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-slate-200"
          >
            <option value="all">All Regions</option>
            <option value="Greater Accra">Greater Accra</option>
            <option value="Ashanti">Ashanti</option>
            <option value="Western">Western</option>
            <option value="Eastern">Eastern</option>
            <option value="Central">Central</option>
            <option value="Northern">Northern</option>
            <option value="Volta">Volta</option>
            {availableRegions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#1a5e48] text-white uppercase font-bold tracking-wider bg-[#041d17]">
              <th className="py-2.5 px-3 text-white font-bold">Player / User</th>
              <th className="py-2.5 px-3 text-white font-bold">Role</th>
              <th className="py-2.5 px-3 text-white font-bold">Region</th>
              <th className="py-2.5 px-3 text-white font-bold">Elo Rating &amp; Record</th>
              <th className="py-2.5 px-3 text-white font-bold">Wallet Balances</th>
              <th className="py-2.5 px-3 text-white font-bold">Status</th>
              <th className="py-2.5 px-3 text-white font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#114232] text-white">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-white/80 italic">
                  No user accounts matching the specified filter criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const totalMatches = (u.wins || 0) + (u.losses || 0) + (u.draws || 0);
                const winPct = totalMatches > 0 ? Math.round(((u.wins || 0) / totalMatches) * 100) : 0;

                return (
                  <tr key={u.token || u.username} className="hover:bg-[#0c3b2e]/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0c3b2e] border border-[#1a5e48] flex items-center justify-center font-bold text-[#d6a735] text-xs shrink-0">
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            {u.username}
                            {u.phoneNumber && (
                              <span title="Verified Phone">
                                <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-white/90">
                            {u.fullName && <span>{u.fullName}</span>}
                            {u.phoneNumber && <span className="font-mono text-white/80">{u.phoneNumber}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#0c3b2e] text-cyan-200 border border-cyan-500/40">
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-white">
                      <div className="flex items-center gap-1 text-[11px] font-medium">
                        <MapPin size={11} className="text-emerald-400" />
                        {u.region || "Greater Accra"}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-white">
                      <div className="font-bold text-amber-300">{u.rating || 1200} Elo</div>
                      <div className="text-[10px] text-white/90 font-medium">
                        {u.wins || 0}W - {u.losses || 0}L - {u.draws || 0}D ({winPct}%)
                      </div>
                    </td>

                    <td className="py-3 px-3 text-white">
                      <div className="font-bold text-emerald-300 font-mono">
                        GH₵ {typeof u.points === "number" ? u.points.toFixed(2) : u.points || 0}
                      </div>
                      <div className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                        <Coins size={10} />
                        {u.marbles ?? 0} Marbles
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          u.status === "banned"
                            ? "bg-red-950 text-red-200 border border-red-500/60"
                            : u.status === "suspended"
                            ? "bg-amber-950 text-amber-200 border border-amber-500/60"
                            : "bg-emerald-950 text-emerald-200 border border-emerald-500/60"
                        }`}
                      >
                        {u.status || "active"}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onInspectUser(u)}
                          className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Eye size={12} /> Inspect Detail
                        </button>
                        <ActionMenu
                          items={[
                            {
                              label: "Inspect Full Detail",
                              icon: Eye,
                              onClick: () => onInspectUser(u),
                            },
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default UsersTable;

