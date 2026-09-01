"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bot,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Coins,
  Trophy,
  TrendingUp,
  TrendingDown,
  Settings,
  Edit2,
  PlayCircle,
  PauseCircle,
  PlusCircle,
  X,
  Sliders,
  DollarSign,
  UserCheck,
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  History,
  BookOpen,
  Receipt,
  FileText,
  UserPlus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sparkles,
  PieChart,
  Activity,
  Award,
  CreditCard,
  Loader2,
  ShieldCheck,
  Lock,
  CheckCircle,
} from "lucide-react";
import type { BotAccountConfig, BotFleetSettings } from "@/lib/bot-service";
import type { LedgerEntry, Profile, Transaction, FormalLedgerAuditReport, FleetLedgerAuditReport } from "@/lib/types";

interface BotFleetManagementProps {
  token: string;
}

interface BotDetailData {
  bot: BotAccountConfig;
  profile: Profile | null;
  matchHistory: Array<{
    roomCode: string;
    mode: string;
    wagerAmount: number;
    opponentName: string;
    opponentToken?: string;
    isHost: boolean;
    result: "win" | "loss" | "draw" | "pending" | "cancelled";
    winner?: string | null;
    profitDelta: number;
    moveCount: number;
    status: string;
    playedAt: string;
  }>;
  ledgerEntries: LedgerEntry[];
  transactions: Transaction[];
  assessment: {
    verdict: string;
    recommendation: string;
    healthClass: string;
    reason: string;
  };
}

