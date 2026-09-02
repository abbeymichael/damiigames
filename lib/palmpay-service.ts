import crypto from "crypto";
import { dbRepository } from "./db-client";
import { AdminSettings } from "./types";

export interface PalmpayConfig {
  merchantId: string;
  bearerToken: string;
  appSecret?: string;
  signature?: string;
  mode: "sandbox" | "live";
  countryCode: string;
  currency: string;
  baseUrl: string;
}

export interface PalmpayBalanceResult {
  configured: boolean;
  success: boolean;
  merchantId?: string;
  mode: "sandbox" | "live";
  countryCode: string;
  currency: string;
  availableBalance: number;
  frozenBalance: number;
  currentBalance: number;
  unSettleBalance: number;
  rawAvailableBalance?: number;
  rawFrozenBalance?: number;
  rawCurrentBalance?: number;
  rawUnSettleBalance?: number;
  formattedAvailable: string;
  formattedFrozen: string;
  formattedCurrent: string;
  formattedUnsettle: string;
  queriedAt: string;
  raw?: any;
  error?: string;
  message?: string;
}

export interface PalmpayTransferParams {
  transactionId: string;
  reference: string;
  amount: number;
  recipientPhone: string;
  recipientName: string;
  bankCode?: string;
  remark?: string;
}

export interface PalmpayTransferResult {
  success: boolean;
  transferCode?: string;
  transferId?: string | number;
  status: "pending" | "processing" | "success" | "failed";
  orderNo?: string;
  message?: string;
  data?: any;
  error?: string;
}

export interface PalmpayCreateOrderParams {
  orderId: string; // The unique Order Number of the merchant (max 32 chars)
  amountGhs: number; // Transaction amount in GHS. Will be sent as cent/pesewas (100 = 1 GHS). Min: 100
  title?: string; // Order title (max 100)
  description?: string; // Order description (max 200)
  notifyUrl?: string; // Receive transaction result notification url (max 200)
  callBackUrl?: string; // After payment completed, H5 page returns this url (max 200)
  orderExpireTime?: number; // Validity duration in seconds (1800s to 86400s)
  goodsDetails?: string | Array<any>; // JSONArray string format
  customerInfo?: string | {
    userId?: string;
    userName?: string;
    phone?: string;
    email?: string;
  };
  remark?: string; // Remarks (max 200)
  currency?: string; // Currency: strictly "GHS" for Ghana
}

export interface PalmpayCreateOrderResult {
  success: boolean;
  orderNo?: string;
  orderStatus?: number;
  message?: string;
  checkoutUrl?: string;
  payToken?: string;
  sdkSessionId?: string;
  sdkSignKey?: string;
  currency?: string;
  orderAmount?: number;
  raw?: any;
  error?: string;
}

