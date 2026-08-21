import type { Permission } from "./types";

/**
 * Standard Granular System Permissions catalog.
 * Grouped directly into the 4 primary operational categories.
 * Safe for both Client and Server usage (no database or Node dependencies).
 */
export const SYSTEM_PERMISSIONS: Omit<Permission, "id">[] = [
  // REVIEW
  {
    key: "organizers.review",
    category: "review",
    description: "Approve, reject, or request info on organizer KYC applications.",
  },
  {
    key: "disputes.resolve",
    category: "review",
    description: "Review game move logs, void or resolve wager disputes and declare winners.",
  },
  {
    key: "tournaments.requests",
    category: "review",
    description: "Review and approve/reject organizer tournament cancellations, disqualifications, and result overrides.",
  },

  // OPERATIONS
  {
    key: "tournaments.manage",
    category: "operations",
    description: "Create, edit, resize, start brackets, or cancel tournaments directly.",
  },
  {
    key: "games.manage",
    category: "operations",
    description: "Create, edit, enable/disable game types in the platform catalog.",
  },
  {
    key: "wallet.view",
    category: "operations",
    description: "View financial overview, recent transactions, and escrow balances.",
  },
  {
    key: "wallet.payouts",
    category: "operations",
    description: "Approve or process Mobile Money cashout requests.",
  },
  {
    key: "ledger.adjust",
    category: "operations",
    description: "Record manual double-entry ledger adjustments and wallet mutations with audit reasons.",
  },
  {
    key: "limits.manage",
    category: "operations",
    description: "Configure game-type wager ranges, escrow rules, and prize pool limits.",
  },
  {
    key: "users.view",
    category: "operations",
    description: "Search and inspect player, organizer, and user profiles and match histories.",
  },
  {
    key: "users.suspend",
    category: "operations",
    description: "Suspend or unban user and player accounts.",
  },
  {
    key: "organizers.revoke",
    category: "operations",
    description: "Revoke approved organizer standing and permissions.",
  },

  // ADMIN
  {
    key: "admins.view",
    category: "admin",
    description: "View administrative staff accounts and credential status.",
  },
  {
    key: "admins.manage",
    category: "admin",
    description: "Invite, create, assign roles, or deactivate admin staff accounts.",
  },
  {
    key: "roles.view",
    category: "admin",
    description: "View RBAC roles and permissions assignment matrix.",
  },
  {
    key: "roles.manage",
    category: "admin",
    description: "Create and edit custom admin roles and permission matrices.",
  },

  // SYSTEM
  {
    key: "audit.view",
    category: "system",
    description: "Inspect immutable audit log trails and administrative records.",
  },
  {
    key: "system.settings.view",
    category: "system",
    description: "View system configurations, SMS/Email settings, and health diagnostics.",
  },
  {
    key: "system.settings.edit",
    category: "system",
    description: "Modify platform configurations, maintenance switch, SMS templates, and security policies.",
  },
  {
    key: "system.backup",
    category: "system",
    description: "Trigger and download system state backups.",
  },
];

export const SEED_ROLES_CONFIG = [
  {
    name: "Super Admin",
    description: "Full unconstrained administrative access across all modules, roles, and settings.",
    isSystemRole: true,
    permissionKeys: SYSTEM_PERMISSIONS.map((p) => p.key),
  },
  {
    name: "Finance Admin",
    description: "Wallet oversight, Mobile Money payouts, manual ledger adjustments, and escrow limits.",
    isSystemRole: false,
    permissionKeys: [
      "wallet.view",
      "wallet.payouts",
      "ledger.adjust",
      "limits.manage",
      "audit.view",
    ],
  },
  {
    name: "Support Admin",
    description: "Player account management, suspension/unsuspension, and activity review.",
    isSystemRole: false,
    permissionKeys: [
      "users.view",
      "users.suspend",
      "audit.view",
    ],
  },
  {
    name: "Reviewer",
    description: "Review organizer KYC applications, match disputes, and tournament organizer requests.",
    isSystemRole: false,
    permissionKeys: [
      "organizers.review",
      "disputes.resolve",
      "tournaments.requests",
      "audit.view",
    ],
  },
];
