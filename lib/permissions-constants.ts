import type { Permission } from "./types";

export interface ModuleCategoryInfo {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  badgeColor: string;
}

/**
 * Standard Operational Module Categories.
 * Provides clear modular grouping across Players, Tournaments, Organizers, Games,
 * Deposits, Withdrawals, Ledger, Disputes, Admin Staff, Communications, Audit, and System.
 */
export const MODULE_CATEGORIES: ModuleCategoryInfo[] = [
  {
    id: "players",
    label: "Players & Accounts",
    shortLabel: "Players",
    description: "Player profiles, account editing, disciplinary suspensions, and user records.",
    icon: "Users",
    badgeColor: "bg-blue-950/80 text-blue-300 border-blue-500/40",
  },
  {
    id: "tournaments",
    label: "Tournaments & Brackets",
    shortLabel: "Tournaments",
    description: "Tournament lifecycle, bracket seeding, prize pools, and organizer action reviews.",
    icon: "Trophy",
    badgeColor: "bg-amber-950/80 text-amber-300 border-amber-500/40",
  },
  {
    id: "organizers",
    label: "Organizers & KYC",
    shortLabel: "Organizers",
    description: "Organizer credentials, Ghana Card KYC reviews, applications, and standing revocations.",
    icon: "UserCheck",
    badgeColor: "bg-indigo-950/80 text-indigo-300 border-indigo-500/40",
  },
  {
    id: "games",
    label: "Games & Rules Catalog",
    shortLabel: "Games",
    description: "Game variants (10x10, Classic, Blitz, Rapid), board timers, rules, and wager limits.",
    icon: "Gamepad2",
    badgeColor: "bg-purple-950/80 text-purple-300 border-purple-500/40",
  },
  {
    id: "deposits",
    label: "Deposits & Wallet",
    shortLabel: "Deposits",
    description: "Financial overview, player balance inspection, Mobile Money deposits, and escrow balances.",
    icon: "ArrowDownCircle",
    badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "withdrawals",
    label: "Withdrawals & Payouts",
    shortLabel: "Withdrawals",
    description: "Mobile Money cashout requests, payout approvals, disbursements, and refunding rejections.",
    icon: "ArrowUpCircle",
    badgeColor: "bg-teal-950/80 text-teal-300 border-teal-500/40",
  },
  {
    id: "payments",
    label: "Payments & Paystack Gateway",
    shortLabel: "Payments",
    description: "Paystack live/test API keys, webhook secrets, currency, fee splits, and payment gateway configuration.",
    icon: "CreditCard",
    badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "ledger",
    label: "Financial Ledger & Adjustments",
    shortLabel: "Ledger",
    description: "Double-entry accounting adjustments, manual wallet credits/debits, and voiding transactions.",
    icon: "BookOpen",
    badgeColor: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
  },
  {
    id: "disputes",
    label: "Disputes & Arbiter",
    shortLabel: "Disputes",
    description: "Match dispute claims, move replays, clock logs, wager voiding, and match arbitration.",
    icon: "Scale",
    badgeColor: "bg-rose-950/80 text-rose-300 border-rose-500/40",
  },
  {
    id: "admins",
    label: "Admin Staff & RBAC",
    shortLabel: "Admins",
    description: "Administrative staff accounts, credential management, custom roles, and permission matrices.",
    icon: "UserCog",
    badgeColor: "bg-sky-950/80 text-sky-300 border-sky-500/40",
  },
  {
    id: "communications",
    label: "Communications & Broadcasts",
    shortLabel: "Broadcasts",
    description: "SMS, Email, and WhatsApp broadcast dispatch histories, templates, and delivery logs.",
    icon: "MessageSquare",
    badgeColor: "bg-pink-950/80 text-pink-300 border-pink-500/40",
  },
  {
    id: "audit",
    label: "Audit Logs & Compliance",
    shortLabel: "Audit",
    description: "Immutable administrative audit logs, data export to CSV/JSON, and compliance retention.",
    icon: "FileText",
    badgeColor: "bg-amber-950/80 text-amber-200 border-amber-600/40",
  },
  {
    id: "mechanics",
    label: "Mechanics Fleet & AI",
    shortLabel: "Mechanics",
    description: "AI bot mechanics accounts, double-entry bankroll ledger, matchmaking modes, funding, and wager risk controls.",
    icon: "Bot",
    badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "system",
    label: "System Settings & Maintenance",
    shortLabel: "System",
    description: "Platform parameters, maintenance mode switches, security policies, diagnostics, and backups.",
    icon: "Settings",
    badgeColor: "bg-slate-900 text-slate-300 border-slate-700",
  },
];