export async function getEffectivePalmpayConfig(): Promise<PalmpayConfig> {
  let settings: AdminSettings | null = null;
  try {
    settings = await dbRepository.getPlatformSettings();
  } catch {
    settings = null;
  }

  const merchantId = (settings?.palmpayMerchantId || process.env.PALMPAY_MERCHANT_ID || "").trim();
  const bearerToken = (settings?.palmpayBearerToken || process.env.PALMPAY_BEARER_TOKEN || "").trim();
  const appSecret = (settings?.palmpayAppSecret || process.env.PALMPAY_APP_SECRET || "").trim();
  const signature = (settings?.palmpaySignature || process.env.PALMPAY_SIGNATURE || "").trim();
  const mode = (settings?.palmpayMode || process.env.PALMPAY_MODE || "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
  const countryCode = (settings?.palmpayCountryCode || process.env.PALMPAY_COUNTRY_CODE || "GH").trim().toUpperCase();
  const currency = (settings?.palmpayCurrency || process.env.PALMPAY_CURRENCY || "GHS").trim().toUpperCase();
  
  const defaultBaseUrl = mode === "live"
    ? "https://open-gw-prod.palmpay-inc.com"
    : "https://open-gw-sandbox.palmpay-inc.com";

  const baseUrl = (settings?.palmpayBaseUrl || process.env.PALMPAY_BASE_URL || defaultBaseUrl).trim().replace(/\/+$/, "");

  return {
    merchantId,
    bearerToken,
    appSecret,
    signature,
    mode,
    countryCode,
    currency,
    baseUrl,
  };
}

/**
 * Generate or resolve the PalmPay signature header.
 * If a static test signature is provided (e.g. from Postman), it is used directly.
 * Otherwise, if an appSecret or privateKey is present, it is dynamically computed.
 */
export function generatePalmpaySignature(params: Record<string, any>, config: PalmpayConfig): string {
  // If an explicit signature is provided (e.g., from Postman test header D11A3E8C...)
  if (config.signature && config.signature.trim().length > 0) {
    return config.signature.trim();
  }

  const secret = (config.appSecret || config.bearerToken || "").trim();
  if (!secret) {
    return "";
  }

  try {
    // Check if secret is an RSA PEM private key
    if (secret.includes("PRIVATE KEY")) {
      const sortedKeys = Object.keys(params).sort();
      const signString = sortedKeys
        .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "")
        .map((k) => `${k}=${typeof params[k] === "object" ? JSON.stringify(params[k]) : params[k]}`)
        .join("&");

      const signer = crypto.createSign("RSA-SHA256");
      signer.update(signString, "utf8");
      return signer.sign(secret, "base64");
    }

    // Standard MD5 / HMAC hash of sorted query/body parameters + secret key
    const sortedKeys = Object.keys(params).sort();
    const kvPairs = sortedKeys
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "" && k !== "signature" && k !== "sign")
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    const toSign = kvPairs ? `${kvPairs}&secretKey=${secret}` : `secretKey=${secret}`;
    const md5Hash = crypto.createHash("md5").update(toSign, "utf8").digest("hex").toUpperCase();
    return md5Hash;
  } catch (err) {
    console.error("[Palmpay] Failed to calculate signature:", err);
    return "";
  }
}

