"use client";

import { useEffect, useState, useCallback } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import { Wallet, CreditCard, ShieldCheck, Phone, CheckCircle2, AlertCircle, LogIn, Award } from "lucide-react";
import { WalletTransaction } from "@/lib/types";

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
      setMessage(data.message || "Paystack transaction verified!");
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
      if (!res.ok) throw new Error(data.error || "Failed to initialize Paystack deposit");

      setMessage(`Paystack invoice created for GH₵ ${topupAmountGhs}. Redirecting...`);
      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank");
      }
      setTimeout(() => verifyPaystackRef(token, data.reference), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up error");
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
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      setMessage(`Withdrawal request of GH₵ ${data.ghsValue} submitted to ${momoProvider} ${momoNumber}. Ref: ${data.reference}`);
      loadWalletData(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal error");
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
          <h1>Wallet Balance & Financial Ledger</h1>
          <p>Please sign in or create an account to view your balance, top up via Paystack, or cash out to Mobile Money.</p>
        </section>

        <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <LogIn size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Sign In to Access Your Wallet</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            All wagers, tournament fees, escrow vaults, and Mobile Money payouts require an active DAMII user login.
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("damii-open-auth"))}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
          >
            <LogIn size={16} /> Click Login / Register in Top Navigation
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
        <span className="eyebrow"><Wallet size={16} /> WALLET LEDGER & PAYSTACK GATEWAY</span>
        <h1>Wallet Balance & MoMo Cash Out</h1>
        <p>Top-up funds via Paystack Mobile Money, wager in matches, enter tournaments, and cash out to Mobile Money (1 Cedi = GH₵ 1.00).</p>
      </section>

      {message && <p className="alert-banner success"><CheckCircle2 size={16} /> {message}</p>}
      {error && <p className="alert-banner error"><AlertCircle size={16} /> {error}</p>}

      <section className="balance-grid">
        <div className="balance-card points-card">
          <small>AVAILABLE BALANCE</small>
          <h2>GH₵ {typeof balance.points === "number" ? balance.points.toFixed(2) : balance.points}</h2>
          <p>Used for Wager Matches, Tournament Entries, and direct MoMo Cash Out (1 Cedi = GH₵ 1.00).</p>
        </div>

        <div className="balance-card marbles-card">
          <small>RATING & RANK</small>
          <h2><Award className="inline text-amber-400 mr-1" size={28} /> {balance.rating} ELO</h2>
          <p>Skill ranking based on match victories, draws, and tournament brackets.</p>
        </div>
      </section>

      <section className="wallet-actions-grid">
        <div className="action-box">
          <h3><CreditCard size={18} /> Top-Up Wallet (Paystack)</h3>
          <p>Instant deposit via Mobile Money (MTN / Telecel / AT) or Bank Card.</p>
          <form onSubmit={handleTopup}>
            <label>Amount in GHS (GH₵)
              <input type="number" min={limits.minDepositGhs} max={limits.maxDepositGhs} step={5} value={topupAmountGhs} onChange={(e) => setTopupAmountGhs(Number(e.target.value))} />
            </label>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 mb-2">
              <span>Limit: <strong>GH₵ {limits.minDepositGhs}</strong> min – <strong>GH₵ {limits.maxDepositGhs.toLocaleString()}</strong> max</span>
              <span className="rate-hint">Will credit: <strong className="text-emerald-400">GH₵ {topupAmountGhs.toFixed(2)}</strong></span>
            </div>
            <label>Email (Receipt)
              <input type="email" placeholder="player@damii.gh" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className="btn-primary">Pay with Paystack</button>
          </form>
        </div>

        <div className="action-box">
          <h3><Phone size={18} /> Mobile Money Cash Out</h3>
          <p>Withdraw funds directly to Mobile Money (1 Cedi = GH₵ 1.00).</p>
          <form onSubmit={handleWithdraw}>
            <div className="form-row">
              <label>Amount to Withdraw (GH₵)
                <input type="number" min={limits.minWithdrawalGhs} max={limits.maxWithdrawalGhs} step={5} value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} />
              </label>
              <label>Provider
                <select value={momoProvider} onChange={(e) => setMomoProvider(e.target.value)}>
                  <option value="MTN">MTN MoMo</option>
                  <option value="Telecel">Telecel Cash</option>
                  <option value="AT">AT Money</option>
                </select>
              </label>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 mb-2">
              <span>Per-Tx: <strong>GH₵ {limits.minWithdrawalGhs}–{limits.maxWithdrawalGhs.toLocaleString()}</strong> (24h Cap: <strong>GH₵ {limits.maxDailyWithdrawalGhs.toLocaleString()}</strong>)</span>
              <span className="rate-hint">Payout value: <strong className="text-amber-400">GH₵ {withdrawAmount.toFixed(2)}</strong></span>
            </div>
            <label>MoMo Phone Number
              <input type="tel" placeholder="024XXXXXXX" value={momoNumber} onChange={(e) => setMomoNumber(e.target.value)} required />
            </label>
            <button type="submit" disabled={busy || balance.points < withdrawAmount} className="btn-outline">Request Cash Out</button>
          </form>
        </div>
      </section>

      <section className="transaction-history">
        <h3>Transaction History & Audit Ledger</h3>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Currency</th>
                <th>Amount</th>
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
                    <td><span className={`tx-type ${tx.type}`}>{tx.type}</span></td>
                    <td>{tx.currency}</td>
                    <td className={tx.amount >= 0 ? "positive" : "negative"}>
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
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
          <strong>Compliance & Safe Play Notice:</strong> DAMII operates on skill-based tournament rules and verified Paystack escrow safeguards. All game actions are logged in immutable ledger records.
        </p>
      </div>
      <Footer />
    </main>
  );
}
