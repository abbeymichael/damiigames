import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbRepository } from "@/lib/db-client";
import { attachAuthCookies } from "@/lib/auth-guard";
import { getClientIp, verifyOtpAttempt } from "@/lib/otp";
import { securityService } from "@/lib/security";

// Helper to strip sensitive secrets before sending profile to client
function sanitizeProfileResponse(profile: Record<string, unknown>) {
  const copy = { ...profile };
  delete copy.passcode;
  delete copy.passwordSalt;
  return copy;
}

const FRUITS = [
  "Lemon",
  "Apple",
  "Grape",
  "Mango",
  "Orange",
  "Banana",
  "Cherry",
  "Peach",
  "Berry",
  "Melon",
  "Papaya",
  "Guava",
  "Kiwi",
  "Lime",
  "Plum",
  "Fig",
  "Coconut",
  "Apricot",
  "Pear",
  "Citrus",
];

/**
 * Generates a unique capitalized fruit-with-numbers gamer tag (e.g. Lemon264, Apple743, Grape455)
 */
async function generateUniqueUsername(): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const rawFruit = FRUITS[crypto.randomInt(0, FRUITS.length)];
    const capitalizedFruit = rawFruit.charAt(0).toUpperCase() + rawFruit.slice(1);
    const num = crypto.randomInt(100, 1000); // 3-digit number (100-999)
    const candidate = `${capitalizedFruit}${num}`;
    if (securityService.isReservedUsername(candidate)) continue;
    const [existingProf, existingUser] = await Promise.all([
      dbRepository.findProfileByUsername(candidate),
      dbRepository.getUserByUsername(candidate),
    ]);
    if (!existingProf && !existingUser) {
      return candidate;
    }
  }
  // Fallback if collision
  const rawFruit = FRUITS[crypto.randomInt(0, FRUITS.length)];
  const capitalizedFruit = rawFruit.charAt(0).toUpperCase() + rawFruit.slice(1);
  return `${capitalizedFruit}${crypto.randomInt(100, 1000)}`;
}

export async function POST(req: NextRequest) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const body = await req.json();

    const requestId = String(body.requestId || "").trim();
    const code = String(body.code || "").trim();
    const password = String(body.password || body.passcode || "").trim();
    const confirmPassword = String(body.confirmPassword || body.passwordConfirmation || "").trim();

    if (!requestId || !code) {
      return NextResponse.json(
        { error: "Both requestId and 6-digit verification code are required." },
        { status: 400 },
      );
    }

    if (password && password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters long." },
        { status: 400 },
      );
    }

    if (password && confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match. Please verify your password confirmation." },
        { status: 400 },
      );
    }

    // 1. One-shot verification (verifies hash, enforces consumedAt immediately)
    const verification = await verifyOtpAttempt(requestId, code);
    if (!verification.success || !verification.phoneNumber) {
      return NextResponse.json(
        { error: verification.error || "Invalid OTP code" },
        { status: 400 },
      );
    }

    const phoneNumber = verification.phoneNumber;
    const now = new Date().toISOString();

    // 2. Auto-generate unique 6-character username candidate
    const autoUsername = await generateUniqueUsername();

    // 3. Hash the chosen password with salt (if provided)
    let passwordHash: string | undefined = undefined;
    let passwordSalt: string | undefined = undefined;
    if (password) {
      const hashed = securityService.hashPassword(password);
      passwordHash = hashed.hash;
      passwordSalt = hashed.salt;
    }

    // 4. Find or create user in users table with phoneVerifiedAt
    let user = await dbRepository.getUserByPhone(phoneNumber);

    if (!user) {
      const userId = crypto.randomUUID();
      user = await dbRepository.saveUser({
        id: userId,
        phoneNumber,
        username: autoUsername,
        phoneVerifiedAt: now,
        role: "player",
        createdAt: now,
      });
    } else {
      user = await dbRepository.updateUser(user.id, {
        phoneNumber,
        username: user.username || autoUsername,
        phoneVerifiedAt: now,
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to persist user profile" }, { status: 500 });
    }

    const finalUsername = user.username || autoUsername;

    // 5. Create or update matching platform profile
    let profile = await dbRepository.getProfile(user.id);
    if (!profile) {
      profile = await dbRepository.createRegisteredProfile(
        user.id,
        finalUsername,
        passwordHash || "temp_otp_verified",
        phoneNumber,
        "user",
        passwordSalt,
      );
    } else {
      profile.username = finalUsername;
      if (passwordHash && passwordSalt) {
        profile.passcode = passwordHash;
        profile.passwordSalt = passwordSalt;
      }
      profile.phoneNumber = phoneNumber;
      await dbRepository.saveProfile(profile);
    }

    // 6. Create active authenticated session
    const session = await dbRepository.createSession(user.id, profile.role || user.role, ipAddress, userAgent);

    const res = NextResponse.json({
      success: true,
      message: `Account created successfully! Your unique Username / Gamer ID is ${finalUsername}.`,
      username: finalUsername,
      user,
      profile: sanitizeProfileResponse(profile as unknown as Record<string, unknown>),
      token: session.token,
      csrfToken: session.csrfToken,
      profileCompleted: Boolean(user.profileCompletedAt),
    });

    attachAuthCookies(res, session.token, session.csrfToken);
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration verification failed" },
      { status: 500 },
    );
  }
}
