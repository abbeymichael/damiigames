import { dbRepository } from "./db-client";
import {
  NotificationItem,
  NotificationType,
  NotificationChannel,
  NotificationUrgency,
  UserNotificationPreferences,
  WhatsAppSettings,
  SmsSettings,
  EmailSettings,
  InAppNotificationSettings,
  NotificationChannelRouting,
  NotificationDispatchedLog,
} from "./types";
import {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_IN_APP_SETTINGS,
  DEFAULT_WHATSAPP_SETTINGS,
  DEFAULT_SMS_SETTINGS,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_CHANNEL_ROUTING,
} from "./notification-constants";

export {
  DEFAULT_USER_PREFERENCES,
  DEFAULT_IN_APP_SETTINGS,
  DEFAULT_WHATSAPP_SETTINGS,
  DEFAULT_SMS_SETTINGS,
  DEFAULT_EMAIL_SETTINGS,
  DEFAULT_CHANNEL_ROUTING,
};

// Process-local notification store attached to globalThis so Next.js route bundles share memory
const globalForNotifications = globalThis as unknown as {
  __damii_active_notifications__?: Map<string, NotificationItem>;
  __damii_user_preferences__?: Map<string, UserNotificationPreferences>;
  __damii_dispatched_logs__?: NotificationDispatchedLog[];
};

const activeNotifications =
  globalForNotifications.__damii_active_notifications__ ??
  (globalForNotifications.__damii_active_notifications__ = new Map<string, NotificationItem>());

const userPreferencesStore =
  globalForNotifications.__damii_user_preferences__ ??
  (globalForNotifications.__damii_user_preferences__ = new Map<string, UserNotificationPreferences>());

const dispatchedChannelLogs =
  globalForNotifications.__damii_dispatched_logs__ ??
  (globalForNotifications.__damii_dispatched_logs__ = []);

// Clean stale notifications older than 24 hours
function cleanOldNotifications() {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, item] of activeNotifications.entries()) {
    const time = new Date(item.timestamp).getTime();
    if (time < cutoff || (item.expiresAt && new Date(item.expiresAt).getTime() < Date.now())) {
      activeNotifications.delete(id);
    }
  }
}

