import { NextRequest, NextResponse } from "next/server";
import { securityService } from "@/lib/security";
import { walletService } from "@/lib/wallet-service";

/**
 * Paystack Transfer Webhook Handler
 * Route: /api/wallet/transfer-webhook
 * 
 * Listens for Paystack transfer events:
 * - 'transfer.success': Updates withdrawal transaction to 'completed', creates settlement ledger entry and notifies user.
 * - 'transfer.failed': Updates withdrawal transaction to 'failed', issues automatic balance refund, writes ledger reversal entry and notifies user.
 * - 'transfer.reversed': Handles network/bank reversal by refunding user and logging audit records.
 *
 * Security: Validates incoming HMAC SHA-512 signature in 'x-paystack-signature' header against PAYSTACK_SECRET_KEY.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecret) {
      console.error("[Paystack Transfer Webhook] PAYSTACK_SECRET_KEY not configured on server");
      return NextResponse.json(
        { error: "PAYSTACK_SECRET_KEY not configured on server" },
        { status: 500 }
      );
    }

    if (!signature) {
      console.warn("[Paystack Transfer Webhook] Missing x-paystack-signature header");
      return NextResponse.json(
        { error: "Missing x-paystack-signature header" },
        { status: 401 }
      );
    }

    // Strictly verify HMAC SHA-512 signature
    const isValidSignature = securityService.verifyPaystackHmac(rawBody, signature, paystackSecret);
    if (!isValidSignature) {
      console.warn("[Paystack Transfer Webhook] Invalid Paystack HMAC signature");
      return NextResponse.json(
        { error: "Invalid Paystack HMAC signature" },
        { status: 401 }
      );
    }

    let event: any = {};
    try {
      event = JSON.parse(rawBody || "{}");
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload in webhook body" }, { status: 400 });
    }

    const eventType = String(event.event || "").toLowerCase();

    // Process transfer events
    if (
      eventType === "transfer.success" ||
      eventType === "transfer.failed" ||
      eventType === "transfer.reversed"
    ) {
      const result = await walletService.handleTransferWebhook(event);
      return NextResponse.json({
        status: "success",
        received: true,
        event: eventType,
        result,
      });
    }

    // Acknowledge receipt of other Paystack webhook events
    return NextResponse.json({
      status: "success",
      received: true,
      event: eventType,
      message: "Event received and acknowledged",
    });
  } catch (error) {
    console.error("[Paystack Transfer Webhook Error]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal transfer webhook error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Paystack Transfer Webhook Endpoint",
    supportedEvents: ["transfer.success", "transfer.failed", "transfer.reversed"],
    timestamp: new Date().toISOString(),
  });
}
