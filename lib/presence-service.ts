/**
 * Real-time player presence & online status tracking service.
 * Tracks active client heartbeats, active room presence, and last seen timestamps.
 */

export type PresenceStatus = "online" | "in_match" | "offline";

export interface PresenceInfo {
  isOnline: boolean;
  presenceStatus: PresenceStatus;
  lastSeenAt?: string;
  currentRoomCode?: string | null;
}

interface PresenceRecord {
  userId: string;
  username: string;
  lastSeenMs: number;
  currentRoomCode?: string | null;
}

// Consider users online if active within the last 60 seconds
const PRESENCE_TTL_MS = 60 * 1000;

class PresenceService {
  private presences = new Map<string, PresenceRecord>();
  private usernameToUserId = new Map<string, string>();

  /**
   * Record that a player is currently active (sent heartbeat, polled lobby, made move, etc.)
   */
  recordPresence(userIdOrToken?: string | null, username?: string | null, currentRoomCode?: string | null): void {
    if (!userIdOrToken && !username) return;
    const now = Date.now();
    const cleanUid = String(userIdOrToken || username || "").trim();
    if (!cleanUid) return;

    const existing = this.presences.get(cleanUid);
    const cleanUser = username?.trim() || existing?.username || cleanUid;

    const record: PresenceRecord = {
      userId: cleanUid,
      username: cleanUser,
      lastSeenMs: now,
      currentRoomCode: currentRoomCode !== undefined ? currentRoomCode : (existing?.currentRoomCode ?? null),
    };

    this.presences.set(cleanUid, record);
    if (cleanUser) {
      this.usernameToUserId.set(cleanUser.toLowerCase(), cleanUid);
    }
  }

  /**
   * Mark a user as offline explicitly (e.g. on logout/disconnect)
   */
  markOffline(userIdOrToken?: string | null, username?: string | null): void {
    if (userIdOrToken) {
      const existing = this.presences.get(userIdOrToken);
      if (existing) {
        existing.lastSeenMs = 0;
        existing.currentRoomCode = null;
      }
    }
    if (username) {
      const uid = this.usernameToUserId.get(username.trim().toLowerCase());
      if (uid) {
        const existing = this.presences.get(uid);
        if (existing) {
          existing.lastSeenMs = 0;
          existing.currentRoomCode = null;
        }
      }
    }
  }

  /**
   * Get the presence status of a player by token/userId or username
   */
  getPresence(userIdOrToken?: string | null, username?: string | null): PresenceInfo {
    const now = Date.now();
    let record: PresenceRecord | undefined;

    if (userIdOrToken) {
      record = this.presences.get(userIdOrToken);
    }
    if (!record && username) {
      const uid = this.usernameToUserId.get(username.trim().toLowerCase());
      if (uid) {
        record = this.presences.get(uid);
      }
    }

    if (!record || !record.lastSeenMs) {
      return { isOnline: false, presenceStatus: "offline" };
    }

    const isRecent = now - record.lastSeenMs < PRESENCE_TTL_MS;
    if (!isRecent) {
      return {
        isOnline: false,
        presenceStatus: "offline",
        lastSeenAt: new Date(record.lastSeenMs).toISOString(),
      };
    }

    return {
      isOnline: true,
      presenceStatus: record.currentRoomCode ? "in_match" : "online",
      lastSeenAt: new Date(record.lastSeenMs).toISOString(),
      currentRoomCode: record.currentRoomCode,
    };
  }

  /**
   * Check if user is online
   */
  isOnline(userIdOrToken?: string | null, username?: string | null): boolean {
    return this.getPresence(userIdOrToken, username).isOnline;
  }

  /**
   * Count active online players in the last 60 seconds
   */
  getActiveOnlineCount(): number {
    const now = Date.now();
    let count = 0;
    for (const record of this.presences.values()) {
      if (now - record.lastSeenMs < PRESENCE_TTL_MS) {
        count++;
      }
    }
    return count;
  }
}

export const presenceService = new PresenceService();