/**
 * Standard Granular System Permissions catalog.
 * Grouped into discrete, intuitive module categories.
 * Safe for both Client and Server usage.
 */
export const SYSTEM_PERMISSIONS: Omit<Permission, "id">[] = [
  // 1. PLAYERS & USERS
  {
    key: "users.view",
    category: "players",
    description: "Search and inspect player profiles, DPI ratings, match histories, and sessions.",
  },
  {
    key: "users.edit",
    category: "players",
    description: "Edit user profile details, usernames, avatar, and assigned balances.",
  },
  {
    key: "users.suspend",
    category: "players",
    description: "Suspend, ban, or unban player and user accounts with recorded reasons.",
  },
  {
    key: "users.delete",
    category: "players",
    description: "Permanently delete player accounts, profile data, and associated user sessions.",
  },

  // 2. TOURNAMENTS & BRACKETS
  {
    key: "tournaments.view",
    category: "tournaments",
    description: "View all leagues, brackets, fixtures, participants, seeds, and prize pools.",
  },
  {
    key: "tournaments.manage",
    category: "tournaments",
    description: "Create, edit, resize, start brackets, seed players, or cancel tournaments.",
  },
  {
    key: "tournaments.requests",
    category: "tournaments",
    description: "Review and approve/reject organizer tournament cancellations, disqualifications, and overrides.",
  },
  {
    key: "tournaments.requests.delete",
    category: "tournaments",
    description: "Permanently delete or dismiss tournament action requests from the queue.",
  },
  {
    key: "tournaments.delete",
    category: "tournaments",
    description: "Permanently delete tournaments, clean up brackets, and refund active participant escrows.",
  },

  // 3. ORGANIZERS & KYC
  {
    key: "organizers.view",
    category: "organizers",
    description: "Inspect organizer accounts, KYC documents, Ghana Card IDs, and application submissions.",
  },
  {
    key: "organizers.review",
    category: "organizers",
    description: "Approve, reject, or request additional information on organizer KYC applications.",
  },
  {
    key: "organizers.revoke",
    category: "organizers",
    description: "Revoke approved organizer standing and tournament hosting permissions.",
  },
  {
    key: "organizers.delete",
    category: "organizers",
    description: "Permanently delete organizer profiles, KYC application files, and organizer records.",
  },

  // 4. GAMES & RULES
  {
    key: "games.view",
    category: "games",
    description: "View games catalog formats (10x10, Classic, Blitz, Rapid), board rules, and timers.",
  },
  {
    key: "games.manage",
    category: "games",
    description: "Create, edit, and toggle enabled/disabled game types in the platform catalog.",
  },
  {
    key: "games.delete",
    category: "games",
    description: "Permanently delete game types and catalog entries.",
  },
  {
    key: "limits.manage",
    category: "games",
    description: "Configure game-type wager ranges, escrow limits, and platform fee percentages.",
  },

  // 5. DEPOSITS & WALLET
  {
    key: "wallet.view",
    category: "deposits",
    description: "View financial overview, recent transactions, player balances, and escrow locks.",
  },
  {
    key: "deposits.view",
    category: "deposits",
    description: "Inspect Mobile Money deposit trails, Paystack gateway events, and payment references.",
  },

  // 6. WITHDRAWALS & PAYOUTS
  {
    key: "withdrawals.view",
    category: "withdrawals",
    description: "View pending and historical Mobile Money cashout requests and settlement logs.",
  },
  {
    key: "wallet.payouts",
    category: "withdrawals",
    description: "Approve or process Mobile Money cashout payouts to user accounts.",
  },
  {
    key: "wallet.reject_payout",
    category: "withdrawals",
    description: "Reject cashout requests and return funds directly to user available balances.",
  },

  // 7. PAYMENTS & PAYSTACK GATEWAY
  {
    key: "payments.view",
    category: "payments",
    description: "View payment gateway configurations, Paystack public/secret status, live balances, and webhook endpoints.",
  },
  {
    key: "payments.manage",
    category: "payments",
    description: "Configure Paystack API secret and public keys, payment channels, fee configurations, and live/test mode toggles.",
  },
  {
    key: "payments.delete",
    category: "payments",
    description: "Clear, reset, or revoke configured payment gateway credentials.",
  },

  // 8. FINANCIAL LEDGER & ADJUSTMENTS
  {
    key: "ledger.adjust",
    category: "ledger",
    description: "Record manual double-entry ledger adjustments and wallet mutations with audit reasons.",
  },
  {
    key: "transactions.void",
    category: "ledger",
    description: "Void or invalidate ledger transactions and emergency-release escrow locks.",
  },

  // 8. DISPUTES & ARBITER
  {
    key: "disputes.view",
    category: "disputes",
    description: "View active match disputes, board snapshots, move logs, timer history, and claims.",
  },
  {
    key: "disputes.resolve",
    category: "disputes",
    description: "Review game move logs, void or resolve wager disputes, and declare match winners.",
  },
  {
    key: "disputes.delete",
    category: "disputes",
    description: "Dismiss, clear, or delete dispute records and incident flags.",
  },

  // 9. ADMIN STAFF & RBAC
  {
    key: "admins.view",
    category: "admins",
    description: "View administrative staff accounts, active sessions, and credential status.",
  },
  {
    key: "admins.manage",
    category: "admins",
    description: "Invite, create, assign roles, or deactivate admin staff accounts.",
  },
  {
    key: "admins.delete",
    category: "admins",
    description: "Permanently delete administrator staff accounts and credentials.",
  },
  {
    key: "roles.view",
    category: "admins",
    description: "View RBAC roles and granular permissions assignment matrix.",
  },
  {
    key: "roles.manage",
    category: "admins",
    description: "Create, edit, and configure custom admin roles and permission matrices.",
  },
  {
    key: "roles.delete",
    category: "admins",
    description: "Delete custom administrative RBAC roles and permissions bindings.",
  },

  // 10. COMMUNICATIONS & BROADCASTS
  {
    key: "communications.view",
    category: "communications",
    description: "View SMS, Email, and WhatsApp dispatch histories and notification templates.",
  },
  {
    key: "communications.send",
    category: "communications",
    description: "Dispatch manual SMS or email broadcasts to players, organizers, or staff.",
  },
  {
    key: "communications.delete",
    category: "communications",
    description: "Clear or delete notification and message dispatch logs.",
  },

  // 11. AUDIT LOGS & COMPLIANCE
  {
    key: "audit.view",
    category: "audit",
    description: "Inspect immutable audit log trails and administrative records.",
  },
  {
    key: "audit.export",
    category: "audit",
    description: "Export audit logs and financial records to CSV or JSON formats.",
  },
  {
    key: "audit.delete",
    category: "audit",
    description: "Purge older audit log records beyond compliance retention windows.",
  },

  // 12. MECHANICS & AI FLEET
  {
    key: "mechanics.view",
    category: "mechanics",
    description: "View mechanics fleet dashboard, status, P&L, balance allocations, and performance metrics.",
  },
  {
    key: "mechanics.manage",
    category: "mechanics",
    description: "Configure mechanics matchmaking modes, default difficulty, risk controls, and parameters.",
  },
  {
    key: "mechanics.fund",
    category: "mechanics",
    description: "Allocate, fund, withdraw, and adjust mechanics double-entry ledger bankrolls.",
  },
  {
    key: "mechanics.create",
    category: "mechanics",
    description: "Create, parameterize, and deploy new custom AI mechanics accounts.",
  },
  {
    key: "mechanics.delete",
    category: "mechanics",
    description: "Retire or permanently remove custom mechanics accounts.",
  },

  // 13. SYSTEM SETTINGS & MAINTENANCE
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
    description: "Wallet oversight, deposits review, Mobile Money payouts, manual ledger adjustments, transaction voiding, and escrow limits.",
    isSystemRole: false,
    permissionKeys: [
      "wallet.view",
      "deposits.view",
      "withdrawals.view",
      "payments.view",
      "payments.manage",
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

