import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { dbRepository } from "@/lib/db-client";
import { canSendOtp, generateOtpCode, getClientIp, hashOtpCode, sendOtpSms } from "@/lib/otp";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = getClientIp(req);
    const body = await req.json();
    const phoneNumber = String(body.phoneNumber || body.phone || "").trim();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    // Phone format validation (Ghanaian / International E.164 or local format)
    const sanitizedPhone = phoneNumber.replace(/[\s\-()]/g, "");
    if (sanitizedPhone.length < 9 || sanitizedPhone.length > 16) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
    }

    // 1. Rate limiting check (phone and IP limits)
    const rateCheck = await canSendOtp(sanitizedPhone, ipAddress);
    if (!rateCheck.allowed) {
      const reasonMessages = {
        phone_rate_limited: "Maximum OTP attempts exceeded for this phone number. Please try again tomorrow.",
        too_soon: `Please wait ${rateCheck.retryAfter || 60} seconds before requesting another code.`,
        ip_rate_limited: "Too many verification requests from your network. Please try again later.",
      };

      return NextResponse.json(
        {
          error: rateCheck.reason ? reasonMessages[rateCheck.reason] : "Rate limit exceeded",
          reason: rateCheck.reason,
          retryAfter: rateCheck.retryAfter,
        },
        { status: 429 },
      );
    }

    // 2. Generate 6-digit code and hash it
    const rawCode = generateOtpCode();
    const codeHash = hashOtpCode(rawCode);
    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes expiry

    // 3. Save OTP request record (raw code is never stored)
    await dbRepository.createOtpRequest({
      id: requestId,
      phoneNumber: sanitizedPhone,
      codeHash,
      ipAddress,
      expiresAt,
    });

    // 4. Send SMS to the user
    await sendOtpSms(sanitizedPhone, rawCode);

    // In development or non-production environment, return debugCode for easy testing
    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      success: true,
      requestId,
      expiresAt: expiresAt.toISOString(),
      message: `OTP code sent successfully to ${sanitizedPhone}. Expires in 4 minutes.`,
      debugCode: isDev ? rawCode : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate OTP" },
      { status: 500 },
    );
  }
}
