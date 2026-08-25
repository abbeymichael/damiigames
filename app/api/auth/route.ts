import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { securityService } from "@/lib/security";
import { Profile } from "@/lib/types";
import { attachAuthCookies, clearAuthCookies, extractTokenFromRequest, getAuthContext, requireAuth } from "@/lib/auth-guard";

const cleanStr = (v: unknown) => securityService.sanitizeInput(String(v ?? "")).slice(0, 80);

// Helper to strip sensitive secrets before sending profile to client
function sanitizeProfileResponse(profile: Profile) {
  const copy = { ...profile };
  delete copy.passcode;
  delete copy.passwordSalt;
  return copy;
}

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);

  if (!token) {
    return NextResponse.json({ error: "Token or session required" }, { status: 400 });
  }

  // Check if token is a valid session token
  const session = await dbRepository.getSession(token);
  let userToken = token;
  if (session) {
    userToken = session.userId;
  }

  const profile = await dbRepository.getProfile(userToken);
  if (!profile) {
    return NextResponse.json({ error: "User profile not found" }, { status: 404 });
  }

  if (profile.status === "banned") {
    return NextResponse.json(
      { error: `Account suspended. Reason: ${profile.bannedReason || "Violation of rules"}` },
      { status: 403 }
    );
  }

  let user = await dbRepository.getUserById(userToken);
  if (!user && profile.phoneNumber) {
    user = await dbRepository.getUserByPhone(profile.phoneNumber);
  }

  const sanitized = sanitizeProfileResponse(profile);
  if (user) {
    sanitized.avatarUrl = user.avatarUrl || sanitized.avatarUrl || null;
    sanitized.fullName = user.fullName || sanitized.fullName;
    sanitized.email = user.email || sanitized.email;
    sanitized.region = user.region || sanitized.region;
    sanitized.city = user.city || sanitized.city;
    sanitized.phoneVerifiedAt = user.phoneVerifiedAt ? user.phoneVerifiedAt.toString() : (profile.phoneNumber ? new Date().toISOString() : null);
  }

  const res = NextResponse.json({
    profile: sanitized,
    user: user || null,
    sessionToken: session ? session.token : undefined,
    csrfToken: session?.csrfToken,
  });

  if (session) {
    attachAuthCookies(res, session.token, session.csrfToken);
  }

  return res;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "Unknown";

  // Rate-limit authentication requests per IP (max 15 requests per minute)
  const rl = securityService.checkRateLimit(`auth:${ip}`, 15, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many authentication requests. Please try again in 1 minute." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    const username = cleanStr(body.username);
    const passcode = cleanStr(body.passcode);
    const phoneNumber = cleanStr(body.phoneNumber || body.phone);
    const tokenParam = cleanStr(body.token);

    // 1. REVOKE ALL SESSIONS
    if (action === "revoke_all_sessions" || action === "revoke_sessions") {
      const ctx = await requireAuth(req);
      const exceptCurrent = body.exceptCurrent === true;
      const currentToken = ctx.session?.token;

      const revokedCount = await dbRepository.revokeAllUserSessions(
        ctx.user.token,
        exceptCurrent ? currentToken : undefined
      );

      const res = NextResponse.json({
        success: true,
        count: revokedCount,
        message: exceptCurrent
          ? "All other active sessions revoked."
          : "All active sessions revoked. Please log in again.",
      });

      if (!exceptCurrent) {
        clearAuthCookies(res);
      }
      return res;
    }

    // 2. ROTATE SESSION TOKEN
    if (action === "rotate_session" || action === "rotate_token") {
      const currentToken = extractTokenFromRequest(req) || tokenParam;
      if (!currentToken) {
        return NextResponse.json({ error: "Session token required to rotate session" }, { status: 400 });
      }

      const rotatedSession = await dbRepository.rotateSession(currentToken, ip, userAgent);
      if (!rotatedSession) {
        return NextResponse.json({ error: "Invalid or expired session to rotate" }, { status: 401 });
      }

      const profile = await dbRepository.getProfile(rotatedSession.userId);
      const res = NextResponse.json({
        success: true,
        token: rotatedSession.token,
        csrfToken: rotatedSession.csrfToken,
        userToken: rotatedSession.userId,
        profile: profile ? sanitizeProfileResponse(profile) : null,
      });

      attachAuthCookies(res, rotatedSession.token, rotatedSession.csrfToken);
      return res;
    }

    // 3. UPDATE PROFILE
    if (action === "update_profile") {
      const activeToken = extractTokenFromRequest(req) || tokenParam;
      if (!activeToken) {
        return NextResponse.json({ error: "Token required for profile update" }, { status: 400 });
      }

      const session = await dbRepository.getSession(activeToken);
      const targetToken = session ? session.userId : activeToken;

      const existingProfile = await dbRepository.getProfile(targetToken);
      if (!existingProfile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      let user = await dbRepository.getUserById(targetToken);
      if (!user && existingProfile.phoneNumber) {
        user = await dbRepository.getUserByPhone(existingProfile.phoneNumber);
      }

      // Check if phone number is locked (verified)
      const isPhoneVerified = Boolean(user?.phoneVerifiedAt || existingProfile.phoneNumber);
      const requestedPhone = body.phoneNumber !== undefined ? cleanStr(body.phoneNumber || body.phone) : undefined;
      if (requestedPhone && requestedPhone !== existingProfile.phoneNumber && requestedPhone !== user?.phoneNumber) {
        if (isPhoneVerified) {
          return NextResponse.json(
            { error: "Verified phone numbers cannot be changed for anti-fraud and security reasons." },
            { status: 400 }
          );
        }
      }

      // Validate username length & uniqueness if username is being changed
      const requestedUsername = body.username !== undefined ? String(body.username).trim() : undefined;
      if (requestedUsername && requestedUsername !== existingProfile.username) {
        const validation = securityService.validateUsername(requestedUsername);
        if (!validation.valid) {
          return NextResponse.json(
            { error: validation.error },
            { status: 400 }
          );
        }
        // Case-insensitive uniqueness check against profiles
        const existingWithUsername = await dbRepository.findProfileByUsername(requestedUsername);
        if (existingWithUsername && existingWithUsername.token !== existingProfile.token) {
          return NextResponse.json(
            { error: `Username "${requestedUsername}" is already taken. Please choose another username.` },
            { status: 400 }
          );
        }
        // Case-insensitive uniqueness check against users
        const existingUserWithUsername = await dbRepository.getUserByUsername(requestedUsername);
        if (existingUserWithUsername && existingUserWithUsername.id !== targetToken) {
          return NextResponse.json(
            { error: `Username "${requestedUsername}" is already taken. Please choose another username.` },
            { status: 400 }
          );
        }

        existingProfile.username = requestedUsername;
      }

      // Update avatarUrl if provided
      const requestedAvatar = body.avatarUrl !== undefined ? String(body.avatarUrl).trim() : undefined;
      if (requestedAvatar !== undefined) {
        existingProfile.avatarUrl = requestedAvatar || null;
      }

      // Update full profile fields if provided
      if (body.fullName !== undefined) existingProfile.fullName = String(body.fullName).trim();
      if (body.email !== undefined) existingProfile.email = String(body.email).trim();
      if (body.region !== undefined) existingProfile.region = String(body.region).trim();
      if (body.city !== undefined) existingProfile.city = String(body.city).trim();

      if (!isPhoneVerified && requestedPhone) {
        existingProfile.phoneNumber = requestedPhone;
      }

      // Passcode update
      if (passcode && passcode.length >= 3) {
        const hashed = securityService.hashPassword(passcode);
        existingProfile.passcode = hashed.hash;
        existingProfile.passwordSalt = hashed.salt;
      }

      const updated = await dbRepository.saveProfile(existingProfile);

      // Also sync user record in users table
      if (user) {
        user.username = existingProfile.username;
        if (existingProfile.avatarUrl !== undefined) user.avatarUrl = existingProfile.avatarUrl;
        if (body.fullName !== undefined) user.fullName = String(body.fullName).trim();
        if (body.email !== undefined) user.email = String(body.email).trim();
        if (body.region !== undefined) user.region = String(body.region).trim();
        if (body.city !== undefined) user.city = String(body.city).trim();
        if (body.address !== undefined) user.address = String(body.address).trim();
        if (body.gender !== undefined) user.gender = String(body.gender).trim();
        if (body.dateOfBirth !== undefined && body.dateOfBirth) user.dateOfBirth = new Date(body.dateOfBirth).toISOString();
        if (body.momoNetwork !== undefined) user.momoNetwork = String(body.momoNetwork).trim();
        await dbRepository.saveUser(user);
      } else {
        user = await dbRepository.saveUser({
          id: targetToken,
          phoneNumber: existingProfile.phoneNumber || `usr_${targetToken.slice(-6)}`,
          phoneVerifiedAt: existingProfile.phoneNumber ? new Date().toISOString() : null,
          username: existingProfile.username,
          fullName: existingProfile.fullName || null,
          email: existingProfile.email || null,
          avatarUrl: existingProfile.avatarUrl || null,
          region: existingProfile.region || null,
          city: existingProfile.city || null,
          role: existingProfile.role === "admin" || existingProfile.role === "super_admin" ? "admin" : existingProfile.role === "organizer" ? "organizer" : "player",
          createdAt: existingProfile.createdAt || new Date().toISOString(),
        });
      }

      const sanitized = sanitizeProfileResponse(updated);
      sanitized.avatarUrl = user.avatarUrl || sanitized.avatarUrl || null;
      sanitized.fullName = user.fullName || sanitized.fullName;
      sanitized.email = user.email || sanitized.email;
      sanitized.region = user.region || sanitized.region;
      sanitized.city = user.city || sanitized.city;

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully",
        profile: sanitized,
        user,
      });
    }

    // 4. LOGOUT
    if (action === "logout") {
      const activeToken = extractTokenFromRequest(req) || tokenParam;
      if (activeToken) {
        await dbRepository.deleteSession(activeToken);
      }
      const res = NextResponse.json({ success: true, message: "Logged out successfully" });
      clearAuthCookies(res);
      return res;
    }

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // 5. REGISTER
    if (action === "register") {
      const validation = securityService.validateUsername(username);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      if (!passcode || passcode.length < 3) {
        return NextResponse.json({ error: "Passcode/password must be at least 3 characters" }, { status: 400 });
      }

      const existing = await dbRepository.findProfileByUsername(username);
      if (existing) {
        return NextResponse.json({ error: "Username already registered. Please login instead." }, { status: 400 });
      }

      const userToken = `usr-${Date.now()}-${securityService.generateCsprngToken(4)}`;
      const { hash, salt } = securityService.hashPassword(passcode);

      const profile = await dbRepository.createRegisteredProfile(userToken, username, hash, phoneNumber);
      profile.passwordSalt = salt;
      await dbRepository.saveProfile(profile);

      // Create server session with HttpOnly cookie & CSRF token
      const session = await dbRepository.createSession(userToken, profile.role, ip, userAgent);

      const res = NextResponse.json({
        success: true,
        token: session.token,
        csrfToken: session.csrfToken,
        userToken,
        profile: sanitizeProfileResponse(profile),
      });

      attachAuthCookies(res, session.token, session.csrfToken);
      return res;
    }

    // 6. LOGIN
    if (action === "login") {
      if (!passcode) {
        return NextResponse.json({ error: "Passcode/password required" }, { status: 400 });
      }

      let profile = await dbRepository.findProfileByUsername(username);
      if (!profile) {
        // Also support logging in using registered phone number
        profile = await dbRepository.findProfileByPhone(username);
      }

      if (!profile) {
        return NextResponse.json({ error: "Account not found. Please check your username or phone number, or register." }, { status: 404 });
      }

      if (profile.status === "banned") {
        return NextResponse.json(
          { error: `Account suspended. Reason: ${profile.bannedReason || "Violation of rules"}` },
          { status: 403 }
        );
      }

      const isValid = securityService.hashOrVerifyPasscode(passcode, profile.passcode, profile.passwordSalt);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Create server session with HttpOnly cookie & CSRF token
      const session = await dbRepository.createSession(profile.token, profile.role, ip, userAgent);

      const res = NextResponse.json({
        success: true,
        token: session.token,
        csrfToken: session.csrfToken,
        userToken: profile.token,
        profile: sanitizeProfileResponse(profile),
      });

      attachAuthCookies(res, session.token, session.csrfToken);
      return res;
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication error" },
      { status: 500 }
    );
  }
}
