"use client";

import React from "react";
import { ShieldCheck, UserCog } from "lucide-react";
import { AdminPermission } from "@/lib/types";

export interface AdminRoleItem {
  userId: string;
  username: string;
  isSuperAdmin: boolean;
  permissions?: AdminPermission[];
  grantedBy?: string;
  grantedAt?: string;
}

export interface AdminRolesTableProps {
  adminRolesList: AdminRoleItem[];
  busy: boolean;
  onUpdateAdminPermissions: (
    targetUserId: string,
    permissions: AdminPermission[],
    isSuperAdmin: boolean
  ) => void;
  newAdminUsername: string;
  setNewAdminUsername: (val: string) => void;
  newAdminPasscode: string;
  setNewAdminPasscode: (val: string) => void;
  newAdminRole: string;
  setNewAdminRole: (val: any) => void;
  onCreateAdmin: (e: React.FormEvent) => void;
}

export function AdminRolesTable({
  adminRolesList,
  busy,
  onUpdateAdminPermissions,
  newAdminUsername,
  setNewAdminUsername,
  newAdminPasscode,
  setNewAdminPasscode,
  newAdminRole,
  setNewAdminRole,
  onCreateAdmin,
}: AdminRolesTableProps) {
  return (
    <div className="space-y-6">
      <section className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-4">
        <div className="pb-3 border-b border-[#114232]">
          <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#d6a735]" /> Administrative &amp; Staff Account Directory
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Manage administrative staff accounts, assign granular role bundles, or grant permissions. Admins are strictly segregated from game player profiles.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                <th className="py-2.5 px-3">Admin Staff Username</th>
                <th className="py-2.5 px-3">Role Type</th>
                <th className="py-2.5 px-3">Active Permissions</th>
                <th className="py-2.5 px-3 text-right">Quick Presets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#114232]">
              {adminRolesList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-300 italic">
                    No admin staff profiles loaded.
                  </td>
                </tr>
              ) : (
                adminRolesList.map((ap) => (
                  <tr key={ap.userId} className="hover:bg-[#0c3b2e]/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#f5efdf] text-sm">{ap.username}</div>
                      <div className="text-[10px] text-cyan-300 font-mono">
                        Role: {ap.isSuperAdmin ? "SUPER ADMIN" : "STAFF ADMIN"}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase font-mono ${
                          ap.isSuperAdmin
                            ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                            : "bg-[#06261f] text-cyan-300 border border-[#114232]"
                        }`}
                      >
                        {ap.isSuperAdmin ? "Super Admin" : "Admin Staff"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {ap.isSuperAdmin ? (
                          <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 text-[10px] font-bold rounded border border-amber-500/40">
                            ★ ALL PERMISSIONS (SUPER ADMIN)
                          </span>
                        ) : (
                          ap.permissions?.map((p: string) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 bg-[#06261f] text-cyan-300 text-[10px] font-mono rounded border border-[#114232]"
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAdminPermissions(
                              ap.userId,
                              ["manage_wallet", "manage_payouts", "view_audit_log"],
                              false
                            )
                          }
                          className="px-2 py-1 bg-[#0c3b2e] text-[#f5efdf] text-[10px] rounded font-bold hover:bg-[#114232] border border-[#114232]"
                        >
                          Treasurer
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAdminPermissions(
                              ap.userId,
                              ["manage_organizers", "view_audit_log"],
                              false
                            )
                          }
                          className="px-2 py-1 bg-[#0c3b2e] text-[#f5efdf] text-[10px] rounded font-bold hover:bg-[#114232] border border-[#114232]"
                        >
                          Org Reviewer
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateAdminPermissions(
                              ap.userId,
                              [
                                "manage_users",
                                "manage_organizers",
                                "manage_tournaments",
                                "manage_wallet",
                                "manage_payouts",
                                "resolve_disputes",
                                "manage_admins",
                                "run_seeder",
                                "view_audit_log",
                              ],
                              true
                            )
                          }
                          className="px-2 py-1 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 text-[10px] rounded font-bold hover:bg-[#d6a735]/30"
                        >
                          Make SuperAdmin
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Staff Form */}
      <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4 max-w-lg">
        <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2 border-b border-[#1a5e48] pb-2">
          <UserCog size={18} className="text-[#d6a735]" /> Create Staff Account
        </h3>
        <form onSubmit={onCreateAdmin} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Staff Username</label>
            <input
              type="text"
              required
              value={newAdminUsername}
              onChange={(e) => setNewAdminUsername(e.target.value)}
              placeholder="e.g. staff_kofi"
              className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Passcode</label>
            <input
              type="password"
              required
              value={newAdminPasscode}
              onChange={(e) => setNewAdminPasscode(e.target.value)}
              placeholder="Passcode"
              className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">Staff Role</label>
            <select
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value)}
              className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
              <option value="treasurer">Treasurer</option>
              <option value="facilitator">Facilitator</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl transition-colors shadow-md"
          >
            Create Staff Account
          </button>
        </form>
      </section>
    </div>
  );
}