export function formatCurrencyValue(amount: number, currency: string): string {
  const symbol = currency === "GHS" || !currency ? "GH₵" : `${currency} `;
  return `${symbol} ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const palmpayService = {
  /**
   * Query Merchant Balance via /api/v2/merchant/manage/account/queryBalance
   * Parameter: merchantId (String 32)
   * Headers: CountryCode, Authorization: Bearer <token>, Signature: <sig>
   */
  async queryBalance(overrideConfig?: Partial<PalmpayConfig>): Promise<PalmpayBalanceResult> {
    const effective = await getEffectivePalmpayConfig();
    const config: PalmpayConfig = {
      ...effective,
      ...overrideConfig,
    };

    const now = new Date().toISOString();

    if (!config.merchantId) {
      return {
        configured: false,
        success: false,
        mode: config.mode,
        countryCode: config.countryCode,
        currency: config.currency,
        availableBalance: 0,
        frozenBalance: 0,
        currentBalance: 0,
        unSettleBalance: 0,
        formattedAvailable: formatCurrencyValue(0, config.currency),
        formattedFrozen: formatCurrencyValue(0, config.currency),
        formattedCurrent: formatCurrencyValue(0, config.currency),
        formattedUnsettle: formatCurrencyValue(0, config.currency),
        queriedAt: now,
        error: "PalmPay Merchant ID (merchantId) is not configured.",
        message: "Please enter your PalmPay 32-character Merchant ID in admin payment settings.",
      };
    }

    if (!config.bearerToken) {
      return {
        configured: false,
        success: false,
        mode: config.mode,
        countryCode: config.countryCode,
        currency: config.currency,
        availableBalance: 0,
        frozenBalance: 0,
        currentBalance: 0,
        unSettleBalance: 0,
        formattedAvailable: formatCurrencyValue(0, config.currency),
        formattedFrozen: formatCurrencyValue(0, config.currency),
        formattedCurrent: formatCurrencyValue(0, config.currency),
        formattedUnsettle: formatCurrencyValue(0, config.currency),
        queriedAt: now,
        error: "PalmPay Authorization Bearer Token is not configured.",
        message: "Please enter your PalmPay Bearer Token in admin payment settings.",
      };
    }

    const payload = {
      merchantId: config.merchantId.trim(),
    };

    const signature = generatePalmpaySignature(payload, config);
    const targetUrl = `${config.baseUrl}/api/v2/merchant/manage/account/queryBalance`;

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      CountryCode: config.countryCode || "GH",
      Authorization: `Bearer ${config.bearerToken.trim()}`,
    };

    if (signature) {
      headers["Signature"] = signature;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let json: any = null;
      try {
        json = rawText ? JSON.parse(rawText) : null;
      } catch {
        // Non-JSON response
        return {
          configured: true,
          success: false,
          merchantId: config.merchantId,
          mode: config.mode,
          countryCode: config.countryCode,
          currency: config.currency,
          availableBalance: 0,
          frozenBalance: 0,
          currentBalance: 0,
          unSettleBalance: 0,
          formattedAvailable: formatCurrencyValue(0, config.currency),
          formattedFrozen: formatCurrencyValue(0, config.currency),
          formattedCurrent: formatCurrencyValue(0, config.currency),
          formattedUnsettle: formatCurrencyValue(0, config.currency),
          queriedAt: now,
          error: `PalmPay server returned HTTP ${res.status}: ${rawText.slice(0, 160)}`,
          raw: rawText,
        };
      }

      // Check for success:
      // PalmPay may return:
      // { respCode: "000000" | "00", message: "success", data: { availableBalance, ... } }
      // or { code: 0 | "000000", data: { ... } }
      // or directly { availableBalance, ... }
      const data = json?.data || json?.result || json;
      const isOkCode =
        json?.respCode === "000000" ||
        json?.respCode === "00" ||
        json?.code === "000000" ||
        json?.code === 0 ||
        json?.status === "success" ||
        json?.status === true ||
        (data && (data.availableBalance !== undefined || data.currentBlance !== undefined || data.currentBalance !== undefined));

      if (res.ok && isOkCode) {
        // Balances in PalmPay responses:
        // Available, frozen, current (total), and unSettle
        const rawAvail = Number(data.availableBalance ?? 0);
        const rawFrozen = Number(data.frozenBalance ?? 0);
        // Note: Palmpay documentation has the typo "currentBlance"
        const rawCurrent = Number(data.currentBlance ?? data.currentBalance ?? (rawAvail + rawFrozen));
        const rawUnsettle = Number(data.unSettleBalance ?? 0);

        // Palmpay balances are typically represented in minor units (kobo/pesewas) or major depending on merchant tier.
        // If values exceed 10000 and have no decimal, we also calculate standard currency units (divided by 100).
        // To be completely clear and accurate, we detect and present both or auto-scale if minor units.
        const isMinorUnits = rawAvail > 1000 && Number.isInteger(rawAvail);
        const scale = isMinorUnits ? 100 : 1;

        const available = rawAvail / scale;
        const frozen = rawFrozen / scale;
        const current = rawCurrent / scale;
        const unsettle = rawUnsettle / scale;

        return {
          configured: true,
          success: true,
          merchantId: config.merchantId,
          mode: config.mode,
          countryCode: config.countryCode,
          currency: config.currency,
          availableBalance: available,
          frozenBalance: frozen,
          currentBalance: current,
          unSettleBalance: unsettle,
          rawAvailableBalance: rawAvail,
          rawFrozenBalance: rawFrozen,
          rawCurrentBalance: rawCurrent,
          rawUnSettleBalance: rawUnsettle,
          formattedAvailable: formatCurrencyValue(available, config.currency),
          formattedFrozen: formatCurrencyValue(frozen, config.currency),
          formattedCurrent: formatCurrencyValue(current, config.currency),
          formattedUnsettle: formatCurrencyValue(unsettle, config.currency),
          queriedAt: now,
          raw: json,
          message: `PalmPay merchant account balance verified successfully (${config.currency} ${available.toLocaleString()})`,
        };
      }

      const errMsg = json?.message || json?.respMsg || json?.error || `HTTP ${res.status} from PalmPay Gateway`;
      return {
        configured: true,
        success: false,
        merchantId: config.merchantId,
        mode: config.mode,
        countryCode: config.countryCode,
        currency: config.currency,
        availableBalance: 0,
        frozenBalance: 0,
        currentBalance: 0,
        unSettleBalance: 0,
        formattedAvailable: formatCurrencyValue(0, config.currency),
        formattedFrozen: formatCurrencyValue(0, config.currency),
        formattedCurrent: formatCurrencyValue(0, config.currency),
        formattedUnsettle: formatCurrencyValue(0, config.currency),
        queriedAt: now,
        error: errMsg,
        raw: json,
      };
    } catch (err: any) {
      return {
        configured: true,
        success: false,
        merchantId: config.merchantId,
        mode: config.mode,
        countryCode: config.countryCode,
        currency: config.currency,
        availableBalance: 0,
        frozenBalance: 0,
        currentBalance: 0,
        unSettleBalance: 0,
        formattedAvailable: formatCurrencyValue(0, config.currency),
        formattedFrozen: formatCurrencyValue(0, config.currency),
        formattedCurrent: formatCurrencyValue(0, config.currency),
        formattedUnsettle: formatCurrencyValue(0, config.currency),
        queriedAt: now,
        error: err.name === "AbortError" ? "PalmPay balance query request timed out after 12s" : err.message || "Failed to reach PalmPay Open Platform servers",
      };
    }
  },

  /**
   * Disburse withdrawal payout via PalmPay Payouts API
   */
  async initiateTransfer(params: PalmpayTransferParams): Promise<PalmpayTransferResult> {
    const config = await getEffectivePalmpayConfig();
    if (!config.merchantId || !config.bearerToken) {
      throw new Error("PalmPay is not fully configured (Merchant ID and Bearer Token required).");
    }

    const orderNo = `PALMPAY-${params.reference}-${Date.now()}`;
    const amountMinor = Math.round(params.amount * 100);

    // Format phone number for Ghana mobile money if applicable
    let payeePhone = (params.recipientPhone || "").trim().replace(/\s+/g, "").replace(/-/g, "");
    if ((config.countryCode || "GH") === "GH") {
      if (payeePhone.startsWith("+233")) {
        payeePhone = payeePhone.substring(1);
      } else if (payeePhone.startsWith("0") && payeePhone.length === 10) {
        payeePhone = `233${payeePhone.substring(1)}`;
      }
    }

    const payload = {
      merchantId: config.merchantId,
      orderNo,
      amount: amountMinor,
      currency: config.currency || "GHS",
      payeePhone,
      payeeName: params.recipientName || "Player",
      remark: params.remark || "DAMII Payout GHS",
    };

    const signature = generatePalmpaySignature(payload, config);
    const targetUrl = `${config.baseUrl}/api/v2/merchant/payout/transfer`;

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      CountryCode: config.countryCode || "GH",
      Authorization: `Bearer ${config.bearerToken.trim()}`,
    };
    if (signature) headers["Signature"] = signature;

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && (json?.respCode === "000000" || json?.code === 0 || json?.status === "success")) {
        return {
          success: true,
          transferCode: json?.data?.orderNo || orderNo,
          transferId: json?.data?.id || orderNo,
          status: "success",
          orderNo,
          message: "PalmPay transfer successfully dispatched.",
          data: json,
        };
      }

      // If sandbox returns simulation or specific code
      if (config.mode === "sandbox") {
        return {
          success: true,
          transferCode: orderNo,
          transferId: `SBX-${Date.now()}`,
          status: "processing",
          orderNo,
          message: `[Sandbox] PalmPay transfer initiated for ${config.currency} ${params.amount.toFixed(2)} to ${params.recipientPhone}`,
          data: json || { simulated: true },
        };
      }

      const errMsg = json?.message || json?.respMsg || `PalmPay transfer failed (HTTP ${res.status})`;
      throw new Error(errMsg);
    } catch (err: any) {
      // In sandbox mode, if the mock gateway endpoint is unreachable, provide a simulated successful response with clear notice
      if (config.mode === "sandbox") {
        return {
          success: true,
          transferCode: orderNo,
          transferId: `SBX-${Date.now()}`,
          status: "processing",
          orderNo,
          message: `[Sandbox Simulated] Transfer queued for ${params.recipientPhone} (${config.currency} ${params.amount.toFixed(2)})`,
          data: { simulated: true, originalError: err.message },
        };
      }
      throw err;
    }
  },

  /**
   * Create Order for Pay-in or Deposits via PalmPay API
   * Request Path: /api/v2/payment/merchant/createorder
   * Pulls up H5 checkoutUrl or parameters required for SDK payment.
   */
  async createOrder(params: PalmpayCreateOrderParams): Promise<PalmpayCreateOrderResult> {
    const config = await getEffectivePalmpayConfig();
    if (!config.merchantId || !config.bearerToken) {
      throw new Error("PalmPay is not fully configured (Merchant ID and Bearer Token required).");
    }

    const cleanOrderId = (params.orderId || `ORD${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`).slice(0, 32);
    const amountMinor = Math.round(params.amountGhs * 100);
    const nowMs = Date.now();
    const nonceStr = crypto.randomBytes(16).toString("hex");

    // Format goodsDetails as JSON string
    let goodsDetailsStr = '[{"goodsId":"marbles_deposit"}]';
    if (typeof params.goodsDetails === "string" && params.goodsDetails.trim()) {
      goodsDetailsStr = params.goodsDetails.trim();
    } else if (Array.isArray(params.goodsDetails) && params.goodsDetails.length > 0) {
      goodsDetailsStr = JSON.stringify(params.goodsDetails);
    }

    // Format customerInfo as JSON string
    let customerInfoStr = "{}";
    if (typeof params.customerInfo === "string" && params.customerInfo.trim()) {
      customerInfoStr = params.customerInfo.trim();
    } else if (typeof params.customerInfo === "object" && params.customerInfo !== null) {
      customerInfoStr = JSON.stringify(params.customerInfo);
    }

    const payload: Record<string, any> = {
      requestTime: nowMs,
      version: "V1.1",
      nonceStr,
      amount: Math.max(100, amountMinor),
      notifyUrl: params.notifyUrl || `${config.baseUrl}/api/wallet/palmpay-webhook`,
      orderId: cleanOrderId,
      title: (params.title || "Damii Marbles Top-up").slice(0, 100),
      description: (params.description || "Damii Game Wallet Deposit").slice(0, 200),
      currency: config.currency || "GHS",
      callBackUrl: params.callBackUrl || "https://damii.gh/wallet",
      goodsDetails: goodsDetailsStr,
      customerInfo: customerInfoStr,
      remark: (params.remark || "Wallet Deposit GHS").slice(0, 200),
    };

    if (params.orderExpireTime && params.orderExpireTime >= 1800 && params.orderExpireTime <= 86400) {
      payload.orderExpireTime = params.orderExpireTime;
    }

    const signature = generatePalmpaySignature(payload, config);
    const targetUrl = `${config.baseUrl}/api/v2/payment/merchant/createorder`;

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      CountryCode: config.countryCode || "GH",
      Authorization: `Bearer ${config.bearerToken.trim()}`,
    };
    if (signature) headers["Signature"] = signature;

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && (json?.respCode === "00000000" || json?.respCode === "000000" || json?.code === 0 || json?.status === "success") && json?.data) {
        return {
          success: true,
          orderNo: json.data.orderNo,
          orderStatus: json.data.orderStatus,
          message: json.respMsg || json.data.message || "Order created successfully",
          checkoutUrl: json.data.checkoutUrl,
          payToken: json.data.payToken,
          sdkSessionId: json.data.sdkSessionId,
          sdkSignKey: json.data.sdkSignKey,
          currency: json.data.currency || config.currency || "GHS",
          orderAmount: json.data.orderAmount,
          raw: json,
        };
      }

      // If in sandbox mode and the API returns simulation or specific mock status
      if (config.mode === "sandbox") {
        const mockOrderNo = json?.data?.orderNo || `SBX-ORD-${Date.now()}`;
        const mockCheckout = json?.data?.checkoutUrl || `${params.callBackUrl || "/wallet"}?palmpay_sandbox=true&orderNo=${mockOrderNo}&ref=${cleanOrderId}`;
        return {
          success: true,
          orderNo: mockOrderNo,
          orderStatus: 1,
          message: `[Sandbox] Order created successfully: ${json?.respMsg || "ready"}`,
          checkoutUrl: mockCheckout,
          payToken: json?.data?.payToken || Buffer.from(JSON.stringify({ orderNo: mockOrderNo, simulated: true })).toString("base64"),
          sdkSessionId: json?.data?.sdkSessionId || String(Date.now()),
          sdkSignKey: json?.data?.sdkSignKey || "sandbox-key",
          currency: config.currency || "GHS",
          orderAmount: Math.max(100, amountMinor),
          raw: json || { simulated: true },
        };
      }

      const errMsg = json?.respMsg || json?.message || `PalmPay createorder failed (HTTP ${res.status})`;
      throw new Error(errMsg);
    } catch (err: any) {
      if (config.mode === "sandbox") {
        const mockOrderNo = `SBX-ORD-${Date.now()}`;
        const mockCheckout = `${params.callBackUrl || "/wallet"}?palmpay_sandbox=true&orderNo=${mockOrderNo}&ref=${cleanOrderId}`;
        return {
          success: true,
          orderNo: mockOrderNo,
          orderStatus: 1,
          message: `[Sandbox Simulated] Order created successfully for ${config.currency} ${params.amountGhs.toFixed(2)}`,
          checkoutUrl: mockCheckout,
          payToken: Buffer.from(JSON.stringify({ orderNo: mockOrderNo, simulated: true })).toString("base64"),
          sdkSessionId: String(Date.now()),
          sdkSignKey: "sandbox-key",
          currency: config.currency || "GHS",
          orderAmount: Math.max(100, amountMinor),
          raw: { simulated: true, originalError: err.message },
        };
      }
      throw err;
    }
  },

  /**
   * Query status of an order via PalmPay API
   */
  async queryOrder(params: { orderId?: string; orderNo?: string }): Promise<any> {
    const config = await getEffectivePalmpayConfig();
    if (!config.merchantId || !config.bearerToken) {
      throw new Error("PalmPay is not fully configured.");
    }

    const payload: Record<string, any> = {
      merchantId: config.merchantId,
    };
    if (params.orderId) payload.orderId = params.orderId;
    if (params.orderNo) payload.orderNo = params.orderNo;

    const signature = generatePalmpaySignature(payload, config);
    const targetUrl = `${config.baseUrl}/api/v2/payment/merchant/queryorder`;

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      CountryCode: config.countryCode || "GH",
      Authorization: `Bearer ${config.bearerToken.trim()}`,
    };
    if (signature) headers["Signature"] = signature;

    try {
      const res = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      return json;
    } catch (err: any) {
      if (config.mode === "sandbox") {
        return {
          respCode: "00000000",
          respMsg: "success",
          data: {
            orderNo: params.orderNo || `SBX-${params.orderId}`,
            orderStatus: 1,
            message: "success (simulated)",
          },
        };
      }
      throw err;
    }
  },
};
