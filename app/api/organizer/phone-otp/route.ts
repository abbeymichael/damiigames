import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbRepository } from "@/lib/db-client";
import { getSessionFromRequest, handleAuthError } from "@/lib/auth-guard";
import { canSendOtp, generateOtpCode, getClientIp, hashOtpCode, sendOtpSms, verifyOtpAttempt } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const auth = await getSessionFromRequest(req);
    const user = auth?.user;
    if (!auth || !user?.token) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const ipAddress = getClientIp(req);
    const body = await req.json();
    const action = String(body.action || "send").toLowerCase();

    if (action === "send") {
      const phoneNumber = String(body.phoneNumber || body.phone || "").trim();
      if (!phoneNumber) {
        return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
      }

      // Phone format validation (E.164 or Ghanaian local format)
      const sanitizedPhone = phoneNumber.replace(/[\s\-()]/g, "");
      if (sanitizedPhone.length < 9 || sanitizedPhone.length > 16) {
        return NextResponse.json({ error: "Invalid phone number format. Please provide a valid Ghana phone number." }, { status: 400 });
      }

      // Check if phone belongs to a different registered user
      const existingUser = await dbRepository.getUserByPhone(sanitizedPhone);
      if (existingUser && existingUser.id !== user.token) {
        return NextResponse.json(
          { error: "This phone number is already registered to another user account. Please use your own phone number." },
          { status: 400 }
        );
      }

      // Rate limit check
      const rateCheck = await canSendOtp(sanitizedPhone, ipAddress);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          {
            error:
              rateCheck.reason === "too_soon"
                ? `Please wait ${rateCheck.retryAfter || 60} seconds before requesting another code.`
                : "OTP rate limit exceeded. Please try again in a little while.",
            reason: rateCheck.reason,
            retryAfter: rateCheck.retryAfter,
          },
          { status: 429 }
        );
      }

      const rawCode = generateOtpCode();
      const codeHash = hashOtpCode(rawCode);
      const requestId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes

      await dbRepository.createOtpRequest({
        id: requestId,
        phoneNumber: sanitizedPhone,
        codeHash,
        ipAddress,
        expiresAt,
      });

      await sendOtpSms(sanitizedPhone, rawCode);

      return NextResponse.json({
        success: true,
        requestId,
        expiresAt: expiresAt.toISOString(),
        message: `6-digit verification code sent to ${sanitizedPhone}. Expires in 4 minutes.`,
      });
    }

    if (action === "verify") {
      const requestId = String(body.requestId || "").trim();
      const code = String(body.code || "").trim();

      if (!requestId || !code) {
        return NextResponse.json(
          { error: "Both request ID and the 6-digit verification code are required." },
          { status: 400 }
        );
      }

      const verification = await verifyOtpAttempt(requestId, code);
      if (!verification.success || !verification.phoneNumber) {
        return NextResponse.json(
          { error: verification.error || "Invalid or expired verification code. Please try again." },
          { status: 400 }
        );
      }

      const verifiedPhone = verification.phoneNumber;
      const now = new Date().toISOString();

      // Find or update user record
      let userRecord = await dbRepository.getUserById(user.token);
      if (!userRecord) {
        userRecord = await dbRepository.saveUser({
          id: user.token,
          phoneNumber: verifiedPhone,
          phoneVerifiedAt: now,
          username: user.username,
          role: "player",
          createdAt: now,
        });
      } else {
        userRecord = await dbRepository.updateUser(user.token, {
          phoneNumber: verifiedPhone,
          phoneVerifiedAt: now,
        });
      }

      // Update matching profile
      const profile = await dbRepository.getProfile(user.token);
      if (profile) {
        profile.phoneNumber = verifiedPhone;
        await dbRepository.saveProfile(profile);
      }

      return NextResponse.json({
        success: true,
        message: `Phone number ${verifiedPhone} verified successfully!`,
        phoneNumber: verifiedPhone,
        phoneVerifiedAt: now,
        user: userRecord,
      });
    }

    return NextResponse.json({ error: "Invalid action. Supported actions: 'send', 'verify'." }, { status: 400 });
  } catch (err) {
    return handleAuthError(err);
  }
}
