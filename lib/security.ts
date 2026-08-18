import crypto from "node:crypto";

// Security Core Utilities for DAMII
// Handles password hashing, CSPRNG tokens, rate limiting, HMAC validation, timing-safe comparison, and input sanitization.

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
   * Hashes a password or passcode using PBKDF2 with SHA-256 and a random salt
   */
  hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
    return { hash, salt };
  },

  /**
   * Verifies a password against a stored PBKDF2 hash and salt
   */
  verifyPassword(password: string, storedHash: string, salt: string): boolean {
    if (!password || !storedHash || !salt) return false;
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
    return this.timingSafeCompare(computedHash, storedHash);
  },

  /**
   * Legacy passcode hash helper (supports plaintext fallback for legacy seeded users)
   */
  hashOrVerifyPasscode(inputPasscode: string, storedPasscodeHash?: string, storedSalt?: string): boolean {
    if (!storedPasscodeHash || !inputPasscode) return false;
    if (storedSalt) {
      return this.verifyPassword(inputPasscode, storedPasscodeHash, storedSalt);
    }
    // Fallback constant-time compare for legacy un-salted passcodes
    return this.timingSafeCompare(inputPasscode, storedPasscodeHash);
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
};
