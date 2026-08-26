import type { Permission } from "./types";

/**
 * Standard Granular System Permissions catalog.
 * Grouped directly into the 4 primary operational categories.
 * Safe for both Client and Server usage (no database or Node dependencies).
 */
export const SYSTEM_PERMISSIONS: Omit<Permission, "id">[] = [
  // REVIEW
  {
    key: "organizers.view",
    category: "review",
    description: "Inspect organizer accounts, KYC documents, and application submissions.",
  },
  {
    key: "organizers.review",
    category: "review",
    description: "Approve, reject, or request info on organizer KYC applications.",
  },
  {
    key: "disputes.view",
    category: "review",
    description: "View active match disputes, move logs, timer history, and player claims.",
  },
  {
    key: "disputes.resolve",
    category: "review",
    description: "Review game move logs, void or resolve wager disputes and declare winners.",
  },
  {
    key: "disputes.delete",
    category: "review",
    description: "Dismiss, clear, or delete dispute records and incident flags.",
  },
  {
    key: "tournaments.requests",
    category: "review",
    description: "Review and approve/reject organizer tournament cancellations, disqualifications, and result overrides.",
  },
  {
    key: "tournaments.requests.delete",
    category: "review",
    description: "Permanently delete or dismiss tournament action requests from the queue.",
  },

  // OPERATIONS
  {
    key: "tournaments.view",
    category: "operations",
    description: "View all leagues, brackets, fixtures, participants, and prize pools.",
  },
  {
    key: "tournaments.manage",
    category: "operations",
    description: "Create, edit, resize, start brackets, or cancel tournaments directly.",
  },
  {
    key: "tournaments.delete",
    category: "operations",
    description: "Permanently delete tournaments, clean up brackets, and refund active participant escrows.",
  },
  {
    key: "games.view",
    category: "operations",
    description: "View games catalog formats, board rules, timers, and active status.",
  },
  {
    key: "games.manage",
    category: "operations",
    description: "Create, edit, enable/disable game types in the platform catalog.",
  },
  {
    key: "games.delete",
    category: "operations",
    description: "Permanently delete game types and catalog entries.",
  },
  {
    key: "wallet.view",
    category: "operations",
    description: "View financial overview, recent transactions, deposits, and escrow balances.",
  },
  {
    key: "wallet.payouts",
    category: "operations",
    description: "Approve or process Mobile Money cashout requests.",
  },
  {
    key: "wallet.reject_payout",
    category: "operations",
    description: "Reject cashout requests and return funds to user available balance.",
  },
  {
    key: "ledger.adjust",
    category: "operations",
    description: "Record manual double-entry ledger adjustments and wallet mutations with audit reasons.",
  },
  {
    key: "transactions.void",
    category: "operations",
    description: "Void or invalidate ledger transactions and escrow locks.",
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
    key: "users.edit",
    category: "operations",
    description: "Edit user profile details, usernames, avatar, and assigned balances.",
  },
  {
    key: "users.suspend",
    category: "operations",
    description: "Suspend or unban user and player accounts.",
  },
  {
    key: "users.delete",
    category: "operations",
    description: "Permanently delete player accounts, profile data, and associated user sessions.",
  },
  {
    key: "organizers.revoke",
    category: "operations",
    description: "Revoke approved organizer standing and permissions.",
  },
  {
    key: "organizers.delete",
    category: "operations",
    description: "Permanently delete organizer profiles, KYC application files, and organizer records.",
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
    key: "admins.delete",
    category: "admin",
    description: "Permanently delete administrator staff accounts and credentials.",
  },
  {
    key: "roles.view",
    category: "admin",
    description: "View RBAC roles and permissions assignment matrix.",
  },
  {
    key: "roles.manage",
    category: "admin",
    description: "Create, edit, and configure custom admin roles and permission matrices.",
  },
  {
    key: "roles.delete",
    category: "admin",
    description: "Delete custom administrative RBAC roles and permissions bindings.",
  },

  // SYSTEM
  {
    key: "audit.view",
    category: "system",
    description: "Inspect immutable audit log trails and administrative records.",
  },
  {
    key: "audit.export",
    category: "system",
    description: "Export audit logs and financial records to CSV or JSON formats.",
  },
  {
    key: "audit.delete",
    category: "system",
    description: "Purge older audit log records beyond compliance retention windows.",
  },
  {
    key: "communications.view",
    category: "system",
    description: "View SMS and email dispatch histories and notification templates.",
  },
  {
    key: "communications.send",
    category: "system",
    description: "Dispatch manual SMS or email broadcasts to players or staff.",
  },
  {
    key: "communications.delete",
    category: "system",
    description: "Clear or delete notification and message dispatch logs.",
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
    key: "system.settings.delete",
    category: "system",
    description: "Delete custom or transient platform configuration entries.",
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
    description: "Wallet oversight, Mobile Money payouts, manual ledger adjustments, transaction voiding, and escrow limits.",
    isSystemRole: false,
    permissionKeys: [
      "wallet.view",
      "wallet.payouts",
      "wallet.reject_payout",
      "ledger.adjust",
      "transactions.void",
      "limits.manage",
      "audit.view",
      "audit.export",
    ],
  },
  {
    name: "Support Admin",
    description: "Player account management, profile updates, suspension/unsuspension, user deletion, dispute resolution, and communications.",
    isSystemRole: false,
    permissionKeys: [
      "users.view",
      "users.edit",
      "users.suspend",
      "users.delete",
      "disputes.view",
      "disputes.resolve",
      "disputes.delete",
      "communications.view",
      "communications.send",
      "audit.view",
    ],
  },
  {
    name: "Reviewer",
    description: "Review organizer KYC applications, match disputes, and tournament organizer action requests.",
    isSystemRole: false,
    permissionKeys: [
      "organizers.view",
      "organizers.review",
      "organizers.revoke",
      "organizers.delete",
      "disputes.view",
      "disputes.resolve",
      "disputes.delete",
      "tournaments.requests",
      "tournaments.requests.delete",
      "audit.view",
    ],
  },
  {
    name: "Tournament Director",
    description: "Manage tournament operations, brackets, participant lists, tournament requests, and game catalog.",
    isSystemRole: false,
    permissionKeys: [
      "tournaments.view",
      "tournaments.manage",
      "tournaments.delete",
      "tournaments.requests",
      "tournaments.requests.delete",
      "games.view",
      "games.manage",
      "games.delete",
      "audit.view",
    ],
  },
];
