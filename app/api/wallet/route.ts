import { NextRequest, NextResponse } from "next/server";
import { walletService } from "@/lib/wallet-service";
import { dbRepository } from "@/lib/db-client";
import { getAuthContext } from "@/lib/auth-guard";
import { securityService } from "@/lib/security";

const cleanToken = (v: unknown) => String(v ?? "").trim().slice(0, 80);

async function resolveUserToken(req: NextRequest, fallbackToken?: string): Promise<string> {
  const authCtx = await getAuthContext(req);
  if (authCtx) return authCtx.user.token;
  if (!fallbackToken) return "";

  const session = await dbRepository.getSession(fallbackToken);
  if (session) return session.userId;
  return fallbackToken;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paramToken = cleanToken(searchParams.get("token"));
  const userToken = await resolveUserToken(req, paramToken);

  if (!userToken) {
    return NextResponse.json({ error: "Token or session required" }, { status: 400 });
  }

  const balance = await walletService.getBalance(userToken);
  const transactions = await dbRepository.getUserTransactions(userToken, 20);
  const settings = await dbRepository.getAdminSettings();

  return NextResponse.json({ balance, transactions, settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    const paramToken = cleanToken(body.token);
    const userToken = await resolveUserToken(req, paramToken);

    if (!userToken) {
      return NextResponse.json({ error: "Token or session required" }, { status: 400 });
    }

    // Rate limiting for wallet financial actions (15 requests per minute)
    const rateCheck = securityService.checkRateLimit(`wallet:${userToken}`, 15, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many wallet requests. Please wait a minute before retrying." },
        { status: 429 }
      );
    }

    if (action === "deposit") {
      const amountGhs = Number(body.amountGhs);
      const email = String(body.email ?? "");
      const res = await walletService.initPaystackTopup(userToken, amountGhs, email);
      return NextResponse.json(res);
    }

    if (action === "verify") {
      const reference = String(body.reference ?? "");
      if (!reference) return NextResponse.json({ error: "Reference required" }, { status: 400 });
      const res = await walletService.verifyAndCreditPaystack(reference);
      const balance = await walletService.getBalance(userToken);
      return NextResponse.json({ ...res, balance });
    }

    if (action === "withdraw") {
      const amount = Number(body.amountGhs ?? body.pointsAmount);
      const momoNumber = String(body.momoNumber ?? "");
      const momoProvider = String(body.momoProvider ?? "MTN");
      if (!momoNumber) return NextResponse.json({ error: "MoMo phone number required" }, { status: 400 });

      const res = await walletService.requestWithdrawal(userToken, amount, momoNumber, momoProvider);
      const balance = await walletService.getBalance(userToken);
      return NextResponse.json({ ...res, balance });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Wallet error" },
      { status: 500 }
    );
  }
}