export const BotFleetManagement: React.FC<BotFleetManagementProps> = ({ token }) => {
  const [bots, setBots] = useState<BotAccountConfig[]>([]);
  const [metrics, setMetrics] = useState<{
    totalBots: number;
    activeBots: number;
    pausedBots: number;
    retiredBots?: number;
    totalBankrollPoints: number;
    totalBankrollMarbles: number;
    totalCapitalFunded: number;
    totalCapitalWithdrawn: number;
    totalNetProfit: number;
    profitableBotsCount: number;
    lossMakingBotsCount: number;
    fleetWinRate: number;
    totalMatches: number;
    avgRating: number;
  } | null>(null);
  const [settings, setSettings] = useState<BotFleetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters, search & sorting
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [profitFilter, setProfitFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"profit_desc" | "profit_asc" | "win_rate" | "balance" | "rating" | "games">("profit_desc");

  // Modals & action states
  const [selectedBotDetail, setSelectedBotDetail] = useState<BotDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<"overview" | "matches" | "ledger" | "transactions" | "config" | "audit">("overview");

  // Formal Ledger Verification & Audit states
  const [botAuditReport, setBotAuditReport] = useState<FormalLedgerAuditReport | null>(null);
  const [botAuditLoading, setBotAuditLoading] = useState(false);
  const [fleetAuditReport, setFleetAuditReport] = useState<FleetLedgerAuditReport | null>(null);
  const [showFleetAuditModal, setShowFleetAuditModal] = useState(false);
  const [fleetAuditLoading, setFleetAuditLoading] = useState(false);
  const [fleetAuditSearch, setFleetAuditSearch] = useState("");

  // Create Bot Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createRegion, setCreateRegion] = useState("Greater Accra");
  const [createRating, setCreateRating] = useState(1950);
  const [createTier, setCreateTier] = useState<"adaptive" | "hard" | "expert" | "master" | "medium" | "easy">("adaptive");
  const [createPlayStyle, setCreatePlayStyle] = useState<"balanced" | "aggressive" | "positional" | "trapping" | "blitz">("balanced");
  const [createInitialPoints, setCreateInitialPoints] = useState(200);
  const [createInitialMarbles, setCreateInitialMarbles] = useState(200);
  const [createMaxWager, setCreateMaxWager] = useState(100);
  const [createDailyWagerLimit, setCreateDailyWagerLimit] = useState(500);
  const [createDailyLossLimit, setCreateDailyLossLimit] = useState(250);
  const [createStatus, setCreateStatus] = useState<"active" | "paused">("active");

  // Fund / Withdraw Single Bot Modal
  const [fundModalBot, setFundModalBot] = useState<BotAccountConfig | null>(null);
  const [fundActionType, setFundActionType] = useState<"fund" | "withdraw">("fund");
  const [fundAmountPoints, setFundAmountPoints] = useState<number>(100);
  const [fundAmountMarbles, setFundAmountMarbles] = useState<number>(100);
  const [fundNote, setFundNote] = useState<string>("");
  const [adminBillingEmail, setAdminBillingEmail] = useState<string>("admin@damii.game");
  const [paystackLoading, setPaystackLoading] = useState<boolean>(false);
  const [paystackPendingRef, setPaystackPendingRef] = useState<string | null>(null);
  const [paystackAuthUrl, setPaystackAuthUrl] = useState<string | null>(null);
  const [manualVerifyRef, setManualVerifyRef] = useState<string>("");
  const [showManualVerify, setShowManualVerify] = useState<boolean>(false);

  // Edit Bot Parameters Modal
  const [editingBot, setEditingBot] = useState<BotAccountConfig | null>(null);
  const [editFullName, setEditFullName] = useState<string>("");
  const [editUsername, setEditUsername] = useState<string>("");
  const [editRegion, setEditRegion] = useState<string>("Greater Accra");
  const [editRating, setEditRating] = useState<number>(1950);
  const [editTier, setEditTier] = useState<any>("adaptive");
  const [editPlayStyle, setEditPlayStyle] = useState<any>("balanced");
  const [editMaxWager, setEditMaxWager] = useState<number>(100);
  const [editDailyWagerLimit, setEditDailyWagerLimit] = useState<number>(500);
  const [editDailyLossLimit, setEditDailyLossLimit] = useState<number>(250);
  const [editStatus, setEditStatus] = useState<any>("active");

  // Bulk funding modal
  const [bulkPoints, setBulkPoints] = useState<number>(100);
  const [bulkMarbles, setBulkMarbles] = useState<number>(100);
  const [bulkTier, setBulkTier] = useState<string>("all");
  const [bulkNote, setBulkNote] = useState<string>("");
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPaystackLoading, setBulkPaystackLoading] = useState<boolean>(false);
  const [bulkPaystackPendingRef, setBulkPaystackPendingRef] = useState<string | null>(null);
  const [bulkPaystackAuthUrl, setBulkPaystackAuthUrl] = useState<string | null>(null);
  const [bulkManualVerifyRef, setBulkManualVerifyRef] = useState<string>("");
  const [bulkShowManualVerify, setBulkShowManualVerify] = useState<boolean>(false);

  const matchingBotsCount = useMemo(() => {
    if (!bots || bots.length === 0) return 0;
    return bots.filter((b) => {
      if (b.status === "retired") return false;
      if (bulkTier === "all") return true;
      return b.difficultyTier === bulkTier;
    }).length;
  }, [bots, bulkTier]);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchBotFleet = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_bot_fleet",
          token,
          search: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          tier: tierFilter !== "all" ? tierFilter : undefined,
          profitability: profitFilter !== "all" ? profitFilter : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBots(data.bots || []);
        setMetrics(data.metrics || null);
        setSettings(data.settings || null);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to load bot fleet." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Network error loading bots." });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, search, statusFilter, tierFilter, profitFilter]);

  useEffect(() => {
    fetchBotFleet();
  }, [fetchBotFleet]);

  const handleVerifyBotLedger = async (botToken: string) => {
    try {
      setBotAuditLoading(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_bot_ledger",
          token,
          botToken,
        }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setBotAuditReport(data.report);
      } else {
        setFeedback({ type: "error", message: data.error || "Formal ledger verification failed." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error running formal ledger verification." });
    } finally {
      setBotAuditLoading(false);
    }
  };

  const handleVerifyFleetLedgers = async () => {
    try {
      setFleetAuditLoading(true);
      setShowFleetAuditModal(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_fleet_ledgers",
          token,
        }),
      });
      const data = await res.json();
      if (data.success && data.fleetReport) {
        setFleetAuditReport(data.fleetReport);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed running fleet ledger audit." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error auditing fleet ledgers." });
    } finally {
      setFleetAuditLoading(false);
    }
  };

  const loadBotDetail = async (botToken: string) => {
    try {
      setLoadingDetail(true);
      setBotAuditReport(null);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_bot_detail",
          token,
          botToken,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedBotDetail(data);
        setDetailActiveTab("overview");
        handleVerifyBotLedger(botToken);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to load bot details." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error fetching bot details." });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<BotFleetSettings>) => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_settings",
          token,
          settings: updates,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setFeedback({ type: "success", message: "Bot fleet settings updated." });
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to update settings." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error updating settings." });
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFullName.trim() || !createUsername.trim()) {
      setFeedback({ type: "error", message: "Full Name and Gamer Tag are required." });
      return;
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_bot_account",
          token,
          botData: {
            fullName: createFullName.trim(),
            username: createUsername.trim(),
            region: createRegion,
            rating: createRating,
            difficultyTier: createTier,
            playStyle: createPlayStyle,
            initialBankrollPoints: createInitialPoints,
            initialBankrollMarbles: createInitialMarbles,
            maxWagerPoints: createMaxWager,
            dailyWagerLimitPoints: createDailyWagerLimit,
            dailyLossLimitPoints: createDailyLossLimit,
            status: createStatus,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Created mechanic "${createFullName}" with initial ledger bankroll allocation of GH₵ ${createInitialPoints}!`,
        });
        setShowCreateModal(false);
        // Reset form
        setCreateFullName("");
        setCreateUsername("");
        setCreateInitialPoints(200);
        setCreateInitialMarbles(200);
        setCreateDailyWagerLimit(500);
        setCreateDailyLossLimit(250);
        fetchBotFleet();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to create mechanic." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error creating mechanic." });
    }
  };

  const handleFundOrWithdrawBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundModalBot) return;

    if (fundActionType === "fund") {
      // Must initiate Paystack checkout flow
      await handleInitiatePaystackFunding();
      return;
    }

    // Reclaim to treasury
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw_bot_bankroll",
          token,
          botToken: fundModalBot.token,
          points: fundAmountPoints,
          note: fundNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Reclaimed GH₵ ${fundAmountPoints} (+ledger entry) from ${fundModalBot.fullName || fundModalBot.username} to Treasury.`,
        });
        setFundModalBot(null);
        fetchBotFleet();
        if (selectedBotDetail && selectedBotDetail.bot.token === fundModalBot.token) {
          loadBotDetail(fundModalBot.token);
        }
      } else {
        setFeedback({ type: "error", message: data.error || "Failed bankroll operation." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error performing bankroll transaction." });
    }
  };

  const handleInitiatePaystackFunding = async () => {
    if (!fundModalBot || fundAmountPoints <= 0) return;
    try {
      setPaystackLoading(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "init_bot_paystack_funding",
          token,
          botToken: fundModalBot.token,
          amountGhs: fundAmountPoints,
          email: adminBillingEmail || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.reference) {
        setPaystackPendingRef(data.reference);
        setPaystackAuthUrl(data.authorizationUrl || null);
        if (data.authorizationUrl) {
          window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to initialize Paystack checkout." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error initializing Paystack funding." });
    } finally {
      setPaystackLoading(false);
    }
  };

  const handleVerifyPaystackFunding = async (refToVerify?: string) => {
    const targetRef = refToVerify || paystackPendingRef || manualVerifyRef;
    if (!targetRef) return;
    try {
      setPaystackLoading(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_bot_paystack_funding",
          token,
          reference: targetRef.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Successfully funded mechanic via Paystack payment (${targetRef})!`,
        });
        setFundModalBot(null);
        setPaystackPendingRef(null);
        setPaystackAuthUrl(null);
        setManualVerifyRef("");
        setShowManualVerify(false);
        fetchBotFleet();
        if (selectedBotDetail && fundModalBot && selectedBotDetail.bot.token === fundModalBot.token) {
          loadBotDetail(fundModalBot.token);
        }
      } else {
        setFeedback({ type: "error", message: data.error || "Payment verification failed." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error verifying Paystack funding." });
    } finally {
      setPaystackLoading(false);
    }
  };

  const handleInitiateBulkPaystackFunding = async () => {
    if (bulkPoints <= 0) return;
    try {
      setBulkPaystackLoading(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "init_bulk_bot_paystack_funding",
          token,
          amountPerBot: bulkPoints,
          tier: bulkTier !== "all" ? bulkTier : undefined,
          email: adminBillingEmail || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.reference) {
        setBulkPaystackPendingRef(data.reference);
        setBulkPaystackAuthUrl(data.authorizationUrl || null);
        if (data.authorizationUrl) {
          window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to initialize bulk Paystack checkout." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error initializing bulk Paystack funding." });
    } finally {
      setBulkPaystackLoading(false);
    }
  };

  const handleVerifyBulkPaystackFunding = async (refToVerify?: string) => {
    const targetRef = refToVerify || bulkPaystackPendingRef || bulkManualVerifyRef;
    if (!targetRef) return;
    try {
      setBulkPaystackLoading(true);
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_bulk_bot_paystack_funding",
          token,
          reference: targetRef.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Successfully bulk-funded fleet mechanics via Paystack (${targetRef})!`,
        });
        setShowBulkModal(false);
        setBulkPaystackPendingRef(null);
        setBulkPaystackAuthUrl(null);
        setBulkManualVerifyRef("");
        setBulkShowManualVerify(false);
        fetchBotFleet();
      } else {
        setFeedback({ type: "error", message: data.error || "Bulk payment verification failed." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error verifying bulk Paystack funding." });
    } finally {
      setBulkPaystackLoading(false);
    }
  };

  const handleSaveBotParams = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBot) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_account",
          token,
          botToken: editingBot.token,
          updates: {
            fullName: editFullName.trim() || editingBot.fullName,
            username: editUsername.trim() || editingBot.username,
            region: editRegion,
            rating: editRating,
            difficultyTier: editTier,
            playStyle: editPlayStyle,
            maxWagerPoints: editMaxWager,
            dailyWagerLimitPoints: editDailyWagerLimit,
            dailyLossLimitPoints: editDailyLossLimit,
            status: editStatus,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Updated configuration for ${editFullName || editingBot.fullName}.` });
        setEditingBot(null);
        fetchBotFleet();
        if (selectedBotDetail && selectedBotDetail.bot.token === editingBot.token) {
          loadBotDetail(editingBot.token);
        }
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to update mechanic parameters." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error saving mechanic parameters." });
    }
  };

  const handleToggleBotStatus = async (bot: BotAccountConfig) => {
    const nextStatus = bot.status === "paused" ? "active" : "paused";
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_bot_account",
          token,
          botToken: bot.token,
          updates: { status: nextStatus },
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBotFleet();
        if (selectedBotDetail && selectedBotDetail.bot.token === bot.token) {
          loadBotDetail(bot.token);
        }
      }
    } catch {}
  };

  const handleDeleteBot = async (bot: BotAccountConfig) => {
    if (!confirm(`Are you sure you want to ${bot.isCustom ? "delete" : "retire"} bot "${bot.fullName || bot.username}"?`)) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_bot_account",
          token,
          botToken: bot.token,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `Bot ${bot.fullName || bot.username} removed/retired.` });
        if (selectedBotDetail?.bot.token === bot.token) {
          setSelectedBotDetail(null);
        }
        fetchBotFleet();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error deleting bot." });
    }
  };

  const handleBulkFund = async () => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_fund_bots",
          token,
          points: bulkPoints,
          marbles: bulkMarbles,
          tier: bulkTier !== "all" ? bulkTier : undefined,
          note: bulkNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: "success",
          message: `Allocated bankroll with double-entry ledger records to ${data.count} bots (+GH₵ ${bulkPoints} pts each).`,
        });
        setShowBulkModal(false);
        fetchBotFleet();
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to bulk fund bots." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error bulk funding bots." });
    }
  };

  const handleResetFleet = async () => {
    if (!confirm("Are you sure you want to reset all bot accounts to default seed configurations?")) return;
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_bot_fleet", token }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: "Bot fleet reset to default seeded configurations." });
        fetchBotFleet();
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Error resetting fleet." });
    }
  };

  const openEditModal = (bot: BotAccountConfig) => {
    setEditingBot(bot);
    setEditFullName(bot.fullName || "");
    setEditUsername(bot.username || "");
    setEditRegion(bot.region || "Greater Accra");
    setEditRating(bot.rating || 1950);
    setEditTier(bot.difficultyTier || "adaptive");
    setEditPlayStyle(bot.playStyle || "balanced");
    setEditMaxWager(bot.maxWagerPoints || 100);
    setEditDailyWagerLimit(bot.dailyWagerLimitPoints || 500);
    setEditDailyLossLimit(bot.dailyLossLimitPoints || 250);
    setEditStatus(bot.status === "paused" ? "paused" : "active");
  };

  const openFundModal = (bot: BotAccountConfig, actionType: "fund" | "withdraw") => {
    setFundModalBot(bot);
    setFundActionType(actionType);
    setFundAmountPoints(actionType === "fund" ? 100 : Math.min(100, bot.bankrollPoints || 0));
    setFundAmountMarbles(100);
    setFundNote("");
  };

  const getRankBadge = (rating: number) => {
    if (rating >= 2200) return { label: "Grandmaster", color: "bg-purple-900/60 text-purple-200 border-purple-700" };
    if (rating >= 2000) return { label: "Master", color: "bg-amber-900/60 text-amber-200 border-amber-700" };
    if (rating >= 1800) return { label: "Diamond", color: "bg-cyan-900/60 text-cyan-200 border-cyan-700" };
    if (rating >= 1600) return { label: "Gold", color: "bg-yellow-900/60 text-yellow-200 border-yellow-700" };
    return { label: "Silver", color: "bg-slate-800 text-slate-300 border-slate-700" };
  };

  // Sort bots
  const sortedBots = useMemo(() => {
    const list = [...bots];
    switch (sortBy) {
      case "profit_desc":
        return list.sort((a, b) => (b.netProfit || 0) - (a.netProfit || 0));
      case "profit_asc":
        return list.sort((a, b) => (a.netProfit || 0) - (b.netProfit || 0));
      case "win_rate":
        return list.sort((a, b) => (b.winPercentage || 0) - (a.winPercentage || 0));
      case "balance":
        return list.sort((a, b) => (b.bankrollPoints || 0) - (a.bankrollPoints || 0));
      case "rating":
        return list.sort((a, b) => b.rating - a.rating);
      case "games":
        return list.sort((a, b) => (b.gamesPlayed || 0) - (a.gamesPlayed || 0));
      default:
        return list;
    }
  }, [bots, sortBy]);

  return (
    <div className="space-y-6" id="admin-bot-fleet-management">
      {/* Top Banner / Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm border ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-200"
              : "bg-red-950/60 border-red-800/80 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Fleet P&L & Bankroll Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Fleet Size</span>
            <Bot className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.totalBots ?? bots.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1">{metrics?.activeBots ?? 0} Active in Queue</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Total Capital Given</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300">
            GH₵ {(metrics?.totalCapitalFunded ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Reclaimed: GH₵ {(metrics?.totalCapitalWithdrawn ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Liquid Bankroll</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">
            GH₵ {(metrics?.totalBankrollPoints ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">{(metrics?.totalBankrollMarbles ?? 0).toLocaleString()} marbles</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Net Fleet Profit/Loss</span>
            {(metrics?.totalNetProfit ?? 0) >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
          <div
            className={`text-2xl font-bold font-mono ${
              (metrics?.totalNetProfit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {(metrics?.totalNetProfit ?? 0) >= 0 ? "+" : ""}
            GH₵ {(metrics?.totalNetProfit ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {metrics?.profitableBotsCount ?? 0} Profitable / {metrics?.lossMakingBotsCount ?? 0} Loss
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Fleet Win Rate</span>
            <Trophy className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.fleetWinRate ?? 95}%</div>
          <div className="text-[11px] text-yellow-400 mt-1">{(metrics?.totalMatches ?? 0).toLocaleString()} total games</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1 font-medium">
            <span>Avg Fleet Rating</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics?.avgRating ?? 2000}</div>
          <div className="text-[11px] text-cyan-400 mt-1">Grandmaster Tiers</div>
        </div>
      </div>

      {/* Fleet Controls & Config Banner */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Mechanics Fleet Management & Bankroll Ledger
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Double-Entry Ledger Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Track real-time mechanic P&L, balance allocations, match history, win rates, and create new parameterized AI mechanics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create New Mechanic</span>
            </button>

            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all"
            >
              <Coins className="w-4 h-4" />
              <span>Bulk Bankroll Top-Up</span>
            </button>

            <button
              onClick={handleVerifyFleetLedgers}
              disabled={fleetAuditLoading}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition-all"
            >
              <ShieldCheck className={`w-4 h-4 text-indigo-400 ${fleetAuditLoading ? "animate-pulse" : ""}`} />
              <span>{fleetAuditLoading ? "Auditing Fleet..." : "Verify Fleet Ledgers"}</span>
            </button>

            <button
              onClick={() => handleUpdateSettings({ matchmakingEnabled: !settings?.matchmakingEnabled })}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                settings?.matchmakingEnabled
                  ? "bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-800/50"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-400"
              }`}
            >
              {settings?.matchmakingEnabled ? <PlayCircle className="w-4 h-4 text-emerald-400" /> : <PauseCircle className="w-4 h-4" />}
              <span>{settings?.matchmakingEnabled ? "Queue Active" : "Queue Paused"}</span>
            </button>

            <button
              onClick={handleResetFleet}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Reset Seed
            </button>

            <button
              onClick={fetchBotFleet}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global Matchmaking Behavior Config */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs">
          {/* Auto-Matching Mode Toggle (Casual / Wagered / Both) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Auto-Matching Match Mode</div>
                <div className="text-[11px] text-slate-400">Control queue eligibility for mechanics</div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {(
                [
                  { key: "casual", label: "Casual" },
                  { key: "wagered", label: "Wagered" },
                  { key: "both", label: "Both" },
                  { key: "disabled", label: "Off" },
                ] as const
              ).map((modeOption) => {
                const currentMode = settings?.matchmakingMode || (settings?.allowWagerMatches ? "both" : "casual");
                const isActive = currentMode === modeOption.key;
                return (
                  <button
                    key={modeOption.key}
                    type="button"
                    onClick={() =>
                      handleUpdateSettings({
                        matchmakingMode: modeOption.key,
                        allowWagerMatches: modeOption.key === "wagered" || modeOption.key === "both",
                        matchmakingEnabled: modeOption.key !== "disabled",
                      })
                    }
                    className={`flex-1 py-1 px-2 rounded-md font-semibold text-xs transition-all ${
                      isActive
                        ? modeOption.key === "wagered"
                          ? "bg-amber-600 text-white shadow"
                          : modeOption.key === "both"
                          ? "bg-emerald-600 text-white shadow"
                          : modeOption.key === "casual"
                          ? "bg-cyan-600 text-white shadow"
                          : "bg-red-600 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {modeOption.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              * In wager mode, only mechanics with liquid balance ≥ stake & within per-game/daily limits join.
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Default Difficulty Engine</div>
                <div className="text-[11px] text-slate-400">Alpha-Beta Minimax heuristics</div>
              </div>
              <select
                value={settings?.defaultDifficulty || "adaptive"}
                onChange={(e: any) => handleUpdateSettings({ defaultDifficulty: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white capitalize text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="adaptive">Adaptive (Smart)</option>
                <option value="hard">Hard (Minimax)</option>
                <option value="medium">Medium</option>
                <option value="easy">Easy</option>
              </select>
            </div>
            <div className="text-[10px] text-slate-400">
              Mechanics adaptively scale tactical depth to match player skill level.
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Auto-Join Delay Interval</div>
                <div className="text-[11px] text-slate-400">Randomized naturally: 15s to 3m</div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                15s – 3m Random
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Simulates authentic human matchmaking delays across all casual & cash rooms.
            </div>
          </div>
        </div>
      </div>

      {/* Bot Roster Table with Financial Metrics & Detail Actions */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Filters & Sort Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by legal full name, handle, region, or token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Standby (Paused)</option>
              <option value="retired">Retired</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All AI Tiers</option>
              <option value="adaptive">Adaptive</option>
              <option value="hard">Hard (Grandmaster)</option>
              <option value="expert">Expert</option>
              <option value="master">Master</option>
              <option value="medium">Medium</option>
              <option value="easy">Easy</option>
            </select>

            <select
              value={profitFilter}
              onChange={(e) => setProfitFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All P&L Profiles</option>
              <option value="profitable">Profitable (+GH₵)</option>
              <option value="loss">Loss-Making (-GH₵)</option>
              <option value="breakeven">Breakeven (GH₵ 0)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-emerald-400 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="profit_desc">Sort: Highest Net Profit</option>
              <option value="profit_asc">Sort: Lowest Profit / Loss</option>
              <option value="win_rate">Sort: Highest Win Rate %</option>
              <option value="balance">Sort: Highest Balance</option>
              <option value="rating">Sort: Highest Rating</option>
              <option value="games">Sort: Most Games Played</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-white uppercase tracking-wider text-[11px] font-bold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4 text-white font-bold">Mechanic Persona & Handle</th>
                <th className="py-3 px-4 text-white font-bold">Rating & Rank</th>
                <th className="py-3 px-4 text-white font-bold">Liquid Balance</th>
                <th className="py-3 px-4 text-white font-bold">Capital Given / Reclaimed</th>
                <th className="py-3 px-4 text-white font-bold">Net Profit / Loss (P&L)</th>
                <th className="py-3 px-4 text-white font-bold">Match Record & Win %</th>
                <th className="py-3 px-4 text-white font-bold">AI Tier</th>
                <th className="py-3 px-4 text-white font-bold">Status</th>
                <th className="py-3 px-4 text-white font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-white">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading mechanic fleet data...
                  </td>
                </tr>
              ) : sortedBots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-white/80">
                    No mechanic accounts match your filter criteria.
                  </td>
                </tr>
              ) : (
                sortedBots.map((b) => {
                  const rank = getRankBadge(b.rating);
                  const totalGames = (b.wins || 0) + (b.losses || 0) + (b.draws || 0);
                  const isPaused = b.status === "paused";
                  const isRetired = b.status === "retired";
                  const netProfit = b.netProfit || 0;
                  const isProfitable = netProfit > 0;
                  const isLoss = netProfit < 0;

                  const initials = b.fullName
                    ? b.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : b.username.slice(0, 2).toUpperCase();

                  return (
                    <tr key={b.token} className="hover:bg-slate-800/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                              <span>{b.fullName || b.username}</span>
                              {b.isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-950 text-purple-200 border border-purple-800 font-mono font-semibold">
                                  Custom
                                </span>
                              )}
                              <Shield className="w-3.5 h-3.5 text-emerald-400 inline" />
                            </div>
                            <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 mt-0.5 font-medium">
                              <span>@{b.username}</span>
                              <span className="text-white/40">•</span>
                              <span className="text-white/90 font-sans">{b.region || "Greater Accra"}</span>
                              <span className="text-white/40">•</span>
                              <span className="font-mono text-white/70 text-[10px]">{b.token}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white font-mono text-sm">{b.rating}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rank.color}`}>
                            {rank.label}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-amber-300 font-bold text-sm">
                          GH₵ {(b.bankrollPoints ?? 0).toLocaleString()}{" "}
                          <span className="text-[10px] text-white/80 font-normal">pts</span>
                        </div>
                        <div className="text-[10px] text-white/80 font-mono">
                          {(b.bankrollMarbles ?? 0).toLocaleString()} marbles
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-mono text-white">
                          <span className="text-indigo-300 font-bold">
                            GH₵ {(b.totalFunded ?? 0).toLocaleString()}
                          </span>{" "}
                          <span className="text-[10px] text-white/70">given</span>
                        </div>
                        <div className="text-[10px] text-white/80 font-mono">
                          GH₵ {(b.totalWithdrawn ?? 0).toLocaleString()} reclaimed
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div
                          className={`font-mono font-bold text-sm flex items-center gap-1 ${
                            isProfitable ? "text-emerald-400" : isLoss ? "text-red-400" : "text-white"
                          }`}
                        >
                          {isProfitable ? "+" : ""}
                          GH₵ {netProfit.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-white/80">
                          ROI: {b.roiPercent !== undefined ? `${b.roiPercent}%` : "0%"}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-emerald-300 font-bold">{b.wins}W</span>
                          <span className="text-white/40">-</span>
                          <span className="text-red-400 font-bold">{b.losses}L</span>
                          <span className="text-white/40">-</span>
                          <span className="text-white font-semibold">{b.draws}D</span>
                        </div>
                        <div className="text-[10px] text-emerald-300 font-bold mt-0.5">
                          {b.winPercentage ?? 95}% win rate ({totalGames} games)
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            b.difficultyTier === "hard" || b.difficultyTier === "master"
                              ? "bg-red-950 text-red-200 border border-red-700"
                              : b.difficultyTier === "medium"
                              ? "bg-amber-950 text-amber-200 border border-amber-700"
                              : b.difficultyTier === "easy"
                              ? "bg-blue-950 text-blue-200 border border-blue-700"
                              : "bg-purple-950 text-purple-200 border border-purple-700"
                          }`}
                        >
                          {b.difficultyTier || "adaptive"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleBotStatus(b)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                            isRetired
                              ? "bg-slate-900 text-slate-500 border border-slate-800"
                              : isPaused
                              ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900/60"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRetired ? "bg-slate-600" : isPaused ? "bg-slate-500" : "bg-emerald-400"
                            }`}
                          />
                          {isRetired ? "Retired" : isPaused ? "Standby" : "Active"}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => loadBotDetail(b.token)}
                            className="px-2.5 py-1.5 rounded bg-emerald-950/60 border border-emerald-800/80 hover:bg-emerald-900 text-emerald-300 hover:text-white transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                            title="View Full Bot Performance & Ledger Details"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Detail</span>
                          </button>

                          <button
                            onClick={() => openFundModal(b, "fund")}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 transition-colors"
                            title="Bankroll / Fund Bot"
                          >
                            <Coins className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title="Edit Parameters"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {b.isCustom && (
                            <button
                              onClick={() => handleDeleteBot(b)}
                              className="p-1.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Bot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEDICATED BOT DETAIL PAGE MODAL */}
      {selectedBotDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-800 flex items-center justify-center font-bold text-white text-xl shadow-lg border border-emerald-400/30">
                  {selectedBotDetail.bot.fullName
                    ? selectedBotDetail.bot.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : selectedBotDetail.bot.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">
                      {selectedBotDetail.bot.fullName || selectedBotDetail.bot.username}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      @{selectedBotDetail.bot.username}
                    </span>
                    {selectedBotDetail.bot.isCustom && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                        Custom AI Asset
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>Region: {selectedBotDetail.bot.region || "Greater Accra"}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">{selectedBotDetail.bot.token}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-mono">Elo {selectedBotDetail.bot.rating}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openFundModal(selectedBotDetail.bot, "fund")}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1 shadow-lg shadow-amber-900/30"
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>+ Fund Bankroll</span>
                </button>

                <button
                  onClick={() => openFundModal(selectedBotDetail.bot, "withdraw")}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>- Reclaim Capital</span>
                </button>

                <button onClick={() => setSelectedBotDetail(null)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Assessment Recommendation Alert */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs ${selectedBotDetail.assessment.healthClass}`}>
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 shrink-0" />
                <div>
                  <div className="font-bold text-sm">{selectedBotDetail.assessment.verdict}</div>
                  <div className="text-slate-300 mt-0.5">{selectedBotDetail.assessment.reason}</div>
                </div>
              </div>
              <div className="font-semibold px-3 py-1 rounded-lg bg-black/40 border border-white/10 shrink-0">
                Action: {selectedBotDetail.assessment.recommendation}
              </div>
            </div>

            {/* Financial & Performance Scorecard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-400 text-[11px] mb-1">Liquid Bankroll Balance</div>
                <div className="text-xl font-bold font-mono text-amber-300">
                  GH₵ {(selectedBotDetail.bot.bankrollPoints ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {(selectedBotDetail.bot.bankrollMarbles ?? 0).toLocaleString()} marbles
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-400 text-[11px] mb-1">Capital Allocated (Funded)</div>
                <div className="text-xl font-bold font-mono text-indigo-300">
                  GH₵ {(selectedBotDetail.bot.totalFunded ?? 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Reclaimed: GH₵ {(selectedBotDetail.bot.totalWithdrawn ?? 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-400 text-[11px] mb-1">Net Platform P&L</div>
                <div
                  className={`text-xl font-bold font-mono ${
                    (selectedBotDetail.bot.netProfit || 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {(selectedBotDetail.bot.netProfit || 0) >= 0 ? "+" : ""}
                  GH₵ {(selectedBotDetail.bot.netProfit || 0).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  ROI: {selectedBotDetail.bot.roiPercent ?? 0}%
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                <div className="text-slate-400 text-[11px] mb-1">Match Record & Win Rate</div>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {selectedBotDetail.bot.winPercentage ?? 95}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {selectedBotDetail.bot.wins}W - {selectedBotDetail.bot.losses}L - {selectedBotDetail.bot.draws}D
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                onClick={() => setDetailActiveTab("overview")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  detailActiveTab === "overview"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Performance & Stats</span>
              </button>

              <button
                onClick={() => setDetailActiveTab("matches")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  detailActiveTab === "matches"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Match History ({selectedBotDetail.matchHistory.length})</span>
              </button>

              <button
                onClick={() => setDetailActiveTab("ledger")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  detailActiveTab === "ledger"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Double-Entry Ledger ({selectedBotDetail.ledgerEntries.length})</span>
              </button>

              <button
                onClick={() => setDetailActiveTab("transactions")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  detailActiveTab === "transactions"
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Wallet Audit Trail</span>
              </button>

              <button
                onClick={() => {
                  setDetailActiveTab("audit");
                  if (selectedBotDetail && !botAuditReport) {
                    handleVerifyBotLedger(selectedBotDetail.bot.token);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  detailActiveTab === "audit"
                    ? "bg-indigo-950 text-indigo-300 border border-indigo-700"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Formal Ledger Audit</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto pr-1">
              {detailActiveTab === "overview" && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span>Gameplay & Win/Loss Statistics</span>
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Total Games Played:</span>
                          <span className="font-bold text-white font-mono">{selectedBotDetail.bot.gamesPlayed ?? (selectedBotDetail.bot.wins + selectedBotDetail.bot.losses + selectedBotDetail.bot.draws)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Win Rate:</span>
                          <span className="font-bold text-emerald-400 font-mono">{selectedBotDetail.bot.winPercentage}% ({selectedBotDetail.bot.wins} wins)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Loss Rate:</span>
                          <span className="font-bold text-red-400 font-mono">{selectedBotDetail.bot.lossPercentage}% ({selectedBotDetail.bot.losses} losses)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Draw Rate:</span>
                          <span className="font-bold text-slate-300 font-mono">{selectedBotDetail.bot.drawPercentage}% ({selectedBotDetail.bot.draws} draws)</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Current Win Streak:</span>
                          <span className="font-bold text-amber-400 font-mono">🔥 {selectedBotDetail.bot.winStreak} games</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Best Career Streak:</span>
                          <span className="font-bold text-white font-mono">{selectedBotDetail.bot.bestStreak} games</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-emerald-400" />
                        <span>AI Engine & Behavioral Profile</span>
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Difficulty Tier:</span>
                          <span className="font-bold text-white uppercase font-mono">{selectedBotDetail.bot.difficultyTier || "adaptive"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Playing Style:</span>
                          <span className="font-bold text-emerald-300 capitalize font-mono">{selectedBotDetail.bot.playStyle || "balanced"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Max Wager Allowed:</span>
                          <span className="font-bold text-amber-300 font-mono">GH₵ {selectedBotDetail.bot.maxWagerPoints || 100}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-800/60">
                          <span className="text-slate-400">Status in Matchmaking:</span>
                          <span className="font-bold text-emerald-400 capitalize">{selectedBotDetail.bot.status || "active"}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-400">Persona Profile Origin:</span>
                          <span className="font-mono text-slate-300">{selectedBotDetail.bot.isCustom ? "Custom Admin Creation" : "Seeded Regional Fleet"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {detailActiveTab === "matches" && (
                <div className="space-y-3">
                  {selectedBotDetail.matchHistory.length === 0 ? (
                    <div className="text-center py-12 text-white/80 bg-slate-950/40 rounded-2xl border border-slate-800">
                      No live room matches recorded yet for this mechanic. Casual matches auto-join when players create public rooms!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/90 text-white uppercase tracking-wider text-[10px] font-bold border-b border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 text-white">Room Code</th>
                            <th className="py-2.5 px-3 text-white">Opponent</th>
                            <th className="py-2.5 px-3 text-white">Mode</th>
                            <th className="py-2.5 px-3 text-white">Wager</th>
                            <th className="py-2.5 px-3 text-white">Outcome</th>
                            <th className="py-2.5 px-3 text-white">P&L Delta</th>
                            <th className="py-2.5 px-3 text-white">Moves</th>
                            <th className="py-2.5 px-3 text-white text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 text-white">
                          {selectedBotDetail.matchHistory.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono text-white font-semibold">{m.roomCode}</td>
                              <td className="py-2.5 px-3 text-white font-medium">{m.opponentName}</td>
                              <td className="py-2.5 px-3 capitalize text-white/90">{m.mode}</td>
                              <td className="py-2.5 px-3 font-mono text-amber-300 font-bold">
                                {m.wagerAmount > 0 ? `GH₵ ${m.wagerAmount}` : "Free"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    m.result === "win"
                                      ? "bg-emerald-950 text-emerald-200 border border-emerald-700"
                                      : m.result === "loss"
                                      ? "bg-red-950 text-red-200 border border-red-700"
                                      : "bg-slate-800 text-white"
                                  }`}
                                >
                                  {m.result}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold">
                                <span className={m.profitDelta > 0 ? "text-emerald-400" : m.profitDelta < 0 ? "text-red-400" : "text-white"}>
                                  {m.profitDelta > 0 ? `+GH₵ ${m.profitDelta}` : m.profitDelta < 0 ? `-GH₵ ${Math.abs(m.profitDelta)}` : "GH₵ 0"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-white/90">{m.moveCount}</td>
                              <td className="py-2.5 px-3 text-white/90 text-right text-[11px]">
                                {new Date(m.playedAt).toLocaleDateString()} {new Date(m.playedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {detailActiveTab === "ledger" && (
                <div className="space-y-3">
                  {selectedBotDetail.ledgerEntries.length === 0 ? (
                    <div className="text-center py-12 text-white/80 bg-slate-950/40 rounded-2xl border border-slate-800">
                      No double-entry ledger records for this mechanic account yet. Click "+ Fund Bankroll" to record an initial bankroll injection!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/90 text-white uppercase tracking-wider text-[10px] font-bold border-b border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 text-white">Entry ID</th>
                            <th className="py-2.5 px-3 text-white">Type</th>
                            <th className="py-2.5 px-3 text-white">Account</th>
                            <th className="py-2.5 px-3 text-white">Amount</th>
                            <th className="py-2.5 px-3 text-white">Balance After</th>
                            <th className="py-2.5 px-3 text-white">Ref Type / ID</th>
                            <th className="py-2.5 px-3 text-white text-right">Recorded At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 font-mono text-white">
                          {selectedBotDetail.ledgerEntries.map((e) => {
                            const amt = Number(e.amount);
                            const isPositive = amt > 0;
                            return (
                              <tr key={e.id} className="hover:bg-slate-800/40">
                                <td className="py-2.5 px-3 text-white/80 text-[10px]">{e.id.slice(0, 8)}...</td>
                                <td className="py-2.5 px-3 text-white uppercase font-bold text-[10px]">{e.entryType}</td>
                                <td className="py-2.5 px-3 text-white/90 capitalize">{e.accountType}</td>
                                <td className={`py-2.5 px-3 font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                                  {isPositive ? "+" : ""}{amt.toFixed(2)} pts
                                </td>
                                <td className="py-2.5 px-3 text-amber-300 font-bold">{e.balanceAfter ? Number(e.balanceAfter).toFixed(2) : "--"} pts</td>
                                <td className="py-2.5 px-3 text-white/90 text-[11px]">{e.referenceType}: {e.referenceId.slice(0, 10)}</td>
                                <td className="py-2.5 px-3 text-white/90 text-right text-[11px]">
                                  {new Date(e.createdAt).toLocaleDateString()} {new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {detailActiveTab === "transactions" && (
                <div className="space-y-3">
                  {selectedBotDetail.transactions.length === 0 ? (
                    <div className="text-center py-12 text-white/80 bg-slate-950/40 rounded-2xl border border-slate-800">
                      No wallet transactions recorded for this mechanic yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/90 text-white uppercase tracking-wider text-[10px] font-bold border-b border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 text-white">TX ID</th>
                            <th className="py-2.5 px-3 text-white">Type</th>
                            <th className="py-2.5 px-3 text-white">Amount</th>
                            <th className="py-2.5 px-3 text-white">Status</th>
                            <th className="py-2.5 px-3 text-white">Reference / Memo</th>
                            <th className="py-2.5 px-3 text-white text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70 text-white">
                          {selectedBotDetail.transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-mono text-white/80 text-[10px]">{tx.id.slice(0, 10)}</td>
                              <td className="py-2.5 px-3 uppercase font-bold text-[10px] text-white">{tx.type}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                                {tx.amount} {tx.currency || "pts"}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-200 border border-emerald-700">
                                  {tx.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-white/90 text-[11px]">{tx.reference}</td>
                              <td className="py-2.5 px-3 text-white/90 text-right text-[11px]">
                                {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {detailActiveTab === "audit" && (
                <div className="space-y-4 text-xs">
                  {/* Top Audit Action & Status Banner */}
                  <div className="flex items-center justify-between bg-slate-950/80 border border-indigo-900/50 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          Formal Ledger Verification Engine
                          {botAuditReport && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                botAuditReport.isValid && botAuditReport.nonNegativeInvariantPassed
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                  : "bg-red-950 text-red-300 border border-red-800"
                              }`}
                            >
                              {botAuditReport.isValid && botAuditReport.nonNegativeInvariantPassed
                                ? "✓ Audit Invariants Passed"
                                : "⚠ Discrepancy Flagged"}
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Replays complete ledger history and verifies zero-deficit invariants and double-entry balancing.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleVerifyBotLedger(selectedBotDetail.bot.token)}
                      disabled={botAuditLoading}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-900/30 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${botAuditLoading ? "animate-spin" : ""}`} />
                      <span>{botAuditLoading ? "Auditing..." : "Re-Verify Ledger"}</span>
                    </button>
                  </div>

                  {/* Audit Invariant Cards */}
                  {botAuditReport ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div
                          className={`p-3.5 rounded-xl border ${
                            botAuditReport.nonNegativeInvariantPassed
                              ? "bg-emerald-950/40 border-emerald-800/80"
                              : "bg-red-950/40 border-red-800/80"
                          }`}
                        >
                          <div className="flex items-center justify-between text-slate-300 text-[11px] mb-1 font-medium">
                            <span>Zero-Deficit Invariant</span>
                            {botAuditReport.nonNegativeInvariantPassed ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <div
                            className={`text-base font-bold font-mono ${
                              botAuditReport.nonNegativeInvariantPassed ? "text-emerald-300" : "text-red-300"
                            }`}
                          >
                            {botAuditReport.nonNegativeInvariantPassed ? "PASSED (Balance ≥ 0)" : "FAILED (Negative Balance Detected)"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Verified Ledger Balance: <span className="font-mono text-white">GH₵ {botAuditReport.verifiedLedgerBalance.toFixed(2)}</span>
                          </div>
                        </div>

                        <div
                          className={`p-3.5 rounded-xl border ${
                            botAuditReport.reconciliationStatus === "balanced"
                              ? "bg-emerald-950/40 border-emerald-800/80"
                              : "bg-amber-950/40 border-amber-800/80"
                          }`}
                        >
                          <div className="flex items-center justify-between text-slate-300 text-[11px] mb-1 font-medium">
                            <span>State Reconciliation</span>
                            <Coins className="w-4 h-4 text-amber-400" />
                          </div>
                          <div className="text-base font-bold font-mono text-white capitalize">
                            {botAuditReport.reconciliationStatus}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Reported: <span className="font-mono text-white">GH₵ {botAuditReport.currentReportedBalance.toFixed(2)}</span> | Ledger:{" "}
                            <span className="font-mono text-white">GH₵ {botAuditReport.verifiedLedgerBalance.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border bg-slate-950/60 border-slate-800">
                          <div className="flex items-center justify-between text-slate-300 text-[11px] mb-1 font-medium">
                            <span>Distinct System Float</span>
                            <Receipt className="w-4 h-4 text-indigo-400" />
                          </div>
                          <div className="text-base font-bold font-mono text-indigo-300">
                            GH₵ {(botAuditReport.totalSystemFunded - botAuditReport.totalSystemReclaimed).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            Injected: GH₵ {botAuditReport.totalSystemFunded.toFixed(2)} | Reclaimed: GH₵ {botAuditReport.totalSystemReclaimed.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Cryptographic SHA-256 Audit Signature */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400 text-[11px]">Ledger State Audit Checksum (SHA-256):</span>
                        </div>
                        <span className="font-mono text-[10px] text-indigo-300 bg-slate-900 px-2.5 py-1 rounded border border-slate-700 break-all">
                          {botAuditReport.auditChecksum}
                        </span>
                      </div>

                      {/* Chronological Audit Verification Table */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-white text-xs flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-400" />
                            <span>Audit Trail Invariant Verification ({botAuditReport.entryAuditTrail.length} Entries)</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            Replayed strictly chronologically
                          </span>
                        </div>

                        {botAuditReport.entryAuditTrail.length === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                            No ledger entries have been recorded yet for this mechanic.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-900/90 text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-700">
                                <tr>
                                  <th className="py-2 px-2.5 text-slate-300">#</th>
                                  <th className="py-2 px-2.5 text-slate-300">Entry ID</th>
                                  <th className="py-2 px-2.5 text-slate-300">Type / Classification</th>
                                  <th className="py-2 px-2.5 text-slate-300">Delta</th>
                                  <th className="py-2 px-2.5 text-slate-300">Verified Balance</th>
                                  <th className="py-2 px-2.5 text-slate-300">Invariant</th>
                                  <th className="py-2 px-2.5 text-slate-300 text-right">Timestamp</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/60 font-mono">
                                {botAuditReport.entryAuditTrail.map((entry, idx) => (
                                  <tr key={entry.id} className="hover:bg-slate-800/30">
                                    <td className="py-2 px-2.5 text-slate-500 text-[10px]">{idx + 1}</td>
                                    <td className="py-2 px-2.5 text-slate-400 text-[10px]">{entry.id.slice(0, 8)}...</td>
                                    <td className="py-2 px-2.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                          entry.referenceType.includes("system") || entry.referenceType.includes("paystack")
                                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                                            : "bg-slate-800 text-slate-300"
                                        }`}
                                      >
                                        {entry.referenceType}
                                      </span>
                                    </td>
                                    <td className={`py-2 px-2.5 font-bold ${entry.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                                      {entry.amount > 0 ? "+" : ""}
                                      {entry.amount.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-2.5 text-amber-300 font-bold">
                                      GH₵ {entry.calculatedRunningBalance.toFixed(2)}
                                    </td>
                                    <td className="py-2 px-2.5">
                                      {entry.invariantSatisfied ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                          <CheckCircle className="w-3 h-3" /> Valid (≥0)
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                                          <AlertTriangle className="w-3 h-3" /> Deficit
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-2.5 text-slate-400 text-right text-[10px]">
                                      {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-400 mb-2" />
                      <p>Calculating formal ledger mathematical verification...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW BOT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Create New Bot Persona</h3>
                  <div className="text-[11px] text-slate-400">Deploy custom AI bot with double-entry ledger fund allocation</div>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBot} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Legal Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createFullName}
                    onChange={(e) => setCreateFullName(e.target.value)}
                    placeholder="e.g. Kojo Emmanuel Mensah"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Gamer Tag / Username *</label>
                  <input
                    type="text"
                    required
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    placeholder="e.g. Kojo_Tactics"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ghanaian Region</label>
                  <select
                    value={createRegion}
                    onChange={(e) => setCreateRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Greater Accra">Greater Accra</option>
                    <option value="Ashanti">Ashanti</option>
                    <option value="Central">Central</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Western">Western</option>
                    <option value="Volta">Volta</option>
                    <option value="Northern">Northern</option>
                    <option value="Bono">Bono</option>
                    <option value="Upper East">Upper East</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Elo Rating (1000 - 2600)</label>
                  <input
                    type="number"
                    min={1000}
                    max={2600}
                    value={createRating}
                    onChange={(e) => setCreateRating(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">AI Difficulty Tier</label>
                  <select
                    value={createTier}
                    onChange={(e: any) => setCreateTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="adaptive">Adaptive (Recommended)</option>
                    <option value="hard">Hard (Minimax Alpha-Beta)</option>
                    <option value="expert">Expert</option>
                    <option value="master">Master</option>
                    <option value="medium">Medium</option>
                    <option value="easy">Easy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Playing Style</label>
                  <select
                    value={createPlayStyle}
                    onChange={(e: any) => setCreatePlayStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive (Center Control)</option>
                    <option value="positional">Positional (King Sacrifices)</option>
                    <option value="trapping">Trapping & Double Captures</option>
                    <option value="blitz">Blitz Speedster</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <Coins className="w-4 h-4" />
                  <span>Initial Bankroll Ledger Injection</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Bankroll Points (GH₵)</label>
                    <input
                      type="number"
                      min={0}
                      value={createInitialPoints}
                      onChange={(e) => setCreateInitialPoints(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-amber-300 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-1">Bankroll Marbles</label>
                    <input
                      type="number"
                      min={0}
                      value={createInitialMarbles}
                      onChange={(e) => setCreateInitialMarbles(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  * Funds will be deducted from Platform Treasury and credited to this Bot's double-entry ledger account.
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Wager/Game (GH₵)</label>
                  <input
                    type="number"
                    min={1}
                    value={createMaxWager}
                    onChange={(e) => setCreateMaxWager(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Daily Wager Limit (GH₵)</label>
                  <input
                    type="number"
                    min={1}
                    value={createDailyWagerLimit}
                    onChange={(e) => setCreateDailyWagerLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Daily Stop-Loss (GH₵)</label>
                  <input
                    type="number"
                    min={1}
                    value={createDailyLossLimit}
                    onChange={(e) => setCreateDailyLossLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Initial Status</label>
                <select
                  value={createStatus}
                  onChange={(e: any) => setCreateStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize"
                >
                  <option value="active">Active in Queue</option>
                  <option value="paused">Standby / Paused</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white shadow-lg shadow-emerald-900/30"
                >
                  Create & Fund Mechanic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FUND / WITHDRAW SINGLE BOT MODAL */}
      {fundModalBot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {fundActionType === "fund" ? "Fund Mechanic Bankroll (Paystack)" : "Reclaim Capital (-)"}
                  </h3>
                  <div className="text-[11px] text-amber-400 font-mono">
                    {fundModalBot.fullName || fundModalBot.username} (@{fundModalBot.username}) • Liquid: GH₵ {(fundModalBot.bankrollPoints ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setFundModalBot(null);
                  setPaystackPendingRef(null);
                  setPaystackAuthUrl(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setFundActionType("fund")}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    fundActionType === "fund" ? "bg-amber-600 text-white shadow-md shadow-amber-900/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  + Paystack Float (Deposit)
                </button>
                <button
                  type="button"
                  onClick={() => setFundActionType("withdraw")}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all ${
                    fundActionType === "withdraw" ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30" : "text-slate-400 hover:text-white"
                  }`}
                >
                  - Reclaim to Treasury
                </button>
              </div>

              {fundActionType === "fund" ? (
                <>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-[11px] leading-relaxed">
                    <p className="font-semibold flex items-center gap-1 mb-1">
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      Authentic Float & Non-Negative P&L Guarantee:
                    </p>
                    Mechanic accounts cannot receive unbacked balances. Funding requires a genuine Paystack transaction. New funds enter at neutral P&L (GH₵ 0.00) — never negative at inception.
                  </div>

                  {/* Preset Buttons */}
                  <div>
                    <label className="block text-slate-400 font-medium mb-1.5">Quick Presets (GH₵)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[50, 100, 250, 500, 1000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFundAmountPoints(amt)}
                          className={`py-1.5 rounded-lg font-mono font-semibold border transition-all ${
                            fundAmountPoints === amt
                              ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                              : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          GH₵ {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Deposit Amount in Points (GH₵) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50000}
                      value={fundAmountPoints}
                      onChange={(e) => setFundAmountPoints(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-base focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Admin Billing / Receipt Email
                    </label>
                    <input
                      type="email"
                      value={adminBillingEmail}
                      onChange={(e) => setAdminBillingEmail(e.target.value)}
                      placeholder="admin@damii.game"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Financial & P&L Projection Card */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Current Liquid Bankroll:</span>
                      <span className="font-mono text-white">GH₵ {(fundModalBot.bankrollPoints ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cumulative Capital Funded:</span>
                      <span className="font-mono text-slate-300">GH₵ {(fundModalBot.totalFunded ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-300 font-medium">Post-Deposit Bankroll:</span>
                      <span className="font-mono font-bold text-amber-300">
                        GH₵ {((fundModalBot.bankrollPoints ?? 0) + fundAmountPoints).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>New Net P&L Offset:</span>
                      <span className="font-mono font-semibold text-emerald-400">
                        GH₵ {Math.max(0, (fundModalBot.bankrollPoints ?? 0) + fundAmountPoints + (fundModalBot.totalWithdrawn ?? 0) - ((fundModalBot.totalFunded ?? 0) + fundAmountPoints)).toFixed(2)} (Neutral baseline)
                      </span>
                    </div>
                  </div>

                  {/* Pending Reference Banner */}
                  {paystackPendingRef && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                          Payment Session Active
                        </span>
                        <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                          {paystackPendingRef}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80">
                        Paystack checkout window has opened. Complete your payment on Mobile Money or Card, then click Verify below.
                      </p>
                      <div className="flex items-center gap-2">
                        {paystackAuthUrl && (
                          <a
                            href={paystackAuthUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-center font-semibold text-[11px] flex items-center justify-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Reopen Paystack
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleVerifyPaystackFunding()}
                          disabled={paystackLoading}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
                        >
                          {paystackLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Verify & Finalize Credit
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowManualVerify(!showManualVerify)}
                      className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {showManualVerify ? "Hide Reference Lookup" : "Verify Existing Paystack Ref"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFundModalBot(null);
                          setPaystackPendingRef(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                      {!paystackPendingRef && (
                        <button
                          type="button"
                          onClick={handleInitiatePaystackFunding}
                          disabled={paystackLoading || fundAmountPoints <= 0}
                          className="px-4 py-2 rounded-lg font-semibold text-white shadow-lg bg-amber-600 hover:bg-amber-500 shadow-amber-900/30 flex items-center gap-2"
                        >
                          {paystackLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          Pay GH₵ {fundAmountPoints} via Paystack
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Manual reference input */}
                  {showManualVerify && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 mt-2">
                      <label className="block text-slate-300 font-medium text-[11px]">
                        Paste Paystack Transaction Reference:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualVerifyRef}
                          onChange={(e) => setManualVerifyRef(e.target.value)}
                          placeholder="e.g. BOT-FUND-1712345678-ABCD"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyPaystackFunding(manualVerifyRef)}
                          disabled={paystackLoading || !manualVerifyRef.trim()}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1"
                        >
                          {paystackLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* WITHDRAW / RECLAIM FLOW */
                <form onSubmit={handleFundOrWithdrawBot} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Amount to Reclaim to Treasury (GH₵) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={fundModalBot.bankrollPoints || 0}
                      value={fundAmountPoints}
                      onChange={(e) => setFundAmountPoints(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono font-bold text-base focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-[11px] text-slate-500">
                      Maximum available to reclaim: GH₵ {(fundModalBot.bankrollPoints || 0).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Reclaim Reason / Audit Note
                    </label>
                    <input
                      type="text"
                      value={fundNote}
                      onChange={(e) => setFundNote(e.target.value)}
                      placeholder="e.g. Capital sweep back to platform treasury"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Current Liquid Balance:</span>
                      <span className="font-mono text-white">GH₵ {(fundModalBot.bankrollPoints ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Balance After Reclaim:</span>
                      <span className="font-mono font-bold text-indigo-300">
                        GH₵ {Math.max(0, (fundModalBot.bankrollPoints ?? 0) - fundAmountPoints).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFundModalBot(null)}
                      className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={fundAmountPoints > (fundModalBot.bankrollPoints || 0)}
                      className="px-4 py-2 rounded-lg font-semibold text-white shadow-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 shadow-indigo-900/30"
                    >
                      Confirm Reclaim to Treasury
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT BOT MODAL */}
      {editingBot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-white">{editingBot.fullName || editingBot.username}</h3>
                  <div className="text-[11px] text-emerald-400 font-mono">@{editingBot.username} • {editingBot.token}</div>
                </div>
              </div>
              <button onClick={() => setEditingBot(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBotParams} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Legal Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Username / Gamer Tag</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Region</label>
                  <input
                    type="text"
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rating (1000 - 2600)</label>
                  <input
                    type="number"
                    min={1000}
                    max={2600}
                    value={editRating}
                    onChange={(e) => setEditRating(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Difficulty Tier</label>
                  <select
                    value={editTier}
                    onChange={(e: any) => setEditTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="adaptive">Adaptive</option>
                    <option value="hard">Hard</option>
                    <option value="expert">Expert</option>
                    <option value="master">Master</option>
                    <option value="medium">Medium</option>
                    <option value="easy">Easy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Playing Style</label>
                  <select
                    value={editPlayStyle}
                    onChange={(e: any) => setEditPlayStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="positional">Positional</option>
                    <option value="trapping">Trapping</option>
                    <option value="blitz">Blitz</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Wager/Game (GH₵)</label>
                  <input
                    type="number"
                    min={1}
                    value={editMaxWager}
                    onChange={(e) => setEditMaxWager(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Daily Wager Limit (GH₵)</label>
                  <input
                    type="number"
                    min={1}
                    value={editDailyWagerLimit}
                    onChange={(e) => setEditDailyWagerLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Daily Stop-Loss (GH₵)</label>
                  <input
                    type="number"
                    min={1}
                    value={editDailyLossLimit}
                    onChange={(e) => setEditDailyLossLimit(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize"
                >
                  <option value="active">Active (In Queue)</option>
                  <option value="paused">Standby (Paused)</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBot(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK FUND MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bulk Fleet Bankroll Top-Up</h3>
                  <div className="text-[11px] text-amber-400 font-mono">
                    Paystack Float Distribution • {matchingBotsCount} Target Mechanics
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkPaystackPendingRef(null);
                  setBulkPaystackAuthUrl(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-[11px] leading-relaxed">
                <p className="font-semibold flex items-center gap-1 mb-1">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  Fleet Capital Float & Neutral P&L Guarantee:
                </p>
                Bulk bankroll injection is backed by a single consolidated Paystack transaction. Each mechanic receives their exact allocated float with neutral base P&L (GH₵ 0.00) — zero arbitrary balance inflation.
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Mechanic Tier</label>
                <select
                  value={bulkTier}
                  onChange={(e) => setBulkTier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white capitalize focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Entire Active Bot Fleet ({bots?.filter((b) => b.status !== "retired").length || 0} Mechanics)</option>
                  <option value="adaptive">Adaptive Tier Only ({bots?.filter((b) => b.difficultyTier === "adaptive" && b.status !== "retired").length || 0})</option>
                  <option value="hard">Hard Tier Only ({bots?.filter((b) => b.difficultyTier === "hard" && b.status !== "retired").length || 0})</option>
                  <option value="expert">Expert Tier Only ({bots?.filter((b) => b.difficultyTier === "expert" && b.status !== "retired").length || 0})</option>
                  <option value="medium">Medium Tier Only ({bots?.filter((b) => b.difficultyTier === "medium" && b.status !== "retired").length || 0})</option>
                  <option value="easy">Easy Tier Only ({bots?.filter((b) => b.difficultyTier === "easy" && b.status !== "retired").length || 0})</option>
                </select>
              </div>

              {/* Preset Buttons */}
              <div>
                <label className="block text-slate-400 font-medium mb-1.5">Float Per Mechanic (GH₵)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 250, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setBulkPoints(amt)}
                      className={`py-1.5 rounded-lg font-mono font-semibold border transition-all ${
                        bulkPoints === amt
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      GH₵ {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Custom Amount/Bot (GH₵)</label>
                  <input
                    type="number"
                    min={1}
                    value={bulkPoints}
                    onChange={(e) => setBulkPoints(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Admin Billing Email</label>
                  <input
                    type="email"
                    value={adminBillingEmail}
                    onChange={(e) => setAdminBillingEmail(e.target.value)}
                    placeholder="admin@damii.game"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>Selected Fleet Size:</span>
                  <span className="font-mono text-white font-semibold">{matchingBotsCount} mechanics</span>
                </div>
                <div className="flex justify-between">
                  <span>Float Allocation Per Mechanic:</span>
                  <span className="font-mono text-slate-300">GH₵ {bulkPoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                  <span className="text-amber-400 font-bold text-xs">Total Paystack Payment Required:</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    GH₵ {(matchingBotsCount * bulkPoints).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bulk Pending Reference Banner */}
              {bulkPaystackPendingRef && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      Bulk Payment Session Active
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      {bulkPaystackPendingRef}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    Paystack checkout window has opened for GH₵ {(matchingBotsCount * bulkPoints).toLocaleString()}. Complete your payment, then click Verify below.
                  </p>
                  <div className="flex items-center gap-2">
                    {bulkPaystackAuthUrl && (
                      <a
                        href={bulkPaystackAuthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-center font-semibold text-[11px] flex items-center justify-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Reopen Paystack
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleVerifyBulkPaystackFunding()}
                      disabled={bulkPaystackLoading}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50"
                    >
                      {bulkPaystackLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Verify & Credit Fleet
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBulkShowManualVerify(!bulkShowManualVerify)}
                  className="text-[11px] text-slate-400 hover:text-amber-400 flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  {bulkShowManualVerify ? "Hide Ref Lookup" : "Verify Bulk Paystack Ref"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkPaystackPendingRef(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  {!bulkPaystackPendingRef && (
                    <button
                      type="button"
                      onClick={handleInitiateBulkPaystackFunding}
                      disabled={bulkPaystackLoading || bulkPoints <= 0 || matchingBotsCount === 0}
                      className="px-4 py-2 rounded-lg font-semibold text-white shadow-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 shadow-amber-900/30 flex items-center gap-2"
                    >
                      {bulkPaystackLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Pay GH₵ {(matchingBotsCount * bulkPoints).toLocaleString()} via Paystack
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Manual Ref input */}
              {bulkShowManualVerify && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 mt-2">
                  <label className="block text-slate-300 font-medium text-[11px]">
                    Paste Existing Bulk Paystack Reference:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bulkManualVerifyRef}
                      onChange={(e) => setBulkManualVerifyRef(e.target.value)}
                      placeholder="e.g. BULK-BOT-1712345678-ABCD"
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleVerifyBulkPaystackFunding(bulkManualVerifyRef)}
                      disabled={bulkPaystackLoading || !bulkManualVerifyRef.trim()}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs flex items-center gap-1"
                    >
                      {bulkPaystackLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FLEET FORMAL LEDGER AUDIT MODAL */}
      {showFleetAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-indigo-900/60 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    Fleet-Wide Formal Ledger Verification Report
                    {fleetAuditReport && (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          fleetAuditReport.allInvariantsSatisfied
                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                            : "bg-red-950 text-red-300 border border-red-800"
                        }`}
                      >
                        {fleetAuditReport.allInvariantsSatisfied
                          ? "✓ Zero-Deficit Proof Passed"
                          : `⚠ ${fleetAuditReport.totalDeficitViolations} Invariant Violations`}
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    Exhaustive replay & double-entry verification of all mechanic bankrolls across the platform
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleVerifyFleetLedgers}
                  disabled={fleetAuditLoading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                  title="Re-run Fleet Audit"
                >
                  <RefreshCw className={`w-4 h-4 ${fleetAuditLoading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => setShowFleetAuditModal(false)} className="text-slate-400 hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {fleetAuditLoading ? (
              <div className="py-20 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <div className="text-sm font-semibold text-white">Replaying Fleet Ledger Records...</div>
                <div className="text-xs text-slate-400">
                  Verifying mathematical non-negative constraints and double-entry balancing for all mechanics.
                </div>
              </div>
            ) : fleetAuditReport ? (
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {/* Fleet Overview Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <div className="text-slate-400 text-[11px] mb-1">Mechanics Audited</div>
                    <div className="text-xl font-bold font-mono text-white">
                      {fleetAuditReport.totalBotsAudited}
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">
                      {fleetAuditReport.totalValidLedgers} valid ({((fleetAuditReport.totalValidLedgers / (fleetAuditReport.totalBotsAudited || 1)) * 100).toFixed(0)}%)
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <div className="text-slate-400 text-[11px] mb-1">Zero-Deficit Invariant</div>
                    <div
                      className={`text-xl font-bold font-mono ${
                        fleetAuditReport.totalDeficitViolations === 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {fleetAuditReport.totalDeficitViolations === 0 ? "100% Passed" : `${fleetAuditReport.totalDeficitViolations} Violations`}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Strict non-negative constraint
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <div className="text-slate-400 text-[11px] mb-1">Total System Capital Float</div>
                    <div className="text-xl font-bold font-mono text-indigo-300">
                      GH₵ {fleetAuditReport.totalFleetSystemFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Injected: GH₵ {fleetAuditReport.totalFleetSystemFunded.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <div className="text-slate-400 text-[11px] mb-1">Verified Fleet Balance</div>
                    <div className="text-xl font-bold font-mono text-amber-300">
                      GH₵ {fleetAuditReport.totalFleetReportedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Reclaimed: GH₵ {fleetAuditReport.totalFleetSystemReclaimed.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Search & Audit Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={fleetAuditSearch}
                        onChange={(e) => setFleetAuditSearch(e.target.value)}
                        placeholder="Filter audit reports by bot name, username, or token..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      Generated at {new Date(fleetAuditReport.auditTimestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800/80 rounded-2xl bg-slate-950/60">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Mechanic</th>
                          <th className="py-2.5 px-3">Reported Balance</th>
                          <th className="py-2.5 px-3">Verified Ledger</th>
                          <th className="py-2.5 px-3">System Float</th>
                          <th className="py-2.5 px-3">Zero-Deficit Proof</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-white">
                        {fleetAuditReport.botReports
                          .filter((rep) => {
                            if (!fleetAuditSearch) return true;
                            const q = fleetAuditSearch.toLowerCase();
                            return (
                              rep.botToken.toLowerCase().includes(q) ||
                              rep.username.toLowerCase().includes(q) ||
                              rep.fullName.toLowerCase().includes(q)
                            );
                          })
                          .map((rep) => (
                            <tr key={rep.botToken} className="hover:bg-slate-800/30">
                              <td className="py-2.5 px-3">
                                <div className="font-sans font-bold text-white text-xs">{rep.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{rep.username}</div>
                              </td>
                              <td className="py-2.5 px-3 text-amber-300 font-bold">
                                GH₵ {rep.currentReportedBalance.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-white font-bold">
                                GH₵ {rep.verifiedLedgerBalance.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-indigo-300">
                                GH₵ {(rep.totalSystemFunded - rep.totalSystemReclaimed).toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3">
                                {rep.nonNegativeInvariantPassed ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    <CheckCircle className="w-3 h-3" /> Balance ≥ 0
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-300 border border-red-800">
                                    <AlertTriangle className="w-3 h-3" /> Deficit
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    rep.isValid ? "text-emerald-400" : "text-amber-400"
                                  }`}
                                >
                                  {rep.reconciliationStatus}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setShowFleetAuditModal(false);
                                    loadBotDetail(rep.botToken);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-sans text-[11px] font-semibold transition-colors"
                                >
                                  Inspect Ledger
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
