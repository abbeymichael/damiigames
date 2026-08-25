"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Send,
  Users,
  UserCheck,
  Smartphone,
  Mail,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Sliders,
  Eye,
  Settings,
  Sparkles,
  ExternalLink,
  Shield,
  Clock,
  Radio,
  Zap,
  Check,
  X,
  Copy,
  Info,
  ChevronRight,
  Filter,
  FileText,
  Volume2,
  RadioTower,
  History,
  SendHorizontal,
} from "lucide-react";
import type {
  NotificationChannel,
  NotificationType,
  NotificationUrgency,
  NotificationDispatchedLog,
  SmsSettings,
  EmailSettings,
  WhatsAppSettings,
  InAppNotificationSettings,
} from "@/lib/types";

interface UserCandidate {
  token: string;
  username: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  points?: number;
  marbles?: number;
  rating?: number;
  status?: string;
}

interface CommunicationsCenterProps {
  token: string;
  adminSecret?: string;
  allUsers?: UserCandidate[];
  onNavigateToSettings?: () => void;
}

const PRESET_TEMPLATES = [
  {
    id: "system_maintenance",
    label: "⚠️ Scheduled Maintenance Notice",
    type: "system" as NotificationType,
    urgency: "high" as NotificationUrgency,
    title: "⚠️ Scheduled System Maintenance",
    message:
      "DAMII will undergo scheduled performance upgrades on Sunday at 02:00 GMT for approx. 30 minutes. Active match clocks will be paused during this maintenance window.",
    actionUrl: "/arena",
    actionLabel: "View Platform Status",
  },
  {
    id: "weekend_tournament",
    label: "🏆 Weekend Championship League Open",
    type: "tournament_alert" as NotificationType,
    urgency: "high" as NotificationUrgency,
    title: "🏆 Ghana Draughts Master Series: Registration Open!",
    message:
      "Registration is now officially open for the Weekend 10×10 Draughts Championship! Guaranteed prize pool of 500 Marbles. Register early to secure your seed bracket.",
    actionUrl: "/leagues",
    actionLabel: "Join Tournament League",
  },
  {
    id: "marbles_bonus",
    label: "🎁 Weekly Marble Reward Drop",
    type: "wager_settlement" as NotificationType,
    urgency: "normal" as NotificationUrgency,
    title: "🎁 Weekly Community Reward Dropped",
    message:
      "Thank you for active competition on DAMII! Bonus Marbles have been credited to your active wallet balance. Head into the Arena and challenge top Grandmasters.",
    actionUrl: "/wallet",
    actionLabel: "Check Wallet Balance",
  },
  {
    id: "security_update",
    label: "🔒 Security Alert: Protect Your Account",
    type: "system" as NotificationType,
    urgency: "urgent" as NotificationUrgency,
    title: "🔒 Security Advisory: Verify Phone & Passcode",
    message:
      "Please ensure your registered phone number is verified to enable SMS match invites and fast Mobile Money withdrawals. Never share your 6-digit OTP verification codes with anyone.",
    actionUrl: "/arena",
    actionLabel: "Verify Profile",
  },
  {
    id: "match_challenge",
    label: "⚔️ Instant Arena Challenge Broadcast",
    type: "game_request" as NotificationType,
    urgency: "normal" as NotificationUrgency,
    title: "⚔️ Grandmaster Rated Matches Open",
    message:
      "High-stakes 10×10 Damii rooms are live in the Arena. Jump in now to climb the national leaderboard rankings and win Marbles!",
    actionUrl: "/arena",
    actionLabel: "Enter Game Arena",
  },
];