export const notificationService = {
  /**
   * Get dynamic in-app settings
   */
  async getInAppSettings(): Promise<InAppNotificationSettings> {
    try {
      const entries = await dbRepository.getSystemSettings("notifications");
      const configEntry = entries.find((e) => e.key === "in_app_config");
      if (configEntry && configEntry.value) {
        return { ...DEFAULT_IN_APP_SETTINGS, ...configEntry.value };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_IN_APP_SETTINGS };
  },

  /**
   * Get dynamic WhatsApp settings
   */
  async getWhatsAppSettings(): Promise<WhatsAppSettings> {
    try {
      const entries = await dbRepository.getSystemSettings("whatsapp");
      const configEntry = entries.find((e) => e.key === "config");
      if (configEntry && configEntry.value) {
        return { ...DEFAULT_WHATSAPP_SETTINGS, ...configEntry.value };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_WHATSAPP_SETTINGS };
  },

  /**
   * Get dynamic SMS settings
   */
  async getSmsSettings(): Promise<SmsSettings> {
    try {
      const entries = await dbRepository.getSystemSettings("sms");
      const configEntry = entries.find((e) => e.key === "config");
      if (configEntry && configEntry.value) {
        return { ...DEFAULT_SMS_SETTINGS, ...configEntry.value };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_SMS_SETTINGS };
  },

  /**
   * Get dynamic Email settings
   */
  async getEmailSettings(): Promise<EmailSettings> {
    try {
      const entries = await dbRepository.getSystemSettings("email");
      const configEntry = entries.find((e) => e.key === "config");
      if (configEntry && configEntry.value) {
        return { ...DEFAULT_EMAIL_SETTINGS, ...configEntry.value };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_EMAIL_SETTINGS };
  },

  /**
   * Get global notification channel routing matrix
   */
  async getChannelRouting(): Promise<NotificationChannelRouting> {
    try {
      const entries = await dbRepository.getSystemSettings("notifications");
      const configEntry = entries.find((e) => e.key === "channel_routing");
      if (configEntry && configEntry.value) {
        return { ...DEFAULT_CHANNEL_ROUTING, ...configEntry.value };
      }
    } catch {
      /* ignore */
    }
    return { ...DEFAULT_CHANNEL_ROUTING };
  },

  /**
   * Fetch all notification settings for Admin Settings dashboard
   */
  async getAllNotificationSettings() {
    const [inApp, whatsapp, sms, email, routing] = await Promise.all([
      this.getInAppSettings(),
      this.getWhatsAppSettings(),
      this.getSmsSettings(),
      this.getEmailSettings(),
      this.getChannelRouting(),
    ]);

    return {
      inApp,
      whatsapp,
      sms,
      email,
      routing,
      recentLogs: this.getDispatchedLogs(),
    };
  },

  /**
   * Save notification settings category from Admin
   */
  async saveNotificationCategorySettings(
    category: "in_app" | "whatsapp" | "sms" | "email" | "routing",
    data: any,
    adminId?: string
  ) {
    if (category === "in_app") {
      await dbRepository.saveSystemSetting("notifications", "in_app_config", data, adminId);
    } else if (category === "whatsapp") {
      await dbRepository.saveSystemSetting("whatsapp", "config", data, adminId);
    } else if (category === "sms") {
      await dbRepository.saveSystemSetting("sms", "config", data, adminId);
    } else if (category === "email") {
      await dbRepository.saveSystemSetting("email", "config", data, adminId);
    } else if (category === "routing") {
      await dbRepository.saveSystemSetting("notifications", "channel_routing", data, adminId);
    }
    return this.getAllNotificationSettings();
  },

  /**
   * Get user notification preferences
   */
  async getUserPreferences(token: string): Promise<UserNotificationPreferences> {
    if (!token) return { ...DEFAULT_USER_PREFERENCES };
    const existing = userPreferencesStore.get(token);
    if (existing) return { ...DEFAULT_USER_PREFERENCES, ...existing };

    // Try to load phone/email from profile
    const profile = await dbRepository.getProfile(token);
    const prefs: UserNotificationPreferences = {
      ...DEFAULT_USER_PREFERENCES,
      whatsappNumber: profile?.phoneNumber || "",
      smsNumber: profile?.phoneNumber || "",
      emailAddress: profile?.email || "",
    };
    userPreferencesStore.set(token, prefs);
    return prefs;
  },

  /**
   * Update user notification preferences
   */
  async saveUserPreferences(
    token: string,
    updates: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferences> {
    const current = await this.getUserPreferences(token);
    const updated = { ...current, ...updates };
    userPreferencesStore.set(token, updated);
    return updated;
  },

  /**
   * Dispatch a notification across all designated channels according to global routing and user prefs
   */
  async dispatchNotification(item: Omit<NotificationItem, "id" | "timestamp">): Promise<NotificationItem> {
    cleanOldNotifications();

    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = new Date().toISOString();

    // Determine routed channels based on system settings
    const routing = await this.getChannelRouting();
    const systemAllowedChannels: NotificationChannel[] = routing[item.type] || ["in_app"];
    
    // Requested channels filtered by system routing
    const requestedChannels = item.channels && item.channels.length > 0 ? item.channels : systemAllowedChannels;
    const channels = requestedChannels.filter((c) => systemAllowedChannels.includes(c));
    if (!channels.includes("in_app")) {
      channels.unshift("in_app"); // Always ensure in-app delivery
    }

    const fullItem: NotificationItem = {
      ...item,
      id,
      timestamp,
      channels,
      read: false,
      deliveryStatus: {
        in_app: "delivered",
        whatsapp: channels.includes("whatsapp") ? "queued" : "disabled",
        sms: channels.includes("sms") ? "queued" : "disabled",
        email: channels.includes("email") ? "queued" : "disabled",
      },
    };

    // Store for in-app delivery
    activeNotifications.set(id, fullItem);

    // Multi-channel dispatch
    const recipientToken = item.recipientToken || item.recipientId || "";
    if (recipientToken) {
      const prefs = await this.getUserPreferences(recipientToken);
      const recipientProfile = await dbRepository.getProfile(recipientToken);
      const [waConfig, smsConfig, emailConfig] = await Promise.all([
        this.getWhatsAppSettings(),
        this.getSmsSettings(),
        this.getEmailSettings(),
      ]);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const directActionUrl = fullItem.link || "/arena";
      const fullActionUrl = directActionUrl.startsWith("http")
        ? directActionUrl
        : `${appUrl}${directActionUrl}`;

      const templateData: Record<string, string> = {
        recipient: recipientProfile?.username || fullItem.recipientUsername || "Player",
        opponent:
          fullItem.actionPayload?.senderUsername ||
          fullItem.actionPayload?.opponentName ||
          fullItem.senderName ||
          "Opponent",
        stake: fullItem.actionPayload?.wagerAmount
          ? `${fullItem.actionPayload.wagerAmount} Marbles`
          : fullItem.actionPayload?.gameMode === "wager"
          ? "Wager Match"
          : "Friendly Match",
        roomCode: fullItem.actionPayload?.roomCode || "",
        tournament:
          fullItem.actionPayload?.leagueTitle ||
          fullItem.actionPayload?.tournamentName ||
          "DAMII Tournament",
        round: String(fullItem.actionPayload?.round || 1),
        link: fullActionUrl,
        actionUrl: fullActionUrl,
        actionLabel: fullItem.actionLabel || "Play in DAMII",
        appName: "DAMII 10×10 Draughts Arena",
      };

      // 1. WhatsApp Channel Dispatch Hook
      if (channels.includes("whatsapp") && prefs.whatsappEnabled && waConfig.enabled) {
        const phone = prefs.whatsappNumber || recipientProfile?.phoneNumber;
        if (phone) {
          await this.sendWhatsAppMessage({
            phone,
            title: fullItem.title,
            message: fullItem.message,
            actionUrl: fullItem.link || "/arena",
            actionLabel: fullItem.actionLabel || "Open Game",
            type: fullItem.type,
            templateData,
          });
          if (fullItem.deliveryStatus) fullItem.deliveryStatus.whatsapp = "sent";
        }
      }

      // 2. SMS Channel Dispatch Hook
      if (channels.includes("sms") && prefs.smsEnabled && smsConfig.enabled) {
        const phone = prefs.smsNumber || recipientProfile?.phoneNumber;
        if (phone) {
          await this.sendSmsMessage({
            phone,
            message: `${fullItem.title}: ${fullItem.message} ${fullItem.link}`,
            type: fullItem.type,
            templateData,
          });
          if (fullItem.deliveryStatus) fullItem.deliveryStatus.sms = "sent";
        }
      }

      // 3. Email Channel Dispatch Hook
      if (channels.includes("email") && prefs.emailEnabled && emailConfig.enabled) {
        const email = prefs.emailAddress || recipientProfile?.email;
        if (email) {
          await this.sendEmailNotification({
            email,
            subject: `DAMII Alert: ${fullItem.title}`,
            title: fullItem.title,
            message: fullItem.message,
            actionUrl: fullItem.link || "/arena",
            actionLabel: fullItem.actionLabel || "View in DAMII",
            type: fullItem.type,
            templateData,
          });
          if (fullItem.deliveryStatus) fullItem.deliveryStatus.email = "sent";
        }
      }
    }

    return fullItem;
  },

  /**
   * Universal Notification Dispatch Helper (Inter-service compatibility)
   */
  async sendNotification(params: {
    userToken?: string;
    recipientToken?: string;
    username?: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    actionLabel?: string;
    actionPayload?: Record<string, any>;
    channels?: NotificationChannel[];
    urgency?: NotificationUrgency;
  }): Promise<NotificationItem> {
    return this.dispatchNotification({
      recipientToken: params.userToken || params.recipientToken || "",
      recipientUsername: params.username,
      type: params.type,
      urgency: params.urgency || "normal",
      title: params.title,
      message: params.message,
      link: params.link,
      actionLabel: params.actionLabel,
      actionPayload: params.actionPayload,
      channels: params.channels,
    });
  },

  /**
   * Helper: Send 1-on-1 Game Challenge Request
   */
  async createGameRequestNotification(params: {
    senderToken: string;
    senderUsername: string;
    targetUsername: string;
    targetToken?: string;
    roomCode: string;
    mode: "casual" | "wager";
    wagerAmount?: number;
  }): Promise<NotificationItem | null> {
    let targetProfile = null;
    if (params.targetToken) {
      targetProfile = await dbRepository.getProfile(params.targetToken);
    }
    if (!targetProfile && params.targetUsername) {
      targetProfile = await dbRepository.findProfileByUsername(params.targetUsername);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const directActionUrl = `/arena?code=${params.roomCode}&join=1`;
    const fullActionUrl = appUrl ? `${appUrl}${directActionUrl}` : directActionUrl;
    const wagerText = params.mode === "wager" ? `${params.wagerAmount || 0} Marbles Wager` : "Free Friendly";

    const title = `⚔️ Match Challenge from ${params.senderUsername}!`;
    const message = `${params.senderUsername} has challenged you to a 10×10 Damii ${wagerText} match in Room #${params.roomCode}.`;

    return this.dispatchNotification({
      recipientToken: targetProfile?.token || "",
      recipientUsername: params.targetUsername,
      senderName: params.senderUsername,
      type: "game_request",
      urgency: "urgent",
      title,
      message,
      link: directActionUrl,
      actionLabel: "Accept Challenge & Play",
      actionPayload: {
        roomCode: params.roomCode,
        gameMode: params.mode,
        wagerAmount: params.wagerAmount || 0,
        senderUsername: params.senderUsername,
        fullActionUrl,
      },
      channels: ["in_app", "whatsapp", "sms"],
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes expiry
    });
  },

  /**
   * Helper: Send Tournament Game Time Approaching Alert
   */
  async createTournamentMatchAlert(params: {
    playerToken: string;
    opponentName: string;
    leagueId: string;
    leagueTitle: string;
    round: number;
    roomCode?: string | null;
    scheduledTime?: string;
  }): Promise<NotificationItem> {
    const directActionUrl = params.roomCode
      ? `/arena?code=${params.roomCode}&mode=league`
      : `/leagues?id=${params.leagueId}`;

    const title = `🏆 Tournament Match Time Approaching!`;
    const timeText = params.scheduledTime ? ` Scheduled for ${params.scheduledTime}.` : " Ready to play now!";
    const message = `Your Round ${params.round} match vs ${params.opponentName || "Opponent"} in "${params.leagueTitle}" is approaching.${timeText}`;

    return this.dispatchNotification({
      recipientToken: params.playerToken,
      type: "tournament_match",
      urgency: "urgent",
      title,
      message,
      link: directActionUrl,
      actionLabel: params.roomCode ? "Enter Match Arena" : "View Bracket & Check-In",
      actionPayload: {
        leagueId: params.leagueId,
        roomCode: params.roomCode || undefined,
        round: params.round,
        opponentName: params.opponentName,
      },
      channels: ["in_app", "whatsapp", "sms", "email"],
    });
  },

  /**
   * Helper: Send Turn Clock / Move Waiting Alert
   */
  async createTurnReminder(params: {
    playerToken: string;
    roomCode: string;
    opponentName: string;
    secondsLeft?: number;
  }): Promise<NotificationItem> {
    const directActionUrl = `/arena?code=${params.roomCode}`;
    const secondsText = params.secondsLeft ? ` (${params.secondsLeft}s remaining)` : "";

    return this.dispatchNotification({
      recipientToken: params.playerToken,
      type: "turn_reminder",
      urgency: "high",
      title: `⏳ Your Turn in Room #${params.roomCode}`,
      message: `${params.opponentName} made their move! 10×10 Damii turn clock is running${secondsText}.`,
      link: directActionUrl,
      actionLabel: "Make Move",
      actionPayload: {
        roomCode: params.roomCode,
      },
      channels: ["in_app"],
    });
  },

  /**
   * Aggregates active in-app notifications for a user token
   */
  async getUserNotifications(token: string): Promise<NotificationItem[]> {
    if (!token) return [];

    let profile = await dbRepository.getProfile(token);
    let resolvedToken = token;

    if (!profile) {
      const session = await dbRepository.getSession(token);
      if (session) {
        resolvedToken = session.userId;
        profile = await dbRepository.getProfile(session.userId);
      }
    }

    if (!profile) {
      profile = await dbRepository.findProfileByUsername(token);
      if (profile) resolvedToken = profile.token;
    }

    const username = profile?.username;
    const userPhone = profile?.phoneNumber;
    const userEmail = profile?.email;
    const items: NotificationItem[] = [];

    // 1. In-memory / persistent active stored notifications for this user or broadcast
    const now = Date.now();
    for (const item of activeNotifications.values()) {
      if (item.expiresAt && new Date(item.expiresAt).getTime() <= now) {
        continue;
      }

      const isBroadcast =
        item.recipientToken === "ALL" ||
        item.recipientToken === "*" ||
        item.recipientUsername?.toUpperCase() === "ALL" ||
        item.recipientUsername?.toLowerCase() === "broadcast" ||
        item.recipientUsername?.toLowerCase() === "everyone";

      const matchesToken =
        item.recipientToken === token ||
        item.recipientToken === resolvedToken ||
        item.recipientId === token ||
        item.recipientId === resolvedToken;

      const matchesUsername =
        Boolean(username && item.recipientUsername && item.recipientUsername.toLowerCase() === username.toLowerCase());

      const matchesPhone =
        Boolean(userPhone && item.recipientPhone && userPhone.replace(/\D/g, "").slice(-9) === item.recipientPhone.replace(/\D/g, "").slice(-9));

      const matchesEmail =
        Boolean(userEmail && item.recipientEmail && userEmail.toLowerCase() === item.recipientEmail.toLowerCase());

      if (isBroadcast || matchesToken || matchesUsername || matchesPhone || matchesEmail) {
        items.push(item);
      }
    }

    // 2. Tournament dynamic notifications (Active leagues, upcoming rounds, pending matches)
    try {
      const leagues = await dbRepository.listLeagues();
      for (const l of leagues) {
        if (l.status === "active") {
          const matches = await dbRepository.getLeagueMatches(l.id);
          const userPendingMatch = matches.find(
            (m) =>
              (m.player1Token === token || m.player2Token === token) &&
              (m.status === "pending" || m.status === "in_progress")
          );

          if (userPendingMatch) {
            const opponentName =
              userPendingMatch.player1Token === token
                ? userPendingMatch.player2Name
                : userPendingMatch.player1Name;

            const isMatchReady = Boolean(userPendingMatch.roomCode);
            const directLink = userPendingMatch.roomCode
              ? `/arena?code=${userPendingMatch.roomCode}&mode=league`
              : `/leagues?id=${l.id}`;

            items.push({
              id: `league-match-${userPendingMatch.id}`,
              recipientToken: token,
              type: "tournament_match",
              urgency: isMatchReady ? "urgent" : "high",
              title: isMatchReady ? "⚔️ Tournament Game Ready to Play!" : "🏆 Tournament Game Approaching",
              message: isMatchReady
                ? `Match vs ${opponentName || "TBD"} in "${l.title}" is LIVE in Room #${userPendingMatch.roomCode}! Click to join.`
                : `Round ${userPendingMatch.round} match vs ${opponentName || "TBD"} in "${l.title}" is scheduled.`,
              timestamp: userPendingMatch.createdAt || l.updatedAt || l.createdAt,
              link: directLink,
              actionLabel: isMatchReady ? "Join Live Match" : "View Bracket",
              actionPayload: {
                leagueId: l.id,
                matchId: userPendingMatch.id,
                roomCode: userPendingMatch.roomCode || undefined,
              },
              channels: ["in_app", "whatsapp", "sms"],
            });
          }
        } else if (l.status === "registration") {
          const participants = await dbRepository.getLeagueParticipants(l.id);
          const userPart = participants.find((p) => p.userToken === token);
          if (userPart && userPart.status === "approved") {
            items.push({
              id: `league-registered-${l.id}`,
              recipientToken: token,
              type: "tournament_alert",
              urgency: "normal",
              title: "Tournament Roster Confirmed",
              message: `You are confirmed for "${l.title}". Bracket will launch once full!`,
              timestamp: userPart.joinedAt || l.updatedAt,
              link: `/leagues?id=${l.id}`,
              actionLabel: "View League",
              channels: ["in_app"],
            });
          }
        }
      }
    } catch {
      /* ignore tournament query failure */
    }

    // 3. Recent Wager Settlements & Wallet Transactions
    try {
      const txs = await dbRepository.getUserTransactions(token, 10);
      for (const tx of txs) {
        if (tx.type === "wager_win") {
          items.push({
            id: `tx-wager-win-${tx.id}`,
            recipientToken: token,
            type: "wager_settlement",
            urgency: "high",
            title: "🏆 Wager Victory Settled!",
            message: `You won +${tx.amount} ${tx.currency === "marbles" ? "Marbles" : "Points"} from your recent wager match!`,
            timestamp: tx.createdAt,
            link: "/wallet",
            actionLabel: "View Wallet",
            channels: ["in_app"],
          });
        } else if (tx.type === "league_prize") {
          items.push({
            id: `tx-league-prize-${tx.id}`,
            recipientToken: token,
            type: "wager_settlement",
            urgency: "high",
            title: "🥇 Tournament Prize Awarded!",
            message: `Congratulations! +${tx.amount} Points credited to your account for tournament placement.`,
            timestamp: tx.createdAt,
            link: "/wallet",
            actionLabel: "Collect Prize",
            channels: ["in_app", "email"],
          });
        }
      }
    } catch {
      /* ignore transaction fetch error */
    }

    // 4. Welcome message (if profile exists)
    if (profile) {
      items.push({
        id: `system-welcome-${profile.token}`,
        recipientToken: token,
        type: "system",
        urgency: "low",
        title: "Welcome to DAMII Arena",
        message: `Account active as ${profile.username}. Current Balance: ${profile.points} Points.`,
        timestamp: profile.createdAt,
        link: "/arena",
        actionLabel: "Go to Arena",
        channels: ["in_app"],
      });
    }

    // Deduplicate by ID
    const uniqueMap = new Map<string, NotificationItem>();
    for (const item of items) {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }

    // Sort by timestamp desc and priority
    const priorityWeight: Record<NotificationUrgency, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    return Array.from(uniqueMap.values()).sort((a, b) => {
      const pA = priorityWeight[a.urgency || "normal"];
      const pB = priorityWeight[b.urgency || "normal"];
      if (pA !== pB) return pB - pA;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  },

  /**
   * Mark notification as read
   */
  markAsRead(id: string) {
    const item = activeNotifications.get(id);
    if (item) {
      item.read = true;
      if (item.deliveryStatus) item.deliveryStatus.in_app = "read";
    }
  },

  /**
   * Delete a notification
   */
  deleteNotification(id: string) {
    activeNotifications.delete(id);
  },

  /* ----------------------------------------------------------------------- */
  /* Channel Adapters & Extensible Dispatchers (WhatsApp, SMS, Email)        */
  /* ----------------------------------------------------------------------- */

  /**
   * Helper to interpolate message template placeholders like {opponent}, {stake}, {roomCode}, {tournament}, {round}, {link}
   */
  interpolateTemplate(template: string, data: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || "");
    }
    return result;
  },

  /**
   * WhatsApp Message Dispatcher (WhatsApp Cloud API / Twilio WhatsApp)
   */
  async sendWhatsAppMessage(payload: {
    phone: string;
    title: string;
    message: string;
    actionUrl: string;
    actionLabel?: string;
    type: NotificationType;
    templateData?: Record<string, string>;
  }) {
    const waConfig = await this.getWhatsAppSettings();
    if (!waConfig.enabled) {
      return { success: false, error: "WhatsApp notifications globally disabled" };
    }

    // Format Ghana E.164 phone number: +233...
    let cleanPhone = payload.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
      cleanPhone = "233" + cleanPhone.substring(1);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const fullActionUrl = payload.actionUrl.startsWith("http")
      ? payload.actionUrl
      : `${appUrl}${payload.actionUrl}`;

    // Use configured template if available
    let bodyText = "";
    if (payload.type === "game_request" && waConfig.gameRequestTemplate) {
      bodyText = this.interpolateTemplate(waConfig.gameRequestTemplate, {
        ...(payload.templateData || {}),
        link: fullActionUrl,
      });
    } else if (payload.type === "tournament_match" && waConfig.tournamentAlertTemplate) {
      bodyText = this.interpolateTemplate(waConfig.tournamentAlertTemplate, {
        ...(payload.templateData || {}),
        link: fullActionUrl,
      });
    } else if (payload.type === "turn_reminder" && waConfig.turnReminderTemplate) {
      bodyText = this.interpolateTemplate(waConfig.turnReminderTemplate, {
        ...(payload.templateData || {}),
        link: fullActionUrl,
      });
    } else {
      bodyText = `${payload.title}\n${payload.message}\n\n👉 ${payload.actionLabel || "Open"}: ${fullActionUrl}`;
    }

    // Record delivery audit log
    dispatchedChannelLogs.push({
      id: `wa-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientToken: payload.phone,
      recipientContact: cleanPhone,
      channel: "whatsapp",
      title: payload.title,
      message: bodyText,
      actionUrl: fullActionUrl,
      type: payload.type,
      status: "sent",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      provider: waConfig.provider,
      recipient: cleanPhone,
      messageBody: bodyText,
    };
  },

  /**
   * SMS Gateway Dispatcher (Hubtel / Arkesel / Twilio)
   */
  async sendSmsMessage(payload: {
    phone: string;
    message: string;
    type: NotificationType;
    templateData?: Record<string, string>;
  }) {
    const smsConfig = await this.getSmsSettings();
    if (!smsConfig.enabled) {
      return { success: false, error: "SMS notifications globally disabled" };
    }

    let cleanPhone = payload.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
      cleanPhone = "233" + cleanPhone.substring(1);
    }

    let smsText = payload.message;
    if (payload.type === "game_request" && smsConfig.matchInviteTemplate) {
      smsText = this.interpolateTemplate(smsConfig.matchInviteTemplate, payload.templateData || {});
    } else if (payload.type === "tournament_match" && smsConfig.tournamentAlertTemplate) {
      smsText = this.interpolateTemplate(smsConfig.tournamentAlertTemplate, payload.templateData || {});
    }

    dispatchedChannelLogs.push({
      id: `sms-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientToken: payload.phone,
      recipientContact: cleanPhone,
      channel: "sms",
      title: smsText.slice(0, 30),
      message: smsText,
      type: payload.type,
      status: "sent",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      provider: smsConfig.provider,
      senderId: smsConfig.senderId,
      recipient: cleanPhone,
      body: smsText,
    };
  },

  /**
   * Email Dispatcher (SMTP / SendGrid / Postmark / Mock)
   */
  async sendEmailNotification(payload: {
    email: string;
    subject?: string;
    title: string;
    message: string;
    actionUrl: string;
    actionLabel?: string;
    type?: NotificationType;
    templateData?: Record<string, string>;
    customSubject?: string;
    customTemplate?: string;
  }) {
    const emailConfig = await this.getEmailSettings();
    if (!emailConfig.enabled) {
      return { success: false, error: "Email notifications globally disabled" };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const fullActionUrl = payload.actionUrl.startsWith("http")
      ? payload.actionUrl
      : `${appUrl}${payload.actionUrl}`;

    const data: Record<string, string> = {
      ...(payload.templateData || {}),
      link: fullActionUrl,
      actionUrl: fullActionUrl,
      actionLabel: payload.actionLabel || "Open DAMII",
      appName: "DAMII 10×10 Draughts Arena",
    };

    // Determine subject and template based on notification type
    let finalSubject = payload.customSubject || payload.subject || `DAMII Alert: ${payload.title}`;
    let finalBodyText = payload.customTemplate || payload.message;

    if (payload.type === "game_request") {
      const subjTpl =
        payload.customSubject ||
        emailConfig.gameRequestSubject ||
        emailConfig.matchInviteSubject ||
        "⚔️ Match Challenge from {opponent} | DAMII Arena";
      const bodyTpl =
        payload.customTemplate ||
        emailConfig.gameRequestTemplate ||
        emailConfig.matchInviteTemplate ||
        "Hello {recipient},\n\n{opponent} has challenged you to a 10×10 Damii match ({stake}) in Room #{roomCode}!\n\nClick the link below to accept the challenge and enter the arena:\n{link}\n\nGood luck!";

      finalSubject = this.interpolateTemplate(subjTpl, data);
      finalBodyText = this.interpolateTemplate(bodyTpl, data);
    } else if (payload.type === "tournament_match" || payload.type === "tournament_alert") {
      const subjTpl =
        payload.customSubject ||
        emailConfig.tournamentApproachingSubject ||
        emailConfig.tournamentAlertSubject ||
        "🏆 Tournament Match Approaching: Round {round} in '{tournament}' | DAMII";
      const bodyTpl =
        payload.customTemplate ||
        emailConfig.tournamentApproachingTemplate ||
        emailConfig.tournamentAlertTemplate ||
        "Hello {recipient},\n\nYour Round {round} tournament match against {opponent} in '{tournament}' is scheduled and approaching!\n\nPlease enter the arena to check-in:\n{link}";

      finalSubject = this.interpolateTemplate(subjTpl, data);
      finalBodyText = this.interpolateTemplate(bodyTpl, data);
    } else {
      if (payload.customSubject) finalSubject = this.interpolateTemplate(payload.customSubject, data);
      if (payload.customTemplate) finalBodyText = this.interpolateTemplate(payload.customTemplate, data);
    }

    // Generate responsive HTML layout
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #04140e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #04140e; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #081c15; border: 1px solid #1a5e48; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header Banner -->
          <tr>
            <td style="padding: 24px 30px; background: linear-gradient(135deg, #0b291e 0%, #06261f 100%); border-bottom: 2px solid #d6a735; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #d6a735; text-transform: uppercase;">
                DAMII
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #a7f3d0; letter-spacing: 1px; text-transform: uppercase;">
                10×10 Draughts Championship Arena
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 30px; line-height: 1.6; font-size: 14px; color: #f5efdf;">
              <h2 style="margin: 0 0 16px 0; font-size: 17px; font-weight: 700; color: #ffffff;">
                ${finalSubject}
              </h2>
              
              <div style="white-space: pre-line; margin-bottom: 25px; color: #e2e8f0; font-size: 14px; line-height: 1.65;">
                ${finalBodyText}
              </div>

              <!-- Action Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 30px auto;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #d6a735;">
                    <a href="${fullActionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 800; color: #041c17; text-decoration: none; border-radius: 12px; letter-spacing: 0.5px;">
                      ${payload.actionLabel || "Enter Arena & Play"}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Action URL fallback -->
              <p style="margin: 20px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all; text-align: center;">
                If the button above does not work, paste this link into your browser:<br>
                <a href="${fullActionUrl}" style="color: #d6a735; text-decoration: underline;">${fullActionUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #041812; border-top: 1px solid #114232; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
              <p style="margin: 0 0 6px 0;">
                You received this notification as a registered player on the DAMII Platform.
              </p>
              <p style="margin: 0;">
                © ${new Date().getFullYear()} DAMII Draughts Arena. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    dispatchedChannelLogs.push({
      id: `email-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      recipientToken: payload.email,
      recipientContact: payload.email,
      channel: "email",
      title: finalSubject,
      message: finalBodyText,
      actionUrl: fullActionUrl,
      type: payload.type || "system",
      status: "sent",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      provider: emailConfig.provider,
      senderEmail: emailConfig.senderEmail,
      senderName: emailConfig.senderName,
      recipient: payload.email,
      subject: finalSubject,
      body: finalBodyText,
      htmlBody,
    };
  },

  /**
   * Send test notification from Admin Control Center
   */
  async sendTestNotification(params: {
    channel: NotificationChannel;
    recipient: string; // phone number, email address, or username
    title?: string;
    message?: string;
    actionUrl?: string;
    actionLabel?: string;
    type?: NotificationType;
    customSubject?: string;
    customTemplate?: string;
    templateData?: Record<string, string>;
  }) {
    const title = params.title || "DAMII Test Alert";
    const message = params.message || "This is a verified test notification sent from the DAMII Admin Console.";
    const actionUrl = params.actionUrl || "/arena";
    const actionLabel = params.actionLabel || "Open Arena";

    if (params.channel === "in_app") {
      const cleanRecipient = (params.recipient || "").trim();
      const cleanRecipientLower = cleanRecipient.toLowerCase().replace(/^@/, "");

      const isBroadcast =
        cleanRecipientLower === "all" ||
        cleanRecipientLower === "broadcast" ||
        cleanRecipientLower === "everyone" ||
        cleanRecipientLower === "*";

      let targetToken = cleanRecipient;
      let targetUsername = cleanRecipient;
      let targetPhone = "";
      let targetEmail = "";

      if (isBroadcast) {
        targetToken = "ALL";
        targetUsername = "ALL";
      } else {
        // 1. Try finding by username
        let profile = await dbRepository.findProfileByUsername(cleanRecipientLower);

        // 2. Try finding by direct token
        if (!profile) {
          profile = await dbRepository.getProfile(cleanRecipient);
        }

        // 3. Try finding by session token
        if (!profile) {
          const session = await dbRepository.getSession(cleanRecipient);
          if (session) {
            profile = await dbRepository.getProfile(session.userId);
          }
        }

        // 4. Try finding by phone number
        if (!profile) {
          profile = await dbRepository.findProfileByPhone(cleanRecipient);
        }

        // 5. Try finding in all profiles by email or matching name
        if (!profile) {
          try {
            const allProfiles = await dbRepository.getAllProfiles();
            profile =
              allProfiles.find(
                (p) =>
                  p.username.toLowerCase() === cleanRecipientLower ||
                  p.email?.toLowerCase() === cleanRecipientLower ||
                  p.token === cleanRecipient ||
                  (p.phoneNumber &&
                    cleanRecipient.replace(/\D/g, "").length >= 9 &&
                    p.phoneNumber.replace(/\D/g, "").includes(cleanRecipient.replace(/\D/g, "")))
              ) || null;
          } catch {
            /* ignore */
          }
        }

        if (profile) {
          targetToken = profile.token;
          targetUsername = profile.username;
          targetPhone = profile.phoneNumber || "";
          targetEmail = profile.email || "";
        }
      }

      const notif = await this.dispatchNotification({
        recipientToken: targetToken,
        recipientUsername: targetUsername,
        recipientPhone: targetPhone,
        recipientEmail: targetEmail,
        type: params.type || "system",
        urgency: "high",
        title,
        message,
        link: actionUrl,
        actionLabel,
        channels: ["in_app"],
      });

      dispatchedChannelLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        channel: "in_app",
        recipient: targetUsername || targetToken || cleanRecipient,
        type: params.type || "system",
        title,
        status: "delivered",
        providerMessageId: notif.id,
      });

      return notif;
    }

    if (params.channel === "whatsapp") {
      return this.sendWhatsAppMessage({
        phone: params.recipient,
        title,
        message,
        actionUrl,
        actionLabel,
        type: params.type || "system",
        templateData: params.templateData,
      });
    }

    if (params.channel === "sms") {
      return this.sendSmsMessage({
        phone: params.recipient,
        message: `${title}: ${message} ${actionUrl}`,
        type: params.type || "system",
        templateData: params.templateData,
      });
    }

    if (params.channel === "email") {
      return this.sendEmailNotification({
        email: params.recipient,
        subject: params.customSubject || `[TEST] ${title}`,
        title,
        message,
        actionUrl,
        actionLabel,
        type: params.type || "system",
        customSubject: params.customSubject,
        customTemplate: params.customTemplate,
        templateData: params.templateData,
      });
    }

    throw new Error(`Unsupported channel: ${params.channel}`);
  },

  /**
   * Get channel delivery audit logs
   */
  getDispatchedLogs(): NotificationDispatchedLog[] {
    return [...dispatchedChannelLogs].reverse().slice(0, 50);
  },
};
