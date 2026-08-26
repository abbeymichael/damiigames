import crypto from "crypto";
import { dbRepository } from "./db-client";
import { OtpRequest } from "./types";
import { notificationService } from "./notification-service";
import { logSmsToFile } from "./sms-logger";

const MIN_GAP_SECONDS = 60;
const MAX_SENDS_PER_HOUR = 4;
const LOCKOUT_HOURS = 24;

/**
 * Extracts caller IP address from standard proxy headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return "127.0.0.1";
}

/**
 * Checks rate limits before issuing a new OTP
 */
export async function canSendOtp(
  phoneNumber: string,
  ipAddress: string,
): Promise<{ allowed: boolean; reason?: "phone_rate_limited" | "too_soon" | "ip_rate_limited"; retryAfter?: number }> {
  const cleanPhone = phoneNumber.trim();
  const cleanIp = ipAddress.trim() || "127.0.0.1";
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentByPhone = await dbRepository.getRecentOtpRequestsByPhone(cleanPhone, oneHourAgo);

  if (recentByPhone.length >= MAX_SENDS_PER_HOUR) {
    return { allowed: false, reason: "phone_rate_limited", retryAfter: LOCKOUT_HOURS * 60 * 60 };
  }

  const lastByPhone = recentByPhone.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  if (lastByPhone) {
    const secondsSinceLast = (Date.now() - new Date(lastByPhone.createdAt).getTime()) / 1000;
    if (secondsSinceLast < MIN_GAP_SECONDS) {
      return { allowed: false, reason: "too_soon", retryAfter: Math.ceil(MIN_GAP_SECONDS - secondsSinceLast) };
    }
  }

  const recentByIp = await dbRepository.getRecentOtpRequestsByIp(cleanIp, oneHourAgo);

  if (recentByIp.length >= MAX_SENDS_PER_HOUR * 3) {
    // IP limit is looser than per-phone since one IP can legitimately be
    // multiple household members, but still catches spray-across-numbers abuse.
    return { allowed: false, reason: "ip_rate_limited", retryAfter: LOCKOUT_HOURS * 60 * 60 };
  }

  return { allowed: true };
}

/**
 * Hashes OTP code with SHA-256 so raw plaintext code is never stored in DB.
 */
export function hashOtpCode(code: string): string {
  const salt = process.env.OTP_SECRET_SALT || "damii_otp_salt_ghana";
  return crypto.createHash("sha256").update(`${code.trim()}:${salt}`).digest("hex");
}

/**
 * Generates a random 6-digit numeric OTP code using cryptographically secure random integers
 */
export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Sends SMS via Admin-configured Ghana SMS Gateway (Hubtel / Arkesel / Twilio) or mock simulation
 */
export async function sendOtpSms(
  phoneNumber: string,
  code: string,
): Promise<{ success: boolean; messageId?: string; error?: string; status?: string }> {
  try {
    const smsConfig = await notificationService.getSmsSettings();

    let cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
      cleanPhone = "233" + cleanPhone.substring(1);
    }

    // Interpolate OTP template configured in platform settings
    const template = smsConfig.otpTemplate || "Your DAMII verification code is {code}. Valid for 4 minutes.";
    const smsText = template
      .replace(/\{code\}/g, code)
      .replace(/\{appName\}/g, "DAMII")
      .replace(/\{expiresIn\}/g, "4 minutes");

    // If SMS notifications are disabled in admin platform settings
    if (!smsConfig.enabled) {
      console.log(`[damii][sms-disabled] Admin SMS is disabled. OTP for ${cleanPhone}: ${code}`);
      const mockMsgId = `mock-otp-${Date.now()}`;
      logSmsToFile({
        type: "OTP",
        phone: cleanPhone,
        code,
        message: smsText,
        provider: smsConfig.provider || "disabled",
        status: "SIMULATED_SENT",
        messageId: mockMsgId,
      });
      notificationService.recordDispatchedLog({
        id: `otp-log-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        recipientToken: phoneNumber,
        recipientContact: cleanPhone,
        channel: "sms",
        title: "OTP Verification Code (Disabled/Mock)",
        message: smsText,
        type: "system",
        status: "sent",
        providerMessageId: mockMsgId,
        timestamp: new Date().toISOString(),
      });
      return {
        success: true,
        messageId: mockMsgId,
        status: "mock_sent",
      };
    }

    // Execute provider dispatcher (Hubtel / Arkesel / Twilio / Mock)
    const result = await notificationService.executeSmsProvider(smsConfig, cleanPhone, smsText);

    logSmsToFile({
      type: "OTP",
      phone: cleanPhone,
      code,
      message: smsText,
      provider: smsConfig.provider || "hubtel",
      status: result.status === "failed" ? "FAILED" : "SENT",
      messageId: result.messageId,
    });

    // Record audit log entry in dispatchedChannelLogs
    notificationService.recordDispatchedLog({
      id: `otp-log-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
      recipientToken: phoneNumber,
      recipientContact: cleanPhone,
      channel: "sms",
      title: "OTP Verification Code",
      message: smsText,
      type: "system",
      status: result.status === "failed" ? "failed" : "sent",
      providerMessageId: result.messageId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: result.success,
      messageId: result.messageId,
      status: result.status,
      error: result.error,
    };
  } catch (err) {
    console.error("[sendOtpSms] Error sending OTP:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to dispatch OTP SMS",
    };
  }
}

/**
 * Single-use OTP verification.
 * consumedAt is set on the one verification attempt, success or fail.
 * Any further attempt against that same row is rejected outright without even checking the code.
 */
export async function verifyOtpAttempt(
  requestId: string,
  code: string,
): Promise<{ success: boolean; phoneNumber?: string; error?: string }> {
  if (!requestId || !code) {
    return { success: false, error: "Request ID and verification code required" };
  }

  const otpRow = await dbRepository.getOtpRequest(requestId);
  if (!otpRow) {
    return { success: false, error: "Invalid OTP request. Please request a new code." };
  }

  // 1. One shot per code: If consumedAt is already set, reject immediately
  if (otpRow.consumedAt) {
    return {
      success: false,
      error: "This OTP code has already been used or attempted. Please request a new code.",
    };
  }

  // 2. Expiration check (sentAt + 4 minutes)
  const expiresAtMillis = new Date(otpRow.expiresAt).getTime();
  if (expiresAtMillis < Date.now()) {
    // Mark consumed on expired attempt
    await dbRepository.consumeOtpRequest(requestId);
    return { success: false, error: "OTP code has expired (4 minute limit). Please request a new code." };
  }

  // 3. Mark consumed immediately so this requestId can never be reused or brute-forced
  await dbRepository.consumeOtpRequest(requestId);

  // 4. Compare hash using timing safe compare
  const candidateHash = hashOtpCode(code);
  const isMatch =
    candidateHash.length === otpRow.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(otpRow.codeHash));

  if (!isMatch) {
    return {
      success: false,
      error: "Incorrect OTP code. The code has been invalidated. Please request a new code.",
    };
  }

  return {
    success: true,
    phoneNumber: otpRow.phoneNumber,
  };
}
