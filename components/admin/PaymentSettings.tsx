"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Key,
  Lock,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Shield,
  Zap,
  Copy,
  Check,
  Globe,
  Radio,
  Sliders,
  DollarSign,
  Info,
  CheckSquare,
  Square,
  ArrowRightLeft,
  Building,
  Terminal,
  ExternalLink,
  Coins,
} from "lucide-react";
import { getCsrfToken, getAuthHeaders, getSessionToken } from "@/lib/client-auth";

export interface PaymentSettingsProps {
  token: string;
  adminSecret?: string;
  canManage?: boolean;
  onSettingsUpdated?: (settings: any) => void;
}

export function PaymentSettings({ token, adminSecret, canManage = true, onSettingsUpdated }: PaymentSettingsProps) {
  const [activeTab, setActiveTab] = useState<"routing" | "paystack" | "palmpay">("routing");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [palmpayQueryLoading, setPalmpayQueryLoading] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [showPalmpayToken, setShowPalmpayToken] = useState(false);
  const [showPalmpaySecret, setShowPalmpaySecret] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  
  // Paystack balance test
  const [connectionTestResult, setConnectionTestResult] = useState<{
    tested: boolean;
    success: boolean;
    balanceGhs?: number;
    message?: string;
  } | null>(null);

  // PalmPay balance test
  const [palmpayBalanceResult, setPalmpayBalanceResult] = useState<{
    tested: boolean;
    success: boolean;
    availableBalance?: number;
    frozenBalance?: number;
    currentBalance?: number;
    unSettleBalance?: number;
    currency?: string;
    queriedAt?: string;
    message?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    // Paystack
    paystackSecretKey: "",
    paystackPublicKey: "",
    paystackMode: "test" as "test" | "live",
    paystackWebhookSecret: "",
    paystackCurrency: "GHS",
    autoPayoutEnabled: false,

    // Payout Provider Toggles
    activePayoutProvider: "paystack" as "paystack" | "palmpay",
    payoutProvidersEnabled: {
      paystack: true,
      palmpay: false,
    },

    // PalmPay
    palmpayMerchantId: "",
    palmpayBearerToken: "",
    palmpayAppSecret: "",
    palmpaySignature: "",
    palmpayMode: "sandbox" as "sandbox" | "live",
    palmpayCountryCode: "GH",
    palmpayCurrency: "GHS",
    palmpayBaseUrl: "https://open-gw-sandbox.palmpay-inc.com",
  });

  const [initialHasEnvKey, setInitialHasEnvKey] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const activeToken = token || getSessionToken() || "";
      const headers = getAuthHeaders();
      if (adminSecret) headers["x-admin-secret"] = adminSecret;
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;

      const queryUrl = activeToken ? `/api/admin?token=${encodeURIComponent(activeToken)}` : "/api/admin";
      const res = await fetch(queryUrl, { headers });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned status ${res.status}: ${rawText.slice(0, 100)}`);
      }

      if (res.ok && data.settings) {
        const s = data.settings;
        setFormData({
          paystackSecretKey: s.paystackSecretKey || "",
          paystackPublicKey: s.paystackPublicKey || "",
          paystackMode: s.paystackMode === "live" ? "live" : "test",
          paystackWebhookSecret: s.paystackWebhookSecret || "",
          paystackCurrency: s.paystackCurrency || "GHS",
          autoPayoutEnabled: Boolean(s.autoPayoutEnabled),

          activePayoutProvider: (s.activePayoutProvider === "palmpay" ? "palmpay" : "paystack") as "paystack" | "palmpay",
          payoutProvidersEnabled: {
            paystack: s.payoutProvidersEnabled ? Boolean(s.payoutProvidersEnabled.paystack !== false) : true,
            palmpay: s.payoutProvidersEnabled ? Boolean(s.payoutProvidersEnabled.palmpay) : false,
          },

          palmpayMerchantId: s.palmpayMerchantId || "",
          palmpayBearerToken: s.palmpayBearerToken || "",
          palmpayAppSecret: s.palmpayAppSecret || "",
          palmpaySignature: s.palmpaySignature || "",
          palmpayMode: s.palmpayMode === "live" ? "live" : "sandbox",
          palmpayCountryCode: s.palmpayCountryCode || "GH",
          palmpayCurrency: s.palmpayCurrency || "GHS",
          palmpayBaseUrl: s.palmpayBaseUrl || (s.palmpayMode === "live" ? "https://open-gw-prod.palmpay-inc.com" : "https://open-gw-sandbox.palmpay-inc.com"),
        });
        setInitialHasEnvKey(Boolean(data.hasPaystackKey));
      } else {
        setMessage({ type: "error", text: data.error || "Failed to load payment settings." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Network error loading payment settings." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token, adminSecret]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canManage) {
      setMessage({
        type: "error",
        text: "Permission Denied: You need 'payments.manage' permission to modify payment gateway configurations.",
      });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const activeToken = token || getSessionToken() || "";
      const csrfToken = getCsrfToken() || "";
      const headers = getAuthHeaders();
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;
      if (adminSecret) headers["x-admin-secret"] = adminSecret;

      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_payment_settings",
          token: activeToken,
          paystackSecretKey: formData.paystackSecretKey.trim(),
          paystackPublicKey: formData.paystackPublicKey.trim(),
          paystackMode: formData.paystackMode,
          paystackWebhookSecret: formData.paystackWebhookSecret.trim(),
          paystackCurrency: formData.paystackCurrency.trim().toUpperCase() || "GHS",
          autoPayoutEnabled: formData.autoPayoutEnabled,

          activePayoutProvider: formData.activePayoutProvider,
          payoutProvidersEnabled: formData.payoutProvidersEnabled,

          palmpayMerchantId: formData.palmpayMerchantId.trim(),
          palmpayBearerToken: formData.palmpayBearerToken.trim(),
          palmpayAppSecret: formData.palmpayAppSecret.trim(),
          palmpaySignature: formData.palmpaySignature.trim(),
          palmpayMode: formData.palmpayMode,
          palmpayCountryCode: formData.palmpayCountryCode.trim().toUpperCase() || "GH",
          palmpayCurrency: formData.palmpayCurrency.trim().toUpperCase() || "GHS",
          palmpayBaseUrl: formData.palmpayBaseUrl.trim(),
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}): ${rawText.slice(0, 120)}`);
      }

      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: `Payment and Payout gateway configuration saved successfully. Default payout provider: ${formData.activePayoutProvider.toUpperCase()}.`,
        });
        if (data.settings && onSettingsUpdated) {
          onSettingsUpdated(data.settings);
        }
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update payment settings." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An unexpected error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const activeToken = token || getSessionToken() || "";
      const csrfToken = getCsrfToken() || "";
      const headers = getAuthHeaders();
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;
      if (adminSecret) headers["x-admin-secret"] = adminSecret;

      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "get_paystack_balance",
          token: activeToken,
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}): ${rawText.slice(0, 120)}`);
      }

      if (res.ok && data.success && data.configured && !data.error) {
        setConnectionTestResult({
          tested: true,
          success: true,
          balanceGhs: data.ghsBalance,
          message: `Paystack Verified! Available float balance: GH₵ ${Number(data.ghsBalance || 0).toFixed(2)}`,
        });
      } else {
        setConnectionTestResult({
          tested: true,
          success: false,
          message: data.error || data.message || "Paystack connection test failed. Please verify your secret key.",
        });
      }
    } catch (err: any) {
      setConnectionTestResult({
        tested: true,
        success: false,
        message: err.message || "Failed to reach Paystack servers.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleQueryPalmpayBalance = async () => {
    setPalmpayQueryLoading(true);
    setPalmpayBalanceResult(null);
    try {
      const activeToken = token || getSessionToken() || "";
      const csrfToken = getCsrfToken() || "";
      const headers = getAuthHeaders();
      if (csrfToken) headers["x-csrf-token"] = csrfToken;
      if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;
      if (adminSecret) headers["x-admin-secret"] = adminSecret;

      const res = await fetch("/api/admin", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "get_palmpay_balance",
          token: activeToken,
          palmpayConfig: {
            merchantId: formData.palmpayMerchantId.trim(),
            bearerToken: formData.palmpayBearerToken.trim(),
            appSecret: formData.palmpayAppSecret.trim(),
            signature: formData.palmpaySignature.trim(),
            mode: formData.palmpayMode,
            countryCode: formData.palmpayCountryCode.trim().toUpperCase(),
            currency: formData.palmpayCurrency.trim().toUpperCase(),
            baseUrl: formData.palmpayBaseUrl.trim(),
          },
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        throw new Error(`Server returned non-JSON response (${res.status}): ${rawText.slice(0, 120)}`);
      }

      if (res.ok && data.success && !data.error) {
        setPalmpayBalanceResult({
          tested: true,
          success: true,
          availableBalance: data.availableBalance,
          frozenBalance: data.frozenBalance,
          currentBalance: data.currentBalance ?? data.currentBlance,
          unSettleBalance: data.unSettleBalance,
          currency: data.currency || formData.palmpayCurrency,
          queriedAt: new Date().toLocaleTimeString(),
          message: `PalmPay Balance Query Success (Code ${data.respCode || "000000"})`,
        });
      } else {
        setPalmpayBalanceResult({
          tested: true,
          success: false,
          message: data.error || data.respMsg || data.message || "Failed to query PalmPay balance.",
        });
      }
    } catch (err: any) {
      setPalmpayBalanceResult({
        tested: true,
        success: false,
        message: err.message || "Network error reaching PalmPay Open Gateway.",
      });
    } finally {
      setPalmpayQueryLoading(false);
    }
  };

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/wallet/paystack-webhook` : "/api/wallet/paystack-webhook";

  const handleCopyWebhook = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  const palmpayTargetUrl = `${(formData.palmpayBaseUrl || (formData.palmpayMode === "live" ? "https://open-gw-prod.palmpay-inc.com" : "https://open-gw-sandbox.palmpay-inc.com")).replace(/\/+$/, "")}/api/v2/merchant/manage/account/queryBalance`;
  
  const palmpayCurlSnippet = `curl --location '${palmpayTargetUrl}' \\
--header 'Accept: application/json, text/plain, */*' \\
--header 'CountryCode: ${formData.palmpayCountryCode || "GH"}' \\
--header 'Authorization: Bearer ${formData.palmpayBearerToken || "10241024"}' \\
--header 'Signature: ${formData.palmpaySignature || "D11A3E8C..."}'`;

  const handleCopyCurl = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(palmpayCurlSnippet);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-emerald-400" size={32} />
        <p className="text-sm font-medium">Loading Payment & Payout Gateways...</p>
      </div>
    );
  }

  const isPaystackLive = formData.paystackMode === "live";
  const isPalmpayLive = formData.palmpayMode === "live";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/50 border border-emerald-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <ArrowRightLeft size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Payment & Payout Gateways</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-800 border border-slate-700 text-slate-200">
                  Default: <strong className={formData.activePayoutProvider === "palmpay" ? "text-amber-400" : "text-emerald-400"}>{formData.activePayoutProvider.toUpperCase()}</strong>
                </span>
                {formData.payoutProvidersEnabled.palmpay && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    🌴 PalmPay Active
                  </span>
                )}
                {formData.payoutProvidersEnabled.paystack && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    💳 Paystack Active
                  </span>
                )}
              </div>
              {!canManage && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Lock size={11} /> Read-Only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Manage multi-provider payout routing between Paystack (Ghana MoMo/cards) and PalmPay (Open Platform API). Toggle providers on or off and query real-time merchant balances.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchSettings}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-xl transition"
              title="Refresh Settings"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Global Action Messages */}
        {message && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              message.type === "success"
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : message.type === "error"
                ? "bg-rose-950/60 border-rose-500/40 text-rose-300"
                : "bg-blue-950/60 border-blue-500/40 text-blue-300"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("routing")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "routing"
              ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Sliders size={14} className={activeTab === "routing" ? "text-emerald-400" : ""} />
          Payout Routing & Toggles
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("paystack")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "paystack"
              ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <CreditCard size={14} className={activeTab === "paystack" ? "text-emerald-400" : ""} />
          Paystack Gateway
          <span className={`w-2 h-2 rounded-full ${formData.payoutProvidersEnabled.paystack ? "bg-emerald-400" : "bg-slate-600"}`} />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("palmpay")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "palmpay"
              ? "bg-slate-800 text-slate-100 border border-slate-700 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          }`}
        >
          <Building size={14} className={activeTab === "palmpay" ? "text-amber-400" : ""} />
          PalmPay Open Platform
          <span className={`w-2 h-2 rounded-full ${formData.payoutProvidersEnabled.palmpay ? "bg-amber-400" : "bg-slate-600"}`} />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ===================== TAB 1: PAYOUT ROUTING ===================== */}
        {activeTab === "routing" && (
          <div className="space-y-6">
            {/* Primary Router Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-emerald-400" />
                  Active Default Payout Provider
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Choose which payout gateway handles player withdrawals by default when automated or manual payouts are processed.
                </p>
              </div>

              {/* Provider Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paystack Card */}
                <div
                  onClick={() => setFormData((prev) => ({ ...prev, activePayoutProvider: "paystack" }))}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    formData.activePayoutProvider === "paystack"
                      ? "bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">Paystack Transfers</h4>
                        <span className="text-[11px] text-slate-400">Ghana MoMo & Bank Rails</span>
                      </div>
                    </div>
                    <Radio size={18} className={formData.activePayoutProvider === "paystack" ? "text-emerald-400" : "text-slate-600"} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses Paystack Transfer Recipients & Transfers API. Supports MTN Mobile Money, Telecel Cash, and AT Money in GHS.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Enabled status:</span>
                    <span className={`text-[11px] font-bold ${formData.payoutProvidersEnabled.paystack ? "text-emerald-400" : "text-slate-500"}`}>
                      {formData.payoutProvidersEnabled.paystack ? "✓ Enabled" : "✕ Disabled"}
                    </span>
                  </div>
                </div>

                {/* PalmPay Card */}
                <div
                  onClick={() => setFormData((prev) => ({ ...prev, activePayoutProvider: "palmpay" }))}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    formData.activePayoutProvider === "palmpay"
                      ? "bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                        <Building size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">PalmPay Open Platform</h4>
                        <span className="text-[11px] text-slate-400">Account Payout & Float Query</span>
                      </div>
                    </div>
                    <Radio size={18} className={formData.activePayoutProvider === "palmpay" ? "text-amber-400" : "text-slate-600"} />
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Uses PalmPay Open Platform API with merchant balance verification, MD5/RSA signatures, and instant account settlement.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Enabled status:</span>
                    <span className={`text-[11px] font-bold ${formData.payoutProvidersEnabled.palmpay ? "text-amber-400" : "text-slate-500"}`}>
                      {formData.payoutProvidersEnabled.palmpay ? "✓ Enabled" : "✕ Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Turn ON / OFF individual providers */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Provider Availability Toggles (Turn On / Off)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Toggle Paystack */}
                  <div className="flex items-start gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          payoutProvidersEnabled: {
                            ...prev.payoutProvidersEnabled,
                            paystack: !prev.payoutProvidersEnabled.paystack,
                          },
                        }))
                      }
                      className="mt-0.5 text-emerald-400 hover:text-emerald-300 transition"
                    >
                      {formData.payoutProvidersEnabled.paystack ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-600" />}
                    </button>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Enable Paystack for Payouts</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        When enabled, admins and auto-payouts can disburse funds via Paystack Ghana transfers.
                      </p>
                    </div>
                  </div>

                  {/* Toggle PalmPay */}
                  <div className="flex items-start gap-3 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          payoutProvidersEnabled: {
                            ...prev.payoutProvidersEnabled,
                            palmpay: !prev.payoutProvidersEnabled.palmpay,
                          },
                        }))
                      }
                      className="mt-0.5 text-amber-400 hover:text-amber-300 transition"
                    >
                      {formData.payoutProvidersEnabled.palmpay ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-600" />}
                    </button>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Enable PalmPay for Payouts</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        When enabled, withdrawals can be disbursed via PalmPay merchant account gateway.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Automation switch */}
              <div className="pt-4 border-t border-slate-800 flex items-start gap-3 p-4 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, autoPayoutEnabled: !prev.autoPayoutEnabled }))}
                  className="mt-0.5 text-emerald-400 hover:text-emerald-300 transition"
                >
                  {formData.autoPayoutEnabled ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-600" />}
                </button>
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Enable Automated Instant Payouts</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automatically trigger payout via the active provider as soon as a player submits a withdrawal request (subject to risk limits).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: PAYSTACK GATEWAY ===================== */}
        {activeTab === "paystack" && (
          <div className="space-y-6">
            {/* Paystack Header & Test Connection */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Globe size={16} className="text-emerald-400" />
                    Paystack Environment & Mode
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Switch between Paystack sandbox test keys and live production credentials.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, paystackMode: "test" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      !isPaystackLive
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🧪 Test Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, paystackMode: "live" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      isPaystackLive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🚀 Live Mode
                  </button>
                </div>
              </div>

              {/* Paystack Connection Test Banner */}
              <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Verify Paystack Credentials</span>
                  <span className="text-[11px] text-slate-400">Tests API connectivity and fetches current balance in GHS</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Zap size={14} className={testingConnection ? "animate-spin text-amber-400" : "text-emerald-400"} />
                  {testingConnection ? "Querying..." : "Test Paystack Balance"}
                </button>
              </div>

              {connectionTestResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                    connectionTestResult.success
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                  }`}
                >
                  {connectionTestResult.success ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
                  <span className="font-medium">{connectionTestResult.message}</span>
                </div>
              )}

              {/* Credentials Form */}
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock size={13} className="text-emerald-400" />
                      Paystack Secret Key (API Calls)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                    >
                      {showSecretKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showSecretKey ? "Hide Key" : "Show Key"}
                    </button>
                  </div>
                  <input
                    type={showSecretKey ? "text" : "password"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono transition"
                    placeholder={isPaystackLive ? "sk_live_..." : "sk_test_..."}
                    value={formData.paystackSecretKey}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paystackSecretKey: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-400">
                    {initialHasEnvKey && !formData.paystackSecretKey
                      ? "Falling back to PAYSTACK_SECRET_KEY in environment variables."
                      : "Used for initiating transactions, checking balances, and transfers."}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Key size={13} className="text-blue-400" />
                    Paystack Public Key (Inline Popup Checkout)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition"
                    placeholder={isPaystackLive ? "pk_live_..." : "pk_test_..."}
                    value={formData.paystackPublicKey}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paystackPublicKey: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Shield size={13} className="text-indigo-400" />
                        Webhook Secret (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {showWebhookSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                    <input
                      type={showWebhookSecret ? "text" : "password"}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono transition"
                      placeholder="Webhook signature hash"
                      value={formData.paystackWebhookSecret}
                      onChange={(e) => setFormData((prev) => ({ ...prev, paystackWebhookSecret: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <DollarSign size={13} className="text-amber-400" />
                      Currency
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono transition"
                      placeholder="GHS"
                      value={formData.paystackCurrency}
                      onChange={(e) => setFormData((prev) => ({ ...prev, paystackCurrency: e.target.value.toUpperCase() }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Paystack Webhook Helper */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Zap size={16} className="text-amber-400" />
                    Paystack Webhook URL
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure this URL in your Paystack dashboard to receive instant deposit and transfer notifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {copiedWebhook ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copiedWebhook ? "Copied!" : "Copy URL"}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300 overflow-x-auto">
                {webhookUrl}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: PALMPAY OPEN PLATFORM ===================== */}
        {activeTab === "palmpay" && (
          <div className="space-y-6">
            {/* PalmPay Overview & Query Balance Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Building size={16} className="text-amber-400" />
                    PalmPay Merchant Configuration
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure PalmPay Open Gateway credentials for account balance verification and payouts.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        palmpayMode: "sandbox",
                        palmpayBaseUrl: "https://open-gw-sandbox.palmpay-inc.com",
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      !isPalmpayLive
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🧪 Sandbox Mode
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        palmpayMode: "live",
                        palmpayBaseUrl: "https://open-gw-prod.palmpay-inc.com",
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      isPalmpayLive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🚀 Production
                  </button>
                </div>
              </div>

              {/* Live Query Merchant Balance Action Bar */}
              <div className="p-4 bg-gradient-to-r from-amber-950/30 via-slate-950/80 to-slate-950/80 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Coins size={18} className="text-amber-400" />
                    <span className="text-sm font-bold text-slate-100">PalmPay Merchant Balance</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Query <code className="text-amber-400 font-mono">/api/v2/merchant/manage/account/queryBalance</code> with current credentials.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleQueryPalmpayBalance}
                  disabled={palmpayQueryLoading}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 shrink-0"
                >
                  <RefreshCw size={14} className={palmpayQueryLoading ? "animate-spin" : ""} />
                  {palmpayQueryLoading ? "Querying PalmPay API..." : "Query Merchant Balance"}
                </button>
              </div>

              {/* Balance Result Display Card */}
              {palmpayBalanceResult && (
                <div
                  className={`p-4 rounded-2xl border ${
                    palmpayBalanceResult.success
                      ? "bg-slate-950 border-emerald-500/40"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}
                >
                  {palmpayBalanceResult.success ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                          <CheckCircle2 size={16} />
                          <span>{palmpayBalanceResult.message}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Queried at {palmpayBalanceResult.queriedAt}
                        </span>
                      </div>

                      {/* 4 Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                        <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                            Available Balance
                          </span>
                          <div className="text-lg font-extrabold text-slate-100 font-mono mt-1">
                            {palmpayBalanceResult.currency || "GHS"} {Number(palmpayBalanceResult.availableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-400">Ready for payouts</span>
                        </div>

                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Total / Current
                          </span>
                          <div className="text-lg font-extrabold text-slate-100 font-mono mt-1">
                            {palmpayBalanceResult.currency || "GHS"} {Number(palmpayBalanceResult.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-400">Total balance</span>
                        </div>

                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                            Frozen Balance
                          </span>
                          <div className="text-lg font-extrabold text-amber-300 font-mono mt-1">
                            {palmpayBalanceResult.currency || "GHS"} {Number(palmpayBalanceResult.frozenBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-400">Reserved / frozen</span>
                        </div>

                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-wider">
                            Unsettled Balance
                          </span>
                          <div className="text-lg font-extrabold text-blue-300 font-mono mt-1">
                            {palmpayBalanceResult.currency || "GHS"} {Number(palmpayBalanceResult.unSettleBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[10px] text-slate-400">Pending settlement</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 text-xs text-rose-300">
                      <AlertCircle size={16} className="shrink-0 text-rose-400" />
                      <span>{palmpayBalanceResult.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* PalmPay Credentials Form */}
              <div className="space-y-4 pt-2">
                {/* Merchant ID */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Key size={13} className="text-amber-400" />
                    PalmPay Merchant ID (<code className="text-amber-400">merchantId</code>)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono transition"
                    placeholder="e.g. 10241024 or your PalmPay Merchant Number"
                    value={formData.palmpayMerchantId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, palmpayMerchantId: e.target.value }))}
                  />
                  <p className="text-[11px] text-slate-400">
                    Mandatory parameter required by PalmPay to identify the merchant account (String, max 32 chars).
                  </p>
                </div>

                {/* Authorization Bearer Token */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock size={13} className="text-amber-400" />
                      Authorization Bearer Token (<code className="text-amber-400">Authorization: Bearer &lt;token&gt;</code>)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPalmpayToken(!showPalmpayToken)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                    >
                      {showPalmpayToken ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showPalmpayToken ? "Hide Token" : "Show Token"}
                    </button>
                  </div>
                  <input
                    type={showPalmpayToken ? "text" : "password"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono transition"
                    placeholder="e.g. 10241024"
                    value={formData.palmpayBearerToken}
                    onChange={(e) => setFormData((prev) => ({ ...prev, palmpayBearerToken: e.target.value }))}
                  />
                </div>

                {/* Signature Header & App Secret */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Shield size={13} className="text-indigo-400" />
                      Signature Header (<code className="text-indigo-400">Signature</code>)
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono transition"
                      placeholder="e.g. D11A3E8C... (Static or dynamic signature)"
                      value={formData.palmpaySignature}
                      onChange={(e) => setFormData((prev) => ({ ...prev, palmpaySignature: e.target.value }))}
                    />
                    <p className="text-[10px] text-slate-400">
                      If provided, this value is sent in the <code className="text-indigo-400">Signature</code> header.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Key size={13} className="text-purple-400" />
                        App Secret / Private Key (Optional for dynamic signing)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPalmpaySecret(!showPalmpaySecret)}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {showPalmpaySecret ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                    <input
                      type={showPalmpaySecret ? "text" : "password"}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500 font-mono transition"
                      placeholder="Secret key for MD5/RSA signing"
                      value={formData.palmpayAppSecret}
                      onChange={(e) => setFormData((prev) => ({ ...prev, palmpayAppSecret: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Country Code, Currency, Base URL - Ghana Market Exclusively */}
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe size={13} className="text-emerald-400" />
                        Market & Currency (Ghana Exclusively)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Configured strictly for Ghana (GH / GHS) Mobile Money and bank payouts, matching Paystack.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                        <span>🇬🇭</span> Ghana (GH / GHS • GH₵)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Globe size={13} className="text-emerald-400" />
                        Country Code (<code className="text-emerald-400">CountryCode</code>)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono transition"
                        placeholder="GH"
                        value={formData.palmpayCountryCode}
                        onChange={(e) => setFormData((prev) => ({ ...prev, palmpayCountryCode: e.target.value.toUpperCase() }))}
                      />
                      <p className="text-[10px] text-slate-400">Sent in the <code className="text-emerald-400">CountryCode</code> header (GH for Ghana).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <DollarSign size={13} className="text-amber-400" />
                        Currency
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono transition"
                        placeholder="GHS"
                        value={formData.palmpayCurrency}
                        onChange={(e) => setFormData((prev) => ({ ...prev, palmpayCurrency: e.target.value.toUpperCase() }))}
                      />
                      <p className="text-[10px] text-slate-400">Account currency (GHS for Ghana Cedis, GH₵).</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Globe size={13} className="text-blue-400" />
                        Gateway Base URL
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition"
                        placeholder={isPalmpayLive ? "https://open-gw-prod.palmpay-inc.com" : "https://open-gw-sandbox.palmpay-inc.com"}
                        value={formData.palmpayBaseUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, palmpayBaseUrl: e.target.value }))}
                      />
                      <p className="text-[10px] text-slate-400">Open gateway base endpoint URL.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Postman / Developer cURL Helper */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Terminal size={16} className="text-amber-400" />
                    Palmpay API Specification & Postman Example
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live cURL command generated from your configuration for testing with Postman or Terminal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCurl}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  {copiedCurl ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  {copiedCurl ? "Copied cURL!" : "Copy cURL"}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-emerald-400 whitespace-pre overflow-x-auto">
                {palmpayCurlSnippet}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px] text-slate-400">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-slate-300 block mb-1">Request Path</span>
                  <code>/api/v2/merchant/manage/account/queryBalance</code>
                </div>
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-slate-300 block mb-1">Response Fields</span>
                  <span>availableBalance, frozenBalance, currentBlance, unSettleBalance</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Active Provider: <strong className="text-slate-200">{formData.activePayoutProvider.toUpperCase()}</strong> &bull; Changes take effect immediately.
          </div>

          {!canManage ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              <Lock size={14} className="text-amber-400" />
              <span>Read-only: <strong>payments.manage</strong> permission required</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? "Saving Configuration..." : "Save Payment & Payout Settings"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
