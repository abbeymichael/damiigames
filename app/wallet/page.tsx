"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import {
  Wallet,
  Coins,
  ShieldCheck,
  Phone,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Award,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Lock,
  Search,
  Check,
  Copy,
  Info,
  Layers,
  CreditCard,
  History,
  HelpCircle,
  Clock,
  ExternalLink,
  Swords,
  Trophy,
  Gamepad2,
  AlertTriangle,
} from "lucide-react";
import type { WalletTransaction } from "@/lib/types";
import { getAuthHeaders, getSessionToken, getCsrfToken } from "@/lib/client-auth";
import { PaystackModal } from "@/components/PaystackModal";
import { loadPaystackScript, openPaystackInlinePopup } from "@/lib/paystack-client";
import { validateAndFormatMomoPhone, detectGhanaTelecomProvider } from "@/lib/momo-validation";

const PRESET_AMOUNTS = [10, 20, 50, 100, 200, 500];

export default function WalletPage() {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<{
    points: number;
    marbles?: number;
    marblesBalance?: number;
    escrowPoints?: number;
    escrowMarbles?: number;
    totalMarbles?: number;
    activeEscrowLocks?: Array<{
      id: string;
      type: "wager_match" | "tournament";
      title: string;
      reference: string;
      amount: number;
      role: "host" | "guest" | "participant";
      status: string;
      createdAt: string;
      opponentName?: string;
    }>;
    rating: number;
    username: string;
    role: string;
    phoneNumber?: string;
  }>({
    points: 0,
    marbles: 0,
    marblesBalance: 0,
    escrowPoints: 0,
    escrowMarbles: 0,
    totalMarbles: 0,
    activeEscrowLocks: [],
    rating: 1000,
    username: "",
    role: "user",
  });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "escrow" | "history" | "security">("deposit");

  const [topupAmountGhs, setTopupAmountGhs] = useState(20);
  const [email, setEmail] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(20);
  const [momoNumber, setMomoNumber] = useState("");
  const [momoProvider, setMomoProvider] = useState("MTN");

  const [limits, setLimits] = useState({
    minDepositGhs: 5,
    maxDepositGhs: 5000,
    minWithdrawalGhs: 10,
    maxWithdrawalGhs: 2000,
    maxDailyWithdrawalGhs: 5000,
  });

  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Active Checkout State
  const [pendingPayment, setPendingPayment] = useState<{
    reference: string;
    authorizationUrl: string;
    amountGhs: number;
    points: number;
    provider?: "paystack" | "palmpay";
  } | null>(null);
  const [showPaystackModal, setShowPaystackModal] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Deposit provider preferences
  const [selectedDepositProvider, setSelectedDepositProvider] = useState<"paystack" | "palmpay">("paystack");
  const [depositProvidersEnabled, setDepositProvidersEnabled] = useState<{ paystack: boolean; palmpay: boolean }>({
    paystack: true,
    palmpay: true,
  });

  useEffect(() => {
    loadPaystackScript().catch(() => {});
  }, []);

  // Search & Filter for History
  const [historyFilter, setHistoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadWalletData = useCallback(async (userToken?: string) => {
    const activeTok = userToken || getSessionToken();
    if (!activeTok) return;

    try {
      setRefreshing(true);
      const res = await fetch(`/api/wallet?token=${encodeURIComponent(activeTok)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.balance) {
        setBalance(data.balance);
        if (data.balance.phoneNumber) {
          const detected = detectGhanaTelecomProvider(data.balance.phoneNumber);
          if (detected.isRecognized && detected.provider !== "Unknown") {
            setMomoProvider(detected.provider);
          }
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("damii-balance-changed", {
              detail: { points: data.balance.points },
            })
          );
        }
      }
      if (Array.isArray(data.transactions)) setTransactions(data.transactions);
      if (data.settings) {
        setLimits({
          minDepositGhs: data.settings.minDepositGhs ?? 5,
          maxDepositGhs: data.settings.maxDepositGhs ?? 5000,
          minWithdrawalGhs: data.settings.minWithdrawalGhs ?? 10,
          maxWithdrawalGhs: data.settings.maxWithdrawalGhs ?? 2000,
          maxDailyWithdrawalGhs: data.settings.maxDailyWithdrawalGhs ?? 5000,
        });

        if (data.settings.activeDepositProvider) {
          const active = data.settings.activeDepositProvider === "palmpay" ? "palmpay" : "paystack";
          setSelectedDepositProvider(active);
        }
        if (data.settings.depositProvidersEnabled) {
          setDepositProvidersEnabled({
            paystack: data.settings.depositProvidersEnabled.paystack !== false,
            palmpay: data.settings.depositProvidersEnabled.palmpay !== false,
          });
        }
      }
    } catch {
      // Retain existing state
    } finally {
      setRefreshing(false);
    }
  }, []);

  const verifyPaymentRef = useCallback(
    async (userToken: string, ref: string, silent = false) => {
      if (!silent) {
        setVerifyingPayment(true);
        setError("");
      }
      try {
        const res = await fetch("/api/wallet", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action: "verify", token: userToken, reference: ref }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");

        if (data.success && !data.pending) {
          setMessage(data.message || "Payment verified! Marbles credited to your wallet.");
          setPendingPayment(null);
          loadWalletData(userToken);
          return true;
        } else if (data.pending) {
          if (!silent) {
            setMessage(data.message || "Payment is still processing on Paystack. Complete the authorization on your device.");
          }
          return false;
        }
      } catch (err) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "Verification error");
        }
        return false;
      } finally {
        if (!silent) {
          setVerifyingPayment(false);
        }
      }
    },
    [loadWalletData]
  );

  // Background verification polling while Paystack payment is pending
  useEffect(() => {
    if (!pendingPayment) return;
    const activeTok = token || getSessionToken();
    if (!activeTok) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/wallet", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action: "verify", token: activeTok, reference: pendingPayment.reference }),
        });
        const data = await res.json();
        if (!isMounted) return;
        if (res.ok && data.success && !data.pending) {
          setMessage(data.message || `GH₵ ${pendingPayment.amountGhs}.00 successfully credited to your wallet!`);
          setPendingPayment(null);
          loadWalletData(activeTok);
        }
      } catch {
        // Ignore background polling errors
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [pendingPayment, token, loadWalletData]);

  const syncUser = useCallback(() => {
    const saved = getSessionToken();
    setToken(saved);
    if (saved) {
      loadWalletData(saved);
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref") || params.get("reference") || params.get("trxref");
      if (ref) {
        verifyPaymentRef(saved, ref);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, [loadWalletData, verifyPaymentRef]);

  useEffect(() => {
    syncUser();
    window.addEventListener("damii-auth-changed", syncUser);
    return () => window.removeEventListener("damii-auth-changed", syncUser);
  }, [syncUser]);

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault();
    const activeTok = token || getSessionToken();
    if (!activeTok) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      return;
    }

    if (topupAmountGhs < limits.minDepositGhs || topupAmountGhs > limits.maxDepositGhs) {
      setError(`Deposit amount must be between ${limits.minDepositGhs} and ${limits.maxDepositGhs.toLocaleString()} Marbles.`);
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "deposit",
          token: activeTok,
          amountGhs: topupAmountGhs,
          email,
          provider: selectedDepositProvider,
          callbackUrl: `${window.location.origin}/wallet`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize payment order");

      if (data.authorizationUrl) {
        const prov = data.provider === "palmpay" ? "palmpay" : selectedDepositProvider;
        setPendingPayment({
          reference: data.reference,
          authorizationUrl: data.authorizationUrl,
          amountGhs: topupAmountGhs,
          points: topupAmountGhs,
          provider: prov,
        });

        // Open on-page payment popup modal
        setShowPaystackModal(true);
        const provLabel = prov === "palmpay" ? "PalmPay" : "Paystack";
        setMessage(`${provLabel} checkout ready for GH₵ ${topupAmountGhs}.00. Complete your payment in the popup.`);

        // If Paystack, attempt Paystack Pop inline trigger if available
        if (prov === "paystack") {
          openPaystackInlinePopup({
            accessCode: data.accessCode,
            reference: data.reference,
            authorizationUrl: data.authorizationUrl,
            email: email || undefined,
            amountGhs: topupAmountGhs,
            onSuccess: (ref) => {
              setShowPaystackModal(false);
              verifyPaymentRef(activeTok, ref);
            },
            onCancel: () => {
              // User closed native popup
            },
          }).then((openedInline) => {
            if (openedInline) {
              setShowPaystackModal(false);
            }
          });
        }
      } else {
        throw new Error("No authorization URL returned by payment gateway");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase error");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const activeTok = token || getSessionToken();
    if (!activeTok) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      return;
    }

    if (withdrawAmount < limits.minWithdrawalGhs || withdrawAmount > limits.maxWithdrawalGhs) {
      setError(`Redemption amount must be between ${limits.minWithdrawalGhs} and ${limits.maxWithdrawalGhs.toLocaleString()} Marbles.`);
      return;
    }

    if (balance.points < withdrawAmount) {
      setError(`Insufficient Marbles balance. You have ${balance.points.toFixed(2)} Marbles available.`);
      return;
    }

    const targetMomoNumber = (balance.phoneNumber || momoNumber).trim();
    if (!targetMomoNumber) {
      setError("Please provide a valid 10-digit Mobile Money phone number.");
      return;
    }

    const momoCheck = validateAndFormatMomoPhone(targetMomoNumber, momoProvider);
    if (!momoCheck.isValid) {
      setError(momoCheck.error || "Please provide a valid Ghana Mobile Money phone number matching the selected network.");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "withdraw",
          token: activeTok,
          amountGhs: withdrawAmount,
          momoNumber: targetMomoNumber,
          momoProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption request failed");
      setMessage(`Redemption request of ${data.ghsValue} Marbles (GH₵ ${data.ghsValue}.00) submitted to ${momoProvider} (${targetMomoNumber}). Reference: ${data.reference}`);
      loadWalletData(activeTok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redemption error");
    } finally {
      setBusy(false);
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (historyFilter !== "all") {
        if (historyFilter === "deposit" && tx.type !== "deposit") return false;
        if (historyFilter === "withdrawal" && tx.type !== "withdrawal") return false;
        if (historyFilter === "wager" && !tx.type.includes("wager") && !tx.type.includes("game")) return false;
        if (historyFilter === "league" && !tx.type.includes("league") && !tx.type.includes("tournament")) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = tx.reference?.toLowerCase().includes(q);
        const typeMatch = tx.type?.toLowerCase().includes(q);
        const metaMatch = tx.metaJson?.toLowerCase().includes(q);
        if (!refMatch && !typeMatch && !metaMatch) return false;
      }
      return true;
    });
  }, [transactions, historyFilter, searchQuery]);

  // Total career earnings calculation
  const totalWinnings = useMemo(() => {
    return transactions
      .filter((tx) => (tx.type.includes("wager") || tx.type.includes("league") || tx.type.includes("prize")) && tx.amount > 0 && tx.status === "completed")
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  // Format rank tier based on DPI
  const rankTier = useMemo(() => {
    const r = balance.rating || 1000;
    if (r >= 2200) return { name: "Grandmaster", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" };
    if (r >= 1800) return { name: "Master", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" };
    if (r >= 1400) return { name: "Expert", color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" };
    return { name: "Challenger", color: "text-slate-300", bg: "bg-slate-700/30", border: "border-slate-600/40" };
  }, [balance.rating]);

  return (
    <main className="min-h-screen bg-[#041c17] text-[#f5efdf] flex flex-col selection:bg-[#d6a735] selection:text-[#06261f]">
      <SharedHeader />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#081c15] via-[#06261f] to-[#041c17] border border-[#1a5e48] p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#d6a735]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 shadow-inner">
                  <Coins size={14} /> DAMII MARBLES TREASURY
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                  <ShieldCheck size={14} className="text-emerald-400" /> CSRF &amp; Escrow Protected
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#0c3b2e] text-[#d6a735] border border-[#1a5e48]">
                  1 Marble = GH₵ 1.00
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f5efdf] font-serif">
                Player Wallet &amp; Treasury
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                Deposit Marbles directly with Mobile Money, enter 1-on-1 wager matches and tournament prize pools, and redeem your winnings instantly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const tok = token || getSessionToken();
                  if (!tok) {
                    window.dispatchEvent(new CustomEvent("damii-open-auth"));
                    return;
                  }
                  loadWalletData(tok);
                }}
                disabled={refreshing}
                className="px-4 py-2.5 rounded-xl bg-[#081c15] hover:bg-[#0c3b2e] text-slate-200 hover:text-white border border-[#1a5e48] text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                title="Refresh balances and transaction history"
              >
                <RefreshCw size={14} className={`text-[#d6a735] ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Syncing..." : "Sync Balance"}
              </button>

              {!token ? (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("damii-open-auth"))}
                  className="px-5 py-2.5 rounded-xl bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-[#d6a735]/20"
                >
                  <LogIn size={15} /> Sign In to Access Wallet
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Global Feedback Banners */}
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-sm font-medium flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
              <span>{message}</span>
            </div>
            <button type="button" onClick={() => setMessage("")} className="text-emerald-400 hover:text-emerald-200 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-sm font-medium flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError("")} className="text-rose-400 hover:text-rose-200 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {!token ? (
          /* Guest State */
          <div className="max-w-xl mx-auto my-12 p-8 sm:p-10 bg-[#081c15] border border-[#1a5e48] rounded-3xl text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-[#d6a735]/10 border border-[#d6a735]/30 text-[#d6a735] rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Wallet size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#f5efdf] font-serif">Unlock Your DAMII Treasury</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Connect your account to deposit Marbles via Mobile Money, enter high-stakes matches, track match earnings, and cash out securely.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left pt-2">
              <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
                <span className="text-[11px] font-bold text-[#d6a735] uppercase block mb-1">1:1 Value Parity</span>
                <p className="text-xs text-slate-300">1 Marble is always equal to 1 Ghana Cedi (GH₵ 1.00).</p>
              </div>
              <div className="p-3.5 bg-[#06261f] border border-[#1a5e48] rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-400 uppercase block mb-1">Escrow Vault</span>
                <p className="text-xs text-slate-300">Atomic locked pots with automatic settlement.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("damii-open-auth"))}
              className="w-full py-4 bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-black rounded-2xl text-sm transition-all shadow-xl shadow-[#d6a735]/20 flex items-center justify-center gap-2"
            >
              <LogIn size={18} /> Sign In or Create Player Account
            </button>
          </div>
        ) : (
          /* Authenticated Player Console */
          <>
            {/* Primary KPI Balance Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Available Marbles (Liquid) */}
              <div className="p-6 bg-gradient-to-br from-[#081c15] to-[#06261f] border border-[#1a5e48] rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5">
                    <Coins size={15} /> Available Marbles
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/30">
                    Liquid
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#f5efdf] font-serif tracking-tight">
                    {typeof balance.points === "number"
                      ? balance.points.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                      : balance.points}
                    <span className="text-lg font-bold text-[#d6a735] ml-1.5">⚪</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-mono">
                    ≈ GH₵ {typeof balance.points === "number" ? balance.points.toFixed(2) : balance.points} Available to play/cashout
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-[#1a5e48]/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab("deposit")}
                    className="flex-1 py-2 bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <ArrowDownLeft size={14} /> Top Up
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("withdraw")}
                    className="flex-1 py-2 bg-[#0c3b2e] hover:bg-[#114a3a] text-emerald-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-[#1a5e48] transition-all cursor-pointer"
                  >
                    <ArrowUpRight size={14} /> Cashout
                  </button>
                </div>
              </div>

              {/* Card 2: Locked in Escrow (Active Wagers & Tournaments) */}
              <div className="p-6 bg-gradient-to-br from-[#041c17] via-[#062b22] to-[#041c17] border-2 border-cyan-500/40 rounded-3xl shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Lock size={15} className="text-cyan-400" /> Locked in Escrow
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (balance.escrowMarbles || balance.escrowPoints || 0) > 0
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse"
                      : "bg-slate-800/60 text-slate-400 border-slate-700/50"
                  }`}>
                    {(balance.activeEscrowLocks?.length || 0)} Active Lock{(balance.activeEscrowLocks?.length || 0) === 1 ? "" : "s"}
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 font-serif tracking-tight flex items-center gap-1.5">
                    {((balance.escrowMarbles ?? balance.escrowPoints ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    <span className="text-lg font-bold text-cyan-400">⚪</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-mono">
                    ≈ GH₵ {((balance.escrowMarbles ?? balance.escrowPoints ?? 0)).toFixed(2)} in Custodial Vault
                  </p>
                </div>
                <div className="pt-1 border-t border-[#1a5e48]/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveTab("escrow")}
                    className="w-full py-2 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 hover:text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-cyan-600/40 transition-all cursor-pointer"
                  >
                    <ShieldCheck size={14} /> View Escrow Vault &amp; Locks
                  </button>
                </div>
              </div>

              {/* Card 3: Total Portfolio (Net Assets) */}
              <div className="p-6 bg-gradient-to-br from-[#081c15] to-[#06261f] border border-[#1a5e48] rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Layers size={15} /> Total Portfolio
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Net Assets
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#f5efdf] font-serif tracking-tight">
                    {(((balance.points || 0) + (balance.escrowMarbles ?? balance.escrowPoints ?? 0))).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    <span className="text-lg font-bold text-[#d6a735] ml-1.5">⚪</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 font-mono">
                    ≈ GH₵ {(((balance.points || 0) + (balance.escrowMarbles ?? balance.escrowPoints ?? 0))).toFixed(2)} Total Holdings
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-[#1a5e48]/60 flex items-center justify-between font-mono">
                  <span>Liq: <strong className="text-emerald-400">GH₵ {(balance.points || 0).toFixed(0)}</strong></span>
                  <span>•</span>
                  <span>Escrow: <strong className="text-cyan-400">GH₵ {((balance.escrowMarbles ?? balance.escrowPoints ?? 0)).toFixed(0)}</strong></span>
                </div>
              </div>

              {/* Card 4: Competitive Rank & Career Payouts */}
              <div className="p-6 bg-gradient-to-br from-[#081c15] to-[#06261f] border border-[#1a5e48] rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Award size={15} /> Rank &amp; Payouts
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${rankTier.bg} ${rankTier.color} border ${rankTier.border}`}>
                    {rankTier.name}
                  </span>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-[#f5efdf] font-serif tracking-tight flex items-center gap-2">
                    <Award className="text-amber-400" size={30} />
                    {balance.rating || 1000}
                    <span className="text-xs font-semibold text-slate-400 font-sans">DPI</span>
                  </div>
                  <p className="text-xs text-emerald-400 mt-1 font-mono font-semibold">
                    +{totalWinnings.toFixed(2)} ⚪ Career Won
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-[#1a5e48]/60 flex items-center justify-between">
                  <span>Player: <strong className="text-slate-200">{balance.username || "Challenger"}</strong></span>
                  <span className="text-emerald-400 font-semibold">Verified</span>
                </div>
              </div>
            </div>

            {/* Active Escrow Notification Banner (if any active locks) */}
            {(balance.escrowMarbles || balance.escrowPoints || 0) > 0 && (
              <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-950/90 via-[#062b22] to-cyan-950/90 border-2 border-cyan-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shrink-0 shadow-inner">
                    <Lock size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                      <span>GH₵ {((balance.escrowMarbles ?? balance.escrowPoints ?? 0)).toFixed(2)} Currently Locked in Escrow</span>
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-500/40">
                        Custodial Protection Active
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Your stakes are locked in isolated smart vaults across {balance.activeEscrowLocks?.length || "active"} match(es) / tournament(s) and will auto-settle upon completion.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("escrow")}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  >
                    <ExternalLink size={13} /> View Active Locks ({balance.activeEscrowLocks?.length || 0})
                  </button>
                </div>
              </div>
            )}

            {/* 1:1 Parity Callout Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#081c15] via-[#0a2e24] to-[#081c15] border border-[#1a5e48] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#d6a735]/20 border border-[#d6a735]/40 text-[#d6a735] flex items-center justify-center shrink-0 shadow-inner">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#d6a735] flex items-center gap-2">
                    Ghana Cedi (GH₵) &amp; Marble Parity Standard
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    1 Virtual Marble is strictly backed and pegged 1:1 to GH₵ 1.00 for transparent wagering, prize distribution, and zero-fee deposits.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs font-mono font-bold bg-[#041c17] px-4 py-2 rounded-xl border border-[#1a5e48] text-emerald-400 shrink-0 shadow-inner">
                <span className="text-slate-200">GH₵ 1.00 Mobile Money</span>
                <ArrowRight size={14} className="text-[#d6a735]" />
                <span className="text-[#d6a735]">1.00 Marble</span>
              </div>
            </div>

            {/* Main Interactive Action Hub */}
            <div className="bg-[#081c15] border border-[#1a5e48] rounded-3xl shadow-2xl overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex items-center border-b border-[#1a5e48] overflow-x-auto bg-[#06261f]/80 p-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("deposit")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "deposit"
                      ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20"
                      : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <Coins size={16} /> Top Up (Mobile Money)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("withdraw")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "withdraw"
                      ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20"
                      : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <Phone size={16} /> Cashout (MoMo Payout)
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("escrow")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "escrow"
                      ? "bg-cyan-500 text-[#06261f] shadow-lg shadow-cyan-500/20 font-black"
                      : "text-cyan-400 hover:text-white hover:bg-cyan-950/60"
                  }`}
                >
                  <Lock size={16} /> Escrow Vault
                  {(balance.escrowMarbles || balance.escrowPoints || 0) > 0 ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeTab === "escrow"
                        ? "bg-[#06261f] text-cyan-300"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    }`}>
                      GH₵ {((balance.escrowMarbles ?? balance.escrowPoints ?? 0)).toFixed(0)}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "history"
                      ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20"
                      : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <History size={16} /> Transaction Ledger ({transactions.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === "security"
                      ? "bg-[#d6a735] text-[#06261f] shadow-lg shadow-[#d6a735]/20"
                      : "text-slate-300 hover:text-white hover:bg-[#0c3b2e]"
                  }`}
                >
                  <ShieldCheck size={16} /> Security &amp; Escrow
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6 sm:p-8">
                {/* TAB 1: DEPOSIT / TOP UP */}
                {activeTab === "deposit" && (
                  <div className="space-y-8">
                    {/* Active Paystack Invoice Tracker Banner */}
                    {pendingPayment && (
                      <div className="p-6 bg-gradient-to-br from-[#0c2f25] to-[#041c17] border-2 border-[#d6a735] rounded-3xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1a5e48] pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40 flex items-center justify-center shrink-0 animate-pulse">
                              <Coins size={22} />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                                Paystack Checkout in Progress
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#d6a735] text-[#06261f]">
                                  Awaiting Authorization
                                </span>
                              </h4>
                              <p className="text-xs text-slate-300 font-mono">
                                Ref: {pendingPayment.reference} • Amount: GH₵ {pendingPayment.amountGhs}.00 ({pendingPayment.points} Marbles)
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPendingPayment(null)}
                            className="text-xs text-slate-400 hover:text-slate-200 underline text-left sm:text-right"
                          >
                            Dismiss / Start Over
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPaystackModal(true)}
                            className="py-3 px-5 bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#d6a735]/20 transition-all text-center cursor-pointer"
                          >
                            <CreditCard size={16} /> Open Paystack Popup
                          </button>

                          <button
                            type="button"
                            disabled={verifyingPayment}
                            onClick={() => {
                              const tok = token || getSessionToken();
                              if (tok && pendingPayment) verifyPaymentRef(tok, pendingPayment.reference);
                            }}
                            className="py-3 px-5 bg-[#0c3b2e] hover:bg-[#114a3a] text-emerald-300 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 border border-[#1a5e48] transition-all disabled:opacity-50"
                          >
                            {verifyingPayment ? (
                              <>
                                <RefreshCw size={16} className="animate-spin" /> Verifying with Gateway...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={16} /> I Have Completed Payment
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-300 bg-[#06261f]/90 p-3 rounded-xl border border-[#1a5e48]">
                          <Clock size={14} className="text-[#d6a735] shrink-0 animate-spin" />
                          <span>
                            Real-time listener is polling Paystack &amp; listening for Mobile Money prompt completion. Balance will auto-update as soon as payment is confirmed.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-[#f5efdf] flex items-center gap-2 font-serif">
                          <Coins size={20} className="text-[#d6a735]" /> Buy Marbles with Mobile Money
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1">
                          Direct Mobile Money top-up via MTN MoMo, Telecel Cash, or AT Money with 0% platform fee.
                        </p>
                      </div>

                      <form onSubmit={handleTopup} className="space-y-5">
                        {/* Quick Presets */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Choose Preset Amount
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {PRESET_AMOUNTS.map((amt) => (
                              <button
                                key={`preset-${amt}`}
                                type="button"
                                onClick={() => setTopupAmountGhs(amt)}
                                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all border ${
                                  topupAmountGhs === amt
                                    ? "bg-[#d6a735] text-[#06261f] border-[#d6a735] shadow-md shadow-[#d6a735]/20 scale-105"
                                    : "bg-[#06261f] text-slate-200 border-[#1a5e48] hover:border-[#d6a735]/50 hover:bg-[#0c3b2e]"
                                }`}
                              >
                                {amt} ⚪
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Input */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                              Or Enter Custom Amount (Marbles)
                            </label>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Min: {limits.minDepositGhs} • Max: {limits.maxDepositGhs.toLocaleString()}
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min={limits.minDepositGhs}
                              max={limits.maxDepositGhs}
                              step={1}
                              value={topupAmountGhs || ""}
                              onChange={(e) => setTopupAmountGhs(Number(e.target.value))}
                              placeholder="20"
                              className="w-full bg-[#041c17] border border-[#1a5e48] focus:border-[#d6a735] text-[#f5efdf] text-lg font-bold rounded-2xl px-4 py-3.5 pl-12 focus:outline-none transition-all"
                              required
                            />
                            <Coins size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d6a735]" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-400 bg-[#06261f] px-2 py-1 rounded-lg border border-[#1a5e48]">
                              = GH₵ {topupAmountGhs ? topupAmountGhs.toFixed(2) : "0.00"}
                            </span>
                          </div>
                        </div>

                        {/* Email Confirmation */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Email for Electronic Receipt (Optional)
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="player@damii.game"
                            className="w-full bg-[#041c17] border border-[#1a5e48] focus:border-[#d6a735] text-[#f5efdf] text-sm rounded-2xl px-4 py-3 focus:outline-none transition-all placeholder:text-slate-600"
                          />
                        </div>

                        {/* Payment Gateway Selector */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                            Payment Gateway
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setSelectedDepositProvider("palmpay")}
                              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                selectedDepositProvider === "palmpay"
                                  ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-900/20"
                                  : "bg-[#041c17] border-[#1a5e48] opacity-75 hover:opacity-100"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-purple-300">PalmPay</span>
                                {selectedDepositProvider === "palmpay" && (
                                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1">
                                Direct MoMo / PalmPay App
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedDepositProvider("paystack")}
                              className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                selectedDepositProvider === "paystack"
                                  ? "bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-900/20"
                                  : "bg-[#041c17] border-[#1a5e48] opacity-75 hover:opacity-100"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-emerald-300">Paystack</span>
                                {selectedDepositProvider === "paystack" && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1">
                                Mobile Money & Cards
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Submit CTA */}
                        <button
                          type="submit"
                          disabled={busy || !topupAmountGhs || topupAmountGhs < limits.minDepositGhs}
                          className="w-full py-4 bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-black rounded-2xl text-sm transition-all shadow-xl shadow-[#d6a735]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {busy ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" /> Processing Invoice...
                            </>
                          ) : (
                            <>
                              <Coins size={18} /> Buy {topupAmountGhs || 0} Marbles (GH₵ {(topupAmountGhs || 0).toFixed(2)})
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Deposit Summary & Supported Providers */}
                    <div className="lg:col-span-5 space-y-5 bg-[#06261f] border border-[#1a5e48] rounded-3xl p-6 shadow-xl">
                      <h4 className="text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
                        <CreditCard size={16} /> Supported Payment Channels
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-2xl flex items-center justify-between">
                          <span className="font-bold text-slate-200 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> MTN Mobile Money
                          </span>
                          <span className="text-[11px] text-emerald-400 font-semibold font-mono">0% Fee • Instant</span>
                        </div>
                        <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-2xl flex items-center justify-between">
                          <span className="font-bold text-slate-200 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Telecel Cash
                          </span>
                          <span className="text-[11px] text-emerald-400 font-semibold font-mono">0% Fee • Instant</span>
                        </div>
                        <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-2xl flex items-center justify-between">
                          <span className="font-bold text-slate-200 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> AT Money
                          </span>
                          <span className="text-[11px] text-emerald-400 font-semibold font-mono">0% Fee • Instant</span>
                        </div>
                      </div>

                      <div className="border-t border-[#1a5e48] pt-4 space-y-2 text-xs text-slate-300">
                        <div className="flex justify-between">
                          <span>Deposit Conversion:</span>
                          <span className="font-bold text-[#f5efdf]">1 Cedi = 1 Marble</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Fee:</span>
                          <span className="font-bold text-emerald-400">0.00 (Free)</span>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-[#d6a735] pt-2 border-t border-[#1a5e48]/50">
                          <span>Marbles to Receive:</span>
                          <span>{topupAmountGhs || 0} ⚪</span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-emerald-950/40 border border-emerald-600/30 rounded-2xl text-[11px] text-emerald-200 flex items-start gap-2.5">
                        <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <p>
                          Transactions are confirmed with bank-level encryption. Your Marbles are credited immediately after Mobile Money PIN authorization.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                {/* TAB 2: WITHDRAW / CASHOUT */}
                {activeTab === "withdraw" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 space-y-6">
                      <div>
                        <h3 className="text-xl font-bold text-[#f5efdf] flex items-center gap-2 font-serif">
                          <Phone size={20} className="text-emerald-400" /> Redeem Marbles to Mobile Money
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1">
                          Withdraw your won Marbles directly to your MTN, Telecel, or AT Mobile Money wallet at 1:1 Cedi parity.
                        </p>
                      </div>

                      <form onSubmit={handleWithdraw} className="space-y-5">
                        {/* Balance quick select % */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                              Redemption Amount (Marbles)
                            </label>
                            <span className="text-[11px] text-slate-400">
                              Available: <strong className="text-[#d6a735]">{balance.points.toFixed(2)} Marbles</strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-2">
                            {[0.25, 0.5, 0.75, 1.0].map((pct) => {
                              const calculated = Math.floor(balance.points * pct);
                              return (
                                <button
                                  key={`pct-${pct}`}
                                  type="button"
                                  onClick={() => setWithdrawAmount(Math.max(limits.minWithdrawalGhs, calculated))}
                                  className="py-1.5 px-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-200 hover:text-white border border-[#1a5e48] rounded-xl text-xs font-bold transition-all"
                                >
                                  {pct * 100}% ({calculated} ⚪)
                                </button>
                              );
                            })}
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min={limits.minWithdrawalGhs}
                              max={Math.min(balance.points, limits.maxWithdrawalGhs)}
                              step={1}
                              value={withdrawAmount || ""}
                              onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                              placeholder="20"
                              className="w-full bg-[#041c17] border border-[#1a5e48] focus:border-[#d6a735] text-[#f5efdf] text-lg font-bold rounded-2xl px-4 py-3.5 pl-12 focus:outline-none transition-all"
                              required
                            />
                            <Coins size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-amber-400 bg-[#06261f] px-2 py-1 rounded-lg border border-[#1a5e48]">
                              = GH₵ {withdrawAmount ? withdrawAmount.toFixed(2) : "0.00"}
                            </span>
                          </div>
                        </div>

                        {/* Network & Phone */}
                        {(() => {
                          const effectiveTargetPhone = (balance.phoneNumber || momoNumber || "").trim();
                          const detected = detectGhanaTelecomProvider(effectiveTargetPhone);
                          const validation = validateAndFormatMomoPhone(effectiveTargetPhone, momoProvider);
                          const hasConflict = Boolean(effectiveTargetPhone.length >= 3 && !validation.isValid);

                          return (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                                      Network Provider
                                    </label>
                                    {detected.isRecognized && (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                        hasConflict
                                          ? "bg-red-500/20 text-red-300 border-red-500/40"
                                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                      }`}>
                                        {hasConflict ? "Network Mismatch" : "Verified Carrier"}
                                      </span>
                                    )}
                                  </div>
                                  <select
                                    value={momoProvider}
                                    onChange={(e) => {
                                      const nextProv = e.target.value;
                                      setMomoProvider(nextProv);
                                      if (effectiveTargetPhone && effectiveTargetPhone.length >= 3) {
                                        const chk = validateAndFormatMomoPhone(effectiveTargetPhone, nextProv);
                                        if (!chk.isValid) {
                                          setError(chk.error || "Network mismatch");
                                        } else {
                                          setError("");
                                        }
                                      }
                                    }}
                                    className={`w-full bg-[#041c17] border text-[#f5efdf] text-sm rounded-2xl px-4 py-3.5 focus:outline-none font-bold transition-colors ${
                                      hasConflict ? "border-red-500 focus:border-red-400" : "border-[#1a5e48] focus:border-[#d6a735]"
                                    }`}
                                  >
                                    <option value="MTN">MTN MoMo (024, 025, 053, 054, 055, 059)</option>
                                    <option value="Telecel">Telecel Cash (Vodafone - 020, 050)</option>
                                    <option value="AT">AT Money (AirtelTigo - 026, 027, 056, 057)</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                                      MoMo Phone Number
                                    </label>
                                    {balance.phoneNumber && (
                                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                                        <ShieldCheck size={12} /> Verified &amp; Locked
                                      </span>
                                    )}
                                  </div>
                                  <input
                                    type="tel"
                                    value={balance.phoneNumber || momoNumber}
                                    onChange={(e) => {
                                      if (!balance.phoneNumber) {
                                        const val = e.target.value;
                                        setMomoNumber(val);
                                        const autoDet = detectGhanaTelecomProvider(val);
                                        if (autoDet.isRecognized && autoDet.provider !== "Unknown") {
                                          setMomoProvider(autoDet.provider);
                                        }
                                      }
                                    }}
                                    disabled={Boolean(balance.phoneNumber)}
                                    placeholder="0244123456"
                                    className={`w-full bg-[#041c17] border text-[#f5efdf] text-sm rounded-2xl px-4 py-3.5 font-mono font-bold placeholder:text-slate-600 transition-colors ${
                                      hasConflict
                                        ? "border-red-500"
                                        : balance.phoneNumber
                                        ? "border-emerald-500/40 bg-emerald-950/20 opacity-80 cursor-not-allowed"
                                        : "border-[#1a5e48] focus:border-[#d6a735] focus:outline-none"
                                    }`}
                                    required
                                  />
                                  {detected.isRecognized ? (
                                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold">
                                      <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                                      <span>Prefix {detected.prefix} detected: {detected.providerName}</span>
                                    </div>
                                  ) : (
                                    <small className="block text-[10px] text-slate-400">
                                      {balance.phoneNumber
                                        ? "🔒 For fraud protection & account security, withdrawals are strictly disbursed to your verified phone number."
                                        : "Enter the Mobile Money phone number to receive your funds."}
                                    </small>
                                  )}
                                </div>
                              </div>

                              {/* Real-time MoMo Network Conflict Warning Banner */}
                              {hasConflict && (
                                <div className="p-3 bg-red-950/80 border border-red-700/80 rounded-xl text-[11px] text-red-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in">
                                  <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                                  <div className="flex-1 space-y-1.5">
                                    <strong className="block text-red-300 font-bold">Destination Network Mismatch:</strong>
                                    <p className="text-red-200/90">{validation.error}</p>
                                    {detected.isRecognized && detected.provider !== "Unknown" && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMomoProvider(detected.provider);
                                          setError("");
                                        }}
                                        className="px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold border border-red-500/70 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                      >
                                        <Check size={12} /> Auto-fix: Switch to {detected.providerName}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Submit Cashout CTA */}
                        <button
                          type="submit"
                          disabled={busy || !withdrawAmount || withdrawAmount > balance.points || withdrawAmount < limits.minWithdrawalGhs}
                          className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-[#06261f] font-black rounded-2xl text-sm transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {busy ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" /> Processing Cashout...
                            </>
                          ) : (
                            <>
                              <Phone size={18} /> Redeem {withdrawAmount || 0} Marbles for GH₵ {(withdrawAmount || 0).toFixed(2)}
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* Redemption Policy Box */}
                    <div className="lg:col-span-5 space-y-5 bg-[#06261f] border border-[#1a5e48] rounded-3xl p-6 shadow-xl">
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck size={16} /> Cashout Limits &amp; Safeguards
                      </h4>

                      <div className="space-y-3 text-xs">
                        <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-2xl flex items-center justify-between">
                          <span className="text-slate-300">Minimum Redemption:</span>
                          <span className="font-bold text-slate-100 font-mono">{limits.minWithdrawalGhs} Marbles (GH₵ {limits.minWithdrawalGhs})</span>
                        </div>
                        <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-2xl flex items-center justify-between">
                          <span className="text-slate-300">Maximum Per-Tx:</span>
                          <span className="font-bold text-slate-100 font-mono">{limits.maxWithdrawalGhs.toLocaleString()} Marbles (GH₵ {limits.maxWithdrawalGhs.toLocaleString()})</span>
                        </div>
                        <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-2xl flex items-center justify-between">
                          <span className="text-slate-300">24h Daily AML Cap:</span>
                          <span className="font-bold text-amber-400 font-mono">{limits.maxDailyWithdrawalGhs.toLocaleString()} Marbles</span>
                        </div>
                      </div>

                      <div className="p-3.5 bg-[#041c17] border border-[#1a5e48] rounded-2xl space-y-2 text-xs text-slate-300">
                        <span className="font-bold text-[#d6a735] block">Disbursement Timeline:</span>
                        <p className="leading-relaxed">
                          Mobile Money redemptions are processed via automated batch settlement. Standard disbursement settles in under 5 minutes directly to your phone number.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ESCROW VAULT & ACTIVE LOCKS */}
                {activeTab === "escrow" && (
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#f5efdf] flex items-center gap-2 font-serif">
                          <Lock size={20} className="text-cyan-400" /> Custodial Escrow Vault &amp; Active Locks
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1">
                          Audited breakdown of all funds currently locked in smart escrow for active 1-on-1 wager challenges and tournament registrations.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const tok = token || getSessionToken();
                            if (tok) loadWalletData(tok);
                          }}
                          disabled={refreshing}
                          className="px-3 py-2 bg-[#041c17] hover:bg-[#0c3b2e] border border-[#1a5e48] text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <RefreshCw size={13} className={refreshing ? "animate-spin text-cyan-400" : ""} /> Refresh Vault
                        </button>
                      </div>
                    </div>

                    {/* Escrow Status Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="p-5 bg-gradient-to-br from-cyan-950/70 to-[#041c17] border border-cyan-500/40 rounded-2xl space-y-2 shadow-lg">
                        <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Lock size={14} /> Total Amount Locked
                        </span>
                        <div className="text-3xl font-extrabold text-cyan-300 font-serif">
                          {((balance.escrowMarbles ?? balance.escrowPoints ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          <span className="text-sm font-bold text-cyan-400 ml-1">⚪</span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono">
                          ≈ GH₵ {((balance.escrowMarbles ?? balance.escrowPoints ?? 0)).toFixed(2)} in Escrow
                        </p>
                      </div>

                      <div className="p-5 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-2 shadow-lg">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Swords size={14} /> Active Locked Challenges
                        </span>
                        <div className="text-3xl font-extrabold text-[#f5efdf] font-serif">
                          {balance.activeEscrowLocks?.length || 0}
                          <span className="text-sm font-medium text-slate-400 ml-1.5">Pot{balance.activeEscrowLocks?.length === 1 ? "" : "s"}</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {balance.activeEscrowLocks && balance.activeEscrowLocks.length > 0
                            ? "Active match pots waiting or in progress"
                            : "No active wager locks pending"}
                        </p>
                      </div>

                      <div className="p-5 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-2 shadow-lg">
                        <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck size={14} /> Cancellation Refund Status
                        </span>
                        <div className="text-base font-bold text-emerald-300 flex items-center gap-1.5 mt-1">
                          <CheckCircle2 size={18} className="text-emerald-400" /> 100% Guaranteed
                        </div>
                        <p className="text-xs text-slate-300">
                          Automatic 100% refund if match is cancelled, expired without an opponent, or drawn.
                        </p>
                      </div>
                    </div>

                    {/* Active Escrow Locks Detail List */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                        <Lock size={16} className="text-cyan-400" /> Active Locked Matches &amp; Tournaments
                      </h4>

                      {balance.activeEscrowLocks && balance.activeEscrowLocks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {balance.activeEscrowLocks.map((lock) => {
                            const isMatch = lock.type === "wager_match";
                            const isHost = lock.role === "host";

                            return (
                              <div
                                key={lock.id}
                                className="p-5 bg-gradient-to-br from-[#06261f] to-[#041c17] border-2 border-cyan-500/40 hover:border-cyan-400 rounded-3xl space-y-4 shadow-xl transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner ${
                                      isMatch ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    }`}>
                                      {isMatch ? <Swords size={20} /> : <Trophy size={20} />}
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-[#f5efdf] text-sm flex items-center gap-2">
                                        {lock.title}
                                      </h5>
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        Ref: #{lock.reference}
                                      </span>
                                    </div>
                                  </div>

                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    lock.status.includes("waiting")
                                      ? "bg-amber-950 text-amber-300 border border-amber-700/50"
                                      : "bg-emerald-950 text-emerald-300 border border-emerald-700/50"
                                  }`}>
                                    {lock.status}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-[#041c17] p-3 rounded-2xl border border-[#1a5e48]">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Your Locked Stake</span>
                                    <span className="font-bold font-mono text-cyan-300 text-sm">
                                      GH₵ {lock.amount.toFixed(2)} ({lock.amount.toFixed(0)} ⚪)
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Role / Side</span>
                                    <span className="font-bold text-slate-200 capitalize">
                                      {isHost ? "Host (Created Game)" : lock.role === "guest" ? "Challenger (Joined)" : "Participant"}
                                    </span>
                                  </div>
                                  {lock.opponentName && (
                                    <div className="col-span-2 pt-1 border-t border-[#1a5e48]/50 flex items-center justify-between text-[11px]">
                                      <span className="text-slate-400">Opponent:</span>
                                      <span className="font-bold text-emerald-300">{lock.opponentName}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-1">
                                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                    <Clock size={12} /> {new Date(lock.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>

                                  {isMatch ? (
                                    <a
                                      href={`/arena?room=${encodeURIComponent(lock.reference)}`}
                                      className="px-4 py-2 bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                                    >
                                      <Gamepad2 size={14} /> Enter Room
                                    </a>
                                  ) : (
                                    <a
                                      href={`/leagues/${encodeURIComponent(lock.reference)}`}
                                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#06261f] font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                                    >
                                      <Trophy size={14} /> View League
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 bg-[#06261f] border border-[#1a5e48] rounded-3xl text-center space-y-4">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                            <ShieldCheck size={28} />
                          </div>
                          <div className="max-w-md mx-auto space-y-1">
                            <h5 className="text-base font-bold text-[#f5efdf]">No Marbles Currently Locked in Escrow</h5>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              Your full balance of <strong>{typeof balance.points === "number" ? balance.points.toFixed(2) : balance.points} Marbles</strong> is completely liquid and available for wagering challenges or immediate Mobile Money cashout.
                            </p>
                          </div>
                          <div className="pt-2">
                            <a
                              href="/arena"
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d6a735] hover:bg-[#c4962b] text-[#06261f] font-bold rounded-xl text-xs transition-all shadow-md"
                            >
                              <Swords size={15} /> Find 1-on-1 Wager Match
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* How Escrow Works Info Card */}
                    <div className="p-6 bg-[#041c17] border border-[#1a5e48] rounded-3xl space-y-4">
                      <h4 className="text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
                        <Info size={16} /> How DAMII Atomic Wager Escrow Works
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                        <div className="p-4 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-2">
                          <span className="font-bold text-amber-400 flex items-center gap-1.5">
                            1. Match Creation
                          </span>
                          <p className="leading-relaxed">
                            When you create a wager match, your stake is immediately deducted from your liquid balance and held safely in the custodial escrow vault.
                          </p>
                        </div>

                        <div className="p-4 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-2">
                          <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                            2. Opponent Acceptance
                          </span>
                          <p className="leading-relaxed">
                            When an opponent clicks to join your room, their matching stake is deducted and locked into the same escrow pot, completing the total prize pot.
                          </p>
                        </div>

                        <div className="p-4 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-2">
                          <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                            3. Instant Settlement
                          </span>
                          <p className="leading-relaxed">
                            Upon victory, the full escrow pot (minus standard platform arbiter fee) is disbursed directly into the winner's wallet. If drawn or cancelled, 100% of stakes are refunded.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: TRANSACTION AUDIT LEDGER */}
                {activeTab === "history" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#f5efdf] flex items-center gap-2 font-serif">
                          <History size={20} className="text-[#d6a735]" /> Marbles Transaction History
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 mt-1">
                          Audited ledger of all top-ups, wager settlements, tournament entry fees, and cashouts.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative min-w-[200px]">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search reference or type..."
                            className="w-full bg-[#041c17] border border-[#1a5e48] rounded-xl px-3 py-2 pl-9 text-xs text-slate-200 focus:outline-none focus:border-[#d6a735]"
                          />
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>

                        <select
                          value={historyFilter}
                          onChange={(e) => setHistoryFilter(e.target.value)}
                          className="bg-[#041c17] border border-[#1a5e48] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none font-bold"
                        >
                          <option value="all">All Types</option>
                          <option value="deposit">Deposits Only</option>
                          <option value="withdrawal">Cashouts Only</option>
                          <option value="wager">Wagers Only</option>
                          <option value="league">Tournaments Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-2xl border border-[#1a5e48] bg-[#041c17]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#1a5e48] bg-[#06261f]/80 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                            <th className="py-3.5 px-4">Date &amp; Time</th>
                            <th className="py-3.5 px-4">Transaction Type</th>
                            <th className="py-3.5 px-4">Currency</th>
                            <th className="py-3.5 px-4">Amount</th>
                            <th className="py-3.5 px-4">Reference ID</th>
                            <th className="py-3.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a5e48]/40">
                          {filteredTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                <History size={28} className="mx-auto text-slate-600 mb-2" />
                                No transactions match your current search or filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredTransactions.map((tx, idx) => {
                              const isPositive = tx.amount > 0;
                              const isDeposit = tx.type === "deposit";
                              const isWithdrawal = tx.type === "withdrawal";

                              return (
                                <tr key={`${tx.id || "tx"}-${idx}`} className="hover:bg-[#06261f]/50 transition-colors">
                                  <td className="py-3.5 px-4 text-slate-300 font-mono whitespace-nowrap">
                                    {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#06261f] border border-[#1a5e48] text-[11px]">
                                      {isDeposit ? <ArrowDownLeft size={12} className="text-emerald-400" /> : null}
                                      {isWithdrawal ? <ArrowUpRight size={12} className="text-rose-400" /> : null}
                                      {tx.type.replace(/_/g, " ").toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2 py-0.5 bg-[#d6a735]/20 text-[#d6a735] font-bold rounded-full text-[10px] border border-[#d6a735]/30">
                                      MARBLE
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-bold text-sm whitespace-nowrap">
                                    <span className={isPositive ? "text-emerald-400" : "text-rose-400"}>
                                      {isPositive ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} ⚪
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate max-w-[160px]" title={tx.reference}>{tx.reference}</span>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(tx.reference)}
                                        className="p-1 hover:bg-[#0c3b2e] rounded text-slate-400 hover:text-white transition-colors"
                                        title="Copy reference code"
                                      >
                                        {copiedRef === tx.reference ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                        tx.status === "completed"
                                          ? "bg-emerald-950 text-emerald-400 border border-emerald-700/50"
                                          : tx.status === "pending"
                                          ? "bg-amber-950 text-amber-400 border border-amber-700/50"
                                          : "bg-rose-950 text-rose-400 border border-rose-700/50"
                                      }`}
                                    >
                                      {tx.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 4: SECURITY & FAIR PLAY */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-[#f5efdf] flex items-center gap-2 font-serif">
                        <ShieldCheck size={20} className="text-[#d6a735]" /> DAMII Escrow &amp; Security Standards
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1">
                        How DAMII guarantees player protection, financial integrity, and fair play across all games.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="p-5 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <Lock size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[#f5efdf]">Atomic Escrow Vaults</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          When two players agree on a wager match or enter a tournament, stakes are atomically locked in an isolated escrow vault until the match concludes.
                        </p>
                      </div>

                      <div className="p-5 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-[#d6a735]/20 text-[#d6a735] flex items-center justify-center">
                          <ShieldCheck size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[#f5efdf]">CSRF &amp; Cryptographic Tokens</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Every transaction requires CSPRNG session validation and synchronized CSRF token headers to defend against cross-site replay attacks and unauthorized requests.
                        </p>
                      </div>

                      <div className="p-5 bg-[#06261f] border border-[#1a5e48] rounded-2xl space-y-3">
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                          <CheckCircle2 size={20} />
                        </div>
                        <h4 className="font-bold text-sm text-[#f5efdf]">Compulsory Fair Play</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Standard 10×10 Damii rules with compulsory multi-hop captures and server-authoritative move validation prevent illegal game moves.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />

      {pendingPayment && (
        <PaystackModal
          isOpen={showPaystackModal}
          onClose={() => setShowPaystackModal(false)}
          authorizationUrl={pendingPayment.authorizationUrl}
          reference={pendingPayment.reference}
          amountGhs={pendingPayment.amountGhs}
          points={pendingPayment.points}
          token={token || getSessionToken()}
          provider={pendingPayment.provider}
          onSuccess={(ref, msg) => {
            setShowPaystackModal(false);
            setMessage(msg || `GH₵ ${pendingPayment.amountGhs}.00 successfully credited!`);
            const tok = token || getSessionToken();
            if (tok) loadWalletData(tok);
            setPendingPayment(null);
          }}
        />
      )}
    </main>
  );
}
