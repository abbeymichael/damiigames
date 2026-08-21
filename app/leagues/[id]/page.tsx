"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import {
  Trophy,
  Users,
  Shield,
  Award,
  CheckCircle,
  Lock,
  Clock,
  ArrowLeft,
  Crown,
  Play,
  Settings,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  Flame,
  UserCheck,
  UserX,
  Grid,
  GitBranch,
  Calendar,
  Zap,
  Swords,
  Eye,
  Hourglass,
} from "lucide-react";
import type { League, LeagueMatch, LeagueParticipant, TournamentFormat } from "@/lib/types";
import { BracketTreeView } from "@/components/BracketTreeView";
import { CountdownTimer } from "@/components/CountdownTimer";

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leagueId = params?.id as string;

  const [league, setLeague] = useState<League | null>(null);
  const [participants, setParticipants] = useState<LeagueParticipant[]>([]);
  const [matches, setMatches] = useState<LeagueMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("user");

  const [activeTab, setActiveTab] = useState<"bracket" | "fixtures" | "roster" | "rules">("bracket");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Private invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Match Scoring Modal for Facilitator/Admin
  const [selectedMatchForScore, setSelectedMatchForScore] = useState<LeagueMatch | null>(null);
  const [scoringWinnerToken, setSelectedScoringWinnerToken] = useState<string | "draw">("");
  const [scoringDisputeNotes, setScoringDisputeNotes] = useState("");

  useEffect(() => {
    const syncAuth = () => {
      const savedToken = localStorage.getItem("damii-player-token") || "";
      const savedName = localStorage.getItem("damii-player-name") || "";
      setToken(savedToken);
      setUsername(savedName);

      const authUser = localStorage.getItem("damii-auth-user");
      if (authUser) {
        try {
          const parsed = JSON.parse(authUser);
          if (parsed.role) setUserRole(parsed.role);
        } catch {
          /* ignore */
        }
      }
    };

    syncAuth();
    if (leagueId) {
      loadDetails();
    }

    window.addEventListener("damii-auth-changed", syncAuth);
    return () => window.removeEventListener("damii-auth-changed", syncAuth);
  }, [leagueId]);

  async function loadDetails() {
    setLoading(true);
    try {
      const res = await fetch(`/api/league?id=${encodeURIComponent(leagueId)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Tournament not found");
      } else {
        setLeague(data.league);
        setParticipants(data.participants || []);
        setMatches(data.matches || []);
      }
    } catch {
      setError("Failed to load tournament details.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinLeague(codeToSubmit?: string) {
    if (!token) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      setError("Please sign in or register to join this tournament.");
      return;
    }

    if (league?.isPrivate && !codeToSubmit && !inviteCodeInput) {
      setShowInviteModal(true);
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          token,
          leagueId,
          inviteCode: codeToSubmit || inviteCodeInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to join tournament");
      }

      if (data.status === "pending") {
        setSuccess("Application submitted! Awaiting organizer approval.");
      } else {
        setSuccess("Successfully registered for this tournament!");
      }

      setShowInviteModal(false);
      loadDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleCheckIn() {
    if (!token || !leagueId) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", token, leagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      setSuccess(data.participant?.checkedIn ? "Player check-in confirmed!" : "Check-in status updated.");
      loadDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in error");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartMatchRoom(matchId: string) {
    if (!token) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_match_room", token, matchId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to start match arena");
      router.push(`/arena?code=${data.roomCode}&mode=league`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match room launch failed");
      setBusy(false);
    }
  }

  async function handleSubmitMatchScore(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatchForScore || !scoringWinnerToken) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "result",
          token,
          matchId: selectedMatchForScore.id,
          winnerToken: scoringWinnerToken,
          disputeNotes: scoringDisputeNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Result submission failed");
      setSuccess("Match result verified and bracket updated successfully!");
      setSelectedMatchForScore(null);
      loadDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Score submission failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleForceGenerateBracket() {
    if (!token || !leagueId) return;
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_bracket", token, leagueId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Bracket generation failed");
      setSuccess("Tournament bracket generated and active rounds launched!");
      loadDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bracket generation error");
    } finally {
      setBusy(false);
    }
  }

  const isFacilitator =
    Boolean(league && league.facilitatorToken === token) ||
    userRole === "admin" ||
    userRole === "super_admin" ||
    userRole === "organizer" ||
    userRole === "facilitator";

  const userParticipant = participants.find((p) => p.userToken === token);
  const approvedParticipants = participants.filter((p) => p.status === "approved" || !p.status);
  const pendingParticipants = participants.filter((p) => p.status === "pending");

  const myUpcomingMatch = matches.find(
    (m) =>
      Boolean(token && (m.player1Token === token || m.player2Token === token)) &&
      (m.status === "pending" || m.status === "in_progress")
  );

  const fixtureRounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  const getRoundTitle = (round: number, totalRounds: number) => {
    if (round === totalRounds) return "🏆 Championship Final";
    if (round === totalRounds - 1 && totalRounds >= 2) return "Semifinals";
    if (round === totalRounds - 2 && totalRounds >= 3) return "Quarterfinals";
    return `Round / Cycle ${round}`;
  };

  const entryFeeMarbles = league?.entryFeeMarbles || league?.entryFeePoints || 0;
  const prizePoolMarbles = league?.prizePoolPoints || 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#081c15] text-[#f5efdf] flex flex-col">
        <SharedHeader />
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <RefreshCw size={36} className="text-[#d6a735] animate-spin mb-4" />
          <p className="text-slate-300 text-sm font-semibold">Loading tournament details and bracket...</p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!league) {
    return (
      <main className="min-h-screen bg-[#081c15] text-[#f5efdf] flex flex-col">
        <SharedHeader />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle size={48} className="text-red-400 mx-auto" />
          <h1 className="text-xl sm:text-2xl font-black text-[#f5efdf]">Tournament Not Found</h1>
          <p className="text-slate-400 text-sm">The tournament you requested does not exist or has been removed.</p>
          <Link
            href="/leagues"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#d6a735] text-[#06261f] font-bold rounded-xl hover:bg-[#b88c24] transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Tournaments
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#081c15] text-[#f5efdf] flex flex-col">
      <SharedHeader />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/leagues"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#d6a735] transition-colors bg-[#06261f] border border-[#184d3c] px-3.5 py-1.5 rounded-xl shadow"
          >
            <ArrowLeft size={14} /> Back to All Tournaments
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDetails}
              className="p-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 hover:text-[#f5efdf] rounded-xl border border-[#184d3c] transition-colors"
              title="Refresh tournament details"
            >
              <RefreshCw size={14} />
            </button>
            {isFacilitator && (
              <Link
                href="/organizer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold text-xs rounded-xl border border-[#d6a735]/40 transition-colors"
              >
                <Settings size={14} /> Organizer Portal
              </Link>
            )}
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-4 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-between text-xs text-red-200 shadow-lg">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-red-300 hover:text-white font-bold ml-4">
              ✕
            </button>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-2xl flex items-center justify-between text-xs text-emerald-200 shadow-lg">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess("")} className="text-emerald-300 hover:text-white font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Hero Header Card */}
        <section className="p-6 sm:p-8 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              {/* Badges Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                {league.status === "registration" ? (
                  <span className="px-3 py-1 bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Registration Open
                  </span>
                ) : league.status === "active" ? (
                  <span className="px-3 py-1 bg-amber-950/90 text-amber-300 border border-amber-500/50 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                    In Progress • Live Rounds
                  </span>
                ) : league.status === "completed" ? (
                  <span className="px-3 py-1 bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/50 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <Crown size={13} />
                    Tournament Completed
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-900 text-slate-400 border border-slate-700 rounded-full text-xs font-bold uppercase">
                    {league.status}
                  </span>
                )}

                <span className="px-3 py-1 bg-[#081c15] text-[#d6a735] border border-[#184d3c] rounded-full text-xs font-mono font-bold capitalize">
                  {league.format?.replace("_", " ") || "Single Elimination"}
                </span>

                {league.isPrivate && (
                  <span className="px-3 py-1 bg-[#081c15] text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold flex items-center gap-1">
                    <Lock size={12} /> Private Invitational
                  </span>
                )}
              </div>

              {/* Tournament Title */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#f5efdf] tracking-tight">
                {league.title}
              </h1>

              {/* Sub-meta */}
              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Shield size={14} className="text-[#d6a735]" /> Organized by{" "}
                  <strong className="text-[#f5efdf]">{league.facilitatorName}</strong>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {league.scheduleDate || "Saturdays & Sundays"} @ {league.scheduleTime || "18:00 GMT"}
                </span>
                <span>•</span>
                <span className="text-[#d6a735] font-mono font-bold">
                  {league.turnTimerSeconds || 60}s Move Clock
                </span>
              </div>

              {league.description && (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl pt-1">
                  {league.description}
                </p>
              )}
            </div>

            {/* Action CTA Block */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[220px] justify-center shrink-0">
              {userParticipant && (
                <div className="p-3 bg-[#081c15] border border-[#184d3c] rounded-2xl text-center space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-center gap-1">
                    <CheckCircle size={14} className="text-emerald-400" /> Registered Participant
                  </div>
                  <button
                    disabled={busy}
                    onClick={handleToggleCheckIn}
                    className={`w-full py-2 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                      userParticipant.checkedIn
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-600"
                        : "bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f]"
                    }`}
                  >
                    <CheckCircle size={14} />
                    {userParticipant.checkedIn ? "Checked In (Ready)" : "Click to Check In"}
                  </button>
                </div>
              )}

              {league.status === "registration" && !userParticipant && (
                <button
                  disabled={busy || approvedParticipants.length >= league.maxParticipants}
                  onClick={() => handleJoinLeague()}
                  className="py-3 px-6 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Trophy size={16} />
                  {league.requiresApproval ? "Apply to Join" : "Register Now"}
                  {entryFeeMarbles > 0 ? ` (${entryFeeMarbles.toLocaleString()} Marbles)` : " (Free Entry)"}
                </button>
              )}

              {league.status === "completed" && league.winnerName && (
                <div className="p-4 bg-[#081c15] border border-[#d6a735]/40 rounded-2xl text-center space-y-1 shadow-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Tournament Champion
                  </span>
                  <div className="text-sm font-black text-[#d6a735] flex items-center justify-center gap-1.5">
                    <Crown size={16} className="text-[#d6a735]" /> {league.winnerName}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#184d3c]">
            {/* Prize Pool */}
            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Prize Pool
              </small>
              <strong className="text-sm sm:text-base font-black text-[#d6a735] font-mono block mt-0.5">
                {prizePoolMarbles > 0 ? `${prizePoolMarbles.toLocaleString()} Marbles` : "Trophy & Accolades"}
              </strong>
            </div>

            {/* Entry Fee */}
            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Entry Fee
              </small>
              <strong className="text-sm sm:text-base font-black text-[#f5efdf] font-mono block mt-0.5">
                {entryFeeMarbles > 0 ? `${entryFeeMarbles.toLocaleString()} Marbles` : "Free Entry"}
              </strong>
            </div>

            {/* Participants */}
            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Players Registered
              </small>
              <strong className="text-sm sm:text-base font-black text-[#f5efdf] font-mono block mt-0.5">
                {approvedParticipants.length} / {league.maxParticipants}
              </strong>
            </div>

            {/* Format */}
            <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl">
              <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Bracket Format
              </small>
              <strong className="text-sm sm:text-base font-black text-slate-200 capitalize block mt-0.5">
                {league.format?.replace("_", " ") || "Single Elimination"}
              </strong>
            </div>
          </div>

          {/* Facilitator Private Code Banner */}
          {isFacilitator && league.isPrivate && league.inviteCode && (
            <div className="p-3.5 bg-[#081c15] border border-[#d6a735]/40 rounded-2xl flex items-center justify-between text-xs text-[#f5efdf] flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Lock size={14} className="text-[#d6a735]" /> Private Invitation Code:{" "}
                <strong className="font-mono text-[#d6a735] bg-[#06261f] px-2.5 py-1 rounded-lg border border-[#184d3c] text-sm">
                  {league.inviteCode}
                </strong>
              </span>
              <button
                className="px-3 py-1.5 bg-[#d6a735] text-[#06261f] rounded-xl font-bold hover:bg-[#b88c24] transition-colors flex items-center gap-1.5 text-xs shadow"
                onClick={() => {
                  navigator.clipboard.writeText(league.inviteCode || "");
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
              >
                {copiedCode ? <Check size={12} /> : <Copy size={12} />} Copy Invite Code
              </button>
            </div>
          )}

          {/* Facilitator Action Bar */}
          {isFacilitator && league.status === "registration" && (
            <div className="p-4 bg-[#081c15] border border-[#184d3c] rounded-2xl flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} /> Facilitator Bracket Generation
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generate tournament match pairings and advance to the active tournament stage.
                </p>
              </div>
              <button
                disabled={busy || approvedParticipants.length < (league.minParticipants || 2)}
                onClick={handleForceGenerateBracket}
                className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-black rounded-xl transition-all shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles size={14} /> Launch Active Bracket
              </button>
            </div>
          )}
        </section>

        {/* LOGGED IN PLAYER PERSONAL UPCOMING MATCH HERO & COUNTDOWN */}
        {myUpcomingMatch && (
          <section className="p-5 sm:p-6 bg-gradient-to-r from-[#06261f] via-[#0c3b2e] to-[#06261f] border-2 border-[#d6a735] rounded-3xl shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-[#d6a735] text-[#06261f] text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                    <Swords size={12} /> Your Active Match
                  </span>
                  <span className="text-xs font-mono font-bold text-[#d6a735]">
                    Round {myUpcomingMatch.round} • Match #{myUpcomingMatch.matchNumber}
                  </span>
                  {myUpcomingMatch.status === "in_progress" ? (
                    <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-400 text-amber-300 text-[10px] font-black uppercase rounded-full flex items-center gap-1 animate-pulse">
                      <Zap size={11} /> Live Now
                    </span>
                  ) : myUpcomingMatch.scheduledTime ? (
                    <CountdownTimer targetIso={myUpcomingMatch.scheduledTime} />
                  ) : (
                    <span className="text-xs text-slate-400">Scheduled</span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-[#f5efdf] flex items-center gap-2 flex-wrap">
                  <span>
                    {myUpcomingMatch.player1Token === token
                      ? `You (${myUpcomingMatch.player1Name}) vs ${myUpcomingMatch.player2Name || "TBD"}`
                      : `${myUpcomingMatch.player1Name || "TBD"} vs You (${myUpcomingMatch.player2Name})`}
                  </span>
                </h3>

                {myUpcomingMatch.scheduledTime && (
                  <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                    <Calendar size={13} className="text-[#d6a735]" />
                    <span>Scheduled for:</span>
                    <strong className="text-[#f5efdf]">
                      {new Date(myUpcomingMatch.scheduledTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(myUpcomingMatch.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleStartMatchRoom(myUpcomingMatch.id)}
                  className="w-full sm:w-auto px-6 py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black text-xs sm:text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Play size={16} className="fill-current" />
                  Enter Match Board Ahead of Time
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#184d3c] gap-2 sm:gap-4 text-xs sm:text-sm font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab("bracket")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "bracket"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-400 hover:text-[#f5efdf]"
            }`}
          >
            <GitBranch size={16} /> Tournament Bracket ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab("fixtures")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "fixtures"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-400 hover:text-[#f5efdf]"
            }`}
          >
            <Calendar size={16} /> Fixtures &amp; Schedule ({fixtureRounds.length} Cycles)
          </button>
          <button
            onClick={() => setActiveTab("roster")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "roster"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-400 hover:text-[#f5efdf]"
            }`}
          >
            <Users size={16} /> Players &amp; Standings ({approvedParticipants.length})
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === "rules"
                ? "border-[#d6a735] text-[#d6a735]"
                : "border-transparent text-slate-400 hover:text-[#f5efdf]"
            }`}
          >
            <Shield size={16} /> Rules &amp; Prizes
          </button>
        </div>

        {/* TAB CONTENT */}
        {activeTab === "bracket" && (
          <section className="space-y-4">
            <BracketTreeView
              matches={matches}
              participants={participants}
              format={league.format}
              userToken={token}
              isFacilitator={isFacilitator}
              onStartMatch={handleStartMatchRoom}
              onSetScore={(match) => {
                setSelectedMatchForScore(match);
                setSelectedScoringWinnerToken(match.player1Token || "");
              }}
              title={league.title}
            />
          </section>
        )}

        {activeTab === "fixtures" && (
          <section className="space-y-6">
            {matches.length === 0 ? (
              <div className="p-12 text-center text-slate-300 italic bg-[#06261f] rounded-3xl border border-[#184d3c] space-y-3">
                <Calendar size={36} className="mx-auto text-[#d6a735] animate-pulse" />
                <p className="text-sm font-bold text-[#f5efdf]">Fixtures have not been scheduled yet.</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  The tournament organizer will generate and schedule the fixtures once registrations close.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {fixtureRounds.map((roundNum) => {
                  const roundMatches = matches.filter((m) => m.round === roundNum);
                  const firstScheduledMatch = roundMatches.find((m) => m.scheduledTime);

                  return (
                    <div key={`cycle-${roundNum}`} className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl space-y-4 shadow-xl">
                      {/* Cycle Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#184d3c]">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-[#0c3b2e] border border-[#d6a735]/40 text-[#d6a735] font-black text-sm flex items-center justify-center">
                            R{roundNum}
                          </span>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-[#f5efdf]">
                              {getRoundTitle(roundNum, fixtureRounds.length)}
                            </h3>
                            <span className="text-xs text-slate-400">
                              {roundMatches.length} {roundMatches.length === 1 ? "Match Fixture" : "Match Fixtures"}
                            </span>
                          </div>
                        </div>

                        {firstScheduledMatch?.scheduledTime && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5 bg-[#081c15] px-3 py-1.5 rounded-xl border border-[#184d3c]">
                              <Calendar size={13} className="text-[#d6a735]" />
                              {new Date(firstScheduledMatch.scheduledTime).toLocaleDateString([], { month: "short", day: "numeric" })} • {new Date(firstScheduledMatch.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <CountdownTimer targetIso={firstScheduledMatch.scheduledTime} />
                          </div>
                        )}
                      </div>

                      {/* Matches in Cycle */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roundMatches.map((match) => {
                          const isP1User = Boolean(token && match.player1Token === token);
                          const isP2User = Boolean(token && match.player2Token === token);
                          const isP1Winner = Boolean(match.winnerToken && match.winnerToken === match.player1Token);
                          const isP2Winner = Boolean(match.winnerToken && match.winnerToken === match.player2Token);
                          const isUserInMatch = isP1User || isP2User;

                          return (
                            <div
                              key={match.id}
                              className={`p-4 rounded-2xl border transition-all space-y-3.5 ${
                                isUserInMatch
                                  ? "bg-[#0c3b2e] border-[#d6a735] shadow-lg ring-1 ring-[#d6a735]/40"
                                  : "bg-[#081c15] border-[#184d3c] hover:border-[#d6a735]/40"
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#184d3c]">
                                <span className="font-mono text-[#d6a735] font-bold">Match #{match.matchNumber}</span>
                                <div className="flex items-center gap-2">
                                  {match.scheduledTime && match.status !== "completed" && (
                                    <CountdownTimer targetIso={match.scheduledTime} compact />
                                  )}
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      match.status === "completed"
                                        ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                        : match.status === "in_progress"
                                        ? "bg-amber-950 text-amber-300 border border-amber-600 animate-pulse"
                                        : "bg-[#06261f] text-slate-400 border border-[#184d3c]"
                                    }`}
                                  >
                                    {match.status.replace("_", " ")}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2 text-xs">
                                {/* Player 1 */}
                                <div
                                  className={`p-2.5 rounded-xl font-bold flex items-center justify-between ${
                                    isP1Winner
                                      ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50"
                                      : isP1User
                                      ? "bg-[#06261f] text-[#d6a735] border border-[#d6a735]/40"
                                      : "bg-[#06261f] text-[#f5efdf]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Shield size={14} className={match.player1Token ? "text-[#d6a735]" : "text-slate-500"} />
                                    <span className="truncate">{match.player1Name || "TBD (Waiting for winner)"}</span>
                                    {isP1User && (
                                      <span className="text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1.5 py-0.2 rounded-full">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  {isP1Winner && <Crown size={14} className="text-[#d6a735] shrink-0" />}
                                </div>

                                <div className="text-center font-mono text-[10px] text-slate-400">VS</div>

                                {/* Player 2 */}
                                <div
                                  className={`p-2.5 rounded-xl font-bold flex items-center justify-between ${
                                    isP2Winner
                                      ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50"
                                      : isP2User
                                      ? "bg-[#06261f] text-[#d6a735] border border-[#d6a735]/40"
                                      : "bg-[#06261f] text-[#f5efdf]"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <Shield size={14} className={match.player2Token ? "text-[#d6a735]" : "text-slate-500"} />
                                    <span className="truncate">{match.player2Name || "TBD (Waiting for winner)"}</span>
                                    {isP2User && (
                                      <span className="text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1.5 py-0.2 rounded-full">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  {isP2Winner && <Crown size={14} className="text-[#d6a735] shrink-0" />}
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="flex items-center justify-between pt-2 border-t border-[#184d3c] text-xs">
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {match.scheduledTime ? (
                                    <span className="flex items-center gap-1">
                                      <Clock size={11} className="text-[#d6a735]" />
                                      {new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span>Time TBD</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {isUserInMatch && match.status !== "completed" && (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleStartMatchRoom(match.id)}
                                      className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg text-xs flex items-center gap-1 transition-all shadow"
                                    >
                                      <Play size={12} className="fill-current" /> Enter Match Arena
                                    </button>
                                  )}

                                  {match.roomCode && (
                                    <a
                                      href={`/arena?code=${match.roomCode}&mode=league&spectate=1`}
                                      className="px-3 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] text-[#d6a735] font-bold rounded-lg border border-[#d6a735]/40 text-xs flex items-center gap-1 transition-colors"
                                    >
                                      <Eye size={12} /> Watch Live
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "roster" && (
          <section className="space-y-6">
            {/* Round Robin / Swiss Standings Table */}
            {(league.format === "round_robin" || league.format === "swiss") && (
              <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp size={16} /> League Standings &amp; Points Table
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Win = 3 pts • Draw = 1 pt</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#184d3c] text-slate-400 font-semibold uppercase">
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Player</th>
                        <th className="py-2.5 px-3 text-center">Played</th>
                        <th className="py-2.5 px-3 text-center">Wins</th>
                        <th className="py-2.5 px-3 text-center">Draws</th>
                        <th className="py-2.5 px-3 text-center">Losses</th>
                        <th className="py-2.5 px-3 text-right font-mono text-[#d6a735]">Total Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#184d3c] font-mono">
                      {[...approvedParticipants]
                        .sort((a, b) => (b.pointsScore || 0) - (a.pointsScore || 0))
                        .map((p, idx) => (
                          <tr key={p.id} className="hover:bg-[#0c3b2e]/50 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-[#d6a735]">#{idx + 1}</td>
                            <td className="py-2.5 px-3 font-sans font-bold text-[#f5efdf]">{p.username}</td>
                            <td className="py-2.5 px-3 text-center text-[#f5efdf]">
                              {(p.winsCount || 0) + (p.drawsCount || 0) + (p.lossesCount || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{p.winsCount || 0}</td>
                            <td className="py-2.5 px-3 text-center text-sky-400">{p.drawsCount || 0}</td>
                            <td className="py-2.5 px-3 text-center text-red-400">{p.lossesCount || 0}</td>
                            <td className="py-2.5 px-3 text-right font-black text-[#d6a735] text-sm">
                              {p.pointsScore || 0}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Player Roster Grid */}
            <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-[#d6a735]" /> Registered Player Roster ({approvedParticipants.length})
                </h3>
              </div>

              {approvedParticipants.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic bg-[#081c15] rounded-2xl border border-[#184d3c]">
                  No players registered yet. Be the first to join!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {approvedParticipants.map((p, idx) => {
                    const isCurrentUser = p.userToken === token;

                    return (
                      <div
                        key={p.id}
                        className={`p-3.5 bg-[#081c15] border rounded-2xl space-y-2 flex flex-col justify-between ${
                          isCurrentUser
                            ? "border-[#d6a735] bg-[#0c3b2e]/60 ring-1 ring-[#d6a735]/40"
                            : "border-[#184d3c]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-7 w-7 rounded-full bg-[#06261f] border border-[#184d3c] text-[#d6a735] font-black text-xs flex items-center justify-center shrink-0">
                              {p.seed || idx + 1}
                            </span>
                            <strong className="text-xs sm:text-sm text-[#f5efdf] truncate">{p.username}</strong>
                          </div>
                          {p.checkedIn && (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-600 rounded-full font-bold">
                              ✓ Checked In
                            </span>
                          )}
                        </div>

                        {league.format === "round_robin" && (
                          <div className="flex items-center justify-between pt-2 border-t border-[#184d3c] text-[11px]">
                            <span className="text-slate-400">Score:</span>
                            <span className="font-mono text-[#d6a735] font-bold">{p.pointsScore || 0} pts</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "rules" && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rules and Guidelines */}
            <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
                <Shield size={16} /> Tournament Rules &amp; Regulations
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                <li>Standard 10x10 Damii rules apply with compulsory multi-hop captures.</li>
                <li>Flying kings can move and capture across open diagonal paths.</li>
                <li>Turn clock is set to <strong>{league.turnTimerSeconds || 60} seconds</strong> per move.</li>
                <li>Players who disconnect have a 45-second grace window to reconnect before forfeit.</li>
                <li>Disputes can be submitted to tournament referees and administrators for arbitration.</li>
              </ul>
              {league.rulesNotes && (
                <div className="pt-3 border-t border-[#184d3c]">
                  <small className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Special Organizer Notes:
                  </small>
                  <p className="text-xs text-slate-300 bg-[#081c15] p-3 rounded-xl border border-[#184d3c]">
                    {league.rulesNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Prize Breakdown */}
            <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
                <Trophy size={16} /> Prize Distribution
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#081c15] border border-[#d6a735]/40 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🥇</span>
                    <div>
                      <strong className="text-xs text-[#f5efdf] block">1st Place (Champion)</strong>
                      <small className="text-[10px] text-slate-400">
                        {league.prizeDistribution?.first || 60}% of pool
                      </small>
                    </div>
                  </div>
                  <strong className="text-sm font-black text-[#d6a735] font-mono">
                    {prizePoolMarbles > 0
                      ? `${Math.round(prizePoolMarbles * ((league.prizeDistribution?.first || 60) / 100)).toLocaleString()} Marbles`
                      : "Gold Trophy"}
                  </strong>
                </div>

                <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🥈</span>
                    <div>
                      <strong className="text-xs text-[#f5efdf] block">2nd Place (Runner-up)</strong>
                      <small className="text-[10px] text-slate-400">
                        {league.prizeDistribution?.second || 30}% of pool
                      </small>
                    </div>
                  </div>
                  <strong className="text-sm font-black text-slate-300 font-mono">
                    {prizePoolMarbles > 0
                      ? `${Math.round(prizePoolMarbles * ((league.prizeDistribution?.second || 30) / 100)).toLocaleString()} Marbles`
                      : "Silver Medal"}
                  </strong>
                </div>

                <div className="p-3.5 bg-[#081c15] border border-[#184d3c] rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">🥉</span>
                    <div>
                      <strong className="text-xs text-[#f5efdf] block">3rd Place (Podium)</strong>
                      <small className="text-[10px] text-slate-400">
                        {league.prizeDistribution?.third || 10}% of pool
                      </small>
                    </div>
                  </div>
                  <strong className="text-sm font-black text-amber-600 font-mono">
                    {prizePoolMarbles > 0
                      ? `${Math.round(prizePoolMarbles * ((league.prizeDistribution?.third || 10) / 100)).toLocaleString()} Marbles`
                      : "Bronze Medal"}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Private Tournament Invitation Code Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#081c15] border border-[#184d3c] p-6 rounded-3xl max-w-md w-full text-[#f5efdf] shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#d6a735] flex items-center gap-2">
              <Lock size={18} /> Private Tournament Invitation
            </h3>
            <p className="text-xs text-slate-300">
              This tournament is private. Please enter the invitation code provided by the organizer to register.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleJoinLeague(inviteCodeInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Invitation Code</label>
                <input
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 bg-[#06261f] border border-[#184d3c] rounded-xl font-mono uppercase tracking-widest text-center text-lg text-[#d6a735]"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DAMII2026"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl transition-colors"
                >
                  Verify &amp; Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Facilitator Score Override Modal */}
      {selectedMatchForScore && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#081c15] border border-[#184d3c] p-6 rounded-3xl max-w-md w-full text-[#f5efdf] shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
              <Award size={18} /> Facilitator Match Result Verification
            </h3>
            <p className="text-xs text-slate-300">
              Select the match winner to update bracket progress and advance players to the next round.
            </p>

            <form onSubmit={handleSubmitMatchScore} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">Select Winner</label>
                <div className="space-y-2">
                  {selectedMatchForScore.player1Token && (
                    <label className="flex items-center gap-2.5 p-3 bg-[#06261f] border border-[#184d3c] rounded-xl cursor-pointer hover:border-[#d6a735]/50">
                      <input
                        type="radio"
                        name="scoringWinner"
                        value={selectedMatchForScore.player1Token}
                        checked={scoringWinnerToken === selectedMatchForScore.player1Token}
                        onChange={(e) => setSelectedScoringWinnerToken(e.target.value)}
                      />
                      <span className="text-xs font-bold text-[#f5efdf]">
                        {selectedMatchForScore.player1Name} (Win)
                      </span>
                    </label>
                  )}

                  {selectedMatchForScore.player2Token && (
                    <label className="flex items-center gap-2.5 p-3 bg-[#06261f] border border-[#184d3c] rounded-xl cursor-pointer hover:border-[#d6a735]/50">
                      <input
                        type="radio"
                        name="scoringWinner"
                        value={selectedMatchForScore.player2Token}
                        checked={scoringWinnerToken === selectedMatchForScore.player2Token}
                        onChange={(e) => setSelectedScoringWinnerToken(e.target.value)}
                      />
                      <span className="text-xs font-bold text-[#f5efdf]">
                        {selectedMatchForScore.player2Name} (Win)
                      </span>
                    </label>
                  )}

                  <label className="flex items-center gap-2.5 p-3 bg-[#06261f] border border-[#184d3c] rounded-xl cursor-pointer hover:border-[#d6a735]/50">
                    <input
                      type="radio"
                      name="scoringWinner"
                      value="draw"
                      checked={scoringWinnerToken === "draw"}
                      onChange={(e) => setSelectedScoringWinnerToken(e.target.value)}
                    />
                    <span className="text-xs font-bold text-sky-400">Match Draw (Round Robin Only)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Audit Notes / Reason (Optional)
                </label>
                <input
                  type="text"
                  value={scoringDisputeNotes}
                  onChange={(e) => setScoringDisputeNotes(e.target.value)}
                  placeholder="e.g. Verified by referee / Forfeit"
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#184d3c] rounded-xl text-xs text-[#f5efdf]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMatchForScore(null)}
                  className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl transition-colors"
                >
                  Confirm Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
