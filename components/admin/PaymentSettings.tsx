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
} from "lucide-react";
import { getCsrfToken, getAuthHeaders, getSessionToken } from "@/lib/client-auth";

export interface PaymentSettingsProps {
  token: string;
  adminSecret?: string;
  canManage?: boolean;
  onSettingsUpdated?: (settings: any) => void;
}

export function PaymentSettings({ token, adminSecret, canManage = true, onSettingsUpdated }: PaymentSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    tested: boolean;
    success: boolean;
    balanceGhs?: number;
    message?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    paystackSecretKey: "",
    paystackPublicKey: "",
    paystackMode: "test" as "test" | "live",
    paystackWebhookSecret: "",
    paystackCurrency: "GHS",
    autoPayoutEnabled: false,
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
        setFormData({
          paystackSecretKey: data.settings.paystackSecretKey || "",
          paystackPublicKey: data.settings.paystackPublicKey || "",
          paystackMode: data.settings.paystackMode === "live" ? "live" : "test",
          paystackWebhookSecret: data.settings.paystackWebhookSecret || "",
          paystackCurrency: data.settings.paystackCurrency || "GHS",
          autoPayoutEnabled: Boolean(data.settings.autoPayoutEnabled),
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
          text: `Paystack payment settings updated successfully in ${formData.paystackMode.toUpperCase()} mode.`,
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
          message: `Connection Verified! Available float balance: GH₵ ${Number(data.ghsBalance || 0).toFixed(2)}`,
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

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/wallet/paystack-webhook` : "/api/wallet/paystack-webhook";

  const handleCopyWebhook = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="animate-spin text-emerald-400" size={32} />
        <p className="text-sm font-medium">Loading Paystack Payment Configuration...</p>
      </div>
    );
  }

  const isLive = formData.paystackMode === "live";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <CreditCard size={22} />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Paystack Payment & Payout Gateway</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isLive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {isLive ? "● Live Production" : "🧪 Test Mode"}
              </span>
              {!canManage && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Lock size={11} /> Read-Only View
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Configure Paystack API credentials, live/test modes, and webhook endpoints for player Mobile Money deposits (MTN, Telecel, AT), card payments, and automated payout disbursements.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Zap size={14} className={testingConnection ? "animate-spin text-amber-400" : "text-emerald-400"} />
              {testingConnection ? "Testing..." : "Test Connection"}
            </button>
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

        {/* Connection test banner */}
        {connectionTestResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              connectionTestResult.success
                ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/60 border-rose-500/40 text-rose-300"
            }`}
          >
            {connectionTestResult.success ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
            <span className="font-medium">{connectionTestResult.message}</span>
          </div>
        )}

        {/* Message notification */}
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Environment & Live Mode Toggle Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Globe size={16} className="text-amber-400" />
                Environment & Mode Toggle
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Switch between sandbox testing and live real-money payment processing.
              </p>
            </div>
            
            {/* Interactive Toggle Switch */}
            <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, paystackMode: "test" }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  !isLive
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
                  isLive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                🚀 Live Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-xl border transition ${!isLive ? "bg-amber-950/20 border-amber-500/30" : "bg-slate-950/40 border-slate-800"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Radio size={14} className={!isLive ? "text-amber-400" : "text-slate-500"} />
                <h4 className="text-xs font-bold text-slate-200">Test Mode Active</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Uses Paystack test keys (<code className="text-amber-400/80">sk_test_...</code> / <code className="text-amber-400/80">pk_test_...</code>). Simulated Mobile Money and card test numbers will succeed without debiting real funds.
              </p>
            </div>

            <div className={`p-4 rounded-xl border transition ${isLive ? "bg-emerald-950/20 border-emerald-500/30" : "bg-slate-950/40 border-slate-800"}`}>
              <div className="flex items-center gap-2 mb-1">
                <Radio size={14} className={isLive ? "text-emerald-400" : "text-slate-500"} />
                <h4 className="text-xs font-bold text-slate-200">Live Mode Active</h4>
              </div>
              <p className="text-[11px] text-slate-400">
                Uses Paystack production keys (<code className="text-emerald-400/80">sk_live_...</code> / <code className="text-emerald-400/80">pk_live_...</code>). Real Mobile Money debits and automatic cashout transfers will execute on live bank/telecom rails.
              </p>
            </div>
          </div>
        </div>

        {/* API Credentials Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Key size={16} className="text-emerald-400" />
              Paystack API Credentials
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These credentials override environment variables and take immediate effect across all deposit and payout routes.
            </p>
          </div>

          <div className="space-y-4">
            {/* Secret Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Lock size={13} className="text-emerald-400" />
                  Paystack Secret Key (Server-side API calls)
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
                placeholder={isLive ? "sk_live_..." : "sk_test_..."}
                value={formData.paystackSecretKey}
                onChange={(e) => setFormData((prev) => ({ ...prev, paystackSecretKey: e.target.value }))}
              />
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info size={12} className="text-slate-500 shrink-0" />
                {initialHasEnvKey && !formData.paystackSecretKey
                  ? "Currently falling back to PAYSTACK_SECRET_KEY declared in environment."
                  : "Required for deposit initializations, float balance lookups, and Mobile Money transfer cashouts."}
              </p>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Key size={13} className="text-blue-400" />
                Paystack Public Key (Client-side checkout)
              </label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 font-mono transition"
                placeholder={isLive ? "pk_live_..." : "pk_test_..."}
                value={formData.paystackPublicKey}
                onChange={(e) => setFormData((prev) => ({ ...prev, paystackPublicKey: e.target.value }))}
              />
              <p className="text-[11px] text-slate-400">
                Used in the browser for Paystack Inline popup checkout.
              </p>
            </div>

            {/* Webhook Secret & Currency */}
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
                  placeholder="Webhook signing hash"
                  value={formData.paystackWebhookSecret}
                  onChange={(e) => setFormData((prev) => ({ ...prev, paystackWebhookSecret: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-amber-400" />
                  Primary Currency
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

        {/* Webhook Integration Helper */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Paystack Webhook Endpoint
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste this URL in your Paystack Dashboard (Settings &gt; API Keys & Webhooks &gt; Webhook URL).
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

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between font-mono text-xs text-amber-300 overflow-x-auto">
            <span>{webhookUrl}</span>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!canManage ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              <Lock size={14} className="text-amber-400" />
              <span>Read-only: <strong>payments.manage</strong> permission required to save changes</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? "Saving Configuration..." : "Save Payment Settings"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
