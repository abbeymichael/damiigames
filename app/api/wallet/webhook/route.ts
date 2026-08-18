import { NextRequest, NextResponse } from "next/server";
import { securityService } from "@/lib/security";
import { walletService } from "@/lib/wallet-service";

// Paystack Webhook Handler with HMAC SHA512 signature security verification
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "PAYSTACK_SECRET_KEY not configured on server" }, { status: 500 });
      }
    } else {
      if (!signature) {
        return NextResponse.json({ error: "Missing x-paystack-signature header" }, { status: 401 });
      }
      // Verify HMAC SHA512 signature strictly
      const isValidSignature = securityService.verifyPaystackHmac(rawBody, signature, paystackSecret);
      if (!isValidSignature) {
        return NextResponse.json({ error: "Invalid Paystack HMAC signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody || "{}");
    const eventType = String(event.event || "").toLowerCase();

    if (eventType === "charge.success") {
      const reference = event.data?.reference;
      if (reference) {
        await walletService.verifyAndCreditPaystack(reference);
      }
    }

    return NextResponse.json({ status: "success", received: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing error" },
      { status: 500 }
    );
  }
}
