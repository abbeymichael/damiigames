"use client";

import React, { useState } from "react";
import { UserCheck, ShieldAlert, KeyRound, Plus, CheckSquare, Square, AlertTriangle, Trash2, ShieldCheck } from "lucide-react";
import type { AdminAccount, AppRole } from "@/lib/types";

interface AdminStaffTableProps {
  adminAccounts: AdminAccount[];
  roles: AppRole[];
  busy: boolean;
  onRefresh: () => void;
  token: string;
  onDeleteAdmin?: (userId: string, username: string) => void;
}

export function AdminStaffTable({
  adminAccounts,
  roles,
  busy,
  onRefresh,
  token,
  onDeleteAdmin,
}: AdminStaffTableProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminAccount | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [newSelectedRoleIds, setNewSelectedRoleIds] = useState<string[]>([]);
  const [assignRoleIds, setAssignRoleIds] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  function handleOpenCreate() {
    setNewUsername("");
    setNewPasscode("");
    setNewSelectedRoleIds([]);
    setError("");
    setSuccess("");
    setCreateModalOpen(true);
  }

  function handleOpenAssign(account: AdminAccount) {
    setSelectedAdmin(account);
    setAssignRoleIds(account.roles.map((r) => r.id));
    setError("");
    setSuccess("");
    setAssignModalOpen(true);
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newPasscode.trim()) {
      setError("Username and passcode are required");
      return;
    }
    setActionBusy(true);
    setError("");
    setSuccess("");

    try {
      // 1. Create admin user
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "create_admin",
          newAdminUsername: newUsername.trim(),
          newAdminPasscode: newPasscode.trim(),
          newRole: "admin",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to create admin user");

      // 2. Assign selected RBAC roles if any
      if (newSelectedRoleIds.length > 0 && data.account?.token) {
        await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "assign_admin_roles",
            targetUserId: data.account.token,
            roleIds: newSelectedRoleIds,
          }),
        });
      }

      setSuccess(`Admin account '${newUsername}' created successfully.`);
      setCreateModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating admin account");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveRoleAssignments(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAdmin) return;

    setActionBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "assign_admin_roles",
          targetUserId: selectedAdmin.userId,
          roleIds: assignRoleIds,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to update role assignments");

      setSuccess(`Assigned roles for '${selectedAdmin.username}' updated.`);
      setAssignModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating role assignments");
    } finally {
      setActionBusy(false);
    }
  }

  function toggleRole(roleId: string, isCreate = false) {
    if (isCreate) {
      setNewSelectedRoleIds((prev) =>
        prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
      );
    } else {
      setAssignRoleIds((prev) =>
        prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
            <UserCheck size={20} className="text-[#d6a735]" />
            Administrative Staff &amp; Access Control
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Directory of administrative personnel. Admins are strictly segregated from player matches and receive permissions exclusively via assigned RBAC roles.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          disabled={busy || actionBusy}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus size={16} />
          Create Admin Account
        </button>
      </div>

      {/* Admin Accounts Table */}
      <div className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold tracking-wider bg-[#041d17]">
                <th className="py-2.5 px-3">Admin Username</th>
                <th className="py-2.5 px-3">Phone / Contact</th>
                <th className="py-2.5 px-3">Assigned RBAC Roles</th>
                <th className="py-2.5 px-3">Security &amp; Password Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#114232]">
              {adminAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-300 italic">
                    No admin accounts registered yet. Use the Seeder or create an admin account.
                  </td>
                </tr>
              ) : (
                adminAccounts.map((acc, idx) => (
                  <tr key={`${acc.userId || "admin"}-${idx}`} className="hover:bg-[#0c3b2e]/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#f5efdf] text-sm">{acc.username}</span>
                        {acc.isSuperAdmin && (
                          <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 text-[10px] font-bold rounded border border-amber-500/40">
                            ★ SUPER ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ID: {acc.userId}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {acc.phoneNumber || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1.5 max-w-sm">
                        {acc.roles.length === 0 ? (
                          <span className="text-[11px] text-amber-400/90 italic flex items-center gap-1">
                            <AlertTriangle size={12} /> No RBAC roles assigned
                          </span>
                        ) : (
                          acc.roles.map((r) => (
                            <span
                              key={r.id}
                              className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                                r.isSystemRole
                                  ? "bg-amber-950/80 text-amber-300 border-amber-500/40"
                                  : "bg-[#06261f] text-emerald-300 border-emerald-500/30"
                              }`}
                            >
                              {r.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {acc.isDefaultCredentials ? (
                        <span className="px-2 py-0.5 bg-red-950/80 text-red-300 text-[10px] font-bold rounded border border-red-500/50 flex items-center gap-1 w-fit">
                          <KeyRound size={10} /> DEFAULT CREDS / FORCE RESET
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <ShieldCheck size={10} /> SECURE PASSWORD
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAssign(acc)}
                          className="px-3 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 hover:text-white text-xs font-semibold rounded-lg border border-[#114232] transition-colors cursor-pointer"
                        >
                          Manage Roles
                        </button>
                        {acc.role !== "super_admin" && acc.userId !== token && onDeleteAdmin && (
                          <button
                            type="button"
                            onClick={() => onDeleteAdmin(acc.userId, acc.username)}
                            className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white text-xs font-semibold rounded-lg border border-red-800/60 transition-colors cursor-pointer flex items-center gap-1"
                            title="Delete Admin Account"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Admin */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#114232]">
              <div>
                <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                  <UserCheck size={18} className="text-[#d6a735]" />
                  Create Staff Account
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Create a new administrative staff login and assign RBAC roles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. FinanceOfficer_Kojo"
                  className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                  Temporary Passcode / Password *
                </label>
                <input
                  type="password"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                  Assign RBAC Roles ({newSelectedRoleIds.length} selected)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isChecked = newSelectedRoleIds.includes(r.id);
                    return (
                      <div
                        key={r.id}
                        onClick={() => toggleRole(r.id, true)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-emerald-950/50 border-emerald-500/50 text-white"
                            : "bg-[#06261f] border-[#114232] text-slate-300 hover:bg-[#0c3b2e]"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            {r.name}
                            {r.isSystemRole && (
                              <span className="text-[10px] text-amber-300 font-mono">
                                [SYSTEM]
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.description || "Custom role"}
                          </div>
                        </div>
                        {isChecked ? (
                          <CheckSquare size={16} className="text-emerald-400" />
                        ) : (
                          <Square size={16} className="text-slate-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#114232]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 text-xs font-bold rounded-xl border border-[#114232] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 cursor-pointer disabled:opacity-50"
                >
                  {actionBusy ? "Creating..." : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Roles */}
      {assignModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#114232]">
              <div>
                <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#d6a735]" />
                  Manage Roles: {selectedAdmin.username}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select the RBAC roles assigned to this staff account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSaveRoleAssignments} className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {roles.map((r) => {
                  const isChecked = assignRoleIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleRole(r.id, false)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-emerald-950/50 border-emerald-500/50 text-white"
                          : "bg-[#06261f] border-[#114232] text-slate-300 hover:bg-[#0c3b2e]"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {r.name}
                          {r.isSystemRole && (
                            <span className="text-[10px] text-amber-300 font-mono">
                              [SYSTEM]
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {r.description || "Custom role"}
                        </div>
                      </div>
                      {isChecked ? (
                        <CheckSquare size={18} className="text-emerald-400" />
                      ) : (
                        <Square size={18} className="text-slate-500" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#114232]">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 text-xs font-bold rounded-xl border border-[#114232] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 cursor-pointer disabled:opacity-50"
                >
                  {actionBusy ? "Saving..." : "Save Role Assignments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminStaffTable;
