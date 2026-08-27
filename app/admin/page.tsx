"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link, { safeNavigate } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import { SharedHeader } from "@/components/SharedHeader";
import {
  LayoutDashboard,
  UserCheck,
  Trophy,
  Wallet,
  Gavel,
  Users,
  ShieldCheck,
  ScrollText,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Circle,
  ShieldAlert,
  Swords,
  Activity,
  Key,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Settings,
  Eye,
  X,
  Search,
  RefreshCw,
  Coins,
  Ban,
  Plus,
  Minus,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  FileText,
  UserCog,
  Scale,
  Lock,
  Database,
  Menu,
  LogOut,
  Copy,
  Play,
  Zap,
  ExternalLink,
  SlidersHorizontal,
  Gamepad2,
  Inbox,
  MessageSquare,
  Bot,
} from "lucide-react";
import { getSessionToken, saveSessionToken, clearSessionToken } from "@/lib/client-auth";
import type {
  AdminLog,
  Role,
  AppRole,
  Permission,
  AdminAccount,
  GameCatalogItem,
  TournamentActionRequest,
  OrganizerApplication,
  OrganizerApplicationDetailPayload,
  LedgerEntry,
  SystemFundsReport,
  ChartOfAccountsReport,
  TreasuryFundDetails,
  ComprehensiveMatch,
  GameRequestItem,
} from "@/lib/types";
import { ActionMenu } from "@/components/ActionMenu";
import { AdminTable } from "@/components/AdminTable";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { UsersTable } from "@/components/admin/UsersTable";
import { UserDetailModal } from "@/components/admin/UserDetailModal";
import { TournamentsTable } from "@/components/admin/TournamentsTable";
import { LedgerTable } from "@/components/admin/LedgerTable";
import { DepositsTable } from "@/components/admin/DepositsTable";
import { WithdrawalsTable } from "@/components/admin/WithdrawalsTable";
import { OrganizersTable } from "@/components/admin/OrganizersTable";
import { OrganizerApplicationDetailModal } from "@/components/admin/OrganizerApplicationDetailModal";
import { DisputesTable } from "@/components/admin/DisputesTable";
import { GameDetailModal } from "@/components/admin/GameDetailModal";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { AdminRolesTable } from "@/components/admin/AdminRolesTable";
import { GameLimitsTable } from "@/components/admin/GameLimitsTable";
import { PlatformSettings } from "@/components/admin/PlatformSettings";
import { RolesManagement } from "@/components/admin/RolesManagement";
import { AdminStaffTable } from "@/components/admin/AdminStaffTable";
import { GamesCatalogTable } from "@/components/admin/GamesCatalogTable";
import { TournamentRequestsTable } from "@/components/admin/TournamentRequestsTable";
import { GameRequestsTable } from "@/components/admin/GameRequestsTable";
import { LegalPagesEditor } from "@/components/admin/LegalPagesEditor";
import { CommunicationsCenter } from "@/components/admin/CommunicationsCenter";
import { BotFleetManagement } from "@/components/admin/BotFleetManagement";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type UserProfileItem = {
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
};

type MoveItem = {
  from: number;
  to: number;
  turn?: string;
  isCapture?: boolean;
  timestamp?: string;
  note?: string;
};

type RoomItem = {
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
};

type TransactionItem = {
  id: string;
  userToken: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  createdAt: string;
};

type SystemMetrics = {
  userCount: number;
  activeRoomsCount: number;
  totalRoomsCount: number;
  leagueCount: number;
  totalTransactions: number;
  totalVolumePoints?: number;
  totalVolumeMarbles?: number;
  resolvedDisputesCount?: number;
  resolvedDisputesVolume?: number;
  totalEscrowProcessed?: number;
  dailyActivity?: Array<{ date: string; users: number; transactions: number; volume: number }>;
  allUsers?: UserProfileItem[];
  recentRooms: RoomItem[];
  recentTransactions: TransactionItem[];
  settings?: {
    wagerFeePercent?: number;
    tournamentFeePercent?: number;
    pointsPerCediDeposit?: number;
    pointsPerCediWithdrawal?: number;
  };
  logs: AdminLog[];
  roles?: AppRole[];
  permissions?: Permission[];
  adminAccounts?: AdminAccount[];
  games?: GameCatalogItem[];
  tournamentRequests?: TournamentActionRequest[];
  systemSettings?: any;
  systemFunds?: SystemFundsReport | null;
  chartOfAccounts?: ChartOfAccountsReport | null;
  treasuryDetails?: TreasuryFundDetails | null;
  ledgerEntries?: LedgerEntry[];
  comprehensiveMatches?: ComprehensiveMatch[];
  gameRequests?: GameRequestItem[];
  deposits?: any[];
  withdrawals?: any[];
  transactions?: any[];
};

interface NavItem {
  key: string;
  label: string;
  icon: any;
  permission: string | null;
  badgeKey?: string;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

// Nav items declare which permission unlocks them. `null` = always visible to all authenticated admins.
const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [{ key: "overview", label: "Overview", icon: LayoutDashboard, permission: null }],
  },
  {
    title: "Review",
    items: [
      { key: "organizers", label: "Organizer Requests", icon: UserCheck, permission: "organizers.view", badgeKey: "pendingOrganizers" },
      { key: "disputes", label: "Disputes & Matches", icon: Gavel, permission: "disputes.view", badgeKey: "openDisputes" },
      { key: "game_requests", label: "Game Requests", icon: Gamepad2, permission: "tournaments.requests", badgeKey: "pendingGameRequests" },
    ],
  },
  {
    title: "Operations",
    items: [
      { key: "tournaments", label: "Tournaments", icon: Trophy, permission: "tournaments.view" },
      { key: "games", label: "Game Catalog", icon: Gamepad2, permission: "games.view" },
      { key: "deposits", label: "Deposits", icon: ArrowDownLeft, permission: "deposits.view" },
      { key: "withdrawals", label: "Withdrawals & Payouts", icon: ArrowUpRight, permission: "withdrawals.view", badgeKey: "pendingWithdrawals" },
      { key: "wallet", label: "Financial Ledger", icon: Wallet, permission: "wallet.view" },
      { key: "communications", label: "Communications", icon: MessageSquare, permission: "communications.view" },
      { key: "limits", label: "Game Limits & Escrow", icon: SlidersHorizontal, permission: "limits.manage" },
      { key: "users", label: "Players & Users", icon: Users, permission: "users.view" },
      { key: "bots", label: "Bot Accounts (100)", icon: Bot, permission: "system.settings.view" },
    ],
  },
  {
    title: "Administration",
    items: [
      { key: "admins", label: "Admin Staff", icon: UserCheck, permission: "admins.view" },
      { key: "roles", label: "Roles & Permissions", icon: ShieldCheck, permission: "roles.view" },
    ],
  },
  {
    title: "System",
    items: [
      { key: "audit", label: "Audit Trail", icon: ScrollText, permission: "audit.view" },
      { key: "settings", label: "System Settings", icon: Settings, permission: "system.settings.view" },
      { key: "pages", label: "Legal & Policy Pages", icon: FileText, permission: "system.settings.view" },
    ],
  },
];

const TAB_ITEMS_CONFIG: Record<
  string,
  { key: string; label: string; permission: string | null; icon: any; moduleName: string }
> = {
  overview: { key: "overview", label: "Overview", permission: null, icon: LayoutDashboard, moduleName: "Dashboard Overview" },
  organizers: { key: "organizers", label: "Organizer Requests", permission: "organizers.view", icon: UserCheck, moduleName: "Organizer Applications & KYC" },
  disputes: { key: "disputes", label: "Disputes & Matches", permission: "disputes.view", icon: Gavel, moduleName: "Match History & Dispute Intelligence" },
  game_requests: { key: "game_requests", label: "Game Requests", permission: "tournaments.requests", icon: Gamepad2, moduleName: "Game Requests & Wager Challenges" },
  tournament_requests: { key: "game_requests", label: "Game Requests", permission: "tournaments.requests", icon: Gamepad2, moduleName: "Game Requests & Wager Challenges" },
  tournaments: { key: "tournaments", label: "Tournaments", permission: "tournaments.view", icon: Trophy, moduleName: "Tournaments & Brackets" },
  games: { key: "games", label: "Game Catalog", permission: "games.view", icon: Gamepad2, moduleName: "Games & Rules Catalog" },
  deposits: { key: "deposits", label: "Deposits", permission: "deposits.view", icon: ArrowDownLeft, moduleName: "Deposits & Paystack Reconciliation" },
  withdrawals: { key: "withdrawals", label: "Withdrawals & Payouts", permission: "withdrawals.view", icon: ArrowUpRight, moduleName: "Withdrawals & Payouts" },
  wallet: { key: "wallet", label: "Financial Ledger", permission: "wallet.view", icon: Wallet, moduleName: "Financial Ledger & Treasury" },
  payments: { key: "wallet", label: "Financial Ledger", permission: "wallet.view", icon: Wallet, moduleName: "Financial Ledger & Treasury" },
  ledger: { key: "wallet", label: "Financial Ledger", permission: "wallet.view", icon: Wallet, moduleName: "Financial Ledger & Treasury" },
  communications: { key: "communications", label: "Communications", permission: "communications.view", icon: MessageSquare, moduleName: "Communications & Broadcasts" },
  limits: { key: "limits", label: "Game Limits & Escrow", permission: "limits.manage", icon: SlidersHorizontal, moduleName: "Game Limits & Escrow" },
  users: { key: "users", label: "Players & Users", permission: "users.view", icon: Users, moduleName: "Player Management" },
  players: { key: "users", label: "Players & Users", permission: "users.view", icon: Users, moduleName: "Player Management" },
  bots: { key: "bots", label: "Bot Accounts (100)", permission: "system.settings.view", icon: Bot, moduleName: "Bot Fleet Management" },
  admins: { key: "admins", label: "Admin Staff", permission: "admins.view", icon: UserCheck, moduleName: "Admin Staff Accounts" },
  roles: { key: "roles", label: "Roles & Permissions", permission: "roles.view", icon: ShieldCheck, moduleName: "Roles & Granular Permissions" },
  audit: { key: "audit", label: "Audit Trail", permission: "audit.view", icon: ScrollText, moduleName: "Audit Trail & Compliance Logs" },
  settings: { key: "settings", label: "System Settings", permission: "system.settings.view", icon: Settings, moduleName: "System Settings & Controls" },
  pages: { key: "pages", label: "Legal & Policy Pages", permission: "system.settings.view", icon: FileText, moduleName: "Legal & Policy Pages" },
};

