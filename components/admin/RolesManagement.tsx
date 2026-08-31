"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Lock,
  Sparkles,
  Search,
  Users,
  Trophy,
  UserCheck,
  Gamepad2,
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Scale,
  UserCog,
  MessageSquare,
  FileText,
  Settings,
  Layers,
  Check,
  Filter,
  Bot,
  CreditCard,
} from "lucide-react";
import type { AppRole, Permission } from "@/lib/types";
import { SYSTEM_PERMISSIONS, MODULE_CATEGORIES, ModuleCategoryInfo } from "@/lib/permissions-constants";
import { ConfirmModal } from "./ConfirmModal";

interface RolesManagementProps {
  roles: AppRole[];
  permissions: Permission[];
  busy?: boolean;
  onRefresh: () => void;
  token: string;
  adminSecret?: string;
}

// Icon mapper for module categories
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  players: Users,
  tournaments: Trophy,
  organizers: UserCheck,
  games: Gamepad2,
  deposits: ArrowDownCircle,
  withdrawals: ArrowUpCircle,
  payments: CreditCard,
  ledger: BookOpen,
  disputes: Scale,
  admins: UserCog,
  communications: MessageSquare,
  audit: FileText,
  mechanics: Bot,
  system: Settings,
};

export function RolesManagement({
  roles,
  permissions,
  busy = false,
  onRefresh,
  token,
  adminSecret,
}: RolesManagementProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<AppRole | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  // Filter and search states in modal
  const [modalSearch, setModalSearch] = useState("");
  const [activeModuleFilter, setActiveModuleFilter] = useState<string>("all");

  // Search state in role list
  const [roleSearchQuery, setRoleSearchQuery] = useState("");

  const availablePermissions = useMemo(() => {
    return permissions.length > 0
      ? permissions
      : SYSTEM_PERMISSIONS.map((p, idx) => ({ id: `perm-${idx}`, ...p }));
  }, [permissions]);

  // Derived category list including fallback for unmapped categories
  const categoriesList = useMemo(() => {
    return MODULE_CATEGORIES;
  }, []);

  function handleOpenCreate() {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermissions([]);
    setModalSearch("");
    setActiveModuleFilter("all");
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function handleOpenEdit(role: AppRole) {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || "");
    setSelectedPermissions(
      role.isSystemRole
        ? availablePermissions.map((p) => p.key)
        : Array.isArray(role.permissionKeys)
        ? [...role.permissionKeys]
        : []
    );
    setModalSearch("");
    setActiveModuleFilter("all");
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
    const catKeys = availablePermissions
      .filter((p) => p.category === catId)
      .map((p) => p.key);
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

  function handleDeleteRole(role: AppRole) {
    if (role.isSystemRole) return;
    setRoleToDelete(role);
  }

  async function executeDeleteRole(role: AppRole) {
    setActionBusy(true);
    setError("");
    setSuccess("");
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
      setSuccess(`Role '${role.name}' deleted successfully!`);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting role");
    } finally {
      setActionBusy(false);
      setRoleToDelete(null);
    }
  }

  // Filtered categories for the modal based on active filter & search text
  const filteredModalCategories = useMemo(() => {
    const query = modalSearch.toLowerCase().trim();

    return categoriesList
      .map((cat) => {
        const catPerms = availablePermissions.filter(
          (p) =>
            p.category === cat.id ||
            // Legacy mapping support
            (cat.id === "players" && p.category === "operations" && p.key.startsWith("users.")) ||
            (cat.id === "tournaments" && p.category === "operations" && p.key.startsWith("tournaments.")) ||
            (cat.id === "organizers" && p.category === "review" && p.key.startsWith("organizers.")) ||
            (cat.id === "games" && p.category === "operations" && (p.key.startsWith("games.") || p.key.startsWith("limits."))) ||
            (cat.id === "deposits" && (p.key === "wallet.view" || p.key === "deposits.view")) ||
            (cat.id === "withdrawals" && (p.key.startsWith("withdrawals.") || p.key === "wallet.payouts" || p.key === "wallet.reject_payout")) ||
            (cat.id === "ledger" && (p.key.startsWith("ledger.") || p.key.startsWith("transactions."))) ||
            (cat.id === "disputes" && p.key.startsWith("disputes.")) ||
            (cat.id === "admins" && (p.key.startsWith("admins.") || p.key.startsWith("roles."))) ||
            (cat.id === "communications" && p.key.startsWith("communications.")) ||
            (cat.id === "audit" && p.key.startsWith("audit.")) ||
            (cat.id === "system" && p.key.startsWith("system."))
        );

        const matchingPerms = query
          ? catPerms.filter(
              (p) =>
                p.key.toLowerCase().includes(query) ||
                p.description.toLowerCase().includes(query) ||
                cat.label.toLowerCase().includes(query) ||
                cat.shortLabel.toLowerCase().includes(query)
            )
          : catPerms;

        return {
          ...cat,
          permissions: matchingPerms,
          totalCategoryCount: catPerms.length,
          selectedCount: catPerms.filter((p) => selectedPermissions.includes(p.key)).length,
        };
      })
      .filter((cat) => {
        if (activeModuleFilter !== "all" && cat.id !== activeModuleFilter) {
          return false;
        }
        if (query && cat.permissions.length === 0) {
          return false;
        }
        return true;
      });
  }, [availablePermissions, categoriesList, modalSearch, activeModuleFilter, selectedPermissions]);

  // Filtered roles list for the main grid
  const filteredRoles = useMemo(() => {
    const q = roleSearchQuery.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.permissionKeys && r.permissionKeys.some((k) => k.toLowerCase().includes(q)))
    );
  }, [roles, roleSearchQuery]);

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
            Configure system access across modular categories: Players, Tournaments, Organizers, Games, Deposits, Withdrawals, Financial Ledger, Disputes, Admin Staff, Broadcasts, Audit, and System.
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

      {/* Module Overview Banner & Quick Search */}
      <div className="p-4 bg-[#041d17] border border-[#114232] rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Layers size={16} className="text-emerald-400" />
            <span>System Modules ({categoriesList.length} Active Modules • {availablePermissions.length} Granular Permissions)</span>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles or permissions..."
              value={roleSearchQuery}
              onChange={(e) => setRoleSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>
        </div>

        {/* Quick Module Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {categoriesList.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat.id] || Layers;
            const permsCount = availablePermissions.filter(
              (p) =>
                p.category === cat.id ||
                (cat.id === "players" && p.key.startsWith("users.")) ||
                (cat.id === "tournaments" && p.key.startsWith("tournaments.")) ||
                (cat.id === "organizers" && p.key.startsWith("organizers.")) ||
                (cat.id === "games" && (p.key.startsWith("games.") || p.key.startsWith("limits."))) ||
                (cat.id === "deposits" && (p.key === "wallet.view" || p.key === "deposits.view")) ||
                (cat.id === "withdrawals" && (p.key.startsWith("withdrawals.") || p.key.startsWith("wallet.payout"))) ||
                (cat.id === "ledger" && (p.key.startsWith("ledger.") || p.key.startsWith("transactions."))) ||
                (cat.id === "disputes" && p.key.startsWith("disputes.")) ||
                (cat.id === "admins" && (p.key.startsWith("admins.") || p.key.startsWith("roles."))) ||
                (cat.id === "communications" && p.key.startsWith("communications.")) ||
                (cat.id === "mechanics" && p.key.startsWith("mechanics.")) ||
                (cat.id === "audit" && p.key.startsWith("audit.")) ||
                (cat.id === "system" && p.key.startsWith("system."))
            ).length;

            return (
              <span
                key={cat.id}
                className="px-2.5 py-1 bg-[#081c15] border border-[#114232] rounded-lg text-[11px] text-slate-300 flex items-center gap-1.5"
              >
                <Icon size={12} className="text-emerald-400" />
                <span className="font-semibold text-slate-200">{cat.shortLabel}</span>
                <span className="text-[10px] text-slate-400 font-mono">({permsCount})</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredRoles.map((role) => {
          // Group role permissions by category for clear badges
          const moduleCoverageMap = new Map<string, number>();
          if (!role.isSystemRole && Array.isArray(role.permissionKeys)) {
            for (const key of role.permissionKeys) {
              const perm = availablePermissions.find((p) => p.key === key);
              const catId = perm?.category || "operations";
              moduleCoverageMap.set(catId, (moduleCoverageMap.get(catId) || 0) + 1);
            }
          }

          return (
            <div
              key={role.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                role.isSystemRole
                  ? "bg-[#0b1712] border-amber-500/40 shadow-lg shadow-amber-950/20"
                  : "bg-[#081c15] border-[#114232] hover:border-emerald-500/40"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#f5efdf]">{role.name}</h3>
                      {role.isSystemRole ? (
                        <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 text-[10px] font-bold rounded-md border border-amber-500/40 flex items-center gap-1">
                          <Lock size={10} />
                          System Role
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-500/40">
                          Custom Role
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {role.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(role)}
                      disabled={busy || actionBusy}
                      title="Edit Permissions"
                      className="p-1.5 bg-[#041d17] hover:bg-[#0c3b2e] text-slate-300 hover:text-white rounded-lg border border-[#114232] cursor-pointer transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    {!role.isSystemRole && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        disabled={busy || actionBusy}
                        title="Delete Role"
                        className="p-1.5 bg-[#041d17] hover:bg-red-950/60 text-slate-400 hover:text-red-300 rounded-lg border border-[#114232] hover:border-red-500/40 cursor-pointer transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Module Coverage Summary */}
                <div className="pt-2 border-t border-[#114232]/60 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold">
                      {role.isSystemRole
                        ? "Full Capability Matrix:"
                        : `Module Capabilities (${role.permissionKeys?.length || 0} keys assigned):`}
                    </span>
                    <span className="font-mono text-emerald-400">{role.adminCount ?? 0} staff assigned</span>
                  </div>

                  {role.isSystemRole ? (
                    <div className="p-2.5 bg-amber-950/40 text-amber-300 text-[11px] font-medium rounded-xl border border-amber-500/30 flex items-center gap-2">
                      <Sparkles size={14} className="text-[#d6a735] shrink-0" />
                      <span>Full Unconstrained Root Access Across All {categoriesList.length} Modules ({availablePermissions.length} Granular Permissions)</span>
                    </div>
                  ) : (role.permissionKeys?.length || 0) === 0 ? (
                    <div className="p-2 bg-[#041d17] border border-[#114232] rounded-xl text-xs text-slate-400 italic">
                      No permissions assigned yet. Click edit to assign module permissions.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Module coverage pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {categoriesList
                          .filter((cat) => (moduleCoverageMap.get(cat.id) || 0) > 0)
                          .map((cat) => {
                            const Icon = CATEGORY_ICON_MAP[cat.id] || Layers;
                            const count = moduleCoverageMap.get(cat.id) || 0;
                            return (
                              <span
                                key={cat.id}
                                className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border flex items-center gap-1 ${cat.badgeColor}`}
                              >
                                <Icon size={11} />
                                {cat.shortLabel} ({count})
                              </span>
                            );
                          })}
                      </div>

                      {/* Raw permission keys scrollbox */}
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                        {role.permissionKeys?.map((k) => (
                          <span
                            key={k}
                            className="px-1.5 py-0.5 bg-[#041d17] text-cyan-300 text-[10px] font-mono rounded border border-[#114232]"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#114232] flex items-center justify-between text-[11px] text-slate-400">
                <span>ID: <code className="font-mono text-slate-300">{role.id}</code></span>
                <span>{role.isSystemRole ? "Permanent System Role" : "Custom Editable Role"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#114232]">
              <div>
                <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#d6a735]" />
                  {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Custom Role"}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Assign granular capabilities grouped cleanly into functional system modules.
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
              {/* Role Details */}
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
                    placeholder="e.g. Tournament Coordinator, Finance Auditor"
                    className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-1">
                    Role Description
                  </label>
                  <input
                    type="text"
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="e.g. Manages tournaments, brackets, and action requests"
                    className="w-full px-3 py-2 bg-[#041d17] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Permission Category Groups */}
              <div className="space-y-4 pt-2 border-t border-[#114232]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <span>Permissions Matrix</span>
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 font-mono text-[11px] rounded-md border border-emerald-500/30">
                        {selectedPermissions.length} of {availablePermissions.length} Selected
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Filter by module category or use quick search to easily find and assign permissions.
                    </p>
                  </div>

                  {!editingRole?.isSystemRole && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(availablePermissions.map((p) => p.key))}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#041d17] hover:bg-emerald-950/60 text-emerald-300 border border-[#114232] hover:border-emerald-500/40 rounded-lg cursor-pointer transition-colors"
                      >
                        Select All ({availablePermissions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#041d17] hover:bg-red-950/60 text-red-300 border border-[#114232] hover:border-red-500/40 rounded-lg cursor-pointer transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>

                {/* Filter and Search Bar inside Modal */}
                <div className="space-y-2.5 p-3 bg-[#041d17] border border-[#114232] rounded-xl">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search permissions by name, key, or module (e.g. 'withdrawals', 'suspend', 'tournaments')..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                    />
                  </div>

                  {/* Module Tabs */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveModuleFilter("all")}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeModuleFilter === "all"
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                          : "bg-[#081c15] text-slate-300 border-[#114232] hover:bg-[#0c3b2e]"
                      }`}
                    >
                      <Filter size={11} />
                      All Modules
                    </button>

                    {categoriesList.map((cat) => {
                      const Icon = CATEGORY_ICON_MAP[cat.id] || Layers;
                      const catPerms = availablePermissions.filter(
                        (p) =>
                          p.category === cat.id ||
                          (cat.id === "players" && p.key.startsWith("users.")) ||
                          (cat.id === "tournaments" && p.key.startsWith("tournaments.")) ||
                          (cat.id === "organizers" && p.key.startsWith("organizers.")) ||
                          (cat.id === "games" && (p.key.startsWith("games.") || p.key.startsWith("limits."))) ||
                          (cat.id === "deposits" && (p.key === "wallet.view" || p.key === "deposits.view")) ||
                          (cat.id === "withdrawals" && (p.key.startsWith("withdrawals.") || p.key.startsWith("wallet.payout"))) ||
                          (cat.id === "ledger" && (p.key.startsWith("ledger.") || p.key.startsWith("transactions."))) ||
                          (cat.id === "disputes" && p.key.startsWith("disputes.")) ||
                          (cat.id === "admins" && (p.key.startsWith("admins.") || p.key.startsWith("roles."))) ||
                          (cat.id === "communications" && p.key.startsWith("communications.")) ||
                          (cat.id === "audit" && p.key.startsWith("audit.")) ||
                          (cat.id === "system" && p.key.startsWith("system."))
                      );
                      const selectedInCat = catPerms.filter((p) => selectedPermissions.includes(p.key)).length;
                      const isActive = activeModuleFilter === cat.id;

                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setActiveModuleFilter(cat.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                              : selectedInCat > 0
                              ? "bg-[#0c3b2e] text-emerald-200 border-emerald-600/50"
                              : "bg-[#081c15] text-slate-300 border-[#114232] hover:bg-[#0c3b2e]"
                          }`}
                        >
                          <Icon size={11} />
                          {cat.shortLabel}
                          <span
                            className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                              selectedInCat > 0 ? "bg-emerald-950 text-emerald-300 font-bold" : "text-slate-400"
                            }`}
                          >
                            {selectedInCat}/{catPerms.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {editingRole?.isSystemRole ? (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs">
                    This is a root system role with all permissions permanently locked to active.
                  </div>
                ) : filteredModalCategories.length === 0 ? (
                  <div className="p-8 text-center bg-[#041d17] border border-[#114232] rounded-xl text-slate-400 text-xs">
                    No permissions match &quot;{modalSearch}&quot;. Try clearing your search or selecting &quot;All Modules&quot;.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredModalCategories.map((cat) => {
                      const Icon = CATEGORY_ICON_MAP[cat.id] || Layers;
                      const catPerms = cat.permissions;
                      const catSelectedCount = cat.selectedCount;
                      const allCatSelected = cat.totalCategoryCount > 0 && catSelectedCount === cat.totalCategoryCount;

                      return (
                        <div
                          key={cat.id}
                          className="p-4 bg-[#041d17] border border-[#114232] rounded-xl space-y-3 shadow-inner"
                        >
                          {/* Module Group Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#114232]/80">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-[#081c15] border border-[#114232] rounded-lg text-emerald-400">
                                <Icon size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-[#f5efdf]">
                                    {cat.label}
                                  </span>
                                  <span
                                    className={`px-2 py-0.2 text-[10px] font-mono font-bold rounded ${
                                      catSelectedCount > 0
                                        ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                        : "bg-[#081c15] text-slate-400 border border-[#114232]"
                                    }`}
                                  >
                                    {catSelectedCount} of {cat.totalCategoryCount} Active
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">{cat.description}</p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => selectCategory(cat.id)}
                              className={`px-3 py-1 text-[11px] font-bold rounded-lg border cursor-pointer transition-colors self-start sm:self-center ${
                                allCatSelected
                                  ? "bg-red-950/60 hover:bg-red-900/80 text-red-300 border-red-500/40"
                                  : "bg-[#081c15] hover:bg-[#0c3b2e] text-emerald-300 border-[#114232]"
                              }`}
                            >
                              {allCatSelected ? "Deselect Module" : "Select Entire Module"}
                            </button>
                          </div>

                          {/* Permissions Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                            {catPerms.map((p) => {
                              const isChecked = selectedPermissions.includes(p.key);
                              return (
                                <label
                                  key={p.key}
                                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                                    isChecked
                                      ? "bg-emerald-950/60 border-emerald-500/60 text-white shadow-sm"
                                      : "bg-[#06261f] border-[#114232] text-slate-300 hover:bg-[#0c3b2e] hover:border-emerald-500/30"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(p.key)}
                                    className="mt-0.5 rounded text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                                  />
                                  <div className="space-y-1 select-none flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-mono font-bold text-cyan-200">
                                        {p.key}
                                      </span>
                                      {isChecked && (
                                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-tight">
                                      {p.description}
                                    </p>
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
              <div className="flex items-center justify-between pt-4 border-t border-[#114232]">
                <div className="text-xs text-slate-400 font-mono">
                  {selectedPermissions.length} permissions assigned to role
                </div>
                <div className="flex gap-3">
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
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-[#114232] hover:from-emerald-500 hover:to-[#1a5e48] text-white text-xs font-bold rounded-xl shadow-lg border border-emerald-500/30 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    {actionBusy ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Delete Confirmation Modal */}
      {roleToDelete && (
        <ConfirmModal
          isOpen={true}
          title="Delete Custom Role"
          description={`Are you sure you want to PERMANENTLY delete role '${roleToDelete.name}'?`}
          warningNote="Any admin staff assigned to this role will lose the associated permissions immediately."
          details={[
            { label: "Role Name", value: roleToDelete.name },
            { label: "Role ID", value: roleToDelete.id },
            { label: "Permissions Count", value: String(roleToDelete.permissionKeys?.length || 0) },
          ]}
          confirmText="Delete Role"
          confirmStyle="danger"
          onConfirm={() => executeDeleteRole(roleToDelete)}
          onClose={() => setRoleToDelete(null)}
        />
      )}
    </div>
  );
}

export default RolesManagement;
