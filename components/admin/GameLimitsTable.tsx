"use client";

import { useEffect, useState } from "react";
import {
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Swords,
  Trophy,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import type { GameTypeLimit, Match, Tournament, LedgerEntry } from "@/lib/types";

interface GameLimitsTableProps {
  token: string;
  adminSecret: string;
}

export function GameLimitsTable({ token, adminSecret }: GameLimitsTableProps) {
  const [limits, setLimits] = useState<GameTypeLimit[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingLimit, setEditingLimit] = useState<GameTypeLimit | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"limits" | "matches" | "tournaments" | "ledger">("limits");

  // Edit form state
  const [formData, setFormData] = useState({
    minWager: "1.00",
    maxWager: "1000.00",
    minTournamentPrizePool: "10.00",
    maxTournamentPrizePool: "10000.00",
    platformFeePercent: "0.0500",
  });

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [limitsRes, matchesRes, tourneysRes, ledgerRes] = await Promise.all([
        fetch("/api/admin/game-type-limits"),
        fetch("/api/matches"),
        fetch("/api/tournaments"),
        fetch("/api/ledger?limit=30"),
      ]);

      const limitsData = await limitsRes.json();
      if (limitsData.success) setLimits(limitsData.limits || []);

      const matchesData = await matchesRes.json();
      if (matchesData.success) setMatches(matchesData.matches || []);

      const tourneysData = await tourneysRes.json();
      if (tourneysData.success) setTournaments(tourneysData.tournaments || []);

      const ledgerData = await ledgerRes.json();
      if (ledgerData.success) setLedgerEntries(ledgerData.entries || []);
    } catch (err: any) {
      setError(err.message || "Failed to load game limits & escrow data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (limit: GameTypeLimit) => {
    setEditingLimit(limit);
    setFormData({
      minWager: String(limit.minWager),
      maxWager: String(limit.maxWager),
      minTournamentPrizePool: String(limit.minTournamentPrizePool),
      maxTournamentPrizePool: String(limit.maxTournamentPrizePool),
      platformFeePercent: String(limit.platformFeePercent),
    });
  };

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLimit) return;
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/game-type-limits/${editingLimit.gameType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minWager: Number(formData.minWager),
          maxWager: Number(formData.maxWager),
          minTournamentPrizePool: Number(formData.minTournamentPrizePool),
          maxTournamentPrizePool: Number(formData.maxTournamentPrizePool),
          platformFeePercent: Number(formData.platformFeePercent),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update limit");

      setSuccess(`Limits for '${editingLimit.gameType}' successfully updated.`);
      setEditingLimit(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save limit");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Subtabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1a5e48] pb-4">
        <div>
          <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-[#d6a735]" />
            Game Type Limits & Double-Entry Escrow
          </h3>
          <p className="text-xs text-slate-200 mt-0.5">
            Admin configuration for game-type constraints, real-time match escrow, and ledger audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-xs font-bold text-[#f5efdf] rounded-xl border border-[#1a5e48] flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Subtabs bar */}
      <div className="flex items-center gap-2 border-b border-[#1a5e48] pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("limits")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "limits"
              ? "bg-[#d6a735] text-[#06261f]"
              : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
          }`}
        >
          Game Type Limits ({limits.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("matches")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "matches"
              ? "bg-[#d6a735] text-[#06261f]"
              : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
          }`}
        >
          Wager Matches ({matches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("tournaments")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "tournaments"
              ? "bg-[#d6a735] text-[#06261f]"
              : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
          }`}
        >
          Tournament Escrows ({tournaments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("ledger")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeSubTab === "ledger"
              ? "bg-[#d6a735] text-[#06261f]"
              : "text-slate-200 hover:text-white hover:bg-[#0c3b2e]"
          }`}
        >
          Double-Entry Ledger ({ledgerEntries.length})
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle size={15} /> {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* SUBTAB 1: LIMITS TABLE */}
      {activeSubTab === "limits" && (
        <div className="bg-[#081c15] border border-[#1a5e48] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#1a5e48] bg-[#06261f]/60 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Admin Game-Type Constraints (Creation-Time Rules)
            </h4>
            <span className="text-[11px] text-[#d6a735] font-semibold">
              Platform Fee & Limits Auto-Enforced at API Gateway
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 font-bold bg-[#041d17]">
                  <th className="py-3 px-4">Game Type</th>
                  <th className="py-3 px-4">Min Wager</th>
                  <th className="py-3 px-4">Max Wager</th>
                  <th className="py-3 px-4">Min Prize Pool</th>
                  <th className="py-3 px-4">Max Prize Pool</th>
                  <th className="py-3 px-4">Platform Fee %</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232]">
                {limits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-300 italic">
                      {loading ? "Loading game limits..." : "No game type limits found."}
                    </td>
                  </tr>
                ) : (
                  limits.map((l) => (
                    <tr key={l.id} className="hover:bg-[#0c3b2e]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#d6a735]">
                        {l.gameType}
                      </td>
                      <td className="py-3 px-4 text-[#f8fafc] font-semibold">
                        GHS {Number(l.minWager).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[#f8fafc] font-semibold">
                        GHS {Number(l.maxWager).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[#f8fafc] font-semibold">
                        GHS {Number(l.minTournamentPrizePool).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-[#f8fafc] font-semibold">
                        GHS {Number(l.maxTournamentPrizePool).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-300">
                        {(Number(l.platformFeePercent) * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditClick(l)}
                          className="px-2.5 py-1 bg-[#0c3b2e] hover:bg-[#d6a735] hover:text-[#06261f] text-[#f5efdf] rounded-lg text-xs font-bold border border-[#1a5e48] transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: WAGER MATCHES */}
      {activeSubTab === "matches" && (
        <div className="bg-[#081c15] border border-[#1a5e48] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#1a5e48] bg-[#06261f]/60 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Wager Match Escrow Tracker
            </h4>
            <span className="text-[11px] text-slate-300">
              {matches.length} Total Match Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 font-bold bg-[#041d17]">
                  <th className="py-3 px-4">Match ID</th>
                  <th className="py-3 px-4">Game Type</th>
                  <th className="py-3 px-4">Player A</th>
                  <th className="py-3 px-4">Player B</th>
                  <th className="py-3 px-4">Wager (Each)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Winner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232]">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-300 italic">
                      No wager matches recorded yet.
                    </td>
                  </tr>
                ) : (
                  matches.map((m) => (
                    <tr key={m.id} className="hover:bg-[#0c3b2e]/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#d6a735]">
                        {m.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#f8fafc]">{m.gameType}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-200">{m.playerAId}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-200">{m.playerBId || "Waiting..."}</td>
                      <td className="py-3 px-4 font-bold text-[#d6a735]">
                        GHS {Number(m.wagerAmount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.status === "completed"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : m.status === "in_progress"
                              ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                              : m.status === "open"
                              ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                              : "bg-red-950 text-red-300 border border-red-500/40"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                        {m.winnerId || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: TOURNAMENT ESCROWS */}
      {activeSubTab === "tournaments" && (
        <div className="bg-[#081c15] border border-[#1a5e48] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#1a5e48] bg-[#06261f]/60 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Tournament Prize Escrows
            </h4>
            <span className="text-[11px] text-slate-300">
              {tournaments.length} Registered Tournaments
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 font-bold bg-[#041d17]">
                  <th className="py-3 px-4">Tournament ID</th>
                  <th className="py-3 px-4">Organizer</th>
                  <th className="py-3 px-4">Game Type</th>
                  <th className="py-3 px-4">Entry Fee</th>
                  <th className="py-3 px-4">Prize Pool</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232]">
                {tournaments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-300 italic">
                      No tournament escrows found.
                    </td>
                  </tr>
                ) : (
                  tournaments.map((t) => (
                    <tr key={t.id} className="hover:bg-[#0c3b2e]/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#d6a735]">
                        {t.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-200">{t.organizerId}</td>
                      <td className="py-3 px-4 font-semibold text-[#f8fafc]">{t.gameType}</td>
                      <td className="py-3 px-4 text-slate-200">
                        GHS {Number(t.entryFee).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#d6a735]">
                        GHS {Number(t.totalPrizePool).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.status === "completed"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : t.status === "in_progress"
                              ? "bg-cyan-950 text-cyan-300 border border-cyan-500/40"
                              : t.status === "open"
                              ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                              : "bg-red-950 text-red-300 border border-red-500/40"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 4: DOUBLE-ENTRY LEDGER AUDIT */}
      {activeSubTab === "ledger" && (
        <div className="bg-[#081c15] border border-[#1a5e48] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#1a5e48] bg-[#06261f]/60 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Double-Entry Ledger Audit Log
            </h4>
            <span className="text-[11px] text-[#d6a735] font-semibold">
              Authoritative Financial Journal
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#1a5e48] text-slate-200 font-bold bg-[#041d17]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User ID / Account</th>
                  <th className="py-3 px-4">Account Type</th>
                  <th className="py-3 px-4">Entry Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#114232]">
                {ledgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-300 italic">
                      No ledger postings recorded yet.
                    </td>
                  </tr>
                ) : (
                  ledgerEntries.map((le) => {
                    const amt = Number(le.amount);
                    const isPositive = amt >= 0;
                    return (
                      <tr key={le.id} className="hover:bg-[#0c3b2e]/40 font-mono text-[11px]">
                        <td className="py-3 px-4 text-slate-300">
                          {new Date(le.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#f8fafc]">{le.userId}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              le.accountType === "available"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                                : "bg-purple-950 text-purple-300 border border-purple-500/40"
                            }`}
                          >
                            {le.accountType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-semibold text-cyan-300">{le.entryType}</td>
                        <td
                          className={`py-3 px-4 font-bold ${
                            isPositive ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {isPositive ? `+GHS ${amt.toFixed(2)}` : `-GHS ${Math.abs(amt).toFixed(2)}`}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {le.referenceType}:{le.referenceId.slice(0, 8)}...
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

      {/* EDIT LIMIT MODAL */}
      {editingLimit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#081c15] border border-[#1a5e48] text-[#f5efdf] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a5e48] pb-3">
              <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                <SlidersHorizontal size={16} /> Edit Limits: {editingLimit.gameType}
              </h3>
              <button
                type="button"
                onClick={() => setEditingLimit(null)}
                className="text-slate-200 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLimit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-200 font-semibold mb-1">Min Wager (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    required
                    value={formData.minWager}
                    onChange={(e) => setFormData({ ...formData, minWager: e.target.value })}
                    className="w-full px-3 py-2 bg-[#06261f] border border-[#1a5e48] rounded-xl text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
                <div>
                  <label className="block text-slate-200 font-semibold mb-1">Max Wager (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    required
                    value={formData.maxWager}
                    onChange={(e) => setFormData({ ...formData, maxWager: e.target.value })}
                    className="w-full px-3 py-2 bg-[#06261f] border border-[#1a5e48] rounded-xl text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-200 font-semibold mb-1">Min Prize Pool (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    required
                    value={formData.minTournamentPrizePool}
                    onChange={(e) =>
                      setFormData({ ...formData, minTournamentPrizePool: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#06261f] border border-[#1a5e48] rounded-xl text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
                <div>
                  <label className="block text-slate-200 font-semibold mb-1">Max Prize Pool (GHS)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="10.00"
                    required
                    value={formData.maxTournamentPrizePool}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTournamentPrizePool: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#06261f] border border-[#1a5e48] rounded-xl text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Platform Fee Percent (Decimal e.g. 0.0500 for 5%)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  max="0.5"
                  required
                  value={formData.platformFeePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, platformFeePercent: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#1a5e48] rounded-xl text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="pt-3 border-t border-[#1a5e48] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLimit(null)}
                  className="px-3.5 py-2 bg-[#0c3b2e] text-slate-200 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
