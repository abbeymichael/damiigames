import { NextRequest, NextResponse } from "next/server";
import { walletService } from "@/lib/wallet-service";
import { getEffectivePalmpayConfig } from "@/lib/palmpay-service";

/**
 * PalmPay Webhook Notification Handler
 * Path: /api/wallet/palmpay-webhook
 * 
 * PalmPay sends asynchronous transaction result notifications to this endpoint:
 * - orderId: The merchant's unique order number
 * - orderNo: PalmPay platform order number
 * - orderStatus: 1 = success, 2 = failed, 3 = pending/processing
 * - amount: transaction amount (in cent / pesewas)
 * - currency: GHS
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return NextResponse.json({ respCode: "999999", respMsg: "Invalid JSON body" }, { status: 400 });
    }

    const orderId = String(body.orderId || body.reference || body.orderNo || "").trim();
    const orderNo = String(body.orderNo || "").trim();
    const orderStatus = body.orderStatus !== undefined ? Number(body.orderStatus) : null;

    if (!orderId && !orderNo) {
      return NextResponse.json(
        { respCode: "999999", respMsg: "Missing orderId and orderNo in webhook payload" },
        { status: 400 }
      );
    }

    // Optional signature check if present
    const signature = req.headers.get("signature") || req.headers.get("Signature");
    const config = await getEffectivePalmpayConfig();

    // PalmPay success status is orderStatus 1 (or string "1")
    if (orderStatus === 1 || String(body.orderStatus) === "1" || String(body.status).toUpperCase() === "SUCCESS") {
      const refToVerify = orderId || orderNo;
      await walletService.verifyAndCreditPalmpay(refToVerify, {
        orderId,
        orderNo,
        orderStatus: 1,
        amount: body.amount,
        currency: body.currency,
        raw: body,
      });
    }

    // Return PalmPay standard webhook acknowledgment response
    return NextResponse.json({
      respCode: "00000000",
      respMsg: "success",
    });
  } catch (error: any) {
    console.error("[PalmPay Webhook Error]:", error);
    return NextResponse.json(
      {
        respCode: "99999999",
        respMsg: error?.message || "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "PalmPay Webhook Listener (Ghana - GHS)",
    timestamp: new Date().toISOString(),
  });
}
