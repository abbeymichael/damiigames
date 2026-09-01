import crypto from "node:crypto";
import bcrypt from "bcryptjs";

// Security Core Utilities for DAMII
// Handles bcrypt password hashing, CSPRNG tokens, rate limiting, HMAC validation, timing-safe comparison, and input sanitization.

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale rate limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export const securityService = {
  /**
   * Generates a cryptographically secure random token (CSPRNG)
   */
  generateCsprngToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  },

  /**
   * Generates a cryptographically secure UUID v4
   */
  generateUUID(): string {
    return crypto.randomUUID();
  },

  /**
   * Hashes a password or passcode using bcrypt with salt rounds = 10
   */
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return { hash, salt };
  },

  /**
   * Verifies a password against a stored bcrypt hash, PBKDF2 hash, or salted hash
   */
  verifyPassword(password: string, storedHash: string, salt?: string): boolean {
    if (!password || !storedHash) return false;

    // Standard bcrypt hash ($2a$, $2b$, or $2y$)
    if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
      try {
        if (bcrypt.compareSync(password, storedHash)) {
          return true;
        }
      } catch {}
    }

    // PBKDF2 SHA-256 fallback with provided salt
    if (salt) {
      try {
        const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
        if (this.timingSafeCompare(computedHash, storedHash)) {
          return true;
        }
      } catch {}

      try {
        const shaHash = crypto.createHash("sha256").update(`${password}:${salt}`).digest("hex");
        if (this.timingSafeCompare(shaHash, storedHash)) {
          return true;
        }
        const shaHashAlt = crypto.createHash("sha256").update(`${salt}:${password}`).digest("hex");
        if (this.timingSafeCompare(shaHashAlt, storedHash)) {
          return true;
        }
      } catch {}
    }

    // Direct SHA-256 check
    try {
      const sha256 = crypto.createHash("sha256").update(password).digest("hex");
      if (this.timingSafeCompare(sha256, storedHash)) {
        return true;
      }
    } catch {}

    // Fallback timing-safe comparison for legacy plaintext entries
    return this.timingSafeCompare(password, storedHash);
  },

  /**
   * Passcode hash verification helper with bcrypt support and backward-compatible fallbacks
   */
  hashOrVerifyPasscode(inputPasscode: string, storedPasscodeHash?: string, storedSalt?: string): boolean {
    if (!storedPasscodeHash || !inputPasscode) return false;
    return this.verifyPassword(inputPasscode, storedPasscodeHash, storedSalt);
  },

  /**
   * Timing-safe string comparison to prevent side-channel timing attacks
   */
  timingSafeCompare(a: string, b: string): boolean {
    if (typeof a !== "string" || typeof b !== "string") return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
      // Compare dummy buffer to maintain constant-time execution
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  },

  /**
   * Validates Paystack HMAC SHA-512 webhook signature
   */
  verifyPaystackHmac(rawBody: string, signatureHeader: string | null, secretKey: string): boolean {
    if (!signatureHeader || !secretKey || !rawBody) return false;
    const expectedSignature = crypto
      .createHmac("sha512", secretKey)
      .update(rawBody)
      .digest("hex");
    return this.timingSafeCompare(expectedSignature, signatureHeader);
  },

  /**
   * Sliding window / token bucket rate limiter indexed by IP/token and key
   */
  checkRateLimit(key: string, limit = 20, windowMs = 60 * 1000): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      rateLimitStore.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count += 1;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  },

  /**
   * Sanitizes string input by trimming and stripping HTML/script tags
   */
  sanitizeInput(input: unknown): string {
    if (typeof input !== "string") return "";
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 1000);
  },

  /**
   * List of reserved system, administrative, and role keywords that cannot be chosen by players
   */
  isReservedUsername(username: string): boolean {
    if (!username || typeof username !== "string") return true;
    const clean = username.trim().toLowerCase();
    const reserved = new Set([
      "admin",
      "superadmin",
      "super_admin",
      "administrator",
      "system",
      "root",
      "moderator",
      "mod",
      "damii",
      "damiigames",
      "support",
      "staff",
      "treasurer",
      "facilitator",
      "official",
      "help",
      "null",
      "undefined",
      "anonymous",
      "bot",
      "ai",
      "api",
      "host",
      "guest",
      "user",
      "server",
      "platform",
      "treasury",
    ]);

    if (reserved.has(clean)) return true;
    if (/^(admin|superadmin|system|damii|support|official)[_.-]/i.test(clean)) return true;
    return false;
  },

  /**
   * Validates a username for syntax, length, and reservation constraints
   */
  validateUsername(username: string): { valid: boolean; error?: string } {
    if (!username || typeof username !== "string") {
      return { valid: false, error: "Username is required." };
    }
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      return { valid: false, error: "Username must be at least 3 characters long." };
    }
    if (trimmed.length > 20) {
      return { valid: false, error: "Username cannot exceed 20 characters." };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      return { valid: false, error: "Username can only contain letters, numbers, underscores, dots, or hyphens." };
    }
    if (this.isReservedUsername(trimmed)) {
      return { valid: false, error: "This username is reserved and cannot be registered." };
    }
    return { valid: true };
  },

  /**
   * Strips sensitive cryptographic credentials (passcode, salt) from a user profile object
   */
  sanitizeProfile<T extends Record<string, unknown>>(profile: T | null | undefined): T | null {
    if (!profile) return null;
    const copy = { ...profile };
    delete copy.passcode;
    delete copy.passwordSalt;
    return copy;
  },

  /**
   * Strips all private identification (passcode, salt, phone, email, private tokens) for public display (e.g. Leaderboard)
   */
  sanitizePublicProfile<T extends Record<string, unknown>>(profile: T | null | undefined): Record<string, unknown> | null {
    if (!profile) return null;
    return {
      username: profile.username || "Player",
      rating: profile.rating ?? 1000,
      points: profile.points ?? 0,
      marbles: profile.marbles ?? 0,
      wins: profile.wins ?? 0,
      losses: profile.losses ?? 0,
      draws: profile.draws ?? 0,
      winStreak: profile.winStreak ?? 0,
      bestStreak: profile.bestStreak ?? 0,
      avatarUrl: profile.avatarUrl || null,
      role: profile.role || "user",
      status: profile.status || "active",
      createdAt: profile.createdAt,
    };
  },
};