function hasAccess(
  role: { isSuperAdmin: boolean; permissions: string[] } | null | undefined,
  permission: string | null
): boolean {
  if (permission === null) return true;
  if (!role) return false;
  if (role.isSuperAdmin) return true;
  if (!Array.isArray(role.permissions)) return false;
  if (role.permissions.includes(permission)) return true;

  // Strict aliases: only permissions in the same functional domain grant access
  const permissionAliases: Record<string, string[]> = {
    "organizers.view": ["organizers.review", "organizers.revoke", "organizers.delete", "manage_organizers"],
    "organizers.review": ["organizers.revoke", "organizers.delete", "manage_organizers"],
    "disputes.view": ["disputes.resolve", "disputes.delete", "resolve_disputes"],
    "disputes.resolve": ["resolve_disputes"],
    "tournaments.view": ["tournaments.manage", "tournaments.delete", "tournaments.requests", "manage_tournaments"],
    "tournaments.requests": ["tournaments.requests.delete", "tournaments.manage", "manage_tournaments"],
    "tournaments.manage": ["manage_tournaments"],
    "games.view": ["games.manage", "games.delete"],
    "games.manage": [],
    "deposits.view": ["wallet.view", "manage_wallet"],
    "withdrawals.view": ["wallet.view", "wallet.payouts", "wallet.payout", "wallet.reject_payout", "manage_wallet", "manage_payouts"],
    "wallet.view": ["ledger.adjust", "transactions.void", "manage_wallet"],
    "communications.view": ["communications.send", "communications.delete", "system.sms_email"],
    "system.sms_email": ["communications.send", "communications.view"],
    "limits.manage": ["manage_wallet"],
    "users.view": ["users.edit", "users.suspend", "users.delete", "manage_users"],
    "admins.view": ["admins.manage", "admins.delete", "manage_admins"],
    "roles.view": ["roles.manage", "roles.delete", "manage_admins"],
    "audit.view": ["audit.export", "audit.delete", "view_audit_log"],
    "system.settings.view": ["system.settings.edit", "system.settings.delete", "system.maintenance", "system.security", "system.backup"],
  };

  const aliases = permissionAliases[permission] || [];
  return aliases.some((alias) => role.permissions.includes(alias));
}

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPasscode, setAdminPasscode] = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Live RBAC permissions and role state from server session
  const [adminRoleName, setAdminRoleName] = useState<string>("Administrator");
  const [adminPermissions, setAdminPermissions] = useState<{
    isSuperAdmin: boolean;
    permissionKeys: string[];
  }>({
    isSuperAdmin: false,
    permissionKeys: [],
  });
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isMobileAdminDrawerOpen, setIsMobileAdminDrawerOpen] = useState(false);

  // Compute effective role bundle strictly from live server permissions
  const currentRole = useMemo(() => {
    const isSuper = Boolean(adminPermissions?.isSuperAdmin);
    const keys = Array.isArray(adminPermissions?.permissionKeys) ? adminPermissions.permissionKeys : [];
    let label = "Administrator";
    if (isSuper) {
      label = "Super Admin";
    } else if (adminRoleName && adminRoleName !== "admin") {
      label = adminRoleName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    } else if (keys.length === 0) {
      label = "Restricted Admin";
    }
    return {
      label,
      isSuperAdmin: isSuper,
      permissions: keys,
    };
  }, [adminPermissions, adminRoleName]);

  // Tab navigation helper with URL query synchronization
  const navigateToTab = useCallback((newTab: string) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", newTab);
      window.history.pushState({ tab: newTab }, "", url.toString());
    }
  }, []);

  // Organizer Approval & Admin Roles State
  const [organizersList, setOrganizersList] = useState<any[]>([]);
  const [organizerApplications, setOrganizerApplications] = useState<OrganizerApplication[]>([]);
  const [selectedAppDetail, setSelectedAppDetail] = useState<OrganizerApplicationDetailPayload | null>(null);
  const [isAppDetailModalOpen, setIsAppDetailModalOpen] = useState(false);
  const [adminRolesList, setAdminRolesList] = useState<any[]>([]);

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<"all" | "playing" | "waiting" | "completed">("all");
  const [txFilter, setTxFilter] = useState<"all" | "completed" | "pending" | "failed">("all");

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  // Selected Comprehensive Match for Inspection
  const [inspectMatch, setInspectMatch] = useState<ComprehensiveMatch | null>(null);

  // Selected Game Room for Inspection
  const [inspectRoom, setInspectRoom] = useState<RoomItem | null>(null);

  // Selected User for Detail Inspector
  const [selectedUserForInspect, setSelectedUserForInspect] = useState<UserProfileItem | null>(null);

  // User Point Adjustment Modal State
  const [pointModalUser, setPointModalUser] = useState<UserProfileItem | null>(null);
  const [pointAmountInput, setPointAmountInput] = useState<number>(100);
  const [pointOperation, setPointOperation] = useState<"add" | "deduct">("add");
  const [pointReason, setPointReason] = useState("");

  // Fee Settings Form Inputs
  const [wagerFeePercentInput, setWagerFeePercentInput] = useState<number>(5);
  const [tournamentFeePercentInput, setTournamentFeePercentInput] = useState<number>(10);

  // Deposit & Withdrawal Limits Form Inputs
  const [minDepositGhsInput, setMinDepositGhsInput] = useState<number>(5);
  const [maxDepositGhsInput, setMaxDepositGhsInput] = useState<number>(5000);
  const [minWithdrawalGhsInput, setMinWithdrawalGhsInput] = useState<number>(10);
  const [maxWithdrawalGhsInput, setMaxWithdrawalGhsInput] = useState<number>(2000);
  const [maxDailyWithdrawalGhsInput, setMaxDailyWithdrawalGhsInput] = useState<number>(5000);

  // Dispute Form
  const [disputeCode, setDisputeCode] = useState("");
  const [disputeWinnerToken, setDisputeWinnerToken] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  // Staff Creation Form
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPasscode, setNewAdminPasscode] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "super_admin" | "treasurer" | "facilitator">("admin");

  // TOURNAMENT MANAGEMENT & OVERSIGHT STATE
  const [leaguesList, setLeaguesList] = useState<any[]>([]);
  const [leagueStatusFilter, setLeagueStatusFilter] = useState<"all" | "registration" | "active" | "completed" | "cancelled">("all");
  const [selectedLeagueForInspect, setSelectedLeagueForInspect] = useState<any | null>(null);
  const [inspectLeagueDetails, setInspectLeagueDetails] = useState<{ league: any; participants: any[]; matches: any[] } | null>(null);
  const [inspectLeagueTab, setInspectLeagueTab] = useState<"overview" | "roster" | "matches">("overview");
  const [manualPlayerUsername, setManualPlayerUsername] = useState("");
  const [createTournamentModalOpen, setCreateTournamentModalOpen] = useState(false);
  const [spectateMatch, setSpectateMatch] = useState<any | null>(null);

  // New Tournament Creation Form State
  const [newTournTitle, setNewTournTitle] = useState("");
  const [newTournDesc, setNewTournDesc] = useState("");
  const [newTournEntryFee, setNewTournEntryFee] = useState<number>(100);
  const [newTournPrizePool, setNewTournPrizePool] = useState<number>(1000);
  const [newTournMaxPlayers, setNewTournMaxPlayers] = useState<number>(8);
  const [newTournFormat, setNewTournFormat] = useState<"single_elimination" | "double_elimination" | "round_robin" | "swiss">("single_elimination");

  // LEDGER SYSTEM STATE & MODAL
  const [addLedgerModalOpen, setAddLedgerModalOpen] = useState(false);
  const [ledgerTargetToken, setLedgerTargetToken] = useState("");
  const [ledgerType, setLedgerType] = useState<"deposit" | "withdrawal" | "wager_refund" | "league_prize" | "league_fee" | "convert_points" | "admin_adjustment">("deposit");
  const [ledgerCurrency, setLedgerCurrency] = useState<"points" | "marbles">("points");
  const [ledgerAmount, setLedgerAmount] = useState<number>(100);
  const [ledgerReference, setLedgerReference] = useState("");
  const [ledgerReason, setLedgerReason] = useState("");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all");

  // CUSTOM CONFIRMATION MODAL STATE
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    warningNote?: string;
    details?: { label: string; value: string }[];
    confirmText?: string;
    confirmStyle?: "danger" | "warning" | "primary";
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [confirmExecuting, setConfirmExecuting] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Read URL tab query parameter on mount
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") || (window.location.hash ? window.location.hash.replace("#", "") : null);
      if (tabParam) {
        setActiveTab(tabParam.toLowerCase());
      }
    }

    // Handle browser forward/back buttons
    const handlePopState = () => {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get("tab") || "overview";
        setActiveTab(tabParam.toLowerCase());
      }
    };
    window.addEventListener("popstate", handlePopState);

    const savedToken = getSessionToken();
    const name = localStorage.getItem("damii-player-name");
    if (savedToken) {
      setToken(savedToken);
      if (name) setAdminUsername(name);

      // Auto-validate session with admin endpoint if token exists
      fetch(`/api/admin?token=${encodeURIComponent(savedToken)}&secret=${encodeURIComponent(adminSecret)}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setMetrics(data);
            if (data.adminPermissions) {
              setAdminPermissions(data.adminPermissions);
            }
            if (data.adminRoleTitle) {
              setAdminRoleName(data.adminRoleTitle);
            } else if (data.adminPermissions?.roleTitle) {
              setAdminRoleName(data.adminPermissions.roleTitle);
            }
            if (data.currentAdmin?.username) {
              setAdminUsername(data.currentAdmin.username);
            }
            setIsAuthenticated(true);
            setSuccess("Active admin session restored.");
          }
        })
        .catch(() => {
          /* Session check failed, stay on login */
        });
    }

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (metrics?.settings) {
      setWagerFeePercentInput(metrics.settings.wagerFeePercent ?? 5);
      setTournamentFeePercentInput(metrics.settings.tournamentFeePercent ?? 10);
      setMinDepositGhsInput(metrics.settings.minDepositGhs ?? 5);
      setMaxDepositGhsInput(metrics.settings.maxDepositGhs ?? 5000);
      setMinWithdrawalGhsInput(metrics.settings.minWithdrawalGhs ?? 10);
      setMaxWithdrawalGhsInput(metrics.settings.maxWithdrawalGhs ?? 2000);
      setMaxDailyWithdrawalGhsInput(metrics.settings.maxDailyWithdrawalGhs ?? 5000);
    }
    if (metrics?.adminPermissions) {
      setAdminPermissions(metrics.adminPermissions);
    }
    if (metrics?.adminRoleTitle) {
      setAdminRoleName(metrics.adminRoleTitle);
    } else if (metrics?.adminPermissions?.roleTitle) {
      setAdminRoleName(metrics.adminPermissions.roleTitle);
    }
  }, [metrics?.settings, metrics?.adminPermissions, metrics?.adminRoleTitle]);

  const chartData = useMemo(() => {
    if (metrics?.dailyActivity && metrics.dailyActivity.length > 0) {
      return metrics.dailyActivity;
    }
    const now = new Date();
    const list = [];
    const baseTotalUsers = metrics?.userCount || 12;
    const baseTotalTxs = metrics?.totalTransactions || 24;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const progress = (30 - i) / 30;
      const users = Math.max(1, Math.round(baseTotalUsers * (0.35 + 0.65 * Math.pow(progress, 0.85))));
      const transactions = Math.max(1, Math.round(2 + (baseTotalTxs / 5) * (0.2 + 0.15 * Math.sin(i * 0.6))));
      const volume = transactions * 180;
      list.push({ date: dateStr, users, transactions, volume });
    }
    return list;
  }, [metrics]);

  const filteredUsers = useMemo(() => {
    const list = metrics?.allUsers || [];
    // Segregate admin accounts: Admins are NOT players and do not play matches.
    const playersOnly = list.filter((u) => u.role !== "admin" && u.role !== "super_admin");
    if (!userSearch.trim()) return playersOnly;
    const q = userSearch.toLowerCase();
    return playersOnly.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.phoneNumber && u.phoneNumber.includes(q))
    );
  }, [metrics?.allUsers, userSearch]);

  const filteredRooms = useMemo(() => {
    if (!metrics?.recentRooms) return [];
    if (roomFilter === "all") return metrics.recentRooms;
    return metrics.recentRooms.filter((r) => r.status.toLowerCase() === roomFilter);
  }, [metrics?.recentRooms, roomFilter]);

  const filteredTransactions = useMemo(() => {
    if (!metrics?.recentTransactions) return [];
    if (txFilter === "all") return metrics.recentTransactions;
    return metrics.recentTransactions.filter((t) => t.status.toLowerCase() === txFilter);
  }, [metrics?.recentTransactions, txFilter]);

  const pendingOrganizersCount = useMemo(() => {
    const fromApps = organizerApplications.filter((o) => o.status === "pending").length;
    if (fromApps > 0) return fromApps;
    return organizersList.filter((o) => o.status === "pending").length;
  }, [organizerApplications, organizersList]);

  const openDisputesCount = useMemo(() => {
    return metrics?.recentRooms?.filter((r) => r.status.toLowerCase() === "disputed").length || 0;
  }, [metrics?.recentRooms]);

  async function handleRunSeeder() {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Seeding failed");
      setSuccess("Seeder executed successfully! Initial admin ('admin' / 'admin123') and player accounts ready.");
      if (isAuthenticated) {
        refreshAdminData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seeder failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdminAuth(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!adminUsername.trim() || !adminPasscode.trim()) {
      setError("Admin Username and Passcode are required.");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: adminUsername.trim(),
          passcode: adminPasscode.trim(),
          secret: adminSecret || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Authentication failed");

      setToken(data.token);
      setMetrics(data.metrics);
      if (data.adminPermissions) {
        setAdminPermissions(data.adminPermissions);
      } else if (data.metrics?.adminPermissions) {
        setAdminPermissions(data.metrics.adminPermissions);
      }
      if (data.adminRoleTitle) {
        setAdminRoleName(data.adminRoleTitle);
      } else if (data.adminPermissions?.roleTitle) {
        setAdminRoleName(data.adminPermissions.roleTitle);
      } else if (data.profile?.roleTitle) {
        setAdminRoleName(data.profile.roleTitle);
      }
      setIsAuthenticated(true);
      setSuccess(`Admin session authenticated for ${data.profile.username}!`);

      saveSessionToken(data.token);
      localStorage.setItem("damii-player-token", data.token);
      localStorage.setItem("damii-player-name", data.profile.username);
      localStorage.setItem(
        "damii-auth-user",
        JSON.stringify({
          token: data.token,
          username: data.profile.username,
          points: data.profile.points,
          role: data.profile.role || (data.adminPermissions?.isSuperAdmin ? "super_admin" : "admin"),
          roleTitle: data.adminRoleTitle || data.profile?.roleTitle || data.adminPermissions?.roleTitle || (data.adminPermissions?.isSuperAdmin ? "Super Admin" : "Administrator"),
          isSuperAdmin: Boolean(data.adminPermissions?.isSuperAdmin || data.profile?.isSuperAdmin),
        })
      );
      window.dispatchEvent(new Event("damii-auth-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    clearSessionToken();
    if (typeof window !== "undefined") {
      localStorage.removeItem("damii-player-token");
      localStorage.removeItem("damii-player-name");
      localStorage.removeItem("damii-auth-user");
    }
    setIsAuthenticated(false);
    setToken("");
    setMetrics(null);
    setSuccess("");
    window.dispatchEvent(new Event("damii-auth-changed"));
    safeNavigate(router, "/");
  }

  async function refreshAdminData() {
    try {
      const res = await fetch(`/api/admin?token=${encodeURIComponent(token)}&secret=${encodeURIComponent(adminSecret)}`);
      const data = await res.json();
      if (res.ok) {
        setMetrics(data);
        if (data.adminPermissions) {
          setAdminPermissions(data.adminPermissions);
        }
        if (data.adminRoleTitle) {
          setAdminRoleName(data.adminRoleTitle);
        } else if (data.adminPermissions?.roleTitle) {
          setAdminRoleName(data.adminPermissions.roleTitle);
        }
      }
      fetchOrganizersList();
      fetchAdminRolesList();
    } catch {
      /* silent */
    }
  }

  const fetchOrganizersList = async () => {
    try {
      const res = await fetch("/api/admin/organizers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrganizersList(data.organizers || []);
        setOrganizerApplications(data.applications || []);
      }
    } catch {
      /* silent */
    }
  };

  const fetchAdminRolesList = async () => {
    try {
      const res = await fetch("/api/admin/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminRolesList(data.adminProfiles || []);
      }
    } catch {
      /* silent */
    }
  };

  const fetchLeaguesList = async () => {
    try {
      const res = await fetch("/api/league");
      if (res.ok) {
        const data = await res.json();
        setLeaguesList(data.leagues || []);
      }
    } catch {
      /* silent */
    }
  };

  const fetchLeagueDetails = async (leagueId: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_tournament_details", token, leagueId }),
      });
      if (res.ok) {
        const data = await res.json();
        setInspectLeagueDetails({
          league: data.league,
          participants: data.participants || [],
          matches: data.matches || [],
        });
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchOrganizersList();
      fetchAdminRolesList();
      fetchLeaguesList();
    }
  }, [isAuthenticated, token, activeTab]);

  // Tournament Management Handlers
  async function handleAdminCreateTournamentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTournTitle.trim()) {
      setError("Tournament title is required");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_create_tournament",
          token,
          title: newTournTitle.trim(),
          description: newTournDesc.trim(),
          entryFeePoints: newTournEntryFee,
          prizePoolPoints: newTournPrizePool,
          maxParticipants: newTournMaxPlayers,
          format: newTournFormat,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create tournament");
      setSuccess(`Tournament '${data.league.title}' created successfully!`);
      setCreateTournamentModalOpen(false);
      setNewTournTitle("");
      setNewTournDesc("");
      fetchLeaguesList();
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tournament creation error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdminGenerateBracket(leagueId: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_generate_bracket", token, leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate bracket");
      setSuccess("Tournament bracket generated and tournament status set to ACTIVE!");
      fetchLeaguesList();
      if (selectedLeagueForInspect?.id === leagueId) {
        fetchLeagueDetails(leagueId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bracket generation error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdminAddPlayerToTournament(leagueId: string) {
    if (!manualPlayerUsername.trim()) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_add_participant", token, leagueId, username: manualPlayerUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add player");
      setSuccess(`Added player '${data.participant.username}' to tournament!`);
      setManualPlayerUsername("");
      fetchLeagueDetails(leagueId);
      fetchLeaguesList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Player add error");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdminApproveParticipant(participantId: string, leagueId: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_approve_applicant", token, participantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve applicant");
      setSuccess("Participant request approved!");
      fetchLeagueDetails(leagueId);
      fetchLeaguesList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve error");
    } finally {
      setBusy(false);
    }
  }

  function handleAdminCancelTournament(leagueId: string) {
    setConfirmModal({
      isOpen: true,
      title: "Cancel Tournament",
      description: "Are you sure you want to cancel this tournament?",
      warningNote: "All participant entry fees will be automatically refunded to their profile balances.",
      details: [{ label: "Tournament ID", value: leagueId }],
      confirmText: "Cancel Tournament",
      confirmStyle: "danger",
      onConfirm: async () => {
        setBusy(true); setError(""); setSuccess("");
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "admin_cancel_tournament", token, leagueId, reason: "Cancelled by Admin" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to cancel tournament");
          setSuccess("Tournament cancelled and entry fees refunded.");
          fetchLeaguesList();
          if (selectedLeagueForInspect?.id === leagueId) {
            fetchLeagueDetails(leagueId);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Cancel error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function handleAdminSubmitMatchWinner(matchId: string, winnerToken: string | "draw", leagueId: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_submit_match_result", token, matchId, winnerToken, disputeNotes: "Admin match result declaration" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit match result");
      setSuccess("Match result recorded!");
      fetchLeagueDetails(leagueId);
      fetchLeaguesList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match result error");
    } finally {
      setBusy(false);
    }
  }

  // Ledger Manual Entry Submit Handler
  async function handleAddLedgerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ledgerTargetToken.trim()) {
      setError("Please select or enter a target user token/username");
      return;
    }
    if (!ledgerAmount || isNaN(ledgerAmount)) {
      setError("Please enter a valid amount");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_ledger_entry",
          token,
          targetToken: ledgerTargetToken.trim(),
          type: ledgerType,
          currency: ledgerCurrency,
          amount: Number(ledgerAmount),
          reference: ledgerReference.trim(),
          reason: ledgerReason.trim() || "Manual Admin Adjustment",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add ledger entry");
      setSuccess(`Ledger entry recorded! Added ${ledgerAmount} ${ledgerCurrency} for ${data.profile.username}.`);
      setAddLedgerModalOpen(false);
      setLedgerTargetToken("");
      setLedgerReference("");
      setLedgerReason("");
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ledger error");
    } finally {
      setBusy(false);
    }
  }

  const handleOrganizerAction = async (targetUserId: string, action: "approve" | "reject" | "revoke", reason?: string) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/organizers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId, action, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Organizer action failed");
      setSuccess(data.message || `Organizer request ${action}ed successfully.`);
      fetchOrganizersList();
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed organizer action");
    } finally {
      setBusy(false);
    }
  };

  const handleInspectOrganizerApplication = async (applicationId: string) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch(`/api/admin/organizers?id=${encodeURIComponent(applicationId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to load application detail");
      setSelectedAppDetail(data);
      setIsAppDetailModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load application detail");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveOrganizerApplication = async (applicationId: string, reviewNote?: string) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/organizers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId, action: "approve", reviewNote }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Approval failed");
      setSuccess(data.message || "Organizer application approved successfully.");
      setIsAppDetailModalOpen(false);
      fetchOrganizersList();
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve application");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectOrganizerApplication = async (applicationId: string, reviewNote: string) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/organizers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId, action: "reject", reviewNote }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Rejection failed");
      setSuccess(data.message || "Organizer application rejected.");
      setIsAppDetailModalOpen(false);
      fetchOrganizersList();
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject application");
    } finally {
      setBusy(false);
    }
  };

  const handleRequestInfoOrganizerApplication = async (applicationId: string, reviewNote: string) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/organizers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId, action: "request_info", reviewNote }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Request info failed");
      setSuccess(data.message || "Additional information requested from applicant.");
      setIsAppDetailModalOpen(false);
      fetchOrganizersList();
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request more info");
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeOrganizerStatus = async (
    applicationId: string,
    reason: string,
    tournamentHandling: "reassign_to_system" | "cancel_and_refund"
  ) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/organizers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId, action: "revoke", reason, tournamentHandling }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Revocation failed");
      setSuccess(data.message || `Organizer privileges revoked.`);
      setIsAppDetailModalOpen(false);
      fetchOrganizersList();
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke organizer status");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateAdminPermissions = async (targetUserId: string, permissions: string[], isSuperAdmin: boolean) => {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId, permissions, isSuperAdmin, action: "update" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update admin permissions");
      setSuccess(data.message || "Updated admin permissions.");
      fetchAdminRolesList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed permission update");
    } finally {
      setBusy(false);
    }
  };

  // Ban or Unban User
  async function handleToggleBan(targetToken: string, currentStatus?: string) {
    const isBanned = currentStatus === "banned";
    const action = isBanned ? "unban_user" : "ban_user";
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          token,
          secret: adminSecret,
          targetToken,
          reason: isBanned ? undefined : "Admin safety action",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ban action failed");
      setSuccess(isBanned ? "User account unbanned successfully." : "User account banned successfully.");
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ban toggle error");
    } finally {
      setBusy(false);
    }
  }

  // Delete User Account
  function handleDeleteUser(targetToken: string, username: string) {
    setConfirmModal({
      isOpen: true,
      title: "Delete User Account",
      description: `Are you sure you want to PERMANENTLY delete user '${username}'?`,
      warningNote: "This action will permanently delete the user profile, session token, and account records from the system. This action cannot be undone.",
      details: [
        { label: "Username", value: username },
        { label: "User Token", value: targetToken },
      ],
      confirmText: "Delete User Account",
      confirmStyle: "danger",
      onConfirm: async () => {
        setBusy(true); setError(""); setSuccess("");
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_user", token, targetToken }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to delete user");
          setSuccess(`User '${username}' deleted successfully.`);
          refreshAdminData();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Delete user error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // Delete Tournament
  function handleDeleteTournament(leagueId: string, title: string) {
    setConfirmModal({
      isOpen: true,
      title: "Delete Tournament",
      description: `Are you sure you want to delete tournament '${title}'?`,
      warningNote: "Participant entry fees will be refunded and tournament data removed.",
      details: [
        { label: "Tournament Title", value: title },
        { label: "League ID", value: leagueId },
      ],
      confirmText: "Delete Tournament",
      confirmStyle: "danger",
      onConfirm: async () => {
        setBusy(true); setError(""); setSuccess("");
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_tournament", token, leagueId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to delete tournament");
          setSuccess(`Tournament '${title}' deleted successfully.`);
          fetchLeaguesList();
          refreshAdminData();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Delete tournament error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // Delete Admin Staff Account
  function handleDeleteAdmin(targetUserId: string, username: string) {
    setConfirmModal({
      isOpen: true,
      title: "Delete Administrator Account",
      description: `Are you sure you want to PERMANENTLY delete administrator account '${username}'?`,
      warningNote: "This action will permanently delete the admin account profile, role assignments, and active sessions. This action cannot be undone.",
      details: [
        { label: "Admin Username", value: username },
        { label: "User ID", value: targetUserId },
      ],
      confirmText: "Delete Administrator",
      confirmStyle: "danger",
      onConfirm: async () => {
        setBusy(true); setError(""); setSuccess("");
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_admin", token, targetUserId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to delete administrator account");
          setSuccess(`Admin '${username}' deleted successfully.`);
          refreshAdminData();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Delete admin error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // Delete Organizer Application / Profile
  function handleDeleteOrganizer(identifier: string, orgName: string) {
    setConfirmModal({
      isOpen: true,
      title: "Delete Organizer Record",
      description: `Are you sure you want to delete organizer record/application for '${orgName}'?`,
      warningNote: "This will remove the organizer application, KYC documentation files, and organizer profile from the database.",
      details: [
        { label: "Organizer / Entity", value: orgName },
        { label: "Application ID / Identifier", value: identifier },
      ],
      confirmText: "Delete Organizer",
      confirmStyle: "danger",
      onConfirm: async () => {
        setBusy(true); setError(""); setSuccess("");
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_organizer", token, targetIdentifier: identifier }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to delete organizer");
          setSuccess(`Organizer record '${orgName}' deleted successfully.`);
          fetchOrganizersList();
          refreshAdminData();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Delete organizer error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // Void Transaction
  function handleVoidTransaction(txId: string) {
    setConfirmModal({
      isOpen: true,
      title: "Void Transaction",
      description: `Are you sure you want to void transaction '${txId}'?`,
      warningNote: "This will mark the transaction as voided in the audit ledger.",
      details: [{ label: "Transaction ID", value: txId }],
      confirmText: "Void Transaction",
      confirmStyle: "danger",
      onConfirm: async () => {
        setBusy(true); setError(""); setSuccess("");
        try {
          const res = await fetch("/api/admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "void_transaction", token, txId, reason: "Voided by Admin" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to void transaction");
          setSuccess(`Transaction '${txId}' voided successfully.`);
          refreshAdminData();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Void transaction error");
        } finally {
          setBusy(false);
        }
      },
    });
  }

  // Adjust User Points
  async function handleAdjustPointsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pointModalUser || pointAmountInput <= 0) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_points",
          token,
          secret: adminSecret,
          targetToken: pointModalUser.token,
          amount: pointAmountInput,
          operation: pointOperation,
          reason: pointReason || `Admin ${pointOperation} points`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Point adjustment failed");
      setSuccess(`Adjusted ${pointAmountInput} Points for ${pointModalUser.username}. New balance: ${data.profile.points} Pts.`);
      setPointModalUser(null);
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Point adjustment error");
    } finally {
      setBusy(false);
    }
  }

  // Update Platform Fee & Financial Limit Settings
  async function handleUpdateSettingsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wagerFeePercentInput < 0 || wagerFeePercentInput > 50 || tournamentFeePercentInput < 0 || tournamentFeePercentInput > 50) {
      setError("Platform fee percentages must be between 0% and 50%.");
      return;
    }
    if (minDepositGhsInput < 0 || maxDepositGhsInput <= minDepositGhsInput) {
      setError("Maximum deposit limit must be greater than minimum deposit limit.");
      return;
    }
    if (minWithdrawalGhsInput < 0 || maxWithdrawalGhsInput <= minWithdrawalGhsInput) {
      setError("Maximum single withdrawal limit must be greater than minimum withdrawal limit.");
      return;
    }
    if (maxDailyWithdrawalGhsInput < maxWithdrawalGhsInput) {
      setError("Maximum 24-hour daily withdrawal limit must be at least equal to maximum single withdrawal limit.");
      return;
    }

    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          token,
          secret: adminSecret,
          wagerFeePercent: wagerFeePercentInput,
          tournamentFeePercent: tournamentFeePercentInput,
          minDepositGhs: minDepositGhsInput,
          maxDepositGhs: maxDepositGhsInput,
          minWithdrawalGhs: minWithdrawalGhsInput,
          maxWithdrawalGhs: maxWithdrawalGhsInput,
          maxDailyWithdrawalGhs: maxDailyWithdrawalGhsInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update platform settings");
      setSuccess("Platform fee and financial deposit/withdrawal limits updated successfully!");
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Settings update error");
    } finally {
      setBusy(false);
    }
  }

  // Reconcile 3 System Funds
  async function handleReconcileSystemFunds() {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconcile_funds",
          token,
          secret: adminSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "System funds reconciliation failed");
      setSuccess(`System funds audit completed! Status: ${data.report.reconciliationStatus.toUpperCase()} (Total platform assets: GH₵ ${Number(data.report.totalPlatformAssets).toFixed(2)})`);
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Funds reconciliation error");
    } finally {
      setBusy(false);
    }
  }

  // Approve or Reject Transaction
  async function handleUpdateTransactionStatus(transactionId: string, newStatus: "completed" | "failed") {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_transaction_status",
          token,
          secret: adminSecret,
          transactionId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transaction update failed");
      setSuccess(`Transaction ${transactionId.slice(0, 8)} status marked as ${newStatus}.`);
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction status error");
    } finally {
      setBusy(false);
    }
  }

  // Set Role
  async function handleSetRole(targetToken: string, newRole: Role) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "role",
          token,
          secret: adminSecret,
          targetToken,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");
      setSuccess(`Role updated to ${newRole}.`);
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update error");
    } finally {
      setBusy(false);
    }
  }

  // Create Staff
  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPasscode.trim()) {
      setError("New admin username and passcode are required.");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_admin",
          token,
          secret: adminSecret,
          newAdminUsername: newAdminUsername.trim(),
          newAdminPasscode: newAdminPasscode.trim(),
          newRole: newAdminRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");
      setSuccess(`Staff account '${data.profile.username}' created as ${data.profile.role}!`);
      setNewAdminUsername("");
      setNewAdminPasscode("");
      refreshAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Admin creation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell pb-12 min-h-screen bg-[#06261f] text-[#f5efdf]">
      {!isAuthenticated ? (
        <>
          <SharedHeader />
          <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="p-8 max-w-md w-full bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#d6a735]/10 text-[#d6a735] flex items-center justify-center mx-auto">
                <Lock size={24} />
              </div>
              <h2 className="text-lg font-bold text-[#f5efdf]">Access Restricted</h2>
              <p className="text-xs text-slate-300">
                Please sign in with an authorized account from the main navigation to access this dashboard.
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/"
                  className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* DEDICATED AUTHENTICATED ADMIN INTERFACE SHELL */
        <div className="flex flex-col min-h-screen w-full bg-[#06261f] text-[#f5efdf]">
          {/* Top Admin Navigation Header (Replaces Player Header) */}
          <header className="sticky top-0 z-40 bg-[#081c15] border-b border-[#114232] px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 shadow-md w-full">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Drawer Hamburger Button */}
              <button
                type="button"
                onClick={() => setIsMobileAdminDrawerOpen(true)}
                className="p-2 bg-[#06261f] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#114232] rounded-xl md:hidden transition-colors relative shrink-0"
                aria-label="Open Admin Menu Drawer"
              >
                <Menu size={18} />
                {(pendingOrganizersCount + openDisputesCount > 0) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                )}
              </button>

              {/* Admin Brand Logo */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6a735] text-xs font-black text-[#06261f] shadow-sm shrink-0">
                  D
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-extrabold text-[#f5efdf] tracking-wide">
                    DAMII
                  </span>
                  <span className="bg-[#d6a735]/15 text-[#d6a735] border border-[#d6a735]/30 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                    Admin
                  </span>
                  <span className="text-[#114232] hidden lg:inline">|</span>
                  <span className="text-[11px] text-[#a3b8b0] font-medium hidden lg:inline truncate">
                    Platform Control
                  </span>
                </div>
              </div>
            </div>

            {/* Top Admin Actions */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={refreshAdminData}
                disabled={busy}
                className="p-1.5 sm:px-3 sm:py-1.5 text-xs bg-[#06261f] hover:bg-[#0c3b2e] text-[#f5efdf] rounded-xl border border-[#1a5e48] font-bold flex items-center gap-1.5 transition-all shrink-0"
                title="Refresh Platform Data"
                id="admin-header-refresh-btn"
              >
                <RefreshCw size={14} className={`shrink-0 ${busy ? "animate-spin text-[#d6a735]" : "text-[#d6a735]"}`} />
                <span className="hidden md:inline">Refresh</span>
              </button>

              {/* Admin Profile Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border border-[#1a5e48] bg-[#06261f] hover:bg-[#0c3b2e] text-xs transition-colors shrink-0 focus:outline-none focus:border-[#d6a735]"
                  id="admin-profile-menu-btn"
                  title="Admin Profile & Account Options"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#d6a735] text-[#06261f] font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {(adminUsername || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left hidden sm:flex">
                    <span className="font-bold text-[#f5efdf] text-xs leading-none max-w-[120px] truncate">
                      {adminUsername || "Admin"}
                    </span>
                    <span className="text-[10px] text-[#d6a735] font-semibold leading-tight">
                      {currentRole.label}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-300 transition-transform duration-200 shrink-0 ${profileDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-24px)] rounded-xl border border-[#1a5e48] bg-[#081c15] p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-2 border-b border-[#1a5e48] mb-1.5">
                      <p className="text-xs font-bold text-[#f5efdf] truncate">{adminUsername || "Administrator"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-semibold text-[#d6a735] uppercase">{currentRole.label}</span>
                      </div>
                    </div>

                    <Link
                      href="/admin/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-[#f5efdf] hover:bg-[#0c3b2e] hover:text-[#d6a735] transition-colors"
                      id="admin-edit-profile-dropdown-link"
                    >
                      <UserCog size={15} className="text-[#d6a735] shrink-0" />
                      <span>Edit Admin Profile</span>
                    </Link>

                    <div className="h-px bg-[#1a5e48] my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold text-red-300 hover:bg-red-950/60 hover:text-red-200 transition-colors text-left"
                      id="admin-logout-dropdown-btn"
                    >
                      <LogOut size={15} className="text-red-400 shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Admin Mobile Menu Drawer Overlay */}
          {isMobileAdminDrawerOpen && (
            <>
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs md:hidden"
                onClick={() => setIsMobileAdminDrawerOpen(false)}
              />
              <div className="fixed top-0 left-0 bottom-0 z-50 w-72 max-w-[85vw] bg-[#081c15] border-r border-[#1a5e48] shadow-2xl p-4 md:hidden flex flex-col justify-between overflow-y-auto text-[#f5efdf] animate-in slide-in-from-left duration-200">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-[#1a5e48] mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6a735] text-xs font-black text-[#06261f]">
                        D
                      </span>
                      <span className="font-bold text-sm text-[#f8fafc]">DAMII Admin Drawer</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileAdminDrawerOpen(false)}
                      className="p-1 text-slate-300 hover:text-white rounded-lg"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <nav className="space-y-4">
                    {NAV_SECTIONS.map((section, i) => {
                      const visibleItems = section.items.filter((item) =>
                        hasAccess(currentRole, item.permission)
                      );
                      if (visibleItems.length === 0) return null;
                      return (
                        <div key={i}>
                          {section.title && (
                            <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              {section.title}
                            </p>
                          )}
                          <div className="space-y-1">
                            {visibleItems.map((item) => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.key;
                              const badgeVal =
                                item.badgeKey === "pendingOrganizers"
                                  ? pendingOrganizersCount
                                  : item.badgeKey === "openDisputes"
                                  ? openDisputesCount
                                  : item.badgeKey === "pendingTournamentRequests"
                                  ? (metrics?.tournamentRequests?.filter((r) => r.status === "pending").length || 0)
                                  : item.badgeKey === "pendingWithdrawals"
                                  ? (metrics?.transactions?.filter((t) => t.type === "withdrawal" && t.status === "pending").length || 0)
                                  : 0;

                              return (
                                <button
                                  key={item.key}
                                  onClick={() => {
                                    navigateToTab(item.key);
                                    setIsMobileAdminDrawerOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                                    isActive
                                      ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                                      : "text-slate-200 hover:bg-[#0c3b2e] hover:text-white"
                                  }`}
                                >
                                  <Icon size={18} className="shrink-0" />
                                  <span className="flex-1 text-left">{item.label}</span>
                                  {badgeVal > 0 && (
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                        isActive
                                          ? "bg-[#06261f] text-[#d6a735]"
                                          : "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40"
                                      }`}
                                    >
                                      {badgeVal}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </nav>
                </div>

                <div className="pt-4 border-t border-[#1a5e48] space-y-2">
                  <div className="p-2.5 bg-[#06261f] rounded-xl border border-[#1a5e48] text-xs">
                    <p className="text-[10px] text-slate-300">Logged in Admin:</p>
                    <p className="font-bold text-[#d6a735]">{adminUsername}</p>
                    <p className="text-[10px] text-slate-300 capitalize">{currentRole.label}</p>
                  </div>
                  <Link
                    href="/admin/profile"
                    onClick={() => setIsMobileAdminDrawerOpen(false)}
                    className="w-full py-2.5 bg-[#06261f] hover:bg-[#0c3b2e] border border-[#1a5e48] text-[#d6a735] text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <UserCog size={16} /> Edit Admin Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileAdminDrawerOpen(false);
                      handleLogout();
                    }}
                    className="w-full py-2.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} /> Logout Admin Session
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Main Layout Area */}
          <div className="flex flex-1 min-h-[calc(100vh-57px)] w-full overflow-hidden">
            {/* Desktop Sidebar (hidden on mobile) */}
            <aside
              className={`hidden md:flex flex-col justify-between border-r border-[#1a5e48] bg-[#081c15] transition-all duration-200 shrink-0 ${
                collapsed ? "w-16" : "w-64"
              }`}
            >
              <div>
                {/* Brand Logo Header */}
                <div className="flex items-center gap-2.5 border-b border-[#1a5e48] px-4 py-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#d6a735] text-xs font-black text-[#06261f] shadow-md">
                    D
                  </span>
                  {!collapsed && (
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Navigation
                    </span>
                  )}
                </div>

                {/* Navigation Sections */}
                <nav className="mt-3 flex flex-col gap-4 px-2">
                  {NAV_SECTIONS.map((section, i) => {
                    const visibleItems = section.items.filter((item) =>
                      hasAccess(currentRole, item.permission)
                    );
                    if (visibleItems.length === 0) return null;
                    return (
                      <div key={i}>
                        {section.title && !collapsed && (
                          <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            {section.title}
                          </p>
                        )}
                        <div className="flex flex-col gap-1">
                          {visibleItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.key;
                            const badgeVal =
                              item.badgeKey === "pendingOrganizers"
                                ? pendingOrganizersCount
                                : item.badgeKey === "openDisputes"
                                ? openDisputesCount
                                : item.badgeKey === "pendingTournamentRequests"
                                ? (metrics?.tournamentRequests?.filter((r) => r.status === "pending").length || 0)
                                : item.badgeKey === "pendingWithdrawals"
                                ? (metrics?.transactions?.filter((t) => t.type === "withdrawal" && t.status === "pending").length || 0)
                                : 0;

                            return (
                              <button
                                key={item.key}
                                onClick={() => navigateToTab(item.key)}
                                className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-xs font-bold transition-all ${
                                  isActive
                                    ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                                    : "text-slate-200 hover:bg-[#0c3b2e] hover:text-white"
                                }`}
                                title={collapsed ? item.label : undefined}
                              >
                                <Icon size={17} className="shrink-0" />
                                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                                {!collapsed && badgeVal > 0 && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                                      isActive
                                        ? "bg-[#06261f] text-[#d6a735]"
                                        : "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40"
                                    }`}
                                  >
                                    {badgeVal}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom Controls */}
              <div className="border-t border-[#1a5e48] p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl px-2 py-1.5 text-xs text-slate-200 hover:bg-[#0c3b2e] hover:text-white transition-colors"
                >
                  {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
                  {!collapsed && <span className="font-semibold">Collapse Sidebar</span>}
                </button>
              </div>
            </aside>

            {/* Main Dashboard Content Area */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6 min-w-0">
              {/* Content View Sub-Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a5e48] pb-4 w-full">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-xl font-black text-[#f5efdf] capitalize flex items-center gap-2 font-serif truncate">
                    <ShieldCheck className="text-[#d6a735] shrink-0" size={20} />
                    <span className="truncate">{activeTab.replace("_", " ")}</span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-200 truncate mt-0.5">
                    Managing as <strong className="text-[#d6a735]">{adminUsername}</strong> ({currentRole.label})
                  </p>
                </div>
              </div>

              {/* Error / Success Banners */}
              {error && (
                <p className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2 shadow-md">
                  <AlertTriangle size={16} /> {error}
                </p>
              )}
              {success && (
                <p className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2 shadow-md">
                  <CheckCircle size={16} /> {success}
                </p>
              )}

            {/* 403 Forbidden Screen or Tab Content */}
            {(() => {
              const currentTabConfig = TAB_ITEMS_CONFIG[activeTab] || {
                key: activeTab,
                label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/_/g, " "),
                permission: "system.settings.view",
                icon: ShieldAlert,
                moduleName: activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/_/g, " "),
              };
              const isTabPermitted = hasAccess(currentRole, currentTabConfig.permission);

              if (!isTabPermitted) {
                const permittedItems = NAV_SECTIONS.flatMap((s) => s.items).filter((i) =>
                  hasAccess(currentRole, i.permission)
                );
                return (
                  <div className="flex flex-col items-center justify-center min-h-[55vh] py-10 px-4 text-center max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200" id="admin-403-access-denied-view">
                    <div className="w-20 h-20 rounded-3xl bg-red-950/70 border border-red-500/40 flex items-center justify-center text-red-400 mb-6 shadow-2xl shadow-red-950/60 ring-8 ring-red-950/20">
                      <ShieldAlert size={42} className="animate-pulse" />
                    </div>

                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-widest mb-4">
                      <Ban size={13} />
                      <span>403 Forbidden • Access Denied</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-[#f5efdf] mb-2 font-serif">
                      {currentTabConfig.moduleName || "Module"} Restricted
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-300 mb-6 max-w-lg leading-relaxed">
                      Your administrator account <strong className="text-[#d6a735]">"{adminUsername || "Admin"}"</strong> ({currentRole.label}) does not have permission to view or manage this module.
                    </p>

                    <div className="w-full bg-[#081c15] border border-red-900/50 rounded-2xl p-4 sm:p-5 mb-6 text-left space-y-2.5 text-xs shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400 border-b border-[#1a5e48]/40 pb-2">
                        <span className="font-semibold text-slate-300">Attempted Route / Tab:</span>
                        <code className="text-red-300 font-mono bg-red-950/60 px-2 py-0.5 rounded border border-red-900/50">/admin?tab={activeTab}</code>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400 border-b border-[#1a5e48]/40 pb-2">
                        <span className="font-semibold text-slate-300">Required Permission:</span>
                        <code className="text-amber-300 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/50">{currentTabConfig.permission || "Restricted Action"}</code>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400">
                        <span className="font-semibold text-slate-300">Access Status:</span>
                        <span className="text-red-400 font-bold flex items-center gap-1.5">
                          <Lock size={13} /> Blocked by Role-Based Access Control (RBAC)
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => navigateToTab("overview")}
                        className="w-full sm:w-auto px-6 py-3 bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-[#d6a735]/20 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                        id="admin-403-return-overview-btn"
                      >
                        <ArrowLeft size={18} />
                        <span>Return to Overview</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const firstAllowed = permittedItems.find((i) => i.key !== activeTab);
                          navigateToTab(firstAllowed ? firstAllowed.key : "overview");
                        }}
                        className="w-full sm:w-auto px-5 py-3 bg-[#0c3b2e] hover:bg-[#1a5e48] text-slate-200 hover:text-white font-bold text-xs sm:text-sm rounded-xl border border-[#1a5e48] transition-colors cursor-pointer"
                        id="admin-403-ack-back-btn"
                      >
                        Acknowledge & Go Back
                      </button>
                    </div>

                    {permittedItems.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-[#1a5e48]/60 w-full text-left">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                          Your Permitted Modules:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {permittedItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => navigateToTab(item.key)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#081c15] hover:bg-[#0c3b2e] border border-[#1a5e48] text-xs text-slate-200 hover:text-[#d6a735] transition-all cursor-pointer font-semibold shadow-xs"
                              >
                                <Icon size={14} className="text-[#d6a735]" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <>
            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-lg space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Pending Organizers</p>
                    <p className="text-2xl font-black text-[#d6a735]">{pendingOrganizersCount}</p>
                    <p className="text-[10px] text-slate-300 font-medium">Awaiting reviewer approval</p>
                  </div>

                  <div className="p-4 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-lg space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Open Disputes</p>
                    <p className="text-2xl font-black text-amber-400">{openDisputesCount}</p>
                    <p className="text-[10px] text-slate-300 font-medium">Wager matches in dispute</p>
                  </div>

                  <div className="p-4 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-lg space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Active Tournaments</p>
                    <p className="text-2xl font-black text-cyan-400">{metrics?.leagueCount || 0}</p>
                    <p className="text-[10px] text-slate-300 font-medium">Leagues & tournament brackets</p>
                  </div>

                  <div className="p-4 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-lg space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-200">Total Registered Users</p>
                    <p className="text-2xl font-black text-[#f5efdf]">{metrics?.userCount || 0}</p>
                    <p className="text-[10px] text-slate-300 font-medium">Active Damii player profiles</p>
                  </div>
                </div>

                {/* Analytics Chart */}
                <div className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
                    <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                      <TrendingUp size={18} className="text-[#d6a735]" /> Platform Activity Trends (Last 30 Days)
                    </h3>
                    <span className="text-xs text-[#d6a735] font-semibold bg-[#0c3b2e] px-2.5 py-1 rounded-lg border border-[#d6a735]/30">
                      Live Heartbeat Analytics
                    </span>
                  </div>

                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a5e48" opacity={0.5} />
                        <XAxis dataKey="date" stroke="#cbd5e1" fontSize={11} tickLine={false} />
                        <YAxis stroke="#cbd5e1" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#081c15", borderColor: "#1a5e48", color: "#f5efdf", borderRadius: "12px" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px", color: "#e2e8f0" }} />
                        <Line type="monotone" dataKey="users" name="Active Users" stroke="#d6a735" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="transactions" name="Transactions" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Audit Trail Summary */}
                <div className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-3">
                  <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2 border-b border-[#1a5e48] pb-2">
                    <ScrollText size={18} className="text-[#d6a735]" /> Recent System Audit Events
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {metrics?.logs?.length === 0 ? (
                      <p className="text-xs text-slate-300 italic">No audit events recorded yet.</p>
                    ) : (
                      metrics?.logs?.slice(0, 5).map((log) => (
                        <div key={log.id} className="p-2.5 bg-[#06261f] border border-[#1a5e48] rounded-xl text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-[#d6a735]">{log.action}</span> by <strong className="text-[#f5efdf]">{log.adminName}</strong>
                          </div>
                          <span className="font-mono text-[10px] text-slate-300 font-semibold">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: ORGANIZERS QUEUE */}
            {activeTab === "organizers" && (
              <OrganizersTable
                applications={organizerApplications}
                legacyOrganizers={organizersList}
                busy={busy}
                onRefresh={fetchOrganizersList}
                onInspectApplication={handleInspectOrganizerApplication}
                onQuickApprove={(id) => handleApproveOrganizerApplication(id)}
                onQuickReject={(id) => handleRejectOrganizerApplication(id, "Requirements not met upon administrative review")}
                onQuickRequestInfo={(id) => handleRequestInfoOrganizerApplication(id, "Please provide updated National ID Card and proof of location documents")}
                onQuickRevoke={(id) => handleRevokeOrganizerStatus(id, "Administrative revocation", "reassign_to_system")}
                onDeleteApplication={handleDeleteOrganizer}
              />
            )}

            {/* TAB: DISPUTES & MATCHES */}
            {activeTab === "disputes" && (
              <DisputesTable
                matches={metrics?.comprehensiveMatches || []}
                onInspectMatch={(m) => setInspectMatch(m)}
                token={token}
                adminSecret={adminSecret}
                onRefresh={refreshAdminData}
              />
            )}

            {/* TAB: GAME REQUESTS & WAGER CHALLENGES */}
            {(activeTab === "game_requests" || activeTab === "tournament_requests") && (
              <GameRequestsTable
                gameRequests={metrics?.gameRequests || []}
                tournamentRequests={metrics?.tournamentRequests || []}
                token={token}
                adminSecret={adminSecret}
                onRefresh={refreshAdminData}
                busy={busy}
                onInspectRoomCode={(code) => {
                  const found = (metrics?.comprehensiveMatches || []).find((m) => m.roomCode === code || m.matchId === code);
                  if (found) {
                    setInspectMatch(found);
                  }
                }}
              />
            )}

            {/* TAB: TOURNAMENTS */}
            {activeTab === "tournaments" && (
              <TournamentsTable
                leagues={leaguesList}
                leagueStatusFilter={leagueStatusFilter}
                setLeagueStatusFilter={setLeagueStatusFilter}
                busy={busy}
                onRefresh={fetchLeaguesList}
                onCreateClick={() => setCreateTournamentModalOpen(true)}
                onInspectLeague={(l) => {
                  setSelectedLeagueForInspect(l);
                  fetchLeagueDetails(l.id);
                }}
                onGenerateBracket={handleAdminGenerateBracket}
                onCancelTournament={handleAdminCancelTournament}
                onDeleteTournament={handleDeleteTournament}
              />
            )}

            {/* TAB: GAMES CATALOG */}
            {activeTab === "games" && (
              <GamesCatalogTable
                games={metrics?.games || []}
                token={token}
                adminSecret={adminSecret}
                onRefresh={refreshAdminData}
              />
            )}

            {/* TAB: DEPOSITS */}
            {activeTab === "deposits" && (
              <DepositsTable
                transactions={metrics?.transactions || metrics?.recentTransactions || []}
                deposits={metrics?.deposits || []}
                users={metrics?.allUsers || []}
                token={token}
                adminSecret={adminSecret}
                busy={busy}
                onRefresh={refreshAdminData}
                onManualCredit={() => setAddLedgerModalOpen(true)}
              />
            )}

            {/* TAB: WITHDRAWALS & PAYOUTS */}
            {activeTab === "withdrawals" && (
              <WithdrawalsTable
                transactions={metrics?.transactions || metrics?.recentTransactions || []}
                users={metrics?.allUsers || []}
                token={token}
                adminSecret={adminSecret}
                busy={busy}
                onRefresh={refreshAdminData}
              />
            )}

            {/* TAB: WALLET & PAYOUTS / LEDGER */}
            {(activeTab === "wallet" || activeTab === "payments") && (
              <div className="space-y-6">
                <section className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1a5e48]">
                    <div>
                      <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                        <Wallet size={18} className="text-[#d6a735]" /> Financial Ledger & Balance Audit System
                      </h3>
                      <p className="text-xs text-slate-200 mt-0.5">
                        Record manual credits/debits, manage Mobile Money top-ups, wager pot escrow logs, and payout settlements.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={refreshAdminData}
                        className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] border border-[#d6a735]/30 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddLedgerModalOpen(true)}
                        className="px-3.5 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md"
                      >
                        <Plus size={15} /> ＋ Add Manual Ledger Entry
                      </button>
                    </div>
                  </div>

                  {/* Ledger Financial KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-200 tracking-wider">Total Deposit Volume</span>
                      <p className="text-xl font-black text-[#d6a735]">
                        GH₵ {(typeof metrics?.totalVolumePoints === "number" ? metrics.totalVolumePoints : (metrics?.systemFunds?.totalDeposits ?? 0)).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-300 font-medium">Mobile Money Gateway Inflow</p>
                    </div>

                    <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-200 tracking-wider">User Wallet Balances</span>
                      <p className="text-xl font-black text-emerald-400">
                        GH₵ {(metrics?.systemFunds?.totalUserAvailable ?? (metrics?.allUsers?.reduce((acc, u) => acc + (u.points || 0), 0) ?? 0)).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-300 font-medium">Active Player Balances</p>
                    </div>

                    <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-200 tracking-wider">Escrow Volume</span>
                      <p className="text-xl font-black text-cyan-400">
                        GH₵ {(metrics?.systemFunds?.totalEscrowLocked ?? (typeof metrics?.totalEscrowProcessed === "number" ? metrics.totalEscrowProcessed : 0)).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-300 font-medium">Locked in matches & leagues</p>
                    </div>

                    <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-200 tracking-wider">Total Transactions</span>
                      <p className="text-xl font-black text-[#f5efdf]">
                        {metrics?.totalTransactions ?? metrics?.ledgerEntries?.length ?? 0}
                      </p>
                      <p className="text-[10px] text-slate-300 font-medium">System ledger entries</p>
                    </div>
                  </div>

                  {/* Transactions & Double-Entry Ledger Audit Table */}
                  <LedgerTable
                    transactions={filteredTransactions}
                    ledgerEntries={metrics?.ledgerEntries || []}
                    systemFunds={metrics?.systemFunds || null}
                    chartOfAccounts={metrics?.chartOfAccounts || null}
                    treasuryDetails={metrics?.treasuryDetails || null}
                    txFilter={txFilter}
                    setTxFilter={setTxFilter}
                    busy={busy}
                    onRefresh={refreshAdminData}
                    onReconcileFunds={handleReconcileSystemFunds}
                    onAddLedgerClick={() => setAddLedgerModalOpen(true)}
                    onUpdateTransactionStatus={handleUpdateTransactionStatus}
                    onVoidTransaction={handleVoidTransaction}
                  />
                </section>
              </div>
            )}

            {/* TAB: USERS */}
            {activeTab === "users" && (
              <UsersTable
                users={filteredUsers}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
                onInspectUser={setSelectedUserForInspect}
                onAdjustBalance={setPointModalUser}
                onToggleBan={handleToggleBan}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {/* TAB: BOT FLEET MANAGEMENT */}
            {activeTab === "bots" && (
              <BotFleetManagement token={token} />
            )}

            {/* TAB: ADMIN STAFF */}
            {activeTab === "admins" && (
              <AdminStaffTable
                adminAccounts={metrics?.adminAccounts || []}
                roles={metrics?.roles || []}
                token={token}
                adminSecret={adminSecret}
                onRefresh={refreshAdminData}
                onDeleteAdmin={handleDeleteAdmin}
              />
            )}

            {/* TAB: ROLES & RBAC PERMISSIONS */}
            {activeTab === "roles" && (
              <RolesManagement
                roles={metrics?.roles || []}
                permissions={metrics?.permissions || []}
                token={token}
                adminSecret={adminSecret}
                onRefresh={refreshAdminData}
              />
            )}

            {/* TAB: GAME LIMITS & ESCROW */}
            {activeTab === "limits" && (
              <GameLimitsTable token={token} adminSecret={adminSecret} />
            )}

            {/* TAB: COMMUNICATIONS & BROADCAST */}
            {activeTab === "communications" && (
              <CommunicationsCenter
                token={token}
                adminSecret={adminSecret}
                allUsers={metrics?.allUsers || []}
                onNavigateToSettings={() => navigateToTab("settings")}
              />
            )}

            {/* TAB: AUDIT LOG */}
            {activeTab === "audit" && (
              <AuditLogsTable logs={metrics?.logs || []} />
            )}

            {/* TAB: SETTINGS & CONTROLS */}
            {activeTab === "settings" && (
              <PlatformSettings
                token={token}
                adminSecret={adminSecret}
                initialSettings={metrics?.settings || undefined}
                onSettingsUpdated={(newSettings) => {
                  setMetrics((prev) => (prev ? { ...prev, settings: newSettings } : prev));
                  refreshAdminData();
                }}
              />
            )}

            {/* TAB: LEGAL & POLICY PAGES */}
            {activeTab === "pages" && (
              <LegalPagesEditor token={token} />
            )}
                </>
              );
            })()}
          </main>
        </div>
      </div>
    )}

      {/* INSPECT ROOM MOVES MODAL */}
      {inspectRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-lg w-full rounded-2xl p-5 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                <Swords size={18} /> Inspect Move History — Room {inspectRoom.code}
              </h3>
              <button type="button" onClick={() => setInspectRoom(null)} className="text-slate-200 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p>Host: <strong className="text-[#f5efdf]">{inspectRoom.hostName}</strong></p>
              <p>Guest: <strong className="text-[#f5efdf]">{inspectRoom.guestName || "None"}</strong></p>
              <p>Wager: <strong className="text-[#d6a735]">GH₵ {inspectRoom.wagerAmount || 0}</strong></p>
              <p>Status: <strong className="uppercase text-cyan-300">{inspectRoom.status}</strong></p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs font-mono">
              {!inspectRoom.moves || inspectRoom.moves.length === 0 ? (
                <p className="text-slate-300 italic">No move entries logged for this room.</p>
              ) : (
                inspectRoom.moves.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-[#1a5e48]/50 py-1">
                    <span>Move #{idx + 1}: {m.turn || "P"} {m.from} → {m.to} {m.isCapture ? "(x Capture)" : ""}</span>
                    <span className="text-[10px] text-slate-300 font-semibold">{m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}</span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#1a5e48] flex justify-end">
              <button
                type="button"
                onClick={() => setInspectRoom(null)}
                className="px-4 py-2 bg-[#0c3b2e] text-[#f5efdf] rounded-xl text-xs font-bold border border-[#1a5e48]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST USER BALANCE MODAL */}
      {pointModalUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-md w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                <Coins size={18} /> Adjust Wallet Balance — {pointModalUser.username}
              </h3>
              <button type="button" onClick={() => setPointModalUser(null)} className="text-slate-200 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustPointsSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-200 font-semibold mb-1">Operation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPointOperation("add")}
                    className={`py-2 rounded-xl font-bold border ${
                      pointOperation === "add"
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-[#041c17] text-slate-200 border-[#1a5e48]"
                    }`}
                  >
                    + Add Funds (GH₵)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointOperation("deduct")}
                    className={`py-2 rounded-xl font-bold border ${
                      pointOperation === "deduct"
                        ? "bg-red-800 text-white border-red-700"
                        : "bg-[#041c17] text-slate-200 border-[#1a5e48]"
                    }`}
                  >
                    - Deduct Funds (GH₵)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">Amount (GH₵)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={pointAmountInput}
                  onChange={(e) => setPointAmountInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">Reason / Reference Note</label>
                <input
                  type="text"
                  value={pointReason}
                  onChange={(e) => setPointReason(e.target.value)}
                  placeholder="e.g. Tournament prize payout adjustment"
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1a5e48]">
                <button
                  type="button"
                  onClick={() => setPointModalUser(null)}
                  className="px-3 py-2 bg-[#041c17] text-slate-200 rounded-xl text-xs font-semibold hover:bg-[#0c3b2e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-[#d6a735] text-[#06261f] font-bold rounded-xl text-xs hover:bg-[#b88c24] shadow-md"
                >
                  Submit Balance Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MANUAL LEDGER ENTRY MODAL */}
      {addLedgerModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-lg w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                <Wallet size={18} /> Record Manual Financial Ledger Entry
              </h3>
              <button type="button" onClick={() => setAddLedgerModalOpen(false)} className="text-slate-200 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLedgerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-200 mb-1 font-semibold">Target User Token or Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwame_Master or token-12345"
                  value={ledgerTargetToken}
                  onChange={(e) => setLedgerTargetToken(e.target.value)}
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Transaction Type</label>
                  <select
                    value={ledgerType}
                    onChange={(e: any) => setLedgerType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="deposit">Deposit / Credit (+)</option>
                    <option value="withdrawal">Withdrawal / Debit (-)</option>
                    <option value="wager_refund">Wager Refund</option>
                    <option value="league_prize">League Prize Payout</option>
                    <option value="league_fee">League Entry Fee</option>
                    <option value="admin_adjustment">Admin Balance Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Currency</label>
                  <select
                    value={ledgerCurrency}
                    onChange={(e: any) => setLedgerCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="GHS">GH₵ (Ghana Cedis)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Amount (GH₵)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={ledgerAmount}
                    onChange={(e) => setLedgerAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Reference ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. PAY-982137 or REF-001"
                    value={ledgerReference}
                    onChange={(e) => setLedgerReference(e.target.value)}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-200 mb-1 font-semibold">Audit Reason / Description</label>
                <textarea
                  rows={2}
                  value={ledgerReason}
                  onChange={(e) => setLedgerReason(e.target.value)}
                  placeholder="State reason for accounting audit log..."
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1a5e48]">
                <button
                  type="button"
                  onClick={() => setAddLedgerModalOpen(false)}
                  className="px-3 py-2 bg-[#041c17] text-slate-200 rounded-xl text-xs hover:bg-[#0c3b2e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-[#d6a735] text-[#06261f] font-bold rounded-xl text-xs hover:bg-[#b88c24] shadow-md"
                >
                  Submit Ledger Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE TOURNAMENT MODAL */}
      {createTournamentModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-lg w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                <Trophy size={18} /> Launch New DAMII Tournament
              </h3>
              <button type="button" onClick={() => setCreateTournamentModalOpen(false)} className="text-slate-200 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdminCreateTournamentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-200 mb-1 font-semibold">Tournament Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Damii Grandmasters Cup 2026"
                  value={newTournTitle}
                  onChange={(e) => setNewTournTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div>
                <label className="block text-slate-200 mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  placeholder="Rules, venue details, and tournament information..."
                  value={newTournDesc}
                  onChange={(e) => setNewTournDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Format</label>
                  <select
                    value={newTournFormat}
                    onChange={(e: any) => setNewTournFormat(e.target.value)}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="swiss">Swiss System</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Max Players</label>
                  <select
                    value={newTournMaxPlayers}
                    onChange={(e: any) => setNewTournMaxPlayers(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value={4}>4 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={16}>16 Players</option>
                    <option value={32}>32 Players</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Entry Fee (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    value={newTournEntryFee}
                    onChange={(e) => setNewTournEntryFee(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>

                <div>
                  <label className="block text-slate-200 mb-1 font-semibold">Prize Pool (GH₵)</label>
                  <input
                    type="number"
                    min={0}
                    value={newTournPrizePool}
                    onChange={(e) => setNewTournPrizePool(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#1a5e48]">
                <button
                  type="button"
                  onClick={() => setCreateTournamentModalOpen(false)}
                  className="px-3 py-2 bg-[#041c17] text-slate-200 rounded-xl text-xs hover:bg-[#0c3b2e]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-[#d6a735] text-[#06261f] font-bold rounded-xl text-xs hover:bg-[#b88c24] shadow-md"
                >
                  Launch Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOURNAMENT INSPECTOR & WATCH CENTER MODAL */}
      {selectedLeagueForInspect && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-3xl w-full max-h-[90vh] flex flex-col rounded-2xl p-5 space-y-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[#d6a735] flex items-center gap-2">
                    <Trophy size={18} /> {selectedLeagueForInspect.title}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-500/40">
                    {selectedLeagueForInspect.status}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-0.5">
                  Format: <span className="uppercase text-cyan-300 font-bold">{selectedLeagueForInspect.format || "Single Elim"}</span> | Organized by: <strong className="text-[#f5efdf]">{selectedLeagueForInspect.facilitatorName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedLeagueForInspect(null);
                  setInspectLeagueDetails(null);
                }}
                className="text-slate-200 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Inspector Modal Tabs */}
            <div className="flex border-b border-[#1a5e48] gap-2 text-xs">
              <button
                type="button"
                onClick={() => setInspectLeagueTab("overview")}
                className={`px-3 py-1.5 font-bold rounded-t-lg transition-all ${
                  inspectLeagueTab === "overview"
                    ? "bg-[#041c17] text-[#d6a735] border-t border-x border-[#1a5e48]"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Overview &amp; Settings
              </button>
              <button
                type="button"
                onClick={() => setInspectLeagueTab("roster")}
                className={`px-3 py-1.5 font-bold rounded-t-lg transition-all ${
                  inspectLeagueTab === "roster"
                    ? "bg-[#041c17] text-[#d6a735] border-t border-x border-[#1a5e48]"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Participants Roster ({inspectLeagueDetails?.participants.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setInspectLeagueTab("matches")}
                className={`px-3 py-1.5 font-bold rounded-t-lg transition-all ${
                  inspectLeagueTab === "matches"
                    ? "bg-[#041c17] text-[#d6a735] border-t border-x border-[#1a5e48]"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                Matches &amp; Watch Arena ({inspectLeagueDetails?.matches.length || 0})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* TAB 1: OVERVIEW */}
              {inspectLeagueTab === "overview" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl">
                      <span className="text-[10px] text-slate-200 uppercase font-bold">Entry Fee</span>
                      <p className="text-sm font-bold text-[#d6a735]">{selectedLeagueForInspect.entryFeePoints || 0} Pts</p>
                    </div>
                    <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl">
                      <span className="text-[10px] text-slate-200 uppercase font-bold">Prize Pool</span>
                      <p className="text-sm font-bold text-emerald-400">{selectedLeagueForInspect.prizePoolPoints || 0} Pts</p>
                    </div>
                    <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl">
                      <span className="text-[10px] text-slate-200 uppercase font-bold">Max Capacity</span>
                      <p className="text-sm font-bold text-[#f5efdf]">{selectedLeagueForInspect.maxParticipants || 8} Players</p>
                    </div>
                    <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl">
                      <span className="text-[10px] text-slate-200 uppercase font-bold">Turn Clock</span>
                      <p className="text-sm font-bold text-cyan-300">{selectedLeagueForInspect.turnTimerSeconds || 60} Seconds</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-1">
                    <span className="text-[10px] text-slate-200 uppercase font-bold">Tournament Description</span>
                    <p className="text-[#f8fafc] leading-relaxed">
                      {selectedLeagueForInspect.description || "Official DAMII Tournament League under standard 10x10 compulsory jump rules."}
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                    <span className="text-[10px] text-slate-200 uppercase font-bold">Admin Control Actions</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedLeagueForInspect.status === "registration" && (
                        <button
                          type="button"
                          onClick={() => handleAdminGenerateBracket(selectedLeagueForInspect.id)}
                          disabled={busy}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md"
                        >
                          <Play size={13} /> Generate Bracket &amp; Launch
                        </button>
                      )}
                      {selectedLeagueForInspect.status !== "cancelled" && selectedLeagueForInspect.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() => handleAdminCancelTournament(selectedLeagueForInspect.id)}
                          disabled={busy}
                          className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md"
                        >
                          <Ban size={13} /> Cancel Tournament &amp; Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROSTER & ADD PLAYER */}
              {inspectLeagueTab === "roster" && (
                <div className="space-y-4">
                  {/* Add Player Box */}
                  <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-[#d6a735] uppercase">Add Player to Roster Manually</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type player username (e.g. Kwame_Master)..."
                        value={manualPlayerUsername}
                        onChange={(e) => setManualPlayerUsername(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-[#f8fafc] placeholder-slate-400 focus:outline-none focus:border-[#d6a735]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAdminAddPlayerToTournament(selectedLeagueForInspect.id)}
                        disabled={busy}
                        className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-lg text-xs"
                      >
                        ＋ Add Player
                      </button>
                    </div>
                  </div>

                  {/* Participants List */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#1a5e48] text-slate-200 uppercase font-bold bg-[#041d17]">
                          <th className="py-2 px-3">Seed</th>
                          <th className="py-2 px-3">Player Username</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Check-in</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#114232]">
                        {!inspectLeagueDetails?.participants || inspectLeagueDetails.participants.length === 0 ? (
                          <tr><td colSpan={5} className="py-6 text-center text-slate-300 italic">No participants in roster yet.</td></tr>
                        ) : (
                          inspectLeagueDetails.participants.map((p: any) => (
                            <tr key={p.id} className="hover:bg-[#0c3b2e]/50">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#d6a735]">#{p.seed || 1}</td>
                              <td className="py-2.5 px-3 font-bold text-[#f8fafc]">{p.username}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.status === "approved" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "bg-amber-950 text-amber-300 border border-amber-500/40"
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-cyan-300">
                                {p.checkedIn ? "Checked In" : "Pending"}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {p.status === "pending" && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdminApproveParticipant(p.id, selectedLeagueForInspect.id)}
                                    disabled={busy}
                                    className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px]"
                                  >
                                    Approve
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: MATCHES & WATCH ARENA ("WATCH OVER THEM") */}
              {inspectLeagueTab === "matches" && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-[#f5efdf] text-xs">Live Tournament Bracket & Matches</h4>
                      <p className="text-[11px] text-slate-200">Spectate active games in real time or force-declare official match results.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {!inspectLeagueDetails?.matches || inspectLeagueDetails.matches.length === 0 ? (
                      <div className="p-6 text-center text-slate-300 italic bg-[#041c17] border border-[#1a5e48] rounded-xl">
                        Bracket matches have not been generated yet. Go to Overview and click "Generate Bracket".
                      </div>
                    ) : (
                      inspectLeagueDetails.matches.map((m: any, idx: number) => (
                        <div key={m.id || idx} className="p-3.5 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs border-b border-[#1a5e48] pb-2">
                            <span className="font-bold uppercase text-[#d6a735]">
                              Round {m.round || 1} — Match #{idx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              {((m.player1Score || 0) + (m.player2Score || 0) > 0 || m.disputeNotes?.includes("Tiebreaker")) && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-500/50 flex items-center gap-1 animate-pulse">
                                  <Zap size={10} className="text-[#d6a735]" /> Sudden Death Tiebreaker (Game #{((m.player1Score || 0) + (m.player2Score || 0)) + 1})
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                m.status === "completed" ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40" : m.status === "in_progress" ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40 animate-pulse" : "bg-slate-800 text-slate-300"
                              }`}>
                                {m.status || "pending"}
                              </span>
                            </div>
                          </div>

                          {m.disputeNotes && (
                            <div className="p-2 bg-amber-950/40 border border-amber-800/40 rounded-lg text-[11px] text-amber-200 font-mono">
                              <strong>Audit Note:</strong> {m.disputeNotes}
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3 my-2">
                            <div className="flex-1 text-left p-2 bg-[#081c15] border border-[#1a5e48] rounded-lg">
                              <p className="text-[10px] text-slate-300 font-semibold">Player 1 (White)</p>
                              <p className="font-bold text-[#f8fafc] text-sm">{m.player1Name || m.player1Token || "TBD"}</p>
                              {m.winnerToken === m.player1Token && m.status === "completed" && (
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">★ WINNER</span>
                              )}
                            </div>

                            <span className="font-black text-sm text-[#d6a735]">VS</span>

                            <div className="flex-1 text-right p-2 bg-[#081c15] border border-[#1a5e48] rounded-lg">
                              <p className="text-[10px] text-slate-300 font-semibold">Player 2 (Black)</p>
                              <p className="font-bold text-[#f8fafc] text-sm">{m.player2Name || m.player2Token || "TBD"}</p>
                              {m.winnerToken === m.player2Token && m.status === "completed" && (
                                <span className="text-[10px] font-bold text-emerald-400 uppercase">★ WINNER</span>
                              )}
                            </div>
                          </div>

                          {/* Match Control & Spectate Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1a5e48]">
                            <button
                              type="button"
                              onClick={() => setSpectateMatch(m)}
                              className="px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold text-xs rounded-lg border border-[#d6a735]/40 flex items-center gap-1 shadow-xs"
                            >
                              <Eye size={12} /> Watch / Spectate Match Arena
                            </button>

                            {m.status !== "completed" && m.player1Token && m.player2Token && (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="text-slate-200 font-semibold">Force Winner:</span>
                                <button
                                  type="button"
                                  onClick={() => handleAdminSubmitMatchWinner(m.id, m.player1Token, selectedLeagueForInspect.id)}
                                  className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded"
                                >
                                  P1 Win
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdminSubmitMatchWinner(m.id, m.player2Token, selectedLeagueForInspect.id)}
                                  className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded"
                                >
                                  P2 Win
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAdminSubmitMatchWinner(m.id, "draw", selectedLeagueForInspect.id)}
                                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded"
                                >
                                  Draw
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#1a5e48] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedLeagueForInspect(null);
                  setInspectLeagueDetails(null);
                }}
                className="px-4 py-2 bg-[#0c3b2e] text-[#f5efdf] rounded-xl text-xs font-bold border border-[#1a5e48]"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE MATCH SPECTATOR MODAL */}
      {spectateMatch && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-xl w-full rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                  <Eye size={18} /> Spectate Live Match Arena — {spectateMatch.id || "Match"}
                </h3>
                <p className="text-xs text-slate-200 mt-0.5">
                  {spectateMatch.player1Name || "P1"} vs {spectateMatch.player2Name || "P2"}
                </p>
              </div>
              <button type="button" onClick={() => setSpectateMatch(null)} className="text-slate-200 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-center font-bold">
                <div className="p-2 bg-[#081c15] rounded-lg border border-[#1a5e48]">
                  <p className="text-[10px] text-slate-300 font-semibold">WHITE PLAYER</p>
                  <p className="text-[#f8fafc]">{spectateMatch.player1Name || "P1"}</p>
                </div>
                <div className="p-2 bg-[#081c15] rounded-lg border border-[#1a5e48]">
                  <p className="text-[10px] text-slate-300 font-semibold">BLACK PLAYER</p>
                  <p className="text-[#f8fafc]">{spectateMatch.player2Name || "P2"}</p>
                </div>
              </div>

              <div className="p-3 bg-[#081c15] border border-[#1a5e48] rounded-lg space-y-1">
                <p className="font-bold text-[#d6a735]">Match Status: <span className="uppercase text-cyan-300">{spectateMatch.status || "in_progress"}</span></p>
                <p className="text-slate-200">Winner: <strong className="text-[#f8fafc]">{spectateMatch.winnerToken || "Match in progress..."}</strong></p>
              </div>

              {spectateMatch.roomCode && (
                <a
                  href={`/arena?code=${spectateMatch.roomCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md"
                >
                  <ExternalLink size={14} /> Open Live Interactive Arena in New Tab
                </a>
              )}
            </div>

            <div className="pt-2 border-t border-[#1a5e48] flex justify-end">
              <button
                type="button"
                onClick={() => setSpectateMatch(null)}
                className="px-4 py-2 bg-[#0c3b2e] text-[#f5efdf] rounded-xl text-xs font-bold border border-[#1a5e48]"
              >
                Close Spectator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME & DISPUTE DETAIL INSPECTOR MODAL */}
      {inspectMatch && (
        <GameDetailModal
          match={inspectMatch}
          onClose={() => setInspectMatch(null)}
          token={token}
          adminSecret={adminSecret}
          onRefresh={refreshAdminData}
        />
      )}

      {/* USER DETAIL INSPECTOR MODAL */}
      {selectedUserForInspect && (
        <UserDetailModal
          userToken={selectedUserForInspect.token}
          adminToken={token}
          onClose={() => setSelectedUserForInspect(null)}
          onRefreshParent={refreshAdminData}
          showToast={(msg, type) => {
            if (type === "error") setError(msg);
            else setSuccess(msg);
          }}
        />
      )}

      {/* ORGANIZER APPLICATION DETAIL INSPECTOR MODAL */}
      <OrganizerApplicationDetailModal
        isOpen={isAppDetailModalOpen}
        onClose={() => setIsAppDetailModalOpen(false)}
        detail={selectedAppDetail}
        busy={busy}
        onApprove={handleApproveOrganizerApplication}
        onReject={handleRejectOrganizerApplication}
        onRequestInfo={handleRequestInfoOrganizerApplication}
        onRevoke={handleRevokeOrganizerStatus}
        onDelete={async (appId) => {
          setIsAppDetailModalOpen(false);
          handleDeleteOrganizer(appId, selectedAppDetail?.application.organizationName || selectedAppDetail?.applicant?.username || appId);
        }}
      />

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          description={confirmModal.description}
          warningNote={confirmModal.warningNote}
          details={confirmModal.details}
          confirmText={confirmModal.confirmText}
          confirmStyle={confirmModal.confirmStyle}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
    </main>
  );
}
