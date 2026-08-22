"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Volume2,
  MessageSquare,
  Smartphone,
  Mail,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
  Shield,
  Clock,
  Sparkles,
  Info,
  Radio,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  Check,
  X,
  Swords,
  Trophy,
  Coins,
  RadioTower,
  FileText,
  Copy,
  Code,
} from "lucide-react";
import type {
  InAppNotificationSettings,
  WhatsAppSettings,
  SmsSettings,
  EmailSettings,
  NotificationChannelRouting,
  NotificationChannel,
  NotificationType,
  NotificationDispatchedLog,
} from "@/lib/types";
import {
  DEFAULT_IN_APP_SETTINGS,
  DEFAULT_WHATSAPP_SETTINGS,
  DEFAULT_SMS_SETTINGS,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_CHANNEL_ROUTING,
} from "@/lib/notification-constants";

interface NotificationSettingsProps {
  token: string;
  adminSecret?: string;
}

export function NotificationSettings({ token, adminSecret }: NotificationSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "routing" | "in_app" | "whatsapp" | "sms" | "email" | "simulator" | "logs"
  >("routing");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Configuration States
  const [inApp, setInApp] = useState<InAppNotificationSettings>(DEFAULT_IN_APP_SETTINGS);
  const [whatsapp, setWhatsapp] = useState<WhatsAppSettings>(DEFAULT_WHATSAPP_SETTINGS);
  const [sms, setSms] = useState<SmsSettings>(DEFAULT_SMS_SETTINGS);
  const [email, setEmail] = useState<EmailSettings>(DEFAULT_EMAIL_SETTINGS);
  const [routing, setRouting] = useState<NotificationChannelRouting>(DEFAULT_CHANNEL_ROUTING);
  const [logs, setLogs] = useState<NotificationDispatchedLog[]>([]);

  // Email Template Studio States
  const [emailTemplateTab, setEmailTemplateTab] = useState<
    "tournament_approaching" | "game_request" | "payout_alert" | "welcome"
  >("tournament_approaching");
  const [testEmailAddress, setTestEmailAddress] = useState("player@example.com");
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Password / Secret Visibility toggles
  const [showWaSecret, setShowWaSecret] = useState(false);
  const [showSmsSecret, setShowSmsSecret] = useState(false);
  const [showEmailSecret, setShowEmailSecret] = useState(false);

  // Test Notification Simulator state
  const [testChannel, setTestChannel] = useState<NotificationChannel>("in_app");
  const [testRecipient, setTestRecipient] = useState("");
  const [testTitle, setTestTitle] = useState("⚔️ Match Request Alert");
  const [testMessage, setTestMessage] = useState(
    "Kwame_Master has invited you to a 50 Marbles match in Room #82914!"
  );
  const [testActionUrl, setTestActionUrl] = useState("/arena?code=82914&join=1");
  const [testActionLabel, setTestActionLabel] = useState("Accept & Enter Match");
  const [simulatorStatus, setSimulatorStatus] = useState<any>(null);

  // Fetch initial settings
  const fetchSettings = async () => {
    setLoading(true);
    setError("");
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
      if (!res.ok) throw new Error(data.error || "Failed to load notification settings");

      if (data.inApp) setInApp(data.inApp);
      if (data.whatsapp) setWhatsapp(data.whatsapp);
      if (data.sms) setSms(data.sms);
      if (data.email) setEmail(data.email);
      if (data.routing) setRouting(data.routing);
      if (data.recentLogs) setLogs(data.recentLogs);
    } catch (err: any) {
      setError(err.message || "Failed to fetch notification settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  // Save specific category
  const handleSaveCategory = async (category: "in_app" | "whatsapp" | "sms" | "email" | "routing") => {
    setBusy(true);
    setError("");
    setSuccess("");

    let payloadData: any = null;
    if (category === "in_app") payloadData = inApp;
    if (category === "whatsapp") payloadData = whatsapp;
    if (category === "sms") payloadData = sms;
    if (category === "email") payloadData = email;
    if (category === "routing") payloadData = routing;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_notification_settings",
          token,
          secret: adminSecret,
          category,
          data: payloadData,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to save configuration");

      setSuccess(`Saved ${category.toUpperCase().replace("_", " ")} configuration successfully.`);
      if (resData.recentLogs) setLogs(resData.recentLogs);
    } catch (err: any) {
      setError(err.message || "Error saving notification settings");
    } finally {
      setBusy(false);
    }
  };

  // Toggle channel routing cell
  const toggleRouteChannel = (type: NotificationType, channel: NotificationChannel) => {
    setRouting((prev) => {
      const currentChannels = prev[type] || [];
      const exists = currentChannels.includes(channel);
      let updated: NotificationChannel[];
      if (exists) {
        // Must keep at least in_app
        if (channel === "in_app" && currentChannels.length === 1) return prev;
        updated = currentChannels.filter((c) => c !== channel);
      } else {
        updated = [...currentChannels, channel];
      }
      return { ...prev, [type]: updated };
    });
  };

  // Audio tone sound test
  const playSoundTest = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const volume = Math.max(0.01, Math.min(1, (inApp.soundVolume || 80) / 100));
      gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);

      if (inApp.soundTheme === "arcade") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (inApp.soundTheme === "subtle") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        // classic
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      /* ignore audio error */
    }
  };

  // Dispatch Test Simulator
  const handleSendTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim()) {
      setError("Please provide a recipient (username, phone number, or email).");
      return;
    }

    setBusy(true);
    setError("");
    setSimulatorStatus(null);

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test_notification",
          token,
          secret: adminSecret,
          channel: testChannel,
          recipient: testRecipient.trim(),
          title: testTitle,
          message: testMessage,
          actionUrl: testActionUrl,
          actionLabel: testActionLabel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch test notification");

      setSimulatorStatus({
        success: true,
        message: data.message || "Notification delivered successfully",
        details: data.result,
      });
      setSuccess(`Sent ${testChannel.toUpperCase()} alert to ${testRecipient}!`);

      // Refresh logs
      const logRes = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_notification_logs", token, secret: adminSecret }),
      });
      const logData = await logRes.json();
      if (logData.logs) setLogs(logData.logs);
    } catch (err: any) {
      setError(err.message || "Failed to trigger test notification");
    } finally {
      setBusy(false);
    }
  };

  // Sample data dictionary for live preview
  const samplePreviewData: Record<string, string> = {
    recipient: "Kwame_Master",
    opponent: "Ama_Queen",
    tournament: "Accra Champions League 2026",
    round: "2",
    roomCode: "DAMII-8842",
    stake: "50 Marbles",
    phone: "+233241234567",
    amount: "150.00",
    link: "https://damii.game/arena?code=DAMII-8842",
    appName: "DAMII 10×10 Draughts Arena",
  };

  const interpolatePreview = (tpl: string, data: Record<string, string> = samplePreviewData) => {
    if (!tpl) return "";
    return tpl.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard?.writeText?.(tag);
    setCopiedToken(tag);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleSendTemplateTestEmail = async (
    templateType: "tournament_approaching" | "game_request" | "payout_alert" | "welcome"
  ) => {
    if (!testEmailAddress.trim()) {
      setError("Please enter a valid recipient email address for testing.");
      return;
    }
    setTestEmailSending(true);
    setTestEmailFeedback(null);
    setError("");

    let customSubject = "";
    let customTemplate = "";
    let type: NotificationType = "system";

    if (templateType === "tournament_approaching") {
      customSubject = email.tournamentApproachingSubject || DEFAULT_EMAIL_SETTINGS.tournamentApproachingSubject || "";
      customTemplate = email.tournamentApproachingTemplate || DEFAULT_EMAIL_SETTINGS.tournamentApproachingTemplate || "";
      type = "tournament_match";
    } else if (templateType === "game_request") {
      customSubject = email.gameRequestSubject || DEFAULT_EMAIL_SETTINGS.gameRequestSubject || "";
      customTemplate = email.gameRequestTemplate || DEFAULT_EMAIL_SETTINGS.gameRequestTemplate || "";
      type = "game_request";
    } else if (templateType === "payout_alert") {
      customSubject = email.payoutAlertSubject || DEFAULT_EMAIL_SETTINGS.payoutAlertSubject || "";
      customTemplate = email.payoutAlertTemplate || DEFAULT_EMAIL_SETTINGS.payoutAlertTemplate || "";
      type = "payout_alert";
    } else {
      customSubject = email.welcomeSubject || DEFAULT_EMAIL_SETTINGS.welcomeSubject || "";
      customTemplate = email.welcomeTemplate || DEFAULT_EMAIL_SETTINGS.welcomeTemplate || "";
      type = "system";
    }

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_test_email",
          token,
          secret: adminSecret,
          email: testEmailAddress.trim(),
          type,
          customSubject,
          customTemplate,
          templateData: samplePreviewData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch test email");
      setTestEmailFeedback({
        success: true,
        message: `Sample email queued to ${testEmailAddress.trim()} using '${templateType.replace("_", " ")}' template!`,
      });
    } catch (err: any) {
      setTestEmailFeedback({
        success: false,
        message: err.message || "Failed to deliver test email",
      });
    } finally {
      setTestEmailSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-[#081c15] border border-[#1a5e48] rounded-2xl">
        <RefreshCw size={24} className="animate-spin text-[#d6a735] mx-auto mb-2" />
        <p className="text-xs text-slate-300">Loading multi-channel notification parameters...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER SUMMARY */}
      <div className="p-5 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
              <RadioTower size={18} className="text-[#d6a735]" /> Multi-Channel Notification Engine & Provider Settings
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Configure in-app chime sound effects, WhatsApp Cloud API integration, SMS Gateways (Hubtel/Arkesel/Twilio), and transactional email dispatch.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            disabled={busy}
            className="px-3 py-1.5 bg-[#041c17] hover:bg-[#0c3b2e] border border-[#1a5e48] rounded-xl text-xs text-slate-200 hover:text-white flex items-center gap-1.5 self-start"
          >
            <RefreshCw size={13} className={busy ? "animate-spin" : ""} /> Refresh Status
          </button>
        </div>

        {/* CHANNEL STATUS PILLS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1a5e48]/60">
          <span className="text-[11px] font-semibold text-slate-300">Provider Status:</span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              inApp.enabled
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                : "bg-red-950/80 text-red-300 border-red-500/40"
            }`}
          >
            <Bell size={11} /> In-App Alerts: {inApp.enabled ? "Active" : "Disabled"}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              whatsapp.enabled
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 text-slate-400 border-slate-700"
            }`}
          >
            <MessageSquare size={11} /> WhatsApp ({whatsapp.provider}): {whatsapp.enabled ? "Active" : "Standby"}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              sms.enabled
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 text-slate-400 border-slate-700"
            }`}
          >
            <Smartphone size={11} /> SMS Gateway ({sms.provider}): {sms.enabled ? "Active" : "Standby"}
          </span>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
              email.enabled
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
                : "bg-slate-900 text-slate-400 border-slate-700"
            }`}
          >
            <Mail size={11} /> Email ({email.provider}): {email.enabled ? "Active" : "Standby"}
          </span>
        </div>
      </div>

      {/* STATUS NOTICES */}
      {error && (
        <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0" /> {error}
          </span>
          <button type="button" onClick={() => setError("")} className="text-red-400 hover:text-white font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> {success}
          </span>
          <button type="button" onClick={() => setSuccess("")} className="text-emerald-400 hover:text-white font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* SUB-TABS NAVIGATION */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#081c15] border border-[#1a5e48] rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSubTab("routing")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "routing"
              ? "bg-[#d6a735] text-[#06261f] shadow-md"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Sliders size={13} /> Modes & Routing Matrix
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("in_app")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "in_app"
              ? "bg-[#d6a735] text-[#06261f] shadow-md"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Volume2 size={13} /> In-App & Sound
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("whatsapp")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "whatsapp"
              ? "bg-[#d6a735] text-[#06261f] shadow-md"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <MessageSquare size={13} /> WhatsApp Cloud API
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("sms")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "sms"
              ? "bg-[#d6a735] text-[#06261f] shadow-md"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Smartphone size={13} /> SMS Gateways
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("email")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "email"
              ? "bg-[#d6a735] text-[#06261f] shadow-md"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Mail size={13} /> Transactional Email
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("simulator")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "simulator"
              ? "bg-[#d6a735] text-[#06261f] shadow-md"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Send size={13} /> Test Dispatch Simulator
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("logs")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === "logs"
              ? "bg-[#d6a735] text-[#06261f] shadow-md"
              : "text-slate-200 hover:text-white hover:bg-[#06261f]"
          }`}
        >
          <Clock size={13} /> Delivery Logs ({logs.length})
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SUB-TAB 1: CHANNEL MODES & ROUTING MATRIX                         */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "routing" && (
        <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-5">
          <div className="border-b border-[#1a5e48] pb-3">
            <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
              <Sliders size={18} className="text-[#d6a735]" /> Global Notification Modes & Event Routing Matrix
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Select which channels are automatically dispatched for each platform event. Players will receive alerts with direct interactive links to enter the game or bracket.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1a5e48] bg-[#041c17]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1a5e48] bg-[#06261f] text-[11px] uppercase text-slate-300 font-bold tracking-wider">
                  <th className="py-3 px-4">Event Type / Notification Mode</th>
                  <th className="py-3 px-3 text-center">In-App Chime</th>
                  <th className="py-3 px-3 text-center">WhatsApp</th>
                  <th className="py-3 px-3 text-center">SMS Gateway</th>
                  <th className="py-3 px-3 text-center">Email</th>
                  <th className="py-3 px-3">Default Action Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a5e48]/50">
                {[
                  {
                    key: "game_request" as NotificationType,
                    label: "1v1 Game Challenge / Invites",
                    icon: Swords,
                    desc: "When a player challenges another user to a friendly or wager match.",
                    defaultLink: "/arena?code={roomCode}&join=1",
                  },
                  {
                    key: "tournament_match" as NotificationType,
                    label: "Tournament Game Time Approaching",
                    icon: Trophy,
                    desc: "Round pairings scheduled, opponent ready, or match room generated.",
                    defaultLink: "/arena?code={roomCode}&mode=league",
                  },
                  {
                    key: "turn_reminder" as NotificationType,
                    label: "Turn Clock Running Alert",
                    icon: Clock,
                    desc: "Remind player that opponent moved and 60s turn timer is ticking.",
                    defaultLink: "/arena?code={roomCode}",
                  },
                  {
                    key: "tournament_alert" as NotificationType,
                    label: "League Roster & Schedule Updates",
                    icon: RadioTower,
                    desc: "Registration confirmed, bracket draw released, or prize payout.",
                    defaultLink: "/leagues?id={leagueId}",
                  },
                  {
                    key: "wager_settlement" as NotificationType,
                    label: "Wager & Prize Wallet Settlements",
                    icon: Coins,
                    desc: "Victor prize credits and Mobile Money cashout completions.",
                    defaultLink: "/wallet",
                  },
                  {
                    key: "system" as NotificationType,
                    label: "Admin & System Broadcasts",
                    icon: Bell,
                    desc: "Platform maintenance, emergency advisories, and system notices.",
                    defaultLink: "/arena",
                  },
                ].map((row) => {
                  const RowIcon = row.icon;
                  const currentChannels = routing[row.key] || [];

                  return (
                    <tr key={row.key} className="hover:bg-[#081c15]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-2.5">
                          <RowIcon size={16} className="text-[#d6a735] mt-0.5 shrink-0" />
                          <div>
                            <span className="font-bold text-[#f5efdf] block">{row.label}</span>
                            <span className="text-[10px] text-slate-400">{row.desc}</span>
                          </div>
                        </div>
                      </td>

                      {/* In-App */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannels.includes("in_app")}
                          onChange={() => toggleRouteChannel(row.key, "in_app")}
                          className="w-4 h-4 rounded accent-[#d6a735] cursor-pointer"
                        />
                      </td>

                      {/* WhatsApp */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannels.includes("whatsapp")}
                          onChange={() => toggleRouteChannel(row.key, "whatsapp")}
                          className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* SMS */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannels.includes("sms")}
                          onChange={() => toggleRouteChannel(row.key, "sms")}
                          className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* Email */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={currentChannels.includes("email")}
                          onChange={() => toggleRouteChannel(row.key, "email")}
                          className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-[#d6a735]">
                        {row.defaultLink}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSaveCategory("routing")}
              className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Save size={15} /> Save Routing Matrix
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-TAB 2: IN-APP & WEB AUDIO NOTIFICATION SETTINGS               */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "in_app" && (
        <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-6">
          <div className="border-b border-[#1a5e48] pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Volume2 size={18} className="text-[#d6a735]" /> In-App Notification Center & Sound Synthesizer
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Configure real-time floating popups, Web Audio synthesize chime alerts, audio theme presets, and auto-dismiss timing.
              </p>
            </div>
            <button
              type="button"
              onClick={playSoundTest}
              className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#1a5e48] text-[#d6a735] border border-[#1a5e48] rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Play size={13} /> Test Sound Chime
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Global Master Toggle */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                  <Bell size={14} className="text-[#d6a735]" /> In-App Notification Alerts
                </label>
                <input
                  type="checkbox"
                  checked={inApp.enabled}
                  onChange={(e) => setInApp({ ...inApp, enabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#d6a735] cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-300">
                Displays live popup drawer and top bell badge whenever challenges or tournament pairings arrive.
              </p>
            </div>

            {/* Audio Chime Master Toggle */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#f5efdf] flex items-center gap-2">
                  <Volume2 size={14} className="text-emerald-400" /> Audio Sound Chimes
                </label>
                <input
                  type="checkbox"
                  checked={inApp.soundEnabled}
                  onChange={(e) => setInApp({ ...inApp, soundEnabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-300">
                Plays low-latency synthetic chime upon match challenge and tournament calls.
              </p>
            </div>

            {/* Sound Theme Selector */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">
                Sound Preset / Theme
              </label>
              <select
                value={inApp.soundTheme || "classic"}
                onChange={(e: any) => setInApp({ ...inApp, soundTheme: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              >
                <option value="classic">Classic Triple-Chime (C-E-G Draughts Arena)</option>
                <option value="arcade">Arcade High Pitch Laser Ramp</option>
                <option value="subtle">Subtle Soft Sine Tone (Quiet Mode)</option>
                <option value="minimal">Minimal Single Pop</option>
              </select>
              <p className="text-[11px] text-slate-300">
                Auditory tone profile synthesized directly in the browser using Web Audio API.
              </p>
            </div>

            {/* Sound Volume Slider */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#f5efdf]">Default Sound Volume</label>
                <span className="text-xs font-bold font-mono text-[#d6a735]">{inApp.soundVolume || 80}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={inApp.soundVolume || 80}
                onChange={(e) => setInApp({ ...inApp, soundVolume: Number(e.target.value) })}
                className="w-full accent-[#d6a735] cursor-pointer"
              />
              <p className="text-[11px] text-slate-300">
                Master audio gain level for notification sound playback.
              </p>
            </div>

            {/* Toast Position */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">Toast Float Position</label>
              <select
                value={inApp.toastPosition || "top-right"}
                onChange={(e: any) => setInApp({ ...inApp, toastPosition: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              >
                <option value="top-right">Top Right (Recommended)</option>
                <option value="top-center">Top Center (Banner)</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>

            {/* Auto-Dismiss Delay */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">
                Auto-Dismiss Duration (Seconds)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={inApp.autoDismissSeconds || 6}
                  onChange={(e) => setInApp({ ...inApp, autoDismissSeconds: Number(e.target.value) })}
                  className="w-28 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
                <span className="text-xs text-slate-300">seconds before toast fades</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSaveCategory("in_app")}
              className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Save size={15} /> Save In-App Settings
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-TAB 3: WHATSAPP CLOUD API & TWILIO WHATSAPP SETTINGS          */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "whatsapp" && (
        <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-6">
          <div className="border-b border-[#1a5e48] pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-400" /> WhatsApp Business Messaging Configuration
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Configure WhatsApp Cloud API (Meta) or Twilio WhatsApp to send direct interactive match challenges and tournament game time alerts to Ghanaian Mobile numbers (+233).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold">Enable WhatsApp:</span>
              <input
                type="checkbox"
                checked={whatsapp.enabled}
                onChange={(e) => setWhatsapp({ ...whatsapp, enabled: e.target.checked })}
                className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider Selection */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">
                WhatsApp Integration Gateway
              </label>
              <select
                value={whatsapp.provider}
                onChange={(e: any) => setWhatsapp({ ...whatsapp, provider: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              >
                <option value="whatsapp_cloud_api">WhatsApp Cloud API (Meta Graph API v20.0)</option>
                <option value="twilio_whatsapp">Twilio WhatsApp Messaging API</option>
                <option value="mock">Sandbox / Simulator Mode (Local Test Logs)</option>
              </select>
              <p className="text-[11px] text-slate-300">
                Meta WhatsApp Cloud API sends verified business messages with CTA action buttons.
              </p>
            </div>

            {/* Phone Number ID */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">
                {whatsapp.provider === "twilio_whatsapp" ? "Twilio Sender Number / WhatsApp From" : "Meta Phone Number ID"}
              </label>
              <input
                type="text"
                placeholder={whatsapp.provider === "twilio_whatsapp" ? "whatsapp:+14155238886" : "e.g. 109823498172345"}
                value={whatsapp.phoneNumberId || ""}
                onChange={(e) => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            {/* Business Account ID / Twilio Account SID */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">
                {whatsapp.provider === "twilio_whatsapp" ? "Twilio Account SID" : "Meta WhatsApp Business Account ID (WABA ID)"}
              </label>
              <input
                type="text"
                placeholder="e.g. 982347109283471"
                value={whatsapp.businessAccountId || ""}
                onChange={(e) => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            {/* Access Token / Auth Token */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#f5efdf]">
                  {whatsapp.provider === "twilio_whatsapp" ? "Twilio Auth Token" : "Meta Permanent System User Access Token"}
                </label>
                <button
                  type="button"
                  onClick={() => setShowWaSecret(!showWaSecret)}
                  className="text-slate-300 hover:text-white text-[11px] flex items-center gap-1"
                >
                  {showWaSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showWaSecret ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showWaSecret ? "text" : "password"}
                placeholder="EAAG...configured"
                value={whatsapp.accessToken || ""}
                onChange={(e) => setWhatsapp({ ...whatsapp, accessToken: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>
          </div>

          {/* WhatsApp Message Template Editors */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-[#d6a735] flex items-center gap-2">
              <MessageSquare size={14} /> WhatsApp Notification Message Templates
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  1v1 Match Challenge Message Template
                </label>
                <textarea
                  rows={3}
                  value={whatsapp.gameRequestTemplate}
                  onChange={(e) => setWhatsapp({ ...whatsapp, gameRequestTemplate: e.target.value })}
                  placeholder="⚔️ DAMII Match Challenge: {opponent} challenged you to a 10×10 Damii match ({stake}). Join room: {link}"
                  className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
                <p className="text-[10px] text-slate-400">
                  Placeholders: <span className="text-[#d6a735] font-mono">&#123;opponent&#125;, &#123;stake&#125;, &#123;roomCode&#125;, &#123;link&#125;</span>
                </p>
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Tournament Match Approaching Template
                </label>
                <textarea
                  rows={3}
                  value={whatsapp.tournamentAlertTemplate}
                  onChange={(e) => setWhatsapp({ ...whatsapp, tournamentAlertTemplate: e.target.value })}
                  placeholder="🏆 DAMII Tournament Alert: Your Round {round} match vs {opponent} in '{tournament}' is ready to play! Enter arena: {link}"
                  className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
                <p className="text-[10px] text-slate-400">
                  Placeholders: <span className="text-[#d6a735] font-mono">&#123;tournament&#125;, &#123;round&#125;, &#123;opponent&#125;, &#123;link&#125;</span>
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSaveCategory("whatsapp")}
              className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Save size={15} /> Save WhatsApp Configuration
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-TAB 4: SMS GATEWAYS (HUBTEL / ARKESEL / TWILIO)                */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "sms" && (
        <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-6">
          <div className="border-b border-[#1a5e48] pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Smartphone size={18} className="text-amber-400" /> SMS Gateway Providers & Ghana Telecom Routing
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Connect Hubtel, Arkesel, or Twilio SMS Gateways to deliver OTP codes, urgent tournament check-in notices, and direct match invites.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold">Enable SMS:</span>
              <input
                type="checkbox"
                checked={sms.enabled}
                onChange={(e) => setSms({ ...sms, enabled: e.target.checked })}
                className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provider Selection */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">SMS Gateway Provider</label>
              <select
                value={sms.provider}
                onChange={(e: any) => setSms({ ...sms, provider: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              >
                <option value="hubtel">Hubtel Ghana SMS API (MTN / Telecel / AT)</option>
                <option value="arkesel">Arkesel SMS Gateway (Ghana SMS)</option>
                <option value="twilio">Twilio Global Programmable SMS</option>
                <option value="mock">Sandbox / Simulator Mode</option>
              </select>
            </div>

            {/* Sender ID */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">
                SMS Sender ID (Alphanumeric 11 Chars)
              </label>
              <input
                type="text"
                maxLength={11}
                value={sms.senderId}
                onChange={(e) => setSms({ ...sms, senderId: e.target.value.toUpperCase() })}
                placeholder="DAMII"
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
              <p className="text-[10px] text-slate-400">
                Registered Sender ID displayed on player mobile devices (e.g. &quot;DAMII&quot;).
              </p>
            </div>

            {/* API Key / Client ID */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">
                API Key / Client ID
              </label>
              <input
                type="text"
                value={sms.apiKey || ""}
                onChange={(e) => setSms({ ...sms, apiKey: e.target.value })}
                placeholder="HUB-***-KEY"
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            {/* API Secret / Client Secret */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#f5efdf]">API Secret / Auth Token</label>
                <button
                  type="button"
                  onClick={() => setShowSmsSecret(!showSmsSecret)}
                  className="text-slate-300 hover:text-white text-[11px] flex items-center gap-1"
                >
                  {showSmsSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showSmsSecret ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showSmsSecret ? "text" : "password"}
                value={sms.clientSecret || ""}
                onChange={(e) => setSms({ ...sms, clientSecret: e.target.value })}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>
          </div>

          {/* SMS Templates */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-[#d6a735] flex items-center gap-2">
              <Smartphone size={14} /> SMS Message Templates
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Match Challenge SMS Template
                </label>
                <textarea
                  rows={2}
                  value={sms.matchInviteTemplate}
                  onChange={(e) => setSms({ ...sms, matchInviteTemplate: e.target.value })}
                  placeholder="DAMII Alert: {opponent} invited you to a {stake} match. Room #{roomCode}: {link}"
                  className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
                <label className="block text-xs font-bold text-[#f5efdf]">
                  Tournament Alert SMS Template
                </label>
                <textarea
                  rows={2}
                  value={sms.tournamentAlertTemplate}
                  onChange={(e) => setSms({ ...sms, tournamentAlertTemplate: e.target.value })}
                  placeholder="DAMII: Round {round} in '{tournament}' vs {opponent} is ready. Join: {link}"
                  className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSaveCategory("sms")}
              className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Save size={15} /> Save SMS Configuration
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-TAB 5: TRANSACTIONAL EMAIL CONFIGURATION                       */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "email" && (
        <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-6">
          <div className="border-b border-[#1a5e48] pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Mail size={18} className="text-cyan-400" /> Transactional Email Dispatch (SMTP & REST APIs)
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Configure SMTP host or cloud email providers (SendGrid, Mailgun, Postmark, AWS SES) for tournament placements and financial settlement statements.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold">Enable Email:</span>
              <input
                type="checkbox"
                checked={email.enabled}
                onChange={(e) => setEmail({ ...email, enabled: e.target.checked })}
                className="w-5 h-5 rounded accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Email Provider */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">Email Transport Engine</label>
              <select
                value={email.provider}
                onChange={(e: any) => setEmail({ ...email, provider: e.target.value })}
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              >
                <option value="smtp">Direct SMTP Server (Mailgun / Postmark / Custom)</option>
                <option value="sendgrid">Twilio SendGrid API</option>
                <option value="postmark">Postmark App API</option>
                <option value="ses">Amazon SES</option>
                <option value="mock">Sandbox / Simulator Mode</option>
              </select>
            </div>

            {/* Sender Email & Name */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">Sender Email Address</label>
              <input
                type="email"
                value={email.senderEmail}
                onChange={(e) => setEmail({ ...email, senderEmail: e.target.value })}
                placeholder="notifications@damii.game"
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">Sender Display Name</label>
              <input
                type="text"
                value={email.senderName}
                onChange={(e) => setEmail({ ...email, senderName: e.target.value })}
                placeholder="DAMII Draughts Arena"
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            {/* SMTP Host & Port */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">SMTP Host & Port</label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={email.smtpHost || ""}
                  onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
                  placeholder="smtp.mailgun.org"
                  className="col-span-2 px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
                <input
                  type="number"
                  value={email.smtpPort || 587}
                  onChange={(e) => setEmail({ ...email, smtpPort: Number(e.target.value) })}
                  placeholder="587"
                  className="px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
              </div>
            </div>

            {/* SMTP Username */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <label className="block text-xs font-bold text-[#f5efdf]">SMTP User / API Login</label>
              <input
                type="text"
                value={email.smtpUser || ""}
                onChange={(e) => setEmail({ ...email, smtpUser: e.target.value })}
                placeholder="postmaster@damii.game"
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            {/* SMTP Password / API Key */}
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#f5efdf]">SMTP Password / API Key</label>
                <button
                  type="button"
                  onClick={() => setShowEmailSecret(!showEmailSecret)}
                  className="text-slate-300 hover:text-white text-[11px] flex items-center gap-1"
                >
                  {showEmailSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showEmailSecret ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showEmailSecret ? "text" : "password"}
                value={email.smtpPassword || email.apiKey || ""}
                onChange={(e) => setEmail({ ...email, smtpPassword: e.target.value, apiKey: e.target.value })}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>
          </div>

          {/* =============================================================== */}
          {/* EMAIL TEMPLATE MANAGEMENT STUDIO (Tournament Approaching & Game Request) */}
          {/* =============================================================== */}
          <div className="p-5 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-5">
            <div className="border-b border-[#1a5e48] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-[#d6a735] flex items-center gap-2">
                  <FileText size={15} /> Email Template & Subject Line Management
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Configure custom email subject lines and body templates for automated match requests, tournament round approach notifications, and account alerts.
                </p>
              </div>

              {/* Template Category Selector Pills */}
              <div className="flex flex-wrap items-center gap-1 bg-[#081c15] p-1 border border-[#1a5e48] rounded-xl">
                <button
                  type="button"
                  onClick={() => setEmailTemplateTab("tournament_approaching")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    emailTemplateTab === "tournament_approaching"
                      ? "bg-[#d6a735] text-[#06261f] shadow-sm"
                      : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <Trophy size={13} /> Tournament Approaching
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTemplateTab("game_request")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    emailTemplateTab === "game_request"
                      ? "bg-[#d6a735] text-[#06261f] shadow-sm"
                      : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <Swords size={13} /> Game Request (1v1)
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTemplateTab("payout_alert")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    emailTemplateTab === "payout_alert"
                      ? "bg-[#d6a735] text-[#06261f] shadow-sm"
                      : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <Coins size={13} /> Payout Settlement
                </button>
                <button
                  type="button"
                  onClick={() => setEmailTemplateTab("welcome")}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                    emailTemplateTab === "welcome"
                      ? "bg-[#d6a735] text-[#06261f] shadow-sm"
                      : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <Sparkles size={13} /> Welcome Email
                </button>
              </div>
            </div>

            {/* TEMPLATE EDITOR & LIVE INBOX PREVIEW GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT COLUMN: TEMPLATE EDITOR CONTROLS (7 COLS) */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. TOURNAMENT APPROACHING TEMPLATE */}
                {emailTemplateTab === "tournament_approaching" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded border border-amber-500/30 uppercase">
                          Tournament Event
                        </span>
                        <span className="text-xs font-bold text-[#f5efdf]">Tournament Round Match Approaching</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEmail({
                            ...email,
                            tournamentApproachingSubject: DEFAULT_EMAIL_SETTINGS.tournamentApproachingSubject,
                            tournamentApproachingTemplate: DEFAULT_EMAIL_SETTINGS.tournamentApproachingTemplate,
                          })
                        }
                        className="text-[11px] text-slate-300 hover:text-[#d6a735] flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Reset to Default
                      </button>
                    </div>

                    {/* Subject Line Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf] flex items-center justify-between">
                        <span>Email Subject Line Template</span>
                        <span className="text-[10px] text-slate-300">
                          {(email.tournamentApproachingSubject || DEFAULT_EMAIL_SETTINGS.tournamentApproachingSubject || "").length} chars
                        </span>
                      </label>
                      <input
                        type="text"
                        value={email.tournamentApproachingSubject ?? DEFAULT_EMAIL_SETTINGS.tournamentApproachingSubject ?? ""}
                        onChange={(e) => setEmail({ ...email, tournamentApproachingSubject: e.target.value })}
                        placeholder="🏆 Tournament Match Approaching: Round {round} in '{tournament}' | DAMII"
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    {/* Body Template Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf] flex items-center justify-between">
                        <span>Email Body Template (Plaintext & Styled HTML Content)</span>
                        <span className="text-[10px] text-slate-300">
                          {(email.tournamentApproachingTemplate ?? DEFAULT_EMAIL_SETTINGS.tournamentApproachingTemplate ?? "").length} chars
                        </span>
                      </label>
                      <textarea
                        rows={7}
                        value={email.tournamentApproachingTemplate ?? DEFAULT_EMAIL_SETTINGS.tournamentApproachingTemplate ?? ""}
                        onChange={(e) => setEmail({ ...email, tournamentApproachingTemplate: e.target.value })}
                        placeholder="Hello {recipient},&#10;&#10;Your Round {round} tournament match against {opponent} in '{tournament}' is scheduled and approaching!&#10;&#10;Please click below to check in:&#10;{link}"
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735] leading-relaxed"
                      />
                    </div>

                    {/* Available Variable Tags Toolbar */}
                    <div className="p-3 bg-[#081c15] border border-[#1a5e48] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                          <Code size={13} className="text-[#d6a735]" /> Available Dynamic Variable Tokens:
                        </span>
                        {copiedToken && (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Check size={11} /> Copied {copiedToken}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { tag: "{recipient}", desc: "Player Name" },
                          { tag: "{opponent}", desc: "Opponent Name" },
                          { tag: "{tournament}", desc: "Tournament Title" },
                          { tag: "{round}", desc: "Round Number" },
                          { tag: "{link}", desc: "Arena Link" },
                          { tag: "{appName}", desc: "DAMII Arena" },
                        ].map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => handleCopyTag(v.tag)}
                            title={`Click to copy ${v.tag} (${v.desc})`}
                            className="px-2 py-1 bg-[#041c17] hover:bg-[#0c3b2e] border border-[#1a5e48] rounded-lg text-[11px] font-mono text-[#d6a735] flex items-center gap-1 hover:border-[#d6a735] transition-all"
                          >
                            <Copy size={10} className="text-slate-300" />
                            {v.tag}
                            <span className="text-[9px] text-slate-300 font-sans">({v.desc})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. GAME REQUEST TEMPLATE */}
                {emailTemplateTab === "game_request" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[10px] font-bold rounded border border-blue-500/30 uppercase">
                          1v1 Challenge
                        </span>
                        <span className="text-xs font-bold text-[#f5efdf]">Direct 1-on-1 Game Challenge Request</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEmail({
                            ...email,
                            gameRequestSubject: DEFAULT_EMAIL_SETTINGS.gameRequestSubject,
                            gameRequestTemplate: DEFAULT_EMAIL_SETTINGS.gameRequestTemplate,
                          })
                        }
                        className="text-[11px] text-slate-300 hover:text-[#d6a735] flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Reset to Default
                      </button>
                    </div>

                    {/* Subject Line Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf] flex items-center justify-between">
                        <span>Email Subject Line Template</span>
                        <span className="text-[10px] text-slate-300">
                          {(email.gameRequestSubject ?? DEFAULT_EMAIL_SETTINGS.gameRequestSubject ?? "").length} chars
                        </span>
                      </label>
                      <input
                        type="text"
                        value={email.gameRequestSubject ?? DEFAULT_EMAIL_SETTINGS.gameRequestSubject ?? ""}
                        onChange={(e) => setEmail({ ...email, gameRequestSubject: e.target.value })}
                        placeholder="⚔️ Match Challenge from {opponent} | DAMII Arena"
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    {/* Body Template Field */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf] flex items-center justify-between">
                        <span>Email Body Template (Plaintext & Styled HTML Content)</span>
                        <span className="text-[10px] text-slate-300">
                          {(email.gameRequestTemplate ?? DEFAULT_EMAIL_SETTINGS.gameRequestTemplate ?? "").length} chars
                        </span>
                      </label>
                      <textarea
                        rows={7}
                        value={email.gameRequestTemplate ?? DEFAULT_EMAIL_SETTINGS.gameRequestTemplate ?? ""}
                        onChange={(e) => setEmail({ ...email, gameRequestTemplate: e.target.value })}
                        placeholder="Hello {recipient},&#10;&#10;{opponent} has challenged you to a 10×10 Damii match ({stake}) in Room #{roomCode}!&#10;&#10;Join room:&#10;{link}"
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735] leading-relaxed"
                      />
                    </div>

                    {/* Available Variable Tags Toolbar */}
                    <div className="p-3 bg-[#081c15] border border-[#1a5e48] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                          <Code size={13} className="text-[#d6a735]" /> Available Dynamic Variable Tokens:
                        </span>
                        {copiedToken && (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Check size={11} /> Copied {copiedToken}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { tag: "{recipient}", desc: "Recipient Player" },
                          { tag: "{opponent}", desc: "Challenger Name" },
                          { tag: "{stake}", desc: "Wager / Free" },
                          { tag: "{roomCode}", desc: "Room Number" },
                          { tag: "{link}", desc: "Direct Game Link" },
                          { tag: "{appName}", desc: "DAMII Arena" },
                        ].map((v) => (
                          <button
                            key={v.tag}
                            type="button"
                            onClick={() => handleCopyTag(v.tag)}
                            title={`Click to copy ${v.tag} (${v.desc})`}
                            className="px-2 py-1 bg-[#041c17] hover:bg-[#0c3b2e] border border-[#1a5e48] rounded-lg text-[11px] font-mono text-[#d6a735] flex items-center gap-1 hover:border-[#d6a735] transition-all"
                          >
                            <Copy size={10} className="text-slate-300" />
                            {v.tag}
                            <span className="text-[9px] text-slate-300 font-sans">({v.desc})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. PAYOUT ALERT TEMPLATE */}
                {emailTemplateTab === "payout_alert" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30 uppercase">
                          Wallet & MoMo
                        </span>
                        <span className="text-xs font-bold text-[#f5efdf]">Financial Settlement & Withdrawal Receipt</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEmail({
                            ...email,
                            payoutAlertSubject: DEFAULT_EMAIL_SETTINGS.payoutAlertSubject,
                            payoutAlertTemplate: DEFAULT_EMAIL_SETTINGS.payoutAlertTemplate,
                          })
                        }
                        className="text-[11px] text-slate-300 hover:text-[#d6a735] flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Reset to Default
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf]">Email Subject Line Template</label>
                      <input
                        type="text"
                        value={email.payoutAlertSubject ?? DEFAULT_EMAIL_SETTINGS.payoutAlertSubject ?? ""}
                        onChange={(e) => setEmail({ ...email, payoutAlertSubject: e.target.value })}
                        placeholder="💰 DAMII Wallet Withdrawal Processed"
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf]">Email Body Template</label>
                      <textarea
                        rows={6}
                        value={email.payoutAlertTemplate}
                        onChange={(e) => setEmail({ ...email, payoutAlertTemplate: e.target.value })}
                        placeholder="Your withdrawal of GHS {amount} via Mobile Money ({phone}) has been processed successfully."
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  </div>
                )}

                {/* 4. WELCOME TEMPLATE */}
                {emailTemplateTab === "welcome" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded border border-purple-500/30 uppercase">
                          Onboarding
                        </span>
                        <span className="text-xs font-bold text-[#f5efdf]">New Player Account Registration</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEmail({
                            ...email,
                            welcomeSubject: DEFAULT_EMAIL_SETTINGS.welcomeSubject,
                            welcomeTemplate: DEFAULT_EMAIL_SETTINGS.welcomeTemplate,
                          })
                        }
                        className="text-[11px] text-slate-300 hover:text-[#d6a735] flex items-center gap-1"
                      >
                        <RotateCcw size={12} /> Reset to Default
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf]">Email Subject Line Template</label>
                      <input
                        type="text"
                        value={email.welcomeSubject ?? DEFAULT_EMAIL_SETTINGS.welcomeSubject ?? ""}
                        onChange={(e) => setEmail({ ...email, welcomeSubject: e.target.value })}
                        placeholder="Welcome to DAMII 10x10 Draughts Arena"
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#f5efdf]">Email Body Template</label>
                      <textarea
                        rows={6}
                        value={email.welcomeTemplate}
                        onChange={(e) => setEmail({ ...email, welcomeTemplate: e.target.value })}
                        placeholder="Welcome to DAMII, {recipient}! Master the 10x10 board, challenge players across Ghana, and compete in ranked tournaments."
                        className="w-full px-3 py-2 bg-[#081c15] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  </div>
                )}

                {/* DIRECT TEMPLATE TEST SENDER FORM */}
                <div className="p-4 bg-[#081c15] border border-[#1a5e48] rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                      <Send size={13} className="text-[#d6a735]" /> Test Send This Specific Template
                    </label>
                    <span className="text-[10px] text-slate-300">Interpolates sample match data</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="player@example.com"
                      className="flex-1 px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                    />
                    <button
                      type="button"
                      disabled={testEmailSending}
                      onClick={() => handleSendTemplateTestEmail(emailTemplateTab)}
                      className="px-4 py-2 bg-[#0c3b2e] hover:bg-[#114232] border border-[#d6a735]/40 hover:border-[#d6a735] text-[#d6a735] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                    >
                      {testEmailSending ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      {testEmailSending ? "Sending..." : "Send Test Email"}
                    </button>
                  </div>

                  {testEmailFeedback && (
                    <div
                      className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        testEmailFeedback.success
                          ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                          : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
                      }`}
                    >
                      {testEmailFeedback.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      <span>{testEmailFeedback.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE INBOX & EMAIL HTML RENDER PREVIEW (5 COLS) */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[#f5efdf] flex items-center gap-1.5">
                    <Eye size={14} className="text-[#d6a735]" /> Live Recipient Inbox Preview
                  </span>
                  <span className="text-[10px] text-slate-300 uppercase tracking-wider">HTML Render</span>
                </div>

                {/* Email Client Container Mockup */}
                <div className="border border-[#1a5e48] rounded-2xl bg-[#081c15] overflow-hidden shadow-2xl">
                  {/* Mail Client Header Bar */}
                  <div className="p-3 bg-[#041c17] border-b border-[#1a5e48] space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-slate-300">From:</span>
                      <span className="text-[#d6a735] truncate max-w-[200px]">
                        {email.senderName || "DAMII Draughts"} &lt;{email.senderEmail || "notifications@damii.game"}&gt;
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-slate-300">To:</span>
                      <span className="text-slate-200">Kwame_Master &lt;kwame@example.com&gt;</span>
                    </div>
                    <div className="pt-1 border-t border-[#114232]/80 flex items-start gap-1">
                      <span className="font-semibold text-slate-300 whitespace-nowrap">Subject:</span>
                      <span className="font-bold text-white leading-tight">
                        {emailTemplateTab === "tournament_approaching"
                          ? interpolatePreview(
                              email.tournamentApproachingSubject || DEFAULT_EMAIL_SETTINGS.tournamentApproachingSubject || ""
                            )
                          : emailTemplateTab === "game_request"
                          ? interpolatePreview(
                              email.gameRequestSubject || DEFAULT_EMAIL_SETTINGS.gameRequestSubject || ""
                            )
                          : emailTemplateTab === "payout_alert"
                          ? interpolatePreview(
                              email.payoutAlertSubject || DEFAULT_EMAIL_SETTINGS.payoutAlertSubject || ""
                            )
                          : interpolatePreview(
                              email.welcomeSubject || DEFAULT_EMAIL_SETTINGS.welcomeSubject || ""
                            )}
                      </span>
                    </div>
                  </div>

                  {/* Rendered Email Layout Preview */}
                  <div className="p-4 space-y-4 bg-[#081c15]">
                    {/* Header Banner */}
                    <div className="p-3.5 bg-gradient-to-br from-[#0b291e] to-[#06261f] border-b-2 border-[#d6a735] rounded-t-xl text-center">
                      <h5 className="font-extrabold text-sm text-[#d6a735] tracking-widest uppercase">
                        DAMII
                      </h5>
                      <p className="text-[10px] text-emerald-300 uppercase tracking-wider">
                        10×10 Draughts Championship Arena
                      </p>
                    </div>

                    {/* Email Message Content */}
                    <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-3">
                      <div className="text-[12px] text-slate-200 leading-relaxed whitespace-pre-line">
                        {emailTemplateTab === "tournament_approaching"
                          ? interpolatePreview(
                              email.tournamentApproachingTemplate ||
                                DEFAULT_EMAIL_SETTINGS.tournamentApproachingTemplate ||
                                ""
                            )
                          : emailTemplateTab === "game_request"
                          ? interpolatePreview(
                              email.gameRequestTemplate ||
                                DEFAULT_EMAIL_SETTINGS.gameRequestTemplate ||
                                ""
                            )
                          : emailTemplateTab === "payout_alert"
                          ? interpolatePreview(
                              email.payoutAlertTemplate ||
                                DEFAULT_EMAIL_SETTINGS.payoutAlertTemplate ||
                                ""
                            )
                          : interpolatePreview(
                              email.welcomeTemplate || DEFAULT_EMAIL_SETTINGS.welcomeTemplate || ""
                            )}
                      </div>

                      {/* Mock CTA Button */}
                      <div className="pt-2 text-center">
                        <span className="inline-block px-4 py-2 bg-[#d6a735] text-[#06261f] font-extrabold text-xs rounded-xl shadow-md cursor-pointer hover:bg-[#b88c24]">
                          {emailTemplateTab === "tournament_approaching"
                            ? "Enter Tournament Arena & Check-in"
                            : emailTemplateTab === "game_request"
                            ? "Accept Challenge & Enter Room"
                            : emailTemplateTab === "payout_alert"
                            ? "View Wallet Statement"
                            : "Explore DAMII Arena"}
                        </span>
                      </div>
                    </div>

                    {/* Mock Footer */}
                    <div className="text-center text-[10px] text-slate-300 pt-1 space-y-0.5">
                      <p>You received this automated notification as a registered player on DAMII.</p>
                      <p>© {new Date().getFullYear()} DAMII Draughts Arena. All rights reserved.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSaveCategory("email")}
              className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
            >
              <Save size={15} /> Save Email Configuration
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-TAB 6: TEST DISPATCH SIMULATOR & INTERACTIVE VERIFIER          */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "simulator" && (
        <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-6">
          <div className="border-b border-[#1a5e48] pb-3">
            <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
              <Send size={18} className="text-[#d6a735]" /> Real-Time Multi-Channel Notification Test Simulator
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Trigger live test notifications across In-App, WhatsApp, SMS, or Email to verify delivery status, template rendering, and interactive action URLs.
            </p>
          </div>

          <form onSubmit={handleSendTestNotification} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-200 text-xs font-bold mb-1">Target Channel</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "in_app" as NotificationChannel, label: "In-App Chime", icon: Bell },
                    { id: "whatsapp" as NotificationChannel, label: "WhatsApp", icon: MessageSquare },
                    { id: "sms" as NotificationChannel, label: "SMS Gateway", icon: Smartphone },
                    { id: "email" as NotificationChannel, label: "Email", icon: Mail },
                  ].map((ch) => {
                    const ChIcon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setTestChannel(ch.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          testChannel === ch.id
                            ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-md"
                            : "bg-[#041c17] text-slate-200 border-[#1a5e48] hover:bg-[#0c3b2e]"
                        }`}
                      >
                        <ChIcon size={14} /> {ch.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-slate-200 text-xs font-bold mb-1">
                  Recipient ({testChannel === "email" ? "Email Address" : testChannel === "in_app" ? "Username / Token" : "Phone +233..."})
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    testChannel === "email"
                      ? "player@gmail.com"
                      : testChannel === "in_app"
                      ? "Kwame_Master"
                      : "+233241234567 or 0241234567"
                  }
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-200 text-xs font-bold mb-1">Alert Title</label>
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div>
                <label className="block text-slate-200 text-xs font-bold mb-1">Direct Action Link URL</label>
                <input
                  type="text"
                  value={testActionUrl}
                  onChange={(e) => setTestActionUrl(e.target.value)}
                  placeholder="/arena?code=82914&join=1"
                  className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs font-mono text-[#d6a735] focus:outline-none focus:border-[#d6a735]"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-200 text-xs font-bold mb-1">Message Body</label>
              <textarea
                rows={2}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3 py-2 bg-[#041c17] border border-[#1a5e48] rounded-xl text-xs text-[#f8fafc] focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setTestTitle("🏆 Tournament Round 2 Match Ready");
                  setTestMessage("Your DAMII Grandmasters Round 2 match vs Ama_Queen is ready in Room #44102. Click to enter!");
                  setTestActionUrl("/arena?code=44102&mode=league");
                  setTestActionLabel("Join Tournament Match");
                }}
                className="text-[11px] text-[#d6a735] hover:underline"
              >
                Load Sample Tournament Alert
              </button>

              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl shadow-md flex items-center gap-2"
              >
                <Send size={15} /> Dispatch Test Alert Now
              </button>
            </div>
          </form>

          {/* SIMULATOR RESPONSE PREVIEW */}
          {simulatorStatus && (
            <div className="p-4 bg-[#041c17] border border-[#1a5e48] rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 size={16} /> {simulatorStatus.message}
              </div>
              <pre className="p-3 bg-[#081c15] rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto">
                {JSON.stringify(simulatorStatus.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SUB-TAB 7: DELIVERY AUDIT LOGS                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "logs" && (
        <div className="p-6 bg-[#081c15] border border-[#1a5e48] rounded-2xl shadow-xl space-y-4">
          <div className="border-b border-[#1a5e48] pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#f5efdf] flex items-center gap-2">
                <Clock size={18} className="text-[#d6a735]" /> Real-Time Multi-Channel Dispatch Logs
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Audit trail of recent notifications dispatched across In-App, WhatsApp, SMS, and Email with delivery receipts.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchSettings}
              className="text-xs text-slate-300 hover:text-white flex items-center gap-1"
            >
              <RefreshCw size={13} /> Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1a5e48] bg-[#041c17]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1a5e48] bg-[#06261f] text-[11px] uppercase text-slate-300 font-bold">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Title / Message</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Direct Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a5e48]/40 font-mono text-[11px]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 italic font-sans">
                      No notifications logged in the current session. Send a test alert above to verify.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#081c15]/50">
                      <td className="py-2 px-3 text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 px-3 font-bold uppercase text-slate-200">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            log.channel === "whatsapp"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                              : log.channel === "sms"
                              ? "bg-amber-950 text-amber-300 border border-amber-700/50"
                              : log.channel === "email"
                              ? "bg-cyan-950 text-cyan-300 border border-cyan-700/50"
                              : "bg-[#06261f] text-[#d6a735] border border-[#1a5e48]"
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#f5efdf] font-bold">
                        {log.recipientContact || log.recipientToken || "Broadcast"}
                      </td>
                      <td className="py-2 px-3 text-slate-300 font-sans max-w-xs truncate">
                        <strong className="text-[#f5efdf]">{log.title}</strong>: {log.message}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                          <Check size={11} /> {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[#d6a735] text-[10px]">
                        {log.actionUrl || "-"}
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

export default NotificationSettings;
