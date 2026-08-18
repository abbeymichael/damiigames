"use client";

import { useEffect, useState } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import {
  Trophy,
  Plus,
  Users,
  Shield,
  Award,
  CheckCircle,
  Lock,
  Calendar,
  Clock,
  Eye,
  UserCheck,
  UserX,
  Copy,
  Check,
  Play,
  Settings,
  Grid,
  TrendingUp,
  Sliders,
  Sparkles,
  HelpCircle,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import type { League, LeagueMatch, LeagueParticipant, TournamentFormat } from "@/lib/types";
import { BracketTreeView } from "@/components/BracketTreeView";

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [activeLeagueDetails, setActiveLeagueDetails] = useState<{
    league: League;
    participants: LeagueParticipant[];
    matches: LeagueMatch[];
  } | null>(null);

  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [joiningLeagueId, setJoiningLeagueId] = useState<string | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryFee, setEntryFee] = useState(50);
  const [prizePool, setPrizePool] = useState(5000);
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [format, setFormat] = useState<TournamentFormat>("single_elimination");
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("Saturdays & Sundays");
  const [scheduleTime, setScheduleTime] = useState("18:00 GMT");
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(60);
  const [rulesNotes, setRulesNotes] = useState("");

  // Quick Match Score Modal
  const [selectedMatchForScore, setSelectedMatchForScore] = useState<LeagueMatch | null>(null);
  const [scoringWinnerToken, setSelectedScoringWinnerToken] = useState<string | "draw">("");
  const [scoringDisputeNotes, setScoringDisputeNotes] = useState("");

  useEffect(() => {
    const syncLeagueAuth = () => {
      const saved = localStorage.getItem("damii-player-token");
      setToken(saved || "");
      setUsername(localStorage.getItem("damii-player-name") || "");

      const authUser = localStorage.getItem("damii-auth-user");
      if (authUser) {
        try {
          const parsed = JSON.parse(authUser);
          if (parsed.role) setUserRole(parsed.role);
        } catch {
          /* silent */
        }
      }
    };

    syncLeagueAuth();
    loadLeagues();

    window.addEventListener("damii-auth-changed", syncLeagueAuth);
    return () => window.removeEventListener("damii-auth-changed", syncLeagueAuth);
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      loadLeagueDetails(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  async function loadLeagues() {
    try {
      const res = await fetch("/api/league");
      const data = await res.json();
      if (data.leagues) {
        setLeagues(data.leagues);
        if (data.leagues.length > 0 && !selectedLeagueId) {
          setSelectedLeagueId(data.leagues[0].id);
        }
      }
    } catch {
      // Retain
    }
  }

  async function loadLeagueDetails(id: string) {
    try {
      const res = await fetch(`/api/league?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.league) {
        setActiveLeagueDetails(data);
      }
    } catch {
      // Retain
    }
  }

  async function handleCreateLeague(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!token) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      setError("Authentication Required: Please sign in or register to host a tournament.");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          token,
          facilitatorName: username,
          title,
          description,
          entryFeePoints: entryFee,
          prizePoolPoints: prizePool,
          maxParticipants,
          format,
          isPrivate,
          inviteCode: isPrivate ? inviteCode : undefined,
          requiresApproval,
          scheduleDate,
          scheduleTime,
          gameDays: `Match Days: ${scheduleDate} @ ${scheduleTime}`,
          turnTimerSeconds,
          rulesNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create league");
      setSuccess(`Tournament "${data.league.title}" created successfully!`);
      setShowCreateModal(false);
      loadLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setBusy(false);
    }
  }

  async function initiateJoinLeague(league: League) {
    if (!token) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      setError("Authentication Required: Please sign in or register to join a tournament.");
      return;
    }
    if (league.isPrivate) {
      setJoiningLeagueId(league.id);
      setInviteCodeInput("");
      setShowInviteModal(true);
    } else {
      await handleJoinLeague(league.id);
    }
  }

  async function handleJoinLeague(leagueId: string, codeToSubmit?: string) {
    if (!token) {
      window.dispatchEvent(new CustomEvent("damii-open-auth"));
      setError("Authentication Required: Please sign in or register for a tournament.");
      return;
    }
    setBusy(true); setError(""); setSuccess("");
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
      if (!res.ok) throw new Error(data.error || "Failed to join tournament");

      if (data.status === "pending") {
        setSuccess("Application submitted! Awaiting facilitator approval.");
      } else {
        setSuccess("Successfully registered for the tournament!");
      }

      setShowInviteModal(false);
      loadLeagueDetails(leagueId);
      loadLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleCheckIn() {
    if (!selectedLeagueId) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", token, leagueId: selectedLeagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Check-in failed");
      setSuccess(data.participant.checkedIn ? "Player check-in confirmed!" : "Check-in status updated.");
      loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in error");
    } finally {
      setBusy(false);
    }
  }

  async function handleApproveParticipant(participantId: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", token, participantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      setSuccess("Participant approved successfully!");
      if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  async function handleRejectParticipant(participantId: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", token, participantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");
      setSuccess("Participant application rejected & fee refunded.");
      if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setBusy(false);
    }
  }

  async function handleStartMatchRoom(matchId: string) {
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_match_room", token, matchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start match arena");
      window.location.href = `/arena?code=${data.roomCode}&mode=league`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match room launch failed");
      setBusy(false);
    }
  }

  async function handleSubmitMatchScore(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatchForScore || !scoringWinnerToken) return;
    setBusy(true); setError(""); setSuccess("");
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
      if (!res.ok) throw new Error(data.error || "Result submission failed");
      setSuccess("Match result verified and bracket updated successfully!");
      setSelectedMatchForScore(null);
      if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Score submission failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleForceGenerateBracket() {
    if (!selectedLeagueId) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_bracket", token, leagueId: selectedLeagueId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bracket generation failed");
      setSuccess("Tournament bracket & match pairings generated successfully!");
      loadLeagueDetails(selectedLeagueId);
      loadLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bracket generation error");
    } finally {
      setBusy(false);
    }
  }

  const isFacilitator =
    activeLeagueDetails?.league.facilitatorToken === token ||
    userRole === "admin" ||
    userRole === "super_admin" ||
    userRole === "organizer" ||
    userRole === "facilitator";
  const userParticipant = activeLeagueDetails?.participants.find((p) => p.userToken === token);

  return (
    <main className="app-shell">
      <SharedHeader />

      <section className="league-page-header">
        <div>
          <span className="eyebrow"><Trophy size={16} /> DAMII TOURNAMENT & LEAGUE ENGINE</span>
          <h1>Professional Tournament Hub</h1>
          <p>Compete in Single Elimination, Double Elimination, Round Robin, or Swiss brackets. Earn prize pools, national rating points, and trophy accolades.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs flex items-center gap-1.5" onClick={() => loadLeagues()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              if (!token) {
                window.dispatchEvent(new CustomEvent("damii-open-auth"));
                setError("Authentication Required: Please sign in or register to host a tournament.");
                return;
              }
              setShowCreateModal(true);
            }}
          >
            <Plus size={18} /> Host Tournament
          </button>
        </div>
      </section>

      {error && <p className="alert-banner error"><AlertCircle size={16} /> {error}</p>}
      {success && <p className="alert-banner success"><CheckCircle size={16} /> {success}</p>}

      <section className="league-layout">
        {/* Sidebar League Selector */}
        <aside className="league-sidebar bg-[#081c15] border border-[#114232] p-4 rounded-2xl shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
            <h3 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider">Tournament Leagues</h3>
            <span className="text-[11px] font-mono text-[#d6a735] bg-[#0c3b2e] px-2 py-0.5 rounded border border-[#d6a735]/30">
              {leagues.length} Total
            </span>
          </div>

          <div className="league-list mt-3 space-y-2.5">
            {leagues.map((league) => (
              <div
                key={league.id}
                className={`league-card-item bg-[#06261f] border border-[#114232] p-3 rounded-xl cursor-pointer hover:border-[#d6a735]/50 transition-all ${selectedLeagueId === league.id ? "active ring-1 ring-[#d6a735] border-[#d6a735] bg-[#0c3b2e]" : ""}`}
                onClick={() => setSelectedLeagueId(league.id)}
              >
                <div className="league-card-header flex items-center justify-between mb-1">
                  <strong className="flex items-center gap-1.5 text-[#f5efdf] text-xs">
                    {league.isPrivate && <Lock size={13} className="text-[#d6a735] shrink-0" />}
                    <span className="truncate">{league.title}</span>
                  </strong>
                  <span className={`status-tag uppercase text-[9px] font-bold px-1.5 py-0.5 rounded ${league.status === "active" ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "bg-[#0c3b2e] text-[#a3b8b0]"}`}>{league.status}</span>
                </div>
                <p className="line-clamp-2 text-xs text-[#a3b8b0]">{league.description}</p>
                <div className="league-card-meta flex items-center justify-between pt-1.5 text-[11px] text-[#a3b8b0]">
                  <span className="flex items-center gap-1"><Users size={12} /> {league.participantCount} / {league.maxParticipants}</span>
                  <span className="font-mono text-[#d6a735]">GH₵ {league.entryFeePoints} Fee</span>
                  <span className="font-mono text-emerald-400 font-bold">GH₵ {league.prizePoolPoints} Prize</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#a3b8b0] font-mono capitalize">
                  <Grid size={11} /> {league.format?.replace("_", " ") || "single elimination"}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Tournament Details & Bracket Viewer */}
        <div className="league-details-view">
          {activeLeagueDetails ? (
            <div className="bracket-container space-y-4">
              {/* Header Meta Banner */}
              <div className="league-meta-banner bg-[#081c15] border border-[#114232] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[#f5efdf]">
                      {activeLeagueDetails.league.title}
                    </h2>
                    {activeLeagueDetails.league.isPrivate && (
                      <span className="px-2 py-0.5 bg-[#0c3b2e] border border-[#d6a735]/40 text-[#d6a735] rounded text-xs font-bold flex items-center gap-1">
                        <Lock size={12} /> Private Code
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-[#06261f] border border-[#114232] text-[#d6a735] rounded text-xs font-mono font-bold capitalize">
                      {activeLeagueDetails.league.format?.replace("_", " ") || "Single Elimination"}
                    </span>
                  </div>
                  <p className="text-xs text-[#a3b8b0] mt-1">
                    Hosted by <strong className="text-[#d6a735]">{activeLeagueDetails.league.facilitatorName}</strong> • Match Days: {activeLeagueDetails.league.scheduleDate || "Saturdays"} @ {activeLeagueDetails.league.scheduleTime || "18:00 GMT"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {userParticipant && (
                    <button
                      disabled={busy}
                      onClick={handleToggleCheckIn}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
                        userParticipant.checkedIn
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                          : "bg-[#d6a735] text-[#06261f] hover:bg-[#b88c24]"
                      }`}
                    >
                      <CheckCircle size={14} />
                      {userParticipant.checkedIn ? "✓ Checked In" : "Click to Check-In"}
                    </button>
                  )}

                  {activeLeagueDetails.league.status === "registration" && !userParticipant && (
                    <button
                      disabled={busy}
                      className="btn-primary"
                      onClick={() => initiateJoinLeague(activeLeagueDetails.league)}
                    >
                      {activeLeagueDetails.league.requiresApproval ? "Apply for Entry" : "Register Now"} (GH₵ {activeLeagueDetails.league.entryFeePoints})
                    </button>
                  )}

                  {activeLeagueDetails.league.status === "completed" && (
                    <div className="winner-badge flex items-center gap-2 bg-[#d6a735] text-[#06261f] font-black px-3 py-1.5 rounded-xl shadow-lg">
                      <Award size={18} /> Champion: {activeLeagueDetails.league.winnerName}
                    </div>
                  )}
                </div>
              </div>

              {/* Facilitator Private Code Banner */}
              {isFacilitator && activeLeagueDetails.league.isPrivate && activeLeagueDetails.league.inviteCode && (
                <div className="p-3 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-xl flex items-center justify-between text-xs text-[#f5efdf]">
                  <span className="flex items-center gap-2">
                    <Lock size={14} className="text-[#d6a735]" /> Private Invitation Code:{" "}
                    <strong className="font-mono text-[#d6a735] bg-[#081c15] px-2 py-1 rounded border border-[#114232] text-sm">
                      {activeLeagueDetails.league.inviteCode}
                    </strong>
                  </span>
                  <button
                    className="px-2.5 py-1 bg-[#d6a735] text-[#06261f] rounded-lg font-bold hover:bg-[#b88c24] transition-colors flex items-center gap-1 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(activeLeagueDetails.league.inviteCode || "");
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                  >
                    {copiedCode ? <Check size={12} /> : <Copy size={12} />} Copy Code
                  </button>
                </div>
              )}

              {/* Facilitator Control Center Panel */}
              {isFacilitator && (
                <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#114232]">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5">
                      <Settings size={14} /> Facilitator &amp; Host Control Dashboard
                    </h4>
                    {activeLeagueDetails.league.status === "registration" && (
                      <button
                        disabled={busy || activeLeagueDetails.participants.filter((p) => p.status === "approved").length < 2}
                        onClick={handleForceGenerateBracket}
                        className="px-3 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Sparkles size={12} /> Generate Bracket Now
                      </button>
                    )}
                  </div>

                  {/* Pending Applications Review */}
                  {activeLeagueDetails.league.requiresApproval && (
                    <div className="space-y-2">
                      <h5 className="text-[11px] font-bold text-[#f5efdf] uppercase">
                        Pending Player Applications ({activeLeagueDetails.participants.filter((p) => p.status === "pending").length})
                      </h5>
                      {activeLeagueDetails.participants.filter((p) => p.status === "pending").length === 0 ? (
                        <p className="text-xs text-[#a3b8b0] italic">No pending applications awaiting review.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeLeagueDetails.participants.filter((p) => p.status === "pending").map((p) => (
                            <div key={p.id} className="flex items-center justify-between p-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-xs">
                              <span className="font-bold text-[#f5efdf]">{p.username}</span>
                              <div className="flex gap-1.5">
                                <button
                                  disabled={busy}
                                  onClick={() => handleApproveParticipant(p.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1"
                                >
                                  <UserCheck size={12} /> Approve
                                </button>
                                <button
                                  disabled={busy}
                                  onClick={() => handleRejectParticipant(p.id)}
                                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg font-bold text-[11px] flex items-center gap-1"
                                >
                                  <UserX size={12} /> Reject
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Standings / Participants Chip Bar */}
              <div className="participants-bar bg-[#081c15] border border-[#114232] p-4 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-[#d6a735]" />
                    Tournament Roster &amp; Standings ({activeLeagueDetails.participants.filter((p) => p.status !== "rejected").length})
                  </h4>
                  {activeLeagueDetails.league.format === "round_robin" && (
                    <span className="text-[11px] font-mono text-[#d6a735]">Wins: 3 Points • Draw: 1 Point</span>
                  )}
                </div>

                <div className="chips flex flex-wrap gap-2">
                  {activeLeagueDetails.participants.map((p) => (
                    <span
                      className={`user-chip flex items-center gap-1.5 px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-xl text-xs ${
                        p.status === "pending" ? "opacity-60 italic border-dashed" : ""
                      }`}
                      key={p.id}
                    >
                      <Shield size={12} className={p.checkedIn ? "text-emerald-400" : "text-[#a3b8b0]"} />
                      <strong className="text-[#f5efdf]">{p.username}</strong>
                      {p.seed ? <span className="text-[10px] font-mono text-[#a3b8b0]">#{p.seed}</span> : null}
                      {p.checkedIn && <span className="text-[10px] text-emerald-400 font-bold">✓</span>}
                      {activeLeagueDetails.league.format === "round_robin" && (
                        <span className="text-[10px] font-mono text-[#d6a735] font-bold bg-[#0c3b2e] px-1.5 py-0.2 rounded border border-[#d6a735]/30">
                          {p.pointsScore || 0} pts
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Standings Table for Round Robin & Swiss Formats */}
              {(activeLeagueDetails.league.format === "round_robin" || activeLeagueDetails.league.format === "swiss") && (
                <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl my-4">
                  <h3 className="text-xs font-bold text-[#d6a735] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <TrendingUp size={16} /> Live Leaderboard Standings
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#114232] text-[#a3b8b0] font-semibold uppercase">
                          <th className="py-2 px-3">Rank</th>
                          <th className="py-2 px-3">Player</th>
                          <th className="py-2 px-3 text-center">Played</th>
                          <th className="py-2 px-3 text-center">Wins</th>
                          <th className="py-2 px-3 text-center">Draws</th>
                          <th className="py-2 px-3 text-center">Losses</th>
                          <th className="py-2 px-3 text-right font-mono text-[#d6a735]">Total Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#114232] font-mono">
                        {[...activeLeagueDetails.participants]
                          .sort((a, b) => (b.pointsScore || 0) - (a.pointsScore || 0))
                          .map((p, idx) => (
                            <tr key={p.id} className="hover:bg-[#0c3b2e]/50 transition-colors">
                              <td className="py-2 px-3 font-bold text-[#d6a735]">#{idx + 1}</td>
                              <td className="py-2 px-3 font-sans font-bold text-[#f5efdf]">{p.username}</td>
                              <td className="py-2 px-3 text-center text-[#f5efdf]">{(p.winsCount || 0) + (p.drawsCount || 0) + (p.lossesCount || 0)}</td>
                              <td className="py-2 px-3 text-center text-emerald-400 font-bold">{p.winsCount || 0}</td>
                              <td className="py-2 px-3 text-center text-sky-400">{p.drawsCount || 0}</td>
                              <td className="py-2 px-3 text-center text-red-400">{p.lossesCount || 0}</td>
                              <td className="py-2 px-3 text-right font-extrabold text-[#d6a735] text-sm">{p.pointsScore || 0}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tournament Bracket Tree Visualizer */}
              <BracketTreeView
                matches={activeLeagueDetails.matches}
                participants={activeLeagueDetails.participants}
                format={activeLeagueDetails.league.format}
                userToken={token}
                isFacilitator={isFacilitator}
                onStartMatch={handleStartMatchRoom}
                onSetScore={(match) => {
                  setSelectedMatchForScore(match);
                  setSelectedScoringWinnerToken(match.player1Token || "");
                }}
                title={activeLeagueDetails.league.title}
              />
            </div>
          ) : (
            <div className="p-12 text-center text-[#a3b8b0] italic bg-[#081c15] border border-[#114232] rounded-2xl">
              Select a tournament league from the sidebar to view details, bracket, and standings.
            </div>
          )}
        </div>
      </section>

      {/* Facilitator Quick Match Scoring Modal */}
      {selectedMatchForScore && (
        <div className="modal-overlay" onClick={() => setSelectedMatchForScore(null)}>
          <div className="modal-card max-w-md bg-[#081c15] border border-[#114232] text-[#f5efdf]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2 mb-2">
              <Award size={18} /> Facilitator Match Result Verification
            </h3>
            <p className="text-xs text-[#a3b8b0] mb-4">
              Select the match winner to update bracket progress and advance players to the next round.
            </p>

            <form onSubmit={handleSubmitMatchScore} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#f5efdf]">Select Match Result</label>
                <div className="space-y-1.5">
                  {selectedMatchForScore.player1Token && (
                    <label className="flex items-center gap-2 p-2.5 bg-[#06261f] border border-[#114232] rounded-xl cursor-pointer hover:border-[#d6a735]/50">
                      <input
                        type="radio"
                        name="scoringWinner"
                        value={selectedMatchForScore.player1Token}
                        checked={scoringWinnerToken === selectedMatchForScore.player1Token}
                        onChange={(e) => setSelectedScoringWinnerToken(e.target.value)}
                      />
                      <span className="text-xs font-bold text-[#f5efdf]">
                        {selectedMatchForScore.player1Name} (Victory)
                      </span>
                    </label>
                  )}

                  {selectedMatchForScore.player2Token && (
                    <label className="flex items-center gap-2 p-2.5 bg-[#06261f] border border-[#114232] rounded-xl cursor-pointer hover:border-[#d6a735]/50">
                      <input
                        type="radio"
                        name="scoringWinner"
                        value={selectedMatchForScore.player2Token}
                        checked={scoringWinnerToken === selectedMatchForScore.player2Token}
                        onChange={(e) => setSelectedScoringWinnerToken(e.target.value)}
                      />
                      <span className="text-xs font-bold text-[#f5efdf]">
                        {selectedMatchForScore.player2Name} (Victory)
                      </span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 p-2.5 bg-[#06261f] border border-[#114232] rounded-xl cursor-pointer hover:border-[#d6a735]/50">
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
                <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Audit Notes / Dispute Resolution</label>
                <input
                  type="text"
                  value={scoringDisputeNotes}
                  onChange={(e) => setScoringDisputeNotes(e.target.value)}
                  placeholder="e.g. Verified by referee / Disconnection forfeit"
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
                />
              </div>

              <div className="modal-actions flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setSelectedMatchForScore(null)}>Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary">Verify &amp; Advance Bracket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Private League Invitation Code Modal */}
      {showInviteModal && joiningLeagueId && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-card bg-[#081c15] border border-[#114232] text-[#f5efdf]" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 text-[#d6a735]">
              <Lock size={18} /> Private Tournament Invitation Code
            </h3>
            <p className="text-xs text-[#a3b8b0] my-2">This tournament is invitation-only. Please enter the invitation code provided by the facilitator.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (joiningLeagueId) handleJoinLeague(joiningLeagueId);
            }}>
              <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Invitation Code
                <input
                  required
                  autoFocus
                  className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl font-mono uppercase tracking-widest text-center text-lg text-[#d6a735]"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DAMII88"
                />
              </label>
              <div className="modal-actions mt-4 flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary">Submit Code &amp; Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Host New Tournament Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card max-w-lg bg-[#081c15] border border-[#114232] text-[#f5efdf]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#d6a735] uppercase tracking-wider mb-2">Host a Tournament League</h3>
            <form onSubmit={handleCreateLeague} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Tournament Title</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Greater Accra Damii Cup 2026" className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Description &amp; Overview</label>
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tournament details & guidelines" className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Entry Fee (GH₵)</label>
                  <input type="number" min={0} value={entryFee} onChange={(e) => setEntryFee(Number(e.target.value))} className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Prize Pool (GH₵)</label>
                  <input type="number" min={0} value={prizePool} onChange={(e) => setPrizePool(Number(e.target.value))} className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Tournament Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value as TournamentFormat)} className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]">
                    <option value="single_elimination">Single Elimination</option>
                    <option value="double_elimination">Double Elimination</option>
                    <option value="round_robin">Round Robin League</option>
                    <option value="swiss">Swiss System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Max Capacity</label>
                  <select value={maxParticipants} onChange={(e) => setMaxParticipants(Number(e.target.value))} className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]">
                    <option value={4}>4 Players</option>
                    <option value={8}>8 Players</option>
                    <option value={16}>16 Players</option>
                    <option value={32}>32 Players</option>
                  </select>
                </div>
              </div>

              {/* Tournament Privacy & Approval Settings */}
              <div className="p-3 bg-[#06261f] border border-[#114232] rounded-xl space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  <span className="font-bold text-[#d6a735]">Private Tournament (Invitation Code Only)</span>
                </label>

                {isPrivate && (
                  <div className="pt-1">
                    <label className="block text-[#a3b8b0] mb-0.5">Custom Invite Code (Optional)</label>
                    <input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="e.g. GHANA2026 (Auto-generated if blank)"
                      className="w-full px-2.5 py-1.5 bg-[#081c15] border border-[#114232] rounded-lg font-mono uppercase text-xs text-[#f5efdf]"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
                  <span className="font-bold text-[#f5efdf]">Require Facilitator Approval for Applicants</span>
                </label>
              </div>

              {/* Schedule Days & Times */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Match Days</label>
                  <input value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} placeholder="e.g. Saturdays & Sundays" className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">Match Time</label>
                  <input value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} placeholder="e.g. 18:00 GMT" className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]" />
                </div>
              </div>

              <div className="modal-actions flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" disabled={busy} className="btn-primary">Create Tournament</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Footer />
    </main>
  );
}
