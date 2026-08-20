"use client";

import { useEffect, useState, useCallback } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import { Wallet, Coins, ShieldCheck, Phone, CheckCircle2, AlertCircle, LogIn, Award, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import type { WalletTransaction } from "@/lib/types";

export default function WalletPage() {
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState({ points: 0, rating: 1000, username: "" });
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadWalletData = useCallback(async (userToken: string) => {
    try {
      const res = await fetch(`/api/wallet?token=${encodeURIComponent(userToken)}`);
      const data = await res.json();
      if (data.balance) setBalance(data.balance);
      if (data.transactions) setTransactions(data.transactions);
      if (data.settings) {
        setLimits({
          minDepositGhs: data.settings.minDepositGhs ?? 5,
          maxDepositGhs: data.settings.maxDepositGhs ?? 5000,
          minWithdrawalGhs: data.settings.minWithdrawalGhs ?? 10,
          maxWithdrawalGhs: data.settings.maxWithdrawalGhs ?? 2000,
          maxDailyWithdrawalGhs: data.settings.maxDailyWithdrawalGhs ?? 5000,
        });
      }
    } catch {
      // Retain
    }
  }, []);

  const verifyPaystackRef = useCallback(async (userToken: string, ref: string) => {
    setBusy(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: userToken, reference: ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      setMessage(data.message || "Paystack transaction verified! Marbles added to your balance.");
      loadWalletData(userToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification error");
    } finally {
      setBusy(false);
    }
  }, [loadWalletData]);

  const syncUser = useCallback(() => {
    const saved = localStorage.getItem("damii-player-token");
    setToken(saved);
    if (saved) {
      loadWalletData(saved);
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        verifyPaystackRef(saved, ref);
      }
    }
  }, [loadWalletData, verifyPaystackRef]);

  useEffect(() => {
    syncUser();
    window.addEventListener("damii-auth-changed", syncUser);
    return () => window.removeEventListener("damii-auth-changed", syncUser);
  }, [syncUser]);

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deposit", token, amountGhs: topupAmountGhs, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize Paystack purchase");

      setMessage(`Paystack invoice created for ${topupAmountGhs} Marbles (GH₵ ${topupAmountGhs}.00). Redirecting to secure gateway...`);
      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank");
      }
      setTimeout(() => verifyPaystackRef(token, data.reference), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Purchase error");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw",
          token,
          amountGhs: withdrawAmount,
          momoNumber,
          momoProvider,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redemption request failed");
      setMessage(`Redemption request of ${data.ghsValue} Marbles (GH₵ ${data.ghsValue}.00) submitted to ${momoProvider} ${momoNumber}. Reference: ${data.reference}`);
      loadWalletData(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redemption error");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="app-shell">
        <SharedHeader />
        <section className="wallet-header">
          <span className="eyebrow"><Wallet size={16} /> USER AUTHENTICATION REQUIRED</span>
          <h1>Marbles Treasury & Virtual Balance</h1>
          <p>Please sign in or create an account to view your Marbles balance, buy Marbles via Paystack, or redeem to Mobile Money.</p>
        </section>

        <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <LogIn size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Sign In to Access Your Treasury</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            All 1-on-1 wagers, tournament prize pools, match stakes, and Mobile Money redemptions use DAMII Marbles (1 Marble = 1 Cedi).
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("damii-open-auth"))}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
          >
            <LogIn size={16} /> Click Sign In / Register in Top Navigation
          </button>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <SharedHeader />

      <section className="wallet-header">
        <span className="eyebrow"><Coins size={16} /> DAMII MARBLES TREASURY (1 MARBLE = 1 CEDI)</span>
        <h1>Marbles Balance & MoMo Redemption</h1>
        <p>Buy Marbles to enter 1-on-1 wager matches and tournament prize pools. Redeem your winnings directly to Mobile Money at a 1:1 rate.</p>
      </section>

      {message && <p className="alert-banner success"><CheckCircle2 size={16} /> {message}</p>}
      {error && <p className="alert-banner error"><AlertCircle size={16} /> {error}</p>}

      <section className="balance-grid">
        <div className="balance-card points-card">
          <small className="flex items-center gap-1.5 font-bold tracking-wider">
            <Coins size={14} className="text-[#d6a735]" /> AVAILABLE MARBLES
          </small>
          <h2>{typeof balance.points === "number" ? balance.points.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : balance.points} <span className="text-lg font-bold text-[#d6a735]">Marbles</span></h2>
          <p>Equivalent to <strong>GH₵ {typeof balance.points === "number" ? balance.points.toFixed(2) : balance.points}</strong> (1 Marble = 1 Cedi). Used for 1-on-1 wagers & tournament prize pools.</p>
        </div>

        <div className="balance-card marbles-card">
          <small className="flex items-center gap-1.5 font-bold tracking-wider">
            <Award size={14} className="text-amber-400" /> RATING & RANK
          </small>
          <h2><Award className="inline text-amber-400 mr-1" size={28} /> {balance.rating} DPI</h2>
          <p>National skill ranking based on match victories, draws, and competitive tournament brackets.</p>
        </div>
      </section>

      {/* 1:1 Marble Conversion Banner */}
      <div className="my-6 p-4 bg-[#081c15] border border-[#184d3c] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-[#f5efdf]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d6a735]/20 border border-[#d6a735]/40 text-[#d6a735] flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#d6a735] flex items-center gap-1.5">
              1:1 Virtual Token Model
            </h4>
            <p className="text-xs text-[#cbd5e1] mt-0.5">
              1 Marble = 1 Ghana Cedi (GH₵ 1.00). All match wagers and tournament entry fees are transacted exclusively in Marbles.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono font-bold bg-[#06261f] px-3 py-1.5 rounded-xl border border-[#184d3c] text-emerald-400 shrink-0">
          <span>1 Cedi (GH₵ 1.00)</span>
          <ArrowRight size={14} className="text-[#d6a735]" />
          <span>1 Marble</span>
        </div>
      </div>

      <section className="wallet-actions-grid">
        <div className="action-box">
          <h3><Coins size={18} className="text-[#d6a735]" /> Buy Marbles (Paystack)</h3>
          <p>Instant purchase via Mobile Money (MTN / Telecel / AT) or Bank Card at 1 Cedi per Marble.</p>
          <form onSubmit={handleTopup}>
            <label>Amount of Marbles (1 Marble = GH₵ 1.00)
              <input type="number" min={limits.minDepositGhs} max={limits.maxDepositGhs} step={5} value={topupAmountGhs} onChange={(e) => setTopupAmountGhs(Number(e.target.value))} />
            </label>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 mb-2">
              <span>Limit: <strong>{limits.minDepositGhs} Marbles</strong> min – <strong>{limits.maxDepositGhs.toLocaleString()} Marbles</strong> max</span>
              <span className="rate-hint">Cost: <strong className="text-emerald-400">GH₵ {topupAmountGhs.toFixed(2)}</strong></span>
            </div>
            <label>Email (Receipt Confirmation)
              <input type="email" placeholder="player@damii.gh" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className="btn-primary flex items-center justify-center gap-1.5">
              <Coins size={16} /> Buy {topupAmountGhs} Marbles (GH₵ {topupAmountGhs}.00)
            </button>
          </form>
        </div>

        <div className="action-box">
          <h3><Phone size={18} className="text-emerald-400" /> Redeem Marbles to Mobile Money</h3>
          <p>Redeem your won Marbles directly to Mobile Money (1 Marble = GH₵ 1.00).</p>
          <form onSubmit={handleWithdraw}>
            <div className="form-row">
              <label>Marbles to Redeem
                <input type="number" min={limits.minWithdrawalGhs} max={limits.maxWithdrawalGhs} step={5} value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} />
              </label>
              <label>Network Provider
                <select value={momoProvider} onChange={(e) => setMomoProvider(e.target.value)}>
                  <option value="MTN">MTN MoMo</option>
                  <option value="Telecel">Telecel Cash</option>
                  <option value="AT">AT Money</option>
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 mb-2">
              <span>Per-Tx: <strong>{limits.minWithdrawalGhs}–{limits.maxWithdrawalGhs.toLocaleString()} Marbles</strong> (24h Cap: <strong>{limits.maxDailyWithdrawalGhs.toLocaleString()}</strong>)</span>
              <span className="rate-hint">Payout value: <strong className="text-amber-400">GH₵ {withdrawAmount.toFixed(2)}</strong></span>
            </div>
            <label>MoMo Phone Number
              <input type="tel" placeholder="024XXXXXXX" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} required />
            </label>
            <button type="submit" disabled={busy || balance.points < withdrawAmount} className="btn-outline flex items-center justify-center gap-1.5">
              <Phone size={16} /> Redeem {withdrawAmount} Marbles for GH₵ {withdrawAmount}.00
            </button>
          </form>
        </div>
      </section>

      <section className="transaction-history">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
            <RefreshCw size={16} className="text-[#d6a735]" /> Marbles Transaction History & Audit Ledger
          </h3>
          <span className="text-xs text-[#cbd5e1] font-mono">1 Marble = 1 Cedi</span>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Token</th>
                <th>Marbles</th>
                <th>Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell">No transaction history found.</td></tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td><span className={`tx-type ${tx.type}`}>{tx.type.replace("_", " ")}</span></td>
                    <td><span className="px-1.5 py-0.5 bg-[#0c3b2e] text-[#d6a735] font-bold rounded text-[10px]">MARBLE</span></td>
                    <td className={tx.amount >= 0 ? "positive" : "negative"}>
                      {tx.amount >= 0 ? `+${tx.amount} ⚪` : `${tx.amount} ⚪`}
                    </td>
                    <td><code>{tx.reference}</code></td>
                    <td><span className={`tx-status ${tx.status}`}>{tx.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="compliance-note">
        <ShieldCheck size={16} />
        <p>
          <strong>Virtual Token & Skill Gaming Safeguards:</strong> DAMII operates on skill-based Draughts competition rules and secured Paystack escrow safeguards. Games and tournaments use virtual Marbles (1:1 conversion rate) with immutable ledger records.
        </p>
      </div>
      <Footer />
    </main>
  );
}
