import crypto from "crypto";
import { Profile, UserPasskey, UserMfaSettings } from "./types";

// Base32 characters according to RFC 4648
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encodes a buffer to RFC 4648 Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes an RFC 4648 Base32 string into a Buffer
 */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_CHARS.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically strong 20-byte Base32 secret for TOTP (160 bits)
 */
export function generateTotpSecret(): string {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Generates standard URI for Authenticator apps (Google Authenticator, Microsoft Authenticator, Authy)
 */
export function generateTotpUri(username: string, secret: string, issuer = "DAMII Ghana"): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(username);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Computes a 6-digit TOTP code for a secret and timestamp according to RFC 6238
 */
export function generateTotpCode(secret: string, timestamp = Date.now(), timeStep = 30): string {
  const key = base32Decode(secret);
  const counter = Math.floor(timestamp / 1000 / timeStep);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verifies a user-supplied 6-digit TOTP code with time drift window (default +/- 1 step = 60s window)
 */
export function verifyTotpCode(secret: string, code: string, window = 1): boolean {
  if (!code || typeof code !== "string") return false;
  const cleanCode = code.trim().replace(/\s/g, "");
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return false;

  const now = Date.now();
  const timeStep = 30;

  for (let i = -window; i <= window; i++) {
    const testTime = now + i * timeStep * 1000;
    const expected = generateTotpCode(secret, testTime, timeStep);
    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expected))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates single-use backup recovery codes
 */
export function generateBackupCodes(count = 8): { rawCodes: string[]; hashedCodes: string[] } {
  const rawCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomInt(1000, 9999);
    const part2 = crypto.randomInt(1000, 9999);
    const code = `DAMII-${part1}-${part2}`;
    rawCodes.push(code);

    const hash = crypto.createHash("sha256").update(code).digest("hex");
    hashedCodes.push(hash);
  }

  return { rawCodes, hashedCodes };
}

/**
 * Verifies and consumes a backup code from the hashed codes list
 */
export function verifyAndConsumeBackupCode(
  hashedCodes: string[],
  enteredCode: string
): { valid: boolean; remainingCodes: string[] } {
  const clean = enteredCode.trim().toUpperCase();
  const targetHash = crypto.createHash("sha256").update(clean).digest("hex");

  const matchIdx = hashedCodes.findIndex((h) => h === targetHash);
  if (matchIdx !== -1) {
    const remaining = [...hashedCodes];
    remaining.splice(matchIdx, 1);
    return { valid: true, remainingCodes: remaining };
  }

  return { valid: false, remainingCodes: hashedCodes };
}

/**
 * In-memory store for WebAuthn registration/authentication challenges
 */
interface ChallengeEntry {
  challenge: string;
  userId: string;
  expiresAt: number;
}
const challengeCache = new Map<string, ChallengeEntry>();

export function createMfaChallenge(userId: string): string {
  const challenge = crypto.randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min TTL
  challengeCache.set(challenge, { challenge, userId, expiresAt });

  // Periodic cleanup
  if (challengeCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of challengeCache.entries()) {
      if (v.expiresAt < now) challengeCache.delete(k);
    }
  }

  return challenge;
}

export function verifyMfaChallenge(challenge: string, expectedUserId?: string): boolean {
  const entry = challengeCache.get(challenge);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    challengeCache.delete(challenge);
    return false;
  }
  if (expectedUserId && entry.userId !== expectedUserId) {
    return false;
  }
  challengeCache.delete(challenge);
  return true;
}

/**
 * Extracts public MFA settings safe for client consumption
 */
export function getSanitizedMfaSettings(profile: Profile): UserMfaSettings {
  const passkeys: UserPasskey[] = (profile.passkeys || []).map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    createdAt: p.createdAt,
    lastUsedAt: p.lastUsedAt,
    deviceType: p.deviceType,
  }));

  const biometrics = passkeys.filter((p) => p.type === "biometric");
  const standardPasskeys = passkeys.filter((p) => p.type === "passkey");

  return {
    enabled: Boolean(profile.mfaEnabled),
    preferredMethod: profile.mfaPreferredMethod || (profile.mfaEnabled ? (passkeys.length > 0 ? "passkey" : profile.totpEnabled ? "authenticator" : "sms") : "sms"),
    enrolledAt: profile.mfaEnrolledAt,
    totpEnabled: Boolean(profile.totpEnabled),
    totpVerifiedAt: profile.totpVerifiedAt,
    passkeysCount: standardPasskeys.length,
    biometricsCount: biometrics.length,
    hasBackupCodes: Boolean(profile.backupCodes && profile.backupCodes.length > 0),
    passkeys,
  };
}