export function CommunicationsCenter({
  token,
  adminSecret,
  allUsers = [],
  onNavigateToSettings,
}: CommunicationsCenterProps) {
  const [activeTab, setActiveTab] = useState<"compose" | "logs" | "channels">("compose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Targeting States
  const [targetType, setTargetType] = useState<
    "all" | "users" | "role" | "high_rated" | "high_balance"
  >("all");
  const [selectedUserTokens, setSelectedUserTokens] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("organizer");

  // Channel Selection
  const [selectedChannels, setSelectedChannels] = useState<NotificationChannel[]>([
    "in_app",
    "sms",
  ]);

  // Message Composition
  const [title, setTitle] = useState("🏆 Weekend Championship: Registration Open!");
  const [message, setMessage] = useState(
    "Registration is now officially open for the 10×10 Draughts Championship! Guaranteed prize pool of 500 Marbles. Register early to secure your seed."
  );
  const [messageType, setMessageType] = useState<NotificationType>("system");
  const [urgency, setUrgency] = useState<NotificationUrgency>("normal");
  const [actionUrl, setActionUrl] = useState("/leagues");
  const [actionLabel, setActionLabel] = useState("View Tournament");

  // Gateway Settings & Logs
  const [smsSettings, setSmsSettings] = useState<SmsSettings | null>(null);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [whatsappSettings, setWhatsappSettings] = useState<WhatsAppSettings | null>(null);
  const [inAppSettings, setInAppSettings] = useState<InAppNotificationSettings | null>(null);
  const [dispatchedLogs, setDispatchedLogs] = useState<NotificationDispatchedLog[]>([]);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [logSearch, setLogSearch] = useState("");

  // Live Preview Device mode
  const [previewTab, setPreviewTab] = useState<"in_app" | "sms" | "whatsapp" | "email">("in_app");
  const [testRecipientPhone, setTestRecipientPhone] = useState("");

  // Fetch Channel Settings and Logs
  const fetchGatewayData = async () => {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_notification_settings",
          token,
          secret: adminSecret,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.sms) setSmsSettings(data.sms);
        if (data.email) setEmailSettings(data.email);
        if (data.whatsapp) setWhatsappSettings(data.whatsapp);
        if (data.inApp) setInAppSettings(data.inApp);
        if (data.recentLogs) setDispatchedLogs(data.recentLogs);
      }
    } catch (e) {
      console.warn("Failed to load gateway data:", e);
    }
  };

  useEffect(() => {
    fetchGatewayData();
  }, [token]);

  // Compute Target User count
  const targetedUsers = useMemo(() => {
    if (targetType === "all") {
      return allUsers.filter((u) => u.status !== "banned");
    }
    if (targetType === "users") {
      const set = new Set(selectedUserTokens);
      return allUsers.filter((u) => set.has(u.token));
    }
    if (targetType === "role") {
      return allUsers.filter((u) => u.role === selectedRole && u.status !== "banned");
    }
    if (targetType === "high_rated") {
      return allUsers.filter((u) => (u.rating || 1200) >= 1350 && u.status !== "banned");
    }
    if (targetType === "high_balance") {
      return allUsers.filter(
        (u) => ((u.marbles || 0) >= 20 || (u.points || 0) >= 100) && u.status !== "banned"
      );
    }
    return [];
  }, [targetType, selectedUserTokens, selectedRole, allUsers]);

  // Filtered User list for user search picker
  const filteredSearchUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return allUsers.slice(0, 12);
    const q = userSearchQuery.toLowerCase();
    return allUsers
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.phoneNumber && u.phoneNumber.includes(q)) ||
          u.role.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [allUsers, userSearchQuery]);

  // Handle Channel Toggle
  const toggleChannel = (channel: NotificationChannel) => {
    if (selectedChannels.includes(channel)) {
      if (selectedChannels.length === 1) {
        setError("You must select at least one delivery channel.");
        return;
      }
      setSelectedChannels(selectedChannels.filter((c) => c !== channel));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  // Preset Template Selection
  const applyPresetTemplate = (templateId: string) => {
    const tpl = PRESET_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setTitle(tpl.title);
    setMessage(tpl.message);
    setMessageType(tpl.type);
    setUrgency(tpl.urgency);
    setActionUrl(tpl.actionUrl);
    setActionLabel(tpl.actionLabel);
  };

  // Toggle user in multi-select
  const toggleUserSelection = (userToken: string) => {
    if (selectedUserTokens.includes(userToken)) {
      setSelectedUserTokens(selectedUserTokens.filter((t) => t !== userToken));
    } else {
      setSelectedUserTokens([...selectedUserTokens, userToken]);
    }
  };

  // Dispatch Communication Broadcast
  const handleDispatchCommunication = async () => {
    setError("");
    setSuccess("");

    if (!message.trim()) {
      setError("Message content cannot be empty.");
      return;
    }
    if (selectedChannels.length === 0) {
      setError("Please select at least one delivery channel.");
      return;
    }
    if (targetType === "users" && selectedUserTokens.length === 0) {
      setError("Please select at least one recipient player.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_communication",
          token,
          secret: adminSecret,
          targetType,
          targetRole: selectedRole,
          targetRecipients: selectedUserTokens,
          channels: selectedChannels,
          title,
          message,
          urgency,
          type: messageType,
          actionUrl,
          actionLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch communication");

      setSuccess(
        `Successfully broadcasted to ${data.summary?.totalTargeted || targetedUsers.length} user(s)! Dispatched across [${(data.summary?.channels || selectedChannels).join(", ")}].`
      );

      // Refresh logs
      fetchGatewayData();
    } catch (err: any) {
      setError(err.message || "Failed to send communication");
    } finally {
      setBusy(false);
    }
  };

  // Send Direct Test to Single Recipient Phone / Email / In-App
  const handleSendTestToSelf = async () => {
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test_notification",
          token,
          secret: adminSecret,
          channel: previewTab,
          recipient: testRecipientPhone || "admin",
          title,
          message,
          actionUrl,
          actionLabel,
          type: messageType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test dispatch failed");

      setSuccess(`Test notification successfully sent via ${previewTab.toUpperCase()}!`);
      fetchGatewayData();
    } catch (err: any) {
      setError(err.message || "Test dispatch failed");
    } finally {
      setBusy(false);
    }
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return dispatchedLogs.filter((log) => {
      if (logFilter !== "all" && log.channel !== logFilter) return false;
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        return (
          (log.recipient && log.recipient.toLowerCase().includes(q)) ||
          (log.recipientToken && log.recipientToken.toLowerCase().includes(q)) ||
          (log.recipientContact && log.recipientContact.toLowerCase().includes(q)) ||
          (log.title && log.title.toLowerCase().includes(q)) ||
          (log.message && log.message.toLowerCase().includes(q)) ||
          (log.providerMessageId && log.providerMessageId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [dispatchedLogs, logFilter, logSearch]);

  return (
    <div id="communications-center" className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#d6a735]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d6a735]/20 to-[#0e3a2b] border border-[#d6a735]/40 flex items-center justify-center text-[#d6a735] shadow-lg shadow-[#d6a735]/10">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#f5efdf] tracking-tight">
                  Communications & Broadcast Center
                </h1>
                <p className="text-xs text-[#a7f3d0]/80">
                  Send targeted or broadcast announcements, SMS match invites, WhatsApp alerts, and HTML emails to players.
                </p>
              </div>
            </div>
          </div>

          {/* Gateway Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {/* SMS Provider Badge */}
            <div
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                smsSettings?.enabled
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>
                SMS: {smsSettings?.provider?.toUpperCase() || "HUBTEL"}{" "}
                {smsSettings?.enabled ? "● Active" : "○ Disabled"}
              </span>
            </div>

            {/* WhatsApp Provider Badge */}
            <div
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                whatsappSettings?.enabled
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400"
              }`}
            >
              <RadioTower className="w-3.5 h-3.5" />
              <span>
                WhatsApp {whatsappSettings?.enabled ? "● Active" : "○ Disabled"}
              </span>
            </div>

            {/* Email Provider Badge */}
            <div
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                emailSettings?.enabled
                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400"
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>
                Email ({emailSettings?.provider?.toUpperCase() || "SMTP"}){" "}
                {emailSettings?.enabled ? "● Active" : "○ Disabled"}
              </span>
            </div>

            {onNavigateToSettings && (
              <button
                id="btn-nav-platform-settings"
                onClick={onNavigateToSettings}
                className="px-3 py-1.5 rounded-lg bg-[#0e3a2b] hover:bg-[#154f3c] border border-[#1a5e48] text-xs font-bold text-[#d6a735] flex items-center gap-1.5 transition-colors"
                title="Configure SMS, Email & WhatsApp Gateways"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Gateway Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-b border-[#114232] pb-0">
          <button
            id="tab-compose-broadcast"
            onClick={() => setActiveTab("compose")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "compose"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <SendHorizontal className="w-4 h-4" />
            <span>Compose & Dispatch</span>
          </button>

          <button
            id="tab-dispatched-outbox"
            onClick={() => setActiveTab("logs")}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "logs"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Delivery History & Outbox ({dispatchedLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Error & Success Feedback Alerts */}
      {error && (
        <div className="bg-rose-950/80 border border-rose-500/50 p-4 rounded-xl text-rose-200 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-xl text-emerald-200 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: COMPOSE & DISPATCH */}
      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Composer Controls (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Target Audience Selection */}
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#d6a735]/20 text-[#d6a735] flex items-center justify-center font-black text-xs">
                    1
                  </div>
                  <h2 className="text-base font-extrabold text-[#f5efdf]">
                    Target Audience
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#0e3a2b] border border-[#1a5e48] text-xs font-bold text-[#d6a735]">
                  Targeting: {targetedUsers.length} Player(s)
                </span>
              </div>

              {/* Target Type Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  id="target-all"
                  onClick={() => setTargetType("all")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    targetType === "all"
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf] shadow-md shadow-[#d6a735]/10"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Users className="w-4 h-4 text-[#d6a735]" />
                    {targetType === "all" && <Check className="w-3.5 h-3.5 text-[#d6a735]" />}
                  </div>
                  <div className="font-bold text-xs">All Users</div>
                  <div className="text-[10px] text-slate-500">Entire platform playerbase</div>
                </button>

                <button
                  type="button"
                  id="target-users"
                  onClick={() => setTargetType("users")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    targetType === "users"
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf] shadow-md shadow-[#d6a735]/10"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <UserCheck className="w-4 h-4 text-[#d6a735]" />
                    {targetType === "users" && <Check className="w-3.5 h-3.5 text-[#d6a735]" />}
                  </div>
                  <div className="font-bold text-xs">Selected Players</div>
                  <div className="text-[10px] text-slate-500">Pick specific accounts</div>
                </button>

                <button
                  type="button"
                  id="target-organizers"
                  onClick={() => {
                    setTargetType("role");
                    setSelectedRole("organizer");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    targetType === "role" && selectedRole === "organizer"
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf] shadow-md shadow-[#d6a735]/10"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Shield className="w-4 h-4 text-[#d6a735]" />
                    {targetType === "role" && selectedRole === "organizer" && (
                      <Check className="w-3.5 h-3.5 text-[#d6a735]" />
                    )}
                  </div>
                  <div className="font-bold text-xs">Organizers</div>
                  <div className="text-[10px] text-slate-500">Tournament hosts & arbiters</div>
                </button>

                <button
                  type="button"
                  id="target-high-rated"
                  onClick={() => setTargetType("high_rated")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    targetType === "high_rated"
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf] shadow-md shadow-[#d6a735]/10"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Sparkles className="w-4 h-4 text-[#d6a735]" />
                    {targetType === "high_rated" && <Check className="w-3.5 h-3.5 text-[#d6a735]" />}
                  </div>
                  <div className="font-bold text-xs">Top ELO Rated</div>
                  <div className="text-[10px] text-slate-500">1350+ Grandmasters</div>
                </button>

                <button
                  type="button"
                  id="target-high-balance"
                  onClick={() => setTargetType("high_balance")}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    targetType === "high_balance"
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf] shadow-md shadow-[#d6a735]/10"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Zap className="w-4 h-4 text-[#d6a735]" />
                    {targetType === "high_balance" && (
                      <Check className="w-3.5 h-3.5 text-[#d6a735]" />
                    )}
                  </div>
                  <div className="font-bold text-xs">Funded Wallets</div>
                  <div className="text-[10px] text-slate-500">Players with Marbles</div>
                </button>

                <button
                  type="button"
                  id="target-staff"
                  onClick={() => {
                    setTargetType("role");
                    setSelectedRole("admin");
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    targetType === "role" && selectedRole === "admin"
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf] shadow-md shadow-[#d6a735]/10"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Settings className="w-4 h-4 text-[#d6a735]" />
                    {targetType === "role" && selectedRole === "admin" && (
                      <Check className="w-3.5 h-3.5 text-[#d6a735]" />
                    )}
                  </div>
                  <div className="font-bold text-xs">Admin Staff</div>
                  <div className="text-[10px] text-slate-500">Admins & moderators</div>
                </button>
              </div>

              {/* Specific User Search Picker (When targetType is "users") */}
              {targetType === "users" && (
                <div className="space-y-3 pt-2 border-t border-[#114232]">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search player by username, phone, or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-[#04140e] border border-[#114232] rounded-xl pl-9 pr-3 py-2 text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {filteredSearchUsers.map((u) => {
                      const isSelected = selectedUserTokens.includes(u.token);
                      return (
                        <div
                          key={u.token}
                          onClick={() => toggleUserSelection(u.token)}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf]"
                              : "bg-[#04140e] border-[#114232] text-slate-300 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isSelected
                                  ? "bg-[#d6a735] border-[#d6a735] text-black"
                                  : "border-slate-600"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className="font-bold text-[#f5efdf]">{u.username}</div>
                              <div className="text-[10px] text-slate-400">
                                {u.phoneNumber || u.email || `Role: ${u.role}`} • ELO: {u.rating || 1200}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-[#d6a735]">
                            {u.marbles || 0} Marbles
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Delivery Channels */}
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#d6a735]/20 text-[#d6a735] flex items-center justify-center font-black text-xs">
                    2
                  </div>
                  <h2 className="text-base font-extrabold text-[#f5efdf]">
                    Delivery Channels
                  </h2>
                </div>
                <span className="text-xs text-slate-400">Select multi-channel dispatch</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* In-App Alerts */}
                <div
                  onClick={() => toggleChannel("in_app")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedChannels.includes("in_app")
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf]"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Bell className="w-4 h-4 text-[#d6a735]" />
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        selectedChannels.includes("in_app")
                          ? "bg-[#d6a735] border-[#d6a735] text-black"
                          : "border-slate-600"
                      }`}
                    >
                      {selectedChannels.includes("in_app") && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="font-bold text-xs">In-App Alert</div>
                  <div className="text-[10px] text-emerald-400">Push & Inbox</div>
                </div>

                {/* SMS Channel */}
                <div
                  onClick={() => toggleChannel("sms")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedChannels.includes("sms")
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf]"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Smartphone className="w-4 h-4 text-[#d6a735]" />
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        selectedChannels.includes("sms")
                          ? "bg-[#d6a735] border-[#d6a735] text-black"
                          : "border-slate-600"
                      }`}
                    >
                      {selectedChannels.includes("sms") && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="font-bold text-xs">SMS Gateway</div>
                  <div className="text-[10px] text-slate-400">
                    {smsSettings?.provider?.toUpperCase() || "HUBTEL"}
                  </div>
                </div>

                {/* WhatsApp Channel */}
                <div
                  onClick={() => toggleChannel("whatsapp")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedChannels.includes("whatsapp")
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf]"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <RadioTower className="w-4 h-4 text-[#d6a735]" />
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        selectedChannels.includes("whatsapp")
                          ? "bg-[#d6a735] border-[#d6a735] text-black"
                          : "border-slate-600"
                      }`}
                    >
                      {selectedChannels.includes("whatsapp") && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="font-bold text-xs">WhatsApp</div>
                  <div className="text-[10px] text-slate-400">Cloud API</div>
                </div>

                {/* Email Channel */}
                <div
                  onClick={() => toggleChannel("email")}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedChannels.includes("email")
                      ? "bg-[#0e3a2b] border-[#d6a735] text-[#f5efdf]"
                      : "bg-[#04140e] border-[#114232] text-slate-400 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Mail className="w-4 h-4 text-[#d6a735]" />
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border ${
                        selectedChannels.includes("email")
                          ? "bg-[#d6a735] border-[#d6a735] text-black"
                          : "border-slate-600"
                      }`}
                    >
                      {selectedChannels.includes("email") && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="font-bold text-xs">HTML Email</div>
                  <div className="text-[10px] text-slate-400">
                    {emailSettings?.provider?.toUpperCase() || "SMTP"}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Message Composer */}
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#d6a735]/20 text-[#d6a735] flex items-center justify-center font-black text-xs">
                    3
                  </div>
                  <h2 className="text-base font-extrabold text-[#f5efdf]">
                    Message Composer
                  </h2>
                </div>

                {/* Quick Presets Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Preset:</span>
                  <select
                    onChange={(e) => applyPresetTemplate(e.target.value)}
                    className="bg-[#04140e] border border-[#114232] text-xs text-[#d6a735] font-bold rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    <option value="">Load Template...</option>
                    {PRESET_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title / Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                  Headline / Subject Line
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Ghana Draughts Master Series Live!"
                  className="w-full bg-[#04140e] border border-[#114232] rounded-xl px-3.5 py-2.5 text-sm text-[#f5efdf] font-semibold focus:border-[#d6a735] focus:outline-none"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">
                    Message Body
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {message.length} chars (approx. {Math.ceil(message.length / 160)} SMS)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement or match alert here..."
                  className="w-full bg-[#04140e] border border-[#114232] rounded-xl p-3 text-sm text-[#f5efdf] leading-relaxed focus:border-[#d6a735] focus:outline-none"
                />
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <span>Available Tokens:</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/40 text-[#d6a735] font-mono">
                    {"{recipient}"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/40 text-[#d6a735] font-mono">
                    {"{link}"}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-black/40 text-[#d6a735] font-mono">
                    {"{appName}"}
                  </span>
                </div>
              </div>

              {/* Call-to-Action Link & Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Action URL / Deep Link
                  </label>
                  <input
                    type="text"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/arena or /leagues"
                    className="w-full bg-[#04140e] border border-[#114232] rounded-xl px-3 py-2 text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="e.g. Enter Arena & Play"
                    className="w-full bg-[#04140e] border border-[#114232] rounded-xl px-3 py-2 text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  />
                </div>
              </div>

              {/* Urgency & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Category Type</label>
                  <select
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value as NotificationType)}
                    className="w-full bg-[#04140e] border border-[#114232] rounded-xl px-3 py-2 text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  >
                    <option value="system">📢 System Announcement</option>
                    <option value="tournament_alert">🏆 Tournament Alert</option>
                    <option value="game_request">⚔️ Match Challenge</option>
                    <option value="wager_settlement">💰 Financial / Wallet Reward</option>
                    <option value="league_invite">🎟️ League Invitation</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Priority Level</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as NotificationUrgency)}
                    className="w-full bg-[#04140e] border border-[#114232] rounded-xl px-3 py-2 text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority (Audible Alert)</option>
                    <option value="urgent">Urgent (Modal Banner)</option>
                  </select>
                </div>
              </div>

              {/* Dispatch CTA Action */}
              <div className="pt-4 border-t border-[#114232] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Ready to send to{" "}
                  <strong className="text-[#d6a735]">{targetedUsers.length} player(s)</strong>{" "}
                  via <strong className="text-white">{selectedChannels.join(", ")}</strong>.
                </div>

                <button
                  type="button"
                  id="btn-dispatch-broadcast"
                  onClick={handleDispatchCommunication}
                  disabled={busy}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#d6a735] to-[#c49227] hover:brightness-110 font-extrabold text-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#d6a735]/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {busy ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Broadcasting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Communication</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Multi-Channel Device Preview & Testing (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#114232] pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#d6a735]" />
                  <h3 className="text-sm font-extrabold text-[#f5efdf]">
                    Live Channel Preview
                  </h3>
                </div>

                {/* Preview Mode Selector */}
                <div className="flex items-center gap-1 bg-[#04140e] p-1 rounded-lg border border-[#114232]">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("in_app")}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${
                      previewTab === "in_app" ? "bg-[#d6a735] text-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    In-App
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("sms")}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${
                      previewTab === "sms" ? "bg-[#d6a735] text-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("whatsapp")}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${
                      previewTab === "whatsapp" ? "bg-[#d6a735] text-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    WA
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("email")}
                    className={`px-2.5 py-1 text-xs font-bold rounded ${
                      previewTab === "email" ? "bg-[#d6a735] text-black" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Email
                  </button>
                </div>
              </div>

              {/* PREVIEW CONTAINER */}
              <div className="min-h-[300px] flex items-center justify-center p-2">
                {/* 1. IN-APP TOAST & BANNER PREVIEW */}
                {previewTab === "in_app" && (
                  <div className="w-full bg-[#0b291e] border-2 border-[#d6a735] rounded-2xl p-4 shadow-2xl space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-[#1a5e48] pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#d6a735] text-black flex items-center justify-center font-bold text-xs">
                          D
                        </div>
                        <span className="text-xs font-black text-[#d6a735] uppercase tracking-wider">
                          DAMII ARENA ALERT
                        </span>
                      </div>
                      <span className="text-[10px] text-[#a7f3d0]">Just now</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{title || "Announcement Title"}</h4>
                      <p className="text-xs text-[#f5efdf]/90 mt-1 leading-relaxed">{message}</p>
                    </div>
                    {actionUrl && (
                      <div className="pt-2">
                        <a
                          href={actionUrl}
                          className="w-full block text-center py-2 rounded-xl bg-[#d6a735] text-black font-extrabold text-xs shadow-md"
                        >
                          {actionLabel || "Open Game"}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. SMS PHONE SCREEN PREVIEW */}
                {previewTab === "sms" && (
                  <div className="w-full max-w-sm bg-zinc-950 border border-zinc-700 rounded-3xl p-4 shadow-2xl space-y-3 font-sans">
                    <div className="text-center border-b border-zinc-800 pb-2">
                      <div className="text-[11px] font-bold text-zinc-300">
                        {smsSettings?.senderId || "DAMII"}
                      </div>
                      <div className="text-[9px] text-zinc-500">Text Message • Today</div>
                    </div>
                    <div className="bg-emerald-800/90 text-white rounded-2xl rounded-tl-sm p-3.5 text-xs leading-relaxed shadow">
                      <p className="font-bold text-[#d6a735]">{title}</p>
                      <p className="mt-1">{message}</p>
                      {actionUrl && (
                        <p className="mt-2 text-[10px] text-emerald-200 underline break-all">
                          👉 {actionUrl}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. WHATSAPP BUBBLE PREVIEW */}
                {previewTab === "whatsapp" && (
                  <div className="w-full max-w-sm bg-[#075e54]/20 border border-[#128c7e]/40 rounded-3xl p-4 shadow-2xl space-y-3">
                    <div className="text-center border-b border-[#128c7e]/30 pb-2">
                      <div className="text-[11px] font-bold text-[#25d366]">DAMII Official Arena</div>
                      <div className="text-[9px] text-slate-400">Verified Business Account</div>
                    </div>
                    <div className="bg-[#054740] border border-[#128c7e]/50 text-slate-100 rounded-2xl rounded-tl-sm p-3.5 text-xs leading-relaxed space-y-2">
                      <p className="font-bold text-[#d6a735]">{title}</p>
                      <p>{message}</p>
                      {actionUrl && (
                        <div className="pt-2 border-t border-[#128c7e]/40">
                          <span className="block text-center py-1.5 bg-[#25d366] text-black font-extrabold rounded-lg text-xs">
                            👉 {actionLabel || "Open Arena"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. HTML EMAIL PREVIEW */}
                {previewTab === "email" && (
                  <div className="w-full bg-[#04140e] border border-[#1a5e48] rounded-2xl overflow-hidden shadow-2xl text-xs">
                    <div className="bg-gradient-to-r from-[#0b291e] to-[#06261f] p-3 text-center border-b-2 border-[#d6a735]">
                      <span className="font-black text-[#d6a735] tracking-widest text-sm uppercase">
                        DAMII 10×10 DRAUGHTS
                      </span>
                    </div>
                    <div className="p-4 space-y-3 text-[#f5efdf]">
                      <h4 className="font-extrabold text-sm text-white">{title}</h4>
                      <p className="text-slate-300 leading-relaxed">{message}</p>
                      {actionUrl && (
                        <div className="text-center pt-2">
                          <span className="inline-block px-5 py-2 rounded-xl bg-[#d6a735] text-black font-extrabold text-xs shadow-md">
                            {actionLabel || "Enter Arena & Play"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="bg-[#020a07] p-2 text-center text-[10px] text-slate-500 border-t border-[#114232]">
                      © {new Date().getFullYear()} DAMII Draughts Arena. All rights reserved.
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Test Dispatch Box */}
              <div className="pt-3 border-t border-[#114232] space-y-2">
                <label className="text-xs font-bold text-slate-300">
                  Send Quick Test to Specific Phone / Token:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 0244123456 or admin"
                    value={testRecipientPhone}
                    onChange={(e) => setTestRecipientPhone(e.target.value)}
                    className="w-full bg-[#04140e] border border-[#114232] rounded-xl px-3 py-2 text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestToSelf}
                    disabled={busy}
                    className="px-4 py-2 rounded-xl bg-[#0e3a2b] hover:bg-[#154f3c] border border-[#1a5e48] text-xs font-bold text-[#d6a735] whitespace-nowrap transition-colors"
                  >
                    Test Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DELIVERY HISTORY & OUTBOX LOG */}
      {activeTab === "logs" && (
        <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#f5efdf]">
                Dispatched Communications & Outbox Logs
              </h2>
              <p className="text-xs text-slate-400">
                Full delivery audit trail for broadcast announcements, match challenges, and SMS OTP verification codes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchGatewayData}
                className="p-2 rounded-xl bg-[#04140e] border border-[#114232] text-slate-300 hover:text-white"
                title="Refresh Logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search logs by recipient, title, or message..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full bg-[#04140e] border border-[#114232] rounded-xl pl-9 pr-3 py-2 text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filter:</span>
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="bg-[#04140e] border border-[#114232] rounded-xl px-3 py-2 text-xs text-[#f5efdf] font-semibold focus:outline-none"
              >
                <option value="all">All Channels</option>
                <option value="sms">SMS Gateway</option>
                <option value="in_app">In-App Notifications</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          {/* Outbox Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#114232] text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Channel</th>
                  <th className="py-3 px-3">Recipient</th>
                  <th className="py-3 px-3">Subject / Preview</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Provider ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232] text-xs">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No matching communication logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#04140e]/60 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}{" "}
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.channel === "sms"
                              ? "bg-amber-950/60 border border-amber-500/40 text-amber-300"
                              : log.channel === "whatsapp"
                              ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                              : log.channel === "email"
                              ? "bg-blue-950/60 border border-blue-500/40 text-blue-300"
                              : "bg-purple-950/60 border border-purple-500/40 text-purple-300"
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#f5efdf]">
                        {log.recipientContact || log.recipient || log.recipientToken || "BROADCAST"}
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-bold text-[#d6a735] truncate">{log.title || "Notification"}</div>
                        <div className="text-slate-400 text-[11px] truncate">{log.message}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === "delivered" || log.status === "sent"
                              ? "bg-emerald-950 border border-emerald-500/50 text-emerald-300"
                              : log.status === "failed"
                              ? "bg-rose-950 border border-rose-500/50 text-rose-300"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                        {log.providerMessageId || log.id}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
