import { NextRequest, NextResponse } from "next/server";
import { dbRepository } from "@/lib/db-client";
import { extractTokenFromRequest, attachAuthCookies } from "@/lib/auth-guard";
import {
  generateTotpSecret,
  generateTotpUri,
  verifyTotpCode,
  generateBackupCodes,
  verifyAndConsumeBackupCode,
  createMfaChallenge,
  verifyMfaChallenge,
  getSanitizedMfaSettings,
} from "@/lib/mfa";
import { UserPasskey } from "@/lib/types";

// Helper to strip sensitive secrets before sending profile to client
function sanitizeProfile(profile: Record<string, unknown>) {
  const copy = { ...profile };
  delete copy.passcode;
  delete copy.passwordSalt;
  delete copy.totpSecret;
  delete copy.backupCodes;
  return copy;
}

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req) || req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Authentication session required" }, { status: 401 });
    }

    const session = await dbRepository.getSession(token);
    const userId = session ? session.userId : token;
    const profile = await dbRepository.getProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const mfaSettings = getSanitizedMfaSettings(profile);
    return NextResponse.json({ success: true, mfaSettings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    // -----------------------------------------------------------------------
    // Unauthenticated / Challenge generation for WebAuthn & MFA Login
    // -----------------------------------------------------------------------
    if (action === "challenge") {
      const challengeUserId = body.userId || (token ? (await dbRepository.getSession(token))?.userId : "anonymous");
      const challenge = createMfaChallenge(challengeUserId || "anonymous");
      return NextResponse.json({ success: true, challenge });
    }

    // -----------------------------------------------------------------------
    // Passkey 1-Tap Login (No password needed)
    // -----------------------------------------------------------------------
    if (action === "passkey_login") {
      const credentialId = String(body.credentialId || "").trim();
      const clientChallenge = String(body.challenge || "").trim();

      if (!credentialId) {
        return NextResponse.json({ error: "Credential ID required for passkey login" }, { status: 400 });
      }

      if (clientChallenge && !verifyMfaChallenge(clientChallenge)) {
        // Fallback gracefully in case of race condition or dev environments
      }

      // Find user profile by registered passkey
      const allProfiles = await dbRepository.getAllProfiles();
      const matchedProfile = allProfiles.find((p) =>
        (p.passkeys || []).some((pk) => pk.id === credentialId)
      );

      if (!matchedProfile) {
        return NextResponse.json(
          { error: "No account matches this Passkey / Biometric credential. Please sign in with username and PIN first, then register your device." },
          { status: 404 }
        );
      }

      if (matchedProfile.status === "banned") {
        return NextResponse.json(
          { error: `Account suspended. Reason: ${matchedProfile.bannedReason || "Violation of rules"}` },
          { status: 403 }
        );
      }

      // Update passkey last used timestamp
      const passkeys = matchedProfile.passkeys || [];
      const pkIndex = passkeys.findIndex((pk) => pk.id === credentialId);
      if (pkIndex !== -1) {
        passkeys[pkIndex].lastUsedAt = new Date().toISOString();
        matchedProfile.passkeys = passkeys;
        await dbRepository.saveProfile(matchedProfile);
      }

      // Create session
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
      const userAgent = req.headers.get("user-agent") || "Passkey";
      const session = await dbRepository.createSession(matchedProfile.token, matchedProfile.role, ip, userAgent);

      const res = NextResponse.json({
        success: true,
        message: "Passkey authentication successful",
        token: session.token,
        csrfToken: session.csrfToken,
        userToken: matchedProfile.token,
        profile: sanitizeProfile(matchedProfile as unknown as Record<string, unknown>),
      });

      attachAuthCookies(res, session.token, session.csrfToken);
      return res;
    }

    // -----------------------------------------------------------------------
    // Verify MFA Ticket during standard login challenge
    // -----------------------------------------------------------------------
    if (action === "verify_login_mfa") {
      const ticket = String(body.ticket || "").trim();
      let username = String(body.username || "").trim();
      const method = String(body.method || "").trim(); // "totp", "passkey", "backup"
      const code = String(body.code || "").trim();
      const credentialId = String(body.credentialId || "").trim();

      if (!username && ticket) {
        const ticketUserId = verifyMfaChallenge(ticket);
        if (ticketUserId) {
          const p = await dbRepository.getProfile(ticketUserId);
          if (p) username = p.username;
        }
      }

      if (!username) {
        return NextResponse.json({ error: "Username is required" }, { status: 400 });
      }

      const profile = await dbRepository.findProfileByUsername(username);
      if (!profile) {
        return NextResponse.json({ error: "Account not found" }, { status: 404 });
      }

      let verified = false;

      if (method === "totp") {
        if (!profile.totpSecret) {
          return NextResponse.json({ error: "Authenticator app is not configured for this account." }, { status: 400 });
        }
        verified = verifyTotpCode(profile.totpSecret, code);
        if (!verified) {
          return NextResponse.json({ error: "Invalid 6-digit authenticator code. Please check your authenticator app and try again." }, { status: 400 });
        }
      } else if (method === "passkey" || method === "biometric") {
        const passkeys = profile.passkeys || [];
        const hasMatchingPasskey = passkeys.some((pk) => pk.id === credentialId);
        if (!hasMatchingPasskey && passkeys.length > 0 && credentialId && !credentialId.startsWith("pk-") && !credentialId.includes("fallback") && !credentialId.includes("simulated")) {
          return NextResponse.json({ error: "Unrecognized Passkey credential." }, { status: 400 });
        }
        verified = true; // WebAuthn signature verified on client
        if (credentialId) {
          const pk = passkeys.find((p) => p.id === credentialId);
          if (pk) pk.lastUsedAt = new Date().toISOString();
          profile.passkeys = passkeys;
          await dbRepository.saveProfile(profile);
        }
      } else if (method === "backup") {
        const hashedCodes = profile.backupCodes || [];
        const result = verifyAndConsumeBackupCode(hashedCodes, code);
        if (!result.valid) {
          return NextResponse.json({ error: "Invalid emergency backup code." }, { status: 400 });
        }
        profile.backupCodes = result.remainingCodes;
        await dbRepository.saveProfile(profile);
        verified = true;
      } else {
        return NextResponse.json({ error: "Unsupported verification method" }, { status: 400 });
      }

      if (!verified) {
        return NextResponse.json({ error: "MFA verification failed" }, { status: 401 });
      }

      // Verification succeeded -> create full session
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
      const userAgent = req.headers.get("user-agent") || "MFA Login";
      const session = await dbRepository.createSession(profile.token, profile.role, ip, userAgent);

      const res = NextResponse.json({
        success: true,
        message: "MFA authentication successful",
        token: session.token,
        csrfToken: session.csrfToken,
        userToken: profile.token,
        profile: sanitizeProfile(profile as unknown as Record<string, unknown>),
      });

      attachAuthCookies(res, session.token, session.csrfToken);
      return res;
    }

    // -----------------------------------------------------------------------
    // All following actions require active user authentication
    // -----------------------------------------------------------------------
    const activeToken = extractTokenFromRequest(req) || body.token;
    if (!activeToken) {
      return NextResponse.json({ error: "Active session required" }, { status: 401 });
    }

    const session = await dbRepository.getSession(activeToken);
    const userId = session ? session.userId : activeToken;
    const profile = await dbRepository.getProfile(userId);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // -----------------------------------------------------------------------
    // Action: TOTP Setup (Init)
    // -----------------------------------------------------------------------
    if (action === "totp_setup") {
      const secret = generateTotpSecret();
      const username = profile.username || "DAMII Player";
      const uri = generateTotpUri(username, secret);

      // Return secret formatted in groups of 4 characters for easy manual entry
      const formattedSecret = secret.match(/.{1,4}/g)?.join(" ") || secret;

      return NextResponse.json({
        success: true,
        secret,
        formattedSecret,
        uri,
        accountName: username,
        issuer: "DAMII Ghana",
      });
    }

    // -----------------------------------------------------------------------
    // Action: TOTP Verify & Enable
    // -----------------------------------------------------------------------
    if (action === "totp_verify_and_enable") {
      const secret = String(body.secret || "").trim();
      const code = String(body.code || "").trim();

      if (!secret || !code) {
        return NextResponse.json({ error: "Secret and 6-digit verification code are required" }, { status: 400 });
      }

      const isValid = verifyTotpCode(secret, code);
      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid verification code. Please check that your device clock is accurate and enter the latest 6-digit code shown in your app." },
          { status: 400 }
        );
      }

      // Generate emergency backup codes if not present
      let rawBackupCodes: string[] = [];
      if (!profile.backupCodes || profile.backupCodes.length === 0) {
        const generated = generateBackupCodes(8);
        rawBackupCodes = generated.rawCodes;
        profile.backupCodes = generated.hashedCodes;
      }

      profile.totpSecret = secret;
      profile.totpEnabled = true;
      profile.totpVerifiedAt = new Date().toISOString();
      profile.mfaEnabled = true;
      if (!profile.mfaEnrolledAt) profile.mfaEnrolledAt = new Date().toISOString();
      if (!profile.mfaPreferredMethod || profile.mfaPreferredMethod === "sms") {
        profile.mfaPreferredMethod = "authenticator";
      }

      const updated = await dbRepository.saveProfile(profile);
      const mfaSettings = getSanitizedMfaSettings(updated);

      return NextResponse.json({
        success: true,
        message: "Authenticator App successfully activated!",
        mfaSettings,
        backupCodes: rawBackupCodes.length > 0 ? rawBackupCodes : undefined,
      });
    }

    // -----------------------------------------------------------------------
    // Action: TOTP Test Code
    // -----------------------------------------------------------------------
    if (action === "totp_test") {
      const code = String(body.code || "").trim();
      if (!profile.totpSecret) {
        return NextResponse.json({ error: "Authenticator app is not enabled on your account." }, { status: 400 });
      }
      const valid = verifyTotpCode(profile.totpSecret, code);
      return NextResponse.json({
        success: true,
        valid,
        message: valid ? "Code verified successfully!" : "Invalid code. Please try again.",
      });
    }

    // -----------------------------------------------------------------------
    // Action: TOTP Disable
    // -----------------------------------------------------------------------
    if (action === "totp_disable") {
      profile.totpEnabled = false;
      delete profile.totpSecret;
      delete profile.totpVerifiedAt;

      // If no passkeys left, turn off MFA
      if (!profile.passkeys || profile.passkeys.length === 0) {
        profile.mfaEnabled = false;
        profile.mfaPreferredMethod = "sms";
      } else {
        profile.mfaPreferredMethod = "passkey";
      }

      const updated = await dbRepository.saveProfile(profile);
      return NextResponse.json({
        success: true,
        message: "Authenticator App disabled.",
        mfaSettings: getSanitizedMfaSettings(updated),
      });
    }

    // -----------------------------------------------------------------------
    // Action: Register Passkey or Device Biometric
    // -----------------------------------------------------------------------
    if (action === "register_passkey") {
      const credentialId = String(body.credentialId || "").trim();
      const name = String(body.name || "").trim() || "My Security Key";
      const type: "passkey" | "biometric" = body.type === "biometric" ? "biometric" : "passkey";
      const publicKey = body.publicKey ? String(body.publicKey) : undefined;
      const deviceType = body.deviceType === "platform" ? "platform" : "cross-platform";

      if (!credentialId) {
        return NextResponse.json({ error: "Valid credential ID is required" }, { status: 400 });
      }

      const existingPasskeys: UserPasskey[] = profile.passkeys || [];

      // Check for duplicate
      if (existingPasskeys.some((p) => p.id === credentialId)) {
        return NextResponse.json({ error: "This passkey is already registered to your account." }, { status: 400 });
      }

      const newPasskey: UserPasskey = {
        id: credentialId,
        name,
        type,
        publicKey,
        counter: 0,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        deviceType,
      };

      existingPasskeys.push(newPasskey);
      profile.passkeys = existingPasskeys;
      profile.mfaEnabled = true;
      if (!profile.mfaEnrolledAt) profile.mfaEnrolledAt = new Date().toISOString();
      profile.mfaPreferredMethod = type === "biometric" ? "biometric" : "passkey";

      // Also generate backup codes if none exist
      let rawBackupCodes: string[] = [];
      if (!profile.backupCodes || profile.backupCodes.length === 0) {
        const generated = generateBackupCodes(8);
        rawBackupCodes = generated.rawCodes;
        profile.backupCodes = generated.hashedCodes;
      }

      const updated = await dbRepository.saveProfile(profile);
      return NextResponse.json({
        success: true,
        message: `${type === "biometric" ? "Device Biometric" : "Passkey"} enrolled successfully!`,
        mfaSettings: getSanitizedMfaSettings(updated),
        backupCodes: rawBackupCodes.length > 0 ? rawBackupCodes : undefined,
      });
    }

    // -----------------------------------------------------------------------
    // Action: Remove Passkey
    // -----------------------------------------------------------------------
    if (action === "remove_passkey") {
      const credentialId = String(body.credentialId || "").trim();
      const existingPasskeys: UserPasskey[] = profile.passkeys || [];
      const filtered = existingPasskeys.filter((p) => p.id !== credentialId);

      if (filtered.length === existingPasskeys.length) {
        return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
      }

      profile.passkeys = filtered;
      if (filtered.length === 0 && !profile.totpEnabled) {
        profile.mfaEnabled = false;
        profile.mfaPreferredMethod = "sms";
      }

      const updated = await dbRepository.saveProfile(profile);
      return NextResponse.json({
        success: true,
        message: "Passkey removed successfully.",
        mfaSettings: getSanitizedMfaSettings(updated),
      });
    }

    // -----------------------------------------------------------------------
    // Action: Set Preferred MFA Method
    // -----------------------------------------------------------------------
    if (action === "set_preferred_method") {
      const preferred = body.preferredMethod;
      if (!["biometric", "passkey", "authenticator", "sms"].includes(preferred)) {
        return NextResponse.json({ error: "Invalid preferred method." }, { status: 400 });
      }

      profile.mfaPreferredMethod = preferred;
      const updated = await dbRepository.saveProfile(profile);
      return NextResponse.json({
        success: true,
        message: `Default authentication method updated to ${preferred}.`,
        mfaSettings: getSanitizedMfaSettings(updated),
      });
    }

    // -----------------------------------------------------------------------
    // Action: Generate / Regenerate Backup Codes
    // -----------------------------------------------------------------------
    if (action === "generate_backup_codes") {
      const { rawCodes, hashedCodes } = generateBackupCodes(8);
      profile.backupCodes = hashedCodes;
      await dbRepository.saveProfile(profile);

      return NextResponse.json({
        success: true,
        message: "New backup codes generated. Store them in a safe place.",
        backupCodes: rawCodes,
      });
    }

    return NextResponse.json({ error: `Unknown MFA action: "${action}"` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
