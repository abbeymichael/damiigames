import { NextRequest, NextResponse } from "next/server";
import { walletService } from "@/lib/wallet-service";
import { dbRepository } from "@/lib/db-client";
import { getAuthContext, validateCsrfToken } from "@/lib/auth-guard";
import { securityService } from "@/lib/security";

const cleanToken = (v: unknown) => String(v ?? "").trim().slice(0, 80);

async function resolveUserSession(req: NextRequest, fallbackToken?: string) {
  const authCtx = await getAuthContext(req);
  if (authCtx?.user?.token) {
    return { userToken: authCtx.user.token, session: authCtx.session };
  }
  if (!fallbackToken) return { userToken: "", session: null };

  const session = await dbRepository.getSession(fallbackToken);
  if (session) return { userToken: session.userId, session };
  return { userToken: fallbackToken, session: null };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paramToken = cleanToken(searchParams.get("token"));
  const { userToken } = await resolveUserSession(req, paramToken);

  if (!userToken) {
    return NextResponse.json({ error: "Token or session required" }, { status: 400 });
  }

  const balance = await walletService.getBalance(userToken);
  const transactions = await dbRepository.getUserTransactions(userToken, 50);
  const settings = await dbRepository.getAdminSettings();

  return NextResponse.json({ balance, transactions, settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action ?? "").trim().toLowerCase();
    const paramToken = cleanToken(body.token);
    const { userToken, session } = await resolveUserSession(req, paramToken);

    if (!userToken) {
      return NextResponse.json({ error: "Token or session required" }, { status: 400 });
    }

    // Enforce CSRF token verification on state-changing wallet actions
    validateCsrfToken(req, session);

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
      const callbackUrl = String(body.callbackUrl ?? req.headers.get("origin") ?? "");
      const requestedProvider = String(body.provider ?? "").toLowerCase().trim();

      const settings = await dbRepository.getAdminSettings();
      const activeProvider = requestedProvider || settings.activeDepositProvider || "paystack";

      if (activeProvider === "palmpay") {
        const res = await walletService.initPalmpayTopup(userToken, amountGhs, email, callbackUrl);
        return NextResponse.json(res);
      } else {
        const res = await walletService.initPaystackTopup(userToken, amountGhs, email, callbackUrl);
        return NextResponse.json(res);
      }
    }

    if (action === "verify") {
      const reference = String(body.reference ?? "");
      const provider = String(body.provider ?? "").toLowerCase().trim();
      if (!reference) return NextResponse.json({ error: "Reference required" }, { status: 400 });

      if (provider === "palmpay" || reference.startsWith("PLM") || reference.startsWith("ORD") || reference.startsWith("SBX-ORD")) {
        const res = await walletService.verifyAndCreditPalmpay(reference);
        const balance = await walletService.getBalance(userToken);
        return NextResponse.json({ ...res, balance });
      } else {
        const res = await walletService.verifyAndCreditPaystack(reference);
        const balance = await walletService.getBalance(userToken);
        return NextResponse.json({ ...res, balance });
      }
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
      { status: (error as any)?.status || 500 }
    );
  }
}

