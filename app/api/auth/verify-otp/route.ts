import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbRepository } from "@/lib/db-client";
import { attachAuthCookies } from "@/lib/auth-guard";
import { getClientIp, verifyOtpAttempt } from "@/lib/otp";
import { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const body = await req.json();

    const requestId = String(body.requestId || "").trim();
    const code = String(body.code || "").trim();

    if (!requestId || !code) {
      return NextResponse.json(
        { error: "Both requestId and verification code are required" },
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

    // 2. Find or create user in users table with phoneVerifiedAt
    let user = await dbRepository.getUserByPhone(phoneNumber);

    if (!user) {
      const userId = crypto.randomUUID();
      user = await dbRepository.saveUser({
        id: userId,
        phoneNumber,
        phoneVerifiedAt: now,
        role: "player",
        createdAt: now,
      });
    } else {
      user = await dbRepository.updateUser(user.id, {
        phoneVerifiedAt: now,
      });
    }

    if (!user) {
      return NextResponse.json({ error: "Failed to persist user profile" }, { status: 500 });
    }

    // 3. Find or create matching platform profile for game play, ratings, and wallet
    let profile = await dbRepository.getProfile(user.id);
    if (!profile) {
      // Check if username was already set on user
      const defaultUsername = user.username || `player_${phoneNumber.slice(-4)}_${Math.random().toString(36).substring(2, 6)}`;
      profile = await dbRepository.createRegisteredProfile(
        user.id,
        defaultUsername,
        "", // no password required for OTP-verified accounts
        phoneNumber,
      );
      profile.role = user.role;
      await dbRepository.saveProfile(profile);
    }

    // 4. Create active authenticated session
    const session = await dbRepository.createSession(user.id, user.role, ipAddress, userAgent);

    const res = NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
      user,
      token: session.token,
      csrfToken: session.csrfToken,
      profileCompleted: Boolean(user.profileCompletedAt),
    });

    attachAuthCookies(res, session.token, session.csrfToken);
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OTP verification failed" },
      { status: 500 },
    );
  }
}
