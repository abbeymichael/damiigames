"use client";

import React, { useState } from "react";
import { ShieldCheck, Plus, Edit2, Trash2, CheckCircle2, Lock, Sparkles } from "lucide-react";
import type { AppRole, Permission } from "@/lib/types";
import { SYSTEM_PERMISSIONS } from "@/lib/permissions-constants";

interface RolesManagementProps {
  roles: AppRole[];
  permissions: Permission[];
  busy: boolean;
  onRefresh: () => void;
  token: string;
}

export function RolesManagement({
  roles,
  permissions,
  busy,
  onRefresh,
  token,
}: RolesManagementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Group permissions by category
  const categories = [
    { id: "review", label: "Review & Oversight", desc: "Organizer approvals, dispute resolution, and tournament action reviews" },
    { id: "operations", label: "Operations & Gaming", desc: "Tournaments, game catalog, wallet payouts, player suspension, and ledger adjustments" },
    { id: "admin", label: "Administration & RBAC", desc: "Staff account administration and custom role permissions management" },
    { id: "system", label: "System & Settings", desc: "Configuration, SMS/Email templates, security policies, diagnostics, and backups" },
  ];

  const availablePermissions = permissions.length > 0 ? permissions : SYSTEM_PERMISSIONS.map((p, idx) => ({ id: `perm-${idx}`, ...p }));

  function handleOpenCreate() {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function handleOpenEdit(role: AppRole) {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPermissions(role.permissionKeys || []);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function togglePermission(key: string) {
    if (editingRole?.isSystemRole) return; // System role permissions are fixed
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function selectCategory(catId: string) {
    if (editingRole?.isSystemRole) return;
    const catKeys = availablePermissions.filter((p) => p.category === catId).map((p) => p.key);
    const allSelected = catKeys.every((k) => selectedPermissions.includes(k));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((k) => !catKeys.includes(k)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...catKeys])));
    }
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleName.trim()) {
      setError("Role name is required");
      return;
    }
    setActionBusy(true);
    setError("");
    setSuccess("");

    try {
      if (editingRole) {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "update_role",
            roleId: editingRole.id,
            name: roleName.trim(),
            description: roleDescription.trim(),
            permissionKeys: editingRole.isSystemRole ? undefined : selectedPermissions,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to update role");
        setSuccess(`Role '${roleName}' updated successfully!`);
      } else {
        const res = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: "create_role",
            name: roleName.trim(),
            description: roleDescription.trim(),
            permissionKeys: selectedPermissions,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to create role");
        setSuccess(`Role '${roleName}' created successfully!`);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving role");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteRole(role: AppRole) {
    if (role.isSystemRole) return;
    if (!confirm(`Are you sure you want to delete custom role '${role.name}'?`)) return;

    setActionBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: "delete_role",
          roleId: role.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delete role");
      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting role");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#d6a735]" />
            Roles &amp; Granular Permissions (RBAC)
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Configure administrative capability matrices. Define custom roles with fine-grained permissions across Review, Operations, Admin, and System tiers.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          disabled={busy || actionBusy}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <Plus size={16} />
          Create Custom Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {roles.map((role) => (
          <div
            key={role.id}
            className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl shadow-lg flex flex-col justify-between space-y-4 hover:border-[#1a5e48] transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#114232]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#f5efdf]">{role.name}</h3>
                    {role.isSystemRole ? (
                      <span className="px-2 py-0.5 bg-amber-950/90 text-amber-300 text-[10px] font-bold rounded border border-amber-500/40 flex items-center gap-1 font-mono">
                        <Lock size={10} /> SYSTEM ROLE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30 font-mono">
                        CUSTOM ROLE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {role.description || "No description provided."}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(role)}
                    className="p-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 hover:text-white rounded-lg border border-[#114232] transition-colors cursor-pointer"
                    title="Edit Role"
                  >
                    <Edit2 size={14} />
                  </button>
                  {!role.isSystemRole && (
                    <button
                      type="button"
                      onClick={() => handleDeleteRole(role)}
                      className="p-1.5 bg-red-950/50 hover:bg-red-900/80 text-red-300 hover:text-white rounded-lg border border-red-800/40 transition-colors cursor-pointer"
                      title="Delete Role"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Permissions Count & Tags */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Assigned Permissions ({role.permissionKeys?.length || 0})</span>
                  <span className="font-mono text-emerald-400">{role.adminCount ?? 0} staff assigned</span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {role.isSystemRole ? (
                    <span className="px-2.5 py-1 bg-amber-950/60 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 flex items-center gap-1.5">
                      <Sparkles size={12} className="text-[#d6a735]" />
                      Full Unconstrained Root Access (All {availablePermissions.length} permissions)
                    </span>
                  ) : (role.permissionKeys?.length || 0) === 0 ? (
                    <span className="text-xs text-slate-400 italic">No permissions assigned yet.</span>
                  ) : (
                    role.permissionKeys?.map((k) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 bg-[#041d17] text-cyan-300 text-[10px] font-mono rounded border border-[#114232]"
                      >
                        {k}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#114232] flex items-center justify-between text-[11px] text-slate-400">
              <span>ID: <code className="font-mono text-slate-300">{role.id}</code></span>
              <span>{role.isSystemRole ? "Permanent System Role" : "Editable"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Role Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#114232]">
              <div>
                <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                  <ShieldCheck size={18} className="text-[#d6a735]" />
                  {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Custom Role"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select granular system permissions across the four operational categories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
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
            {success && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-semibold">
                {success}
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    disabled={editingRole?.isSystemRole}
                    placeholder="e.g. Tournament Coordinator"
                    className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="e.g. Manages tournaments and review requests"
                    className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Permission Category Groups */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Permissions Matrix ({selectedPermissions.length} Selected)
                  </h4>
                  {!editingRole?.isSystemRole && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(availablePermissions.map((p) => p.key))}
                        className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="text-[11px] text-red-400 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                {editingRole?.isSystemRole ? (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs">
                    This is a root system role with all permissions permanently locked to active.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categories.map((cat) => {
                      const catPerms = availablePermissions.filter((p) => p.category === cat.id);
                      const catSelectedCount = catPerms.filter((p) => selectedPermissions.includes(p.key)).length;

                      return (
                        <div key={cat.id} className="p-3.5 bg-[#041d17] border border-[#114232] rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                {cat.label}
                              </span>
                              <p className="text-[11px] text-slate-400">{cat.desc}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => selectCategory(cat.id)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-[#081c15] hover:bg-[#0c3b2e] text-slate-300 border border-[#114232] rounded cursor-pointer"
                            >
                              {catSelectedCount === catPerms.length ? "Deselect Group" : "Select Group"}
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            {catPerms.map((p) => {
                              const isChecked = selectedPermissions.includes(p.key);
                              return (
                                <label
                                  key={p.key}
                                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-colors ${
                                    isChecked
                                      ? "bg-emerald-950/50 border-emerald-500/50 text-white"
                                      : "bg-[#06261f] border-[#114232] text-slate-300 hover:bg-[#0c3b2e]"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(p.key)}
                                    className="mt-0.5 rounded text-emerald-500 focus:ring-0"
                                  />
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-mono font-bold flex items-center gap-1.5">
                                      {p.key}
                                      {isChecked && <CheckCircle2 size={12} className="text-emerald-400" />}
                                    </div>
                                    <div className="text-[11px] text-slate-400 leading-tight">
                                      {p.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-[#114232]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 text-xs font-bold rounded-xl border border-[#114232] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 cursor-pointer disabled:opacity-50"
                >
                  {actionBusy ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
