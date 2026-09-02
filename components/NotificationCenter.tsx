"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { safeNavigate } from "@/components/NavLink";
import {
  Bell,
  Volume2,
  VolumeX,
  Swords,
  Trophy,
  Clock,
  Zap,
  Check,
  CheckCheck,
  X,
  ExternalLink,
  MessageSquare,
  Mail,
  Smartphone,
  Settings2,
  Sparkles,
  Play,
  Send,
  Radio,
  Coins,
  Shield,
} from "lucide-react";
import { soundService } from "@/lib/sound-service";
import type { NotificationItem, UserNotificationPreferences, NotificationType } from "@/lib/types";

export interface NotificationCenterProps {
  userToken: string | null;
  username: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
  showDesktopTrigger?: boolean;
}

export function NotificationCenter({
  userToken,
  username,
  isOpen: propIsOpen,
  onOpenChange,
  onUnreadCountChange,
  showDesktopTrigger = true,
}: NotificationCenterProps) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = typeof propIsOpen === "boolean";
  const isOpen = isControlled ? propIsOpen : internalIsOpen;

  const setOpen = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      const nextVal = typeof val === "function" ? val(isOpen) : val;
      if (!isControlled) {
        setInternalIsOpen(nextVal);
      }
      onOpenChange?.(nextVal);
    },
    [isControlled, isOpen, onOpenChange]
  );

  const [activeTab, setActiveTab] = useState<"all" | "games" | "tournaments" | "wallet">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState("");

  // Listen for global custom events to open/toggle notifications from any mobile or desktop trigger
  useEffect(() => {
    const handleToggle = () => setOpen((prev) => !prev);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    window.addEventListener("damii-toggle-notifications", handleToggle);
    window.addEventListener("damii-open-notifications", handleOpen);
    window.addEventListener("damii-close-notifications", handleClose);

    return () => {
      window.removeEventListener("damii-toggle-notifications", handleToggle);
      window.removeEventListener("damii-open-notifications", handleOpen);
      window.removeEventListener("damii-close-notifications", handleClose);
    };
  }, [setOpen]);

  // Track known notification IDs to detect fresh incoming ones for audio chime & toast banner
  const prevNotificationIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize sound mute state from soundService
  useEffect(() => {
    const s = soundService.getSettings();
    setIsSoundMuted(!s.master || !s.notification);
  }, []);

  // Load read notification IDs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("damii-read-notifications");
      if (saved) {
        setReadIds(JSON.parse(saved));
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Fetch notifications and preferences from API
  const fetchNotifications = useCallback(async () => {
    if (!userToken) {
      setNotifications([]);
      return;
    }

    try {
      const res = await fetch(`/api/notifications?token=${encodeURIComponent(userToken)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data.notifications)) {
        const incoming: NotificationItem[] = data.notifications;
        setNotifications(incoming);

        if (data.preferences) {
          setPreferences(data.preferences);
        }

        // On first load, record existing IDs without triggering audio alarms
        if (!initialLoadDoneRef.current) {
          prevNotificationIdsRef.current = new Set(incoming.map((n) => n.id));
          initialLoadDoneRef.current = true;
          return;
        }

        // Detect genuinely new notifications
        const currentSavedRead = new Set<string>();
        try {
          const saved = localStorage.getItem("damii-read-notifications");
          if (saved) JSON.parse(saved).forEach((id: string) => currentSavedRead.add(id));
        } catch {
          /* ignore */
        }

        const freshItems = incoming.filter(
          (n) => !prevNotificationIdsRef.current.has(n.id) && !currentSavedRead.has(n.id)
        );

        if (freshItems.length > 0) {
          const latest = freshItems[0];

          // Trigger audio chime via Web Audio API
          const soundAllowed = !isSoundMuted && (data.preferences?.inAppSound ?? true);
          if (soundAllowed) {
            soundService.playNotification(latest.type);
          }

          // Show floating in-app toast banner
          if (data.preferences?.inAppToast ?? true) {
            setActiveToast(latest);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = setTimeout(() => {
              setActiveToast(null);
            }, 9000);
          }

          // Update known set
          incoming.forEach((n) => prevNotificationIdsRef.current.add(n.id));
        }
      }
    } catch {
      /* ignore fetch errors during polling */
    }
  }, [userToken, isSoundMuted]);

  // Polling loop every 3.5 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3500);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Mark all as read
  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem("damii-read-notifications", JSON.stringify(allIds));
    } catch {
      /* ignore */
    }
    // Also notify server
    if (userToken) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", token: userToken, id: "all" }),
      }).catch(() => undefined);
    }
  };

  // Mark single item read
  const handleMarkSingleRead = (id: string) => {
    const updated = Array.from(new Set([...readIds, id]));
    setReadIds(updated);
    try {
      localStorage.setItem("damii-read-notifications", JSON.stringify(updated));
    } catch {
      /* ignore */
    }
    if (userToken) {
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", token: userToken, id }),
      }).catch(() => undefined);
    }
  };

  // Toggle notification sound
  const toggleSound = () => {
    const current = soundService.getSettings();
    const nextState = !current.notification;
    soundService.setSettings({ notification: nextState });
    setIsSoundMuted(!nextState);

    // If unmuting, play a confirmation blip
    if (nextState) {
      soundService.playNotification("default");
    }

    if (userToken && preferences) {
      const updatedPrefs = { ...preferences, inAppSound: nextState };
      setPreferences(updatedPrefs);
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_preferences",
          token: userToken,
          preferences: updatedPrefs,
        }),
      }).catch(() => undefined);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (newPrefs: Partial<UserNotificationPreferences>) => {
    if (!userToken) return;
    const merged = { ...(preferences || {}), ...newPrefs } as UserNotificationPreferences;
    setPreferences(merged);

    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_preferences",
          token: userToken,
          preferences: merged,
        }),
      });
    } catch {
      /* ignore */
    }
  };

  // Send Test Notification
  const handleSendTestNotification = async (type: NotificationType) => {
    if (!userToken) return;
    setIsTesting(true);
    setTestFeedback("");

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_notification",
          token: userToken,
          type,
        }),
      });

      const data = await res.json();
      if (data.notification) {
        // Trigger sound test immediately
        soundService.playNotification(type);
        setActiveToast(data.notification);
        setTestFeedback(`Test ${type.replace("_", " ")} alert dispatched!`);
        fetchNotifications();
      }
    } catch {
      setTestFeedback("Failed to trigger test notification.");
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestFeedback(""), 3000);
    }
  };

  // Handle direct navigation on click
  const handleActionClick = (notification: NotificationItem) => {
    handleMarkSingleRead(notification.id);
    setActiveToast(null);
    setOpen(false);
    if (notification.link) {
      safeNavigate(router, notification.link);
    }
  };

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  // Filter by active tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "games") return n.type === "game_request" || n.type === "turn_reminder";
    if (activeTab === "tournaments") return n.type === "tournament_match" || n.type === "tournament_alert" || n.type === "league_invite";
    if (activeTab === "wallet") return n.type === "wager_settlement";
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "game_request":
        return <Swords size={16} className="text-amber-400" />;
      case "tournament_match":
      case "tournament_alert":
      case "league_invite":
        return <Trophy size={16} className="text-[#d6a735]" />;
      case "turn_reminder":
        return <Clock size={16} className="text-sky-400" />;
      case "wager_settlement":
        return <Coins size={16} className="text-emerald-400" />;
      case "admin":
        return <Shield size={16} className="text-red-400" />;
      default:
        return <Sparkles size={16} className="text-sky-400" />;
    }
  };

  if (!userToken && !isOpen && !activeToast) return null;

  return (
    <>
      {/* ------------------------------------------------------------------- */}
      {/* FLOATING IN-APP TOAST BANNER (Triggered on challenge or alert)       */}
      {/* ------------------------------------------------------------------- */}
      {activeToast && (
        <aside
          role="status"
          aria-live="polite"
          aria-label="New notification banner"
          className="fixed top-18 right-4 md:right-8 z-50 max-w-md w-[calc(100vw-2rem)] bg-[#06261f] border-2 border-[#d6a735] rounded-2xl shadow-2xl p-4 text-[#f5efdf] animate-in slide-in-from-top-4 duration-300 backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#d6a735]/20 border border-[#d6a735]/40 flex items-center justify-center shrink-0">
                {getNotificationIcon(activeToast.type)}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#d6a735] flex items-center gap-1">
                  <Radio size={10} className="animate-pulse text-emerald-400" /> New Alert
                </span>
                <h4 className="text-sm font-black text-[#f5efdf] leading-snug">{activeToast.title}</h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="p-1 hover:bg-[#0c3b2e] rounded-lg text-slate-400 hover:text-[#f5efdf]"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-xs text-[#cbd5e1] mt-2 mb-3 leading-relaxed">{activeToast.message}</p>

          <div className="flex items-center gap-2 pt-1 border-t border-[#0c3b2e]">
            {activeToast.link && (
              <button
                type="button"
                onClick={() => handleActionClick(activeToast)}
                className="flex-1 py-2 px-3 bg-gradient-to-r from-[#d6a735] to-[#c2962e] hover:from-[#e5b642] hover:to-[#d6a735] text-[#06261f] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-transform hover:scale-[1.02]"
              >
                <Play size={13} fill="#06261f" />
                <span>{activeToast.actionLabel || "Open Game"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                handleMarkSingleRead(activeToast.id);
                setActiveToast(null);
              }}
              className="py-2 px-3 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 hover:text-white font-bold text-xs rounded-xl"
            >
              Dismiss
            </button>
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* NOTIFICATION BELL BUTTON WITH AUDIO & UNREAD BADGES (OPTIONAL TRIGGER)*/}
      {/* ------------------------------------------------------------------- */}
      {showDesktopTrigger && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
            className="relative p-2 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] rounded-xl border border-[#d6a735]/40 transition-colors flex items-center justify-center shadow-sm cursor-pointer"
            title="Notifications & Game Alerts"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-gradient-to-br from-[#d6a735] to-amber-500 text-[#06261f] font-black text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* NOTIFICATION BACKDROP OVERLAY                                     */}
      {/* ----------------------------------------------------------------- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-xs transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ----------------------------------------------------------------- */}
      {/* NOTIFICATION DRAWER / POPOVER (BOTTOM SHEET ON MOBILE, POPOVER ON DESKTOP) */}
      {/* ----------------------------------------------------------------- */}
      {isOpen && (
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Alerts and In-App Notifications"
          className="fixed inset-x-0 bottom-0 md:bottom-auto md:top-16 md:right-6 md:left-auto md:w-96 max-h-[85vh] md:max-h-[620px] bg-[#06261f] border-t-2 md:border-2 border-[#d6a735]/60 rounded-t-3xl md:rounded-2xl shadow-2xl z-[150] text-left text-[#f5efdf] animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-200 flex flex-col overflow-hidden"
        >
          {/* Mobile Drag Handle / Dismiss Touch Bar */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Dismiss notification drawer"
            className="w-full py-2.5 shrink-0 md:hidden flex justify-center items-center focus:outline-none cursor-pointer group"
          >
            <div className="w-12 h-1.5 bg-[#d6a735]/40 group-hover:bg-[#d6a735] rounded-full transition-colors" />
          </button>

          {/* Header with Title & Quick Controls */}
          <div className="p-3.5 bg-gradient-to-b from-[#081c15] to-[#06261f] border-b border-[#0c3b2e] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#d6a735]/20 flex items-center justify-center text-[#d6a735]">
                <Bell size={15} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[#f5efdf] uppercase tracking-wider">Alerts & In-App Feed</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span>{notifications.length} Total</span>
                  {unreadCount > 0 && <span className="text-[#d6a735] font-bold">• {unreadCount} New</span>}
                </div>
              </div>
            </div>

            {/* Sound toggle & Settings action & Close button */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSound}
                title={isSoundMuted ? "Unmute In-App Notification Audio" : "Mute In-App Notification Audio"}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isSoundMuted
                    ? "bg-red-950/40 border-red-800/60 text-red-400"
                    : "bg-[#0c3b2e] border-[#d6a735]/40 text-[#d6a735]"
                }`}
              >
                {isSoundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                title="Notification Channel Settings (WhatsApp, SMS, Email)"
                className="p-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 hover:text-[#d6a735] rounded-lg border border-[#184d3c] transition-colors cursor-pointer"
              >
                <Settings2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="Close notification drawer"
                aria-label="Close notification drawer"
                className="p-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 hover:text-white rounded-lg border border-[#184d3c] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center px-3 py-1.5 bg-[#081c15]/60 border-b border-[#0c3b2e] gap-1 text-[11px] font-bold overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === "all" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("games")}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === "games" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-white"
                }`}
              >
                <Swords size={11} /> Match Challenges
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tournaments")}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === "tournaments" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-white"
                }`}
              >
                <Trophy size={11} /> Tournaments
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("wallet")}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 ${
                  activeTab === "wallet" ? "bg-[#d6a735] text-[#06261f]" : "text-slate-400 hover:text-white"
                }`}
              >
                <Coins size={11} /> Settlements
              </button>
            </div>

            {/* Notification Items List */}
            <div className="max-h-80 overflow-y-auto p-2.5 space-y-2 scrollbar-thin">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#0c3b2e] flex items-center justify-center mx-auto text-slate-500">
                    <Bell size={18} />
                  </div>
                  <p className="text-xs">
                    {!userToken
                      ? "Sign in to receive match alerts, game invites, and payouts."
                      : "No notifications in this category"}
                  </p>
                  {!userToken && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        window.dispatchEvent(new CustomEvent("damii-open-auth", { detail: "login" }));
                      }}
                      className="mt-3 px-4 py-2 bg-[#d6a735] hover:bg-[#e2b542] text-[#06261f] font-black text-xs rounded-xl shadow-md cursor-pointer transition-all"
                    >
                      Sign In to DAMII
                    </button>
                  )}
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const isUnread = !readIds.includes(n.id);
                  const isGameOrMatch = n.type === "game_request" || n.type === "tournament_match";

                  return (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border transition-all relative ${
                        isUnread
                          ? "bg-gradient-to-br from-[#0c3b2e] to-[#082a20] border-[#d6a735]/60 shadow-md"
                          : "bg-[#0c3b2e]/40 border-[#184d3c] opacity-85"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#06261f] border border-[#184d3c] flex items-center justify-center shrink-0">
                          {getNotificationIcon(n.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <strong className="text-xs font-black text-[#f5efdf] truncate block">{n.title}</strong>
                            <span className="text-[9px] text-slate-400 shrink-0">
                              {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                            </span>
                          </div>

                          <p className="text-[11px] text-[#cbd5e1] leading-relaxed mb-2.5">{n.message}</p>

                          {/* Direct Action Link / Button */}
                          <div className="flex items-center gap-2">
                            {n.link && (
                              <button
                                type="button"
                                onClick={() => handleActionClick(n)}
                                className={`py-1 px-2.5 rounded-lg text-[11px] font-black flex items-center gap-1.5 transition-transform hover:scale-[1.02] ${
                                  isGameOrMatch
                                    ? "bg-gradient-to-r from-[#d6a735] to-[#c2962e] text-[#06261f] shadow-sm"
                                    : "bg-[#06261f] border border-[#d6a735]/40 text-[#d6a735] hover:bg-[#0c3b2e]"
                                }`}
                              >
                                {isGameOrMatch ? <Play size={10} fill="#06261f" /> : <ExternalLink size={10} />}
                                <span>{n.actionLabel || "View Action"}</span>
                              </button>
                            )}

                            {isUnread && (
                              <button
                                type="button"
                                onClick={() => handleMarkSingleRead(n.id)}
                                title="Mark as read"
                                className="p-1 hover:bg-[#144435] text-slate-400 hover:text-[#d6a735] rounded-md transition-colors text-[10px] flex items-center gap-1"
                              >
                                <Check size={11} /> Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Mark All Read & Multi-Channel Test */}
            <div className="p-3 bg-[#081c15] border-t border-[#0c3b2e] flex items-center justify-between text-[11px] pb-6 sm:pb-3">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="text-[#d6a735] hover:underline font-bold flex items-center gap-1"
              >
                <Smartphone size={12} /> WhatsApp / SMS / Email Settings
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-slate-400 hover:text-white font-semibold flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>
          </aside>
        )}

      {/* ------------------------------------------------------------------- */}
      {/* MULTI-CHANNEL PREFERENCES & DISPATCH SETTINGS MODAL                 */}
      {/* ------------------------------------------------------------------- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#06261f] border-2 border-[#d6a735] rounded-3xl max-w-lg w-full p-6 text-[#f5efdf] shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#0c3b2e] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#d6a735]/20 border border-[#d6a735]/50 flex items-center justify-center text-[#d6a735]">
                  <Radio size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#f5efdf]">Notification & Audio Controls</h3>
                  <p className="text-xs text-slate-400">Configure in-app alerts and multi-channel delivery routes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 hover:bg-[#0c3b2e] rounded-xl text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
              {/* 1. In-App Audio & Sound Alerts */}
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-[#d6a735]" />
                    <strong className="text-xs font-black">In-App Audio Chimes</strong>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSound}
                    className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
                      !isSoundMuted ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-red-500/20 text-red-300 border border-red-500/40"
                    }`}
                  >
                    {!isSoundMuted ? "Audio Enabled" : "Audio Muted"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Synthesizes instantaneous zero-latency audio cues when 1-on-1 match challenges or tournament game times arrive.
                </p>

                {/* Sound test buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSendTestNotification("game_request")}
                    disabled={isTesting}
                    className="py-1 px-2.5 bg-[#0c3b2e] hover:bg-[#144435] text-[#d6a735] font-bold text-[10px] rounded-lg border border-[#184d3c] flex items-center gap-1"
                  >
                    <Swords size={11} /> Test Game Challenge Sound
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendTestNotification("tournament_match")}
                    disabled={isTesting}
                    className="py-1 px-2.5 bg-[#0c3b2e] hover:bg-[#144435] text-amber-300 font-bold text-[10px] rounded-lg border border-[#184d3c] flex items-center gap-1"
                  >
                    <Trophy size={11} /> Test Tournament Fanfare
                  </button>
                </div>
                {testFeedback && <p className="text-[11px] text-emerald-400 font-bold">{testFeedback}</p>}
              </div>

              {/* 2. WhatsApp Multi-Channel Expansion */}
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-emerald-400" />
                    <div>
                      <strong className="text-xs font-black">WhatsApp Alerts</strong>
                      <span className="block text-[9px] text-slate-400">Ghanaian Mobile Numbers (+233)</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.whatsappEnabled ?? false}
                    onChange={(e) => handleSavePreferences({ whatsappEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#d6a735] cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-300">WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0244123456"
                    value={preferences?.whatsappNumber ?? ""}
                    onChange={(e) => handleSavePreferences({ whatsappNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-300 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences?.whatsappGameRequests ?? true}
                      onChange={(e) => handleSavePreferences({ whatsappGameRequests: e.target.checked })}
                      className="accent-[#d6a735]"
                    />
                    <span>Receive instant WhatsApp links for 1-on-1 match challenges</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences?.whatsappTournamentAlerts ?? true}
                      onChange={(e) => handleSavePreferences({ whatsappTournamentAlerts: e.target.checked })}
                      className="accent-[#d6a735]"
                    />
                    <span>Receive WhatsApp reminders when tournament matches are called</span>
                  </label>
                </div>
              </div>

              {/* 3. SMS Channel Expansion */}
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-sky-400" />
                    <div>
                      <strong className="text-xs font-black">SMS Gateway Alerts</strong>
                      <span className="block text-[9px] text-slate-400">Hubtel / Arkesel / Twilio</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.smsEnabled ?? false}
                    onChange={(e) => handleSavePreferences({ smsEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#d6a735] cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-300">SMS Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0551234567"
                    value={preferences?.smsNumber ?? ""}
                    onChange={(e) => handleSavePreferences({ smsNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Email Notification Expansion */}
              <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-amber-400" />
                    <div>
                      <strong className="text-xs font-black">Email Notifications</strong>
                      <span className="block text-[9px] text-slate-400">Tournament Brackets & Financial Receipts</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences?.emailEnabled ?? false}
                    onChange={(e) => handleSavePreferences({ emailEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-[#d6a735] cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. player@damii.com"
                    value={preferences?.emailAddress ?? ""}
                    onChange={(e) => handleSavePreferences({ emailAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf] focus:border-[#d6a735] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-[#0c3b2e]">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="py-2.5 px-6 bg-gradient-to-r from-[#d6a735] to-[#c2962e] text-[#06261f] font-black text-xs rounded-xl shadow-md transition-transform hover:scale-105"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NotificationCenter;
