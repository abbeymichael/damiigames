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
  RefreshCw,
  AlertCircle,
  UserPlus,
  UserCog,
  DollarSign,
  Gavel,
  ChevronRight,
  Zap,
  Key,
  Trash2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Building2,
  BadgeCheck,
  Briefcase,
  Send,
  ArrowRight,
  Coins,
  Receipt,
  History,
  LogIn,
  Filter,
  Search,
} from "lucide-react";
import {
  League,
  LeagueMatch,
  LeagueParticipant,
  TournamentFormat,
  PrizeDistribution,
  OrganizerProfile,
} from "@/lib/types";
import { BracketTreeView } from "@/components/BracketTreeView";

export default function OrganizerPage() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);

  // Login form state for unauthenticated users
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPasscode, setLoginPasscode] = useState("");

  // Organizer License Application Form state
  const [appOrgName, setAppOrgName] = useState("");
  const [appGhanaCardPin, setAppGhanaCardPin] = useState("");
  const [appContactPhone, setAppContactPhone] = useState("");
  const [appBio, setAppBio] = useState("");
  const [appFrequency, setAppFrequency] = useState("Monthly");
  const [appAgreedTerms, setAppAgreedTerms] = useState(false);

  // Tournaments state
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [activeLeagueDetails, setActiveLeagueDetails] = useState<{
    league: League;
    participants: LeagueParticipant[];
    matches: LeagueMatch[];
  } | null>(null);

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<"tournaments" | "create" | "manage">("tournaments");
  const [manageSubTab, setManageSubTab] = useState<"overview" | "participants" | "bracket" | "prizes">("overview");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Async States
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Create Tournament Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [entryFee, setEntryFee] = useState(0);
  const [prizePool, setPrizePool] = useState(1000);
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [format, setFormat] = useState<TournamentFormat>("single_elimination");
  const [isPrivate, setIsPrivate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("Saturdays & Sundays");
  const [scheduleTime, setScheduleTime] = useState("18:00 GMT");
  const [turnTimerSeconds, setTurnTimerSeconds] = useState(60);
  const [rulesNotes, setRulesNotes] = useState("");
  const [prize1st, setPrize1st] = useState(60);
  const [prize2nd, setPrize2nd] = useState(30);
  const [prize3rd, setPrize3rd] = useState(10);

  // Manual Player Add form
  const [manualPlayerName, setManualPlayerName] = useState("");

  // Settings Edit state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editScheduleDate, setEditScheduleDate] = useState("");
  const [editScheduleTime, setEditScheduleTime] = useState("");
  const [editTurnTimer, setEditTurnTimer] = useState(60);
  const [editRules, setEditRules] = useState("");
  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);

  // Score Override Modal
  const [selectedMatchForScore, setSelectedMatchForScore] = useState<LeagueMatch | null>(null);
  const [scoringWinnerToken, setScoringWinnerToken] = useState<string | "draw">("");
  const [scoringDisputeNotes, setScoringDisputeNotes] = useState("");

  // Prize Disbursement Modal
  const [showDisburseModal, setShowDisburseModal] = useState(false);

  const syncOrganizerAuth = () => {
    const savedToken = localStorage.getItem("damii-player-token") || "";
    const savedName = localStorage.getItem("damii-player-name") || "";
    setToken(savedToken);
    setUsername(savedName);

    const authUser = localStorage.getItem("damii-auth-user");
    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        if (parsed.role) setRole(parsed.role);
      } catch {
        /* silent */
      }
    }

    if (savedToken) {
      fetchOrganizerRequestStatus(savedToken);
    } else {
      setOrganizerProfile(null);
    }
  };

  const fetchOrganizerRequestStatus = async (userToken: string) => {
    try {
      const res = await fetch("/api/organizer/request", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await res.json();
      if (res.ok && data.organizerProfile) {
        setOrganizerProfile(data.organizerProfile);
        if (data.profile?.role) {
          setRole(data.profile.role);
        }
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    syncOrganizerAuth();
    loadLeagues();

    window.addEventListener("damii-auth-changed", syncOrganizerAuth);
    return () => window.removeEventListener("damii-auth-changed", syncOrganizerAuth);
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      loadLeagueDetails(selectedLeagueId);
    }
  }, [selectedLeagueId]);

  const loadLeagues = async () => {
    try {
      const res = await fetch("/api/league");
      const data = await res.json();
      if (data.leagues) {
        setLeagues(data.leagues);
        if (!selectedLeagueId && data.leagues.length > 0) {
          setSelectedLeagueId(data.leagues[0].id);
        }
      }
    } catch {
      setError("Failed to fetch tournament leagues.");
    }
  };

  const loadLeagueDetails = async (leagueId: string) => {
    try {
      const res = await fetch(`/api/league?id=${leagueId}`);
      const data = await res.json();
      if (res.ok && data.league) {
        setActiveLeagueDetails(data);
        setEditTitle(data.league.title);
        setEditDescription(data.league.description);
        setEditScheduleDate(data.league.scheduleDate || "Saturdays");
        setEditScheduleTime(data.league.scheduleTime || "18:00 GMT");
        setEditTurnTimer(data.league.turnTimerSeconds || 60);
        setEditRules(data.league.rulesNotes || "");
      }
    } catch {
      /* silent */
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: loginUsername.trim(),
          passcode: loginPasscode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Authentication failed. Check credentials.");
        setBusy(false);
        return;
      }

      localStorage.setItem("damii-player-token", data.token);
      localStorage.setItem("damii-player-name", data.profile.username);
      localStorage.setItem(
        "damii-auth-user",
        JSON.stringify({
          token: data.token,
          username: data.profile.username,
          points: data.profile.points,
          role: data.profile.role,
        })
      );

      setToken(data.token);
      setUsername(data.profile.username);
      setRole(data.profile.role);
      setSuccess(`Authenticated as ${data.profile.username}`);
      window.dispatchEvent(new Event("damii-auth-changed"));
      fetchOrganizerRequestStatus(data.token);
      loadLeagues();
    } catch {
      setError("Server connection failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Please sign in first to submit an organizer license application.");
      return;
    }
    if (!appOrgName.trim()) {
      setError("Organization or Brand Name is required.");
      return;
    }
    if (!appContactPhone.trim()) {
      setError("Contact Phone Number is required.");
      return;
    }
    if (!appAgreedTerms) {
      setError("You must acknowledge and accept the DAMII Organizer Rules & Financial Escrow Terms.");
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/organizer/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationName: appOrgName.trim(),
          contactPhone: appContactPhone.trim(),
          bio: appBio.trim()
            ? `[Ghana Card / Reg ID: ${appGhanaCardPin || "Provided"}] ${appBio.trim()} (Expected Frequency: ${appFrequency})`
            : `[Ghana Card / Reg ID: ${appGhanaCardPin || "Provided"}] Expected Frequency: ${appFrequency}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to submit organizer application.");
        setBusy(false);
        return;
      }

      setOrganizerProfile(data.organizerProfile);
      setSuccess("Your organizer application has been submitted successfully! An Admin will review your credentials.");
    } catch {
      setError("Failed to submit application. Network error.");
    } finally {
      setBusy(false);
    }
  };

  const isApprovedOrganizer =
    ["organizer", "facilitator", "admin", "super_admin"].includes(role) ||
    organizerProfile?.status === "approved";

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("League title is required.");
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
          action: "create",
          token,
          facilitatorName: username || "Facilitator",
          title: title.trim(),
          description: description.trim() || "Official Damii Tournament",
          entryFeePoints: Number(entryFee) || 0,
          prizePoolPoints: Number(prizePool) || 0,
          maxParticipants: Number(maxParticipants) || 8,
          format,
          isPrivate,
          inviteCode: isPrivate ? inviteCode.trim() : undefined,
          requiresApproval,
          scheduleDate: scheduleDate.trim(),
          scheduleTime: scheduleTime.trim(),
          turnTimerSeconds: Number(turnTimerSeconds) || 60,
          prizeDistribution: {
            first: Number(prize1st) || 60,
            second: Number(prize2nd) || 30,
            third: Number(prize3rd) || 10,
          },
          rulesNotes: rulesNotes.trim() || "Standard 10x10 Damii rules apply.",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to create tournament.");
        setBusy(false);
        return;
      }

      setSuccess(`Tournament '${data.league.title}' created successfully!`);
      setTitle("");
      setDescription("");
      await loadLeagues();
      setSelectedLeagueId(data.league.id);
      setActiveTab("manage");
      setManageSubTab("overview");
    } catch {
      setError("Server error while creating tournament.");
    } finally {
      setBusy(false);
    }
  };

  const handleApproveParticipant = async (participantId: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", token, participantId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to approve player");

      setSuccess("Player application approved!");
      if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRejectParticipant = async (participantId: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", token, participantId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to reject player");

      setSuccess("Player application rejected. Entry fee refunded if applicable.");
      if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAddManualPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPlayerName.trim() || !selectedLeagueId) return;

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_player_manual",
          token,
          leagueId: selectedLeagueId,
          usernameToAdd: manualPlayerName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to add player");

      setSuccess(`Player '${manualPlayerName.trim()}' enrolled in tournament!`);
      setManualPlayerName("");
      loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Manual addition failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateBracket = async () => {
    if (!selectedLeagueId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_bracket",
          token,
          leagueId: selectedLeagueId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to generate bracket");

      setSuccess("Tournament bracket generated and round 1 launched!");
      loadLeagueDetails(selectedLeagueId);
      setManageSubTab("bracket");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bracket generation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleStartMatchRoom = async (matchId: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_match_room",
          token,
          matchId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to start match room");

      setSuccess(`Match arena room code generated: ${data.roomCode}`);
      if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match initialization failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveScoreOverride = async () => {
    if (!selectedMatchForScore || !scoringWinnerToken) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "result",
          token,
          matchId: selectedMatchForScore.id,
          winnerToken: scoringWinnerToken,
          disputeNotes: scoringDisputeNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to submit result");

      setSuccess("Match result recorded and bracket advanced!");
      setSelectedMatchForScore(null);
      if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Score override failed");
    } finally {
      setBusy(false);
    }
  };

  const handleExecutePrizeDisbursement = async () => {
    if (!selectedLeagueId || !activeLeagueDetails) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disburse_prizes",
          token,
          leagueId: selectedLeagueId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to disburse prize pool");

      setSuccess("Tournament Prize Pool disbursed successfully! Winners have been credited in Points.");
      setShowDisburseModal(false);
      loadLeagueDetails(selectedLeagueId);
      loadLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prize disbursement failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTournament = async () => {
    if (!selectedLeagueId) return;
    if (!confirm("Are you sure you want to CANCEL this tournament? All participant entry fees will be automatically refunded.")) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          token,
          leagueId: selectedLeagueId,
          reason: "Cancelled by Organizer",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to cancel tournament");

      setSuccess("Tournament cancelled and entry fees refunded.");
      loadLeagueDetails(selectedLeagueId);
      loadLeagues();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setBusy(false);
    }
  };

  const filteredLeagues = leagues.filter((lg) => {
    const matchesFilter =
      statusFilter === "all" || lg.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      lg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lg.facilitatorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selectedLeague = activeLeagueDetails?.league;

  return (
    <main className="app-shell">
      <SharedHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner Messages */}
        {error && (
          <div className="p-4 bg-red-950/90 border border-red-600/80 rounded-2xl text-red-200 flex items-center justify-between gap-3 shadow-xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <span className="text-sm font-semibold">{error}</span>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-white p-1 rounded-lg"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/90 border border-emerald-500/80 rounded-2xl text-emerald-200 flex items-center justify-between gap-3 shadow-xl animate-in fade-in">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold">{success}</span>
            </div>
            <button
              onClick={() => setSuccess("")}
              className="text-emerald-400 hover:text-white p-1 rounded-lg"
            >
              <XCircle size={18} />
            </button>
          </div>
        )}

        {/* --- CASE 1: UNAUTHENTICATED USER --- */}
        {!token && (
          <section className="max-w-xl mx-auto space-y-6">
            <div className="p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-2xl flex items-center justify-center mx-auto text-[#d6a735] shadow-lg">
                <ShieldCheck size={32} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-[#f5efdf]">
                  DAMII Organizer Hub Login
                </h2>
                <p className="text-sm text-[#a3b8b0] mt-1.5 leading-relaxed">
                  Sign in with your official account credentials to access the Tournament Organizer Command Studio or apply for an official License.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Username / Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Password / Passcode
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPasscode}
                    onChange={(e) => setLoginPasscode(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  {busy ? "Authenticating..." : "Sign In to Organizer Studio"}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* --- CASE 2: LOGGED IN BUT UNAPPROVED ORGANIZER APPLICANT --- */}
        {token && !isApprovedOrganizer && (
          <section className="max-w-3xl mx-auto space-y-6">
            {/* Header Banner */}
            <div className="p-6 bg-gradient-to-br from-[#0c3b2e] to-[#06261f] border border-[#184d3c] rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#081c15] border border-[#d6a735]/40 rounded-2xl flex items-center justify-center text-[#d6a735] shrink-0">
                  <Building2 size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-[#f5efdf]">
                    Official Organizer License Portal
                  </h2>
                  <p className="text-xs text-[#a3b8b0] mt-0.5">
                    Account: <strong className="text-[#f5efdf]">{username}</strong> • Status:{" "}
                    <span className="capitalize font-bold text-[#d6a735]">
                      {organizerProfile?.status || "unsubmitted"}
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchOrganizerRequestStatus(token)}
                className="px-4 py-2 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shrink-0"
              >
                <RefreshCw size={14} /> Refresh Application Status
              </button>
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#06261f] border border-[#114232] rounded-2xl text-xs font-semibold text-center">
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle size={14} /> 1. Account Auth
              </div>
              <div
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${
                  organizerProfile?.status === "pending"
                    ? "bg-amber-950/80 border-amber-500/80 text-amber-300"
                    : organizerProfile?.status === "rejected"
                    ? "bg-red-950/80 border-red-500/80 text-red-300"
                    : "bg-[#081c15] border-[#114232] text-[#a3b8b0]"
                }`}
              >
                <FileText size={14} /> 2. Commission Review
              </div>
              <div className="p-2.5 bg-[#081c15] border border-[#114232] text-[#a3b8b0] rounded-xl flex items-center justify-center gap-1.5 opacity-60">
                <BadgeCheck size={14} /> 3. Certified Studio
              </div>
            </div>

            {/* Status Feedback Card if Pending */}
            {organizerProfile?.status === "pending" && (
              <div className="p-6 bg-amber-950/70 border border-amber-500/80 rounded-3xl text-[#f5efdf] space-y-4 shadow-xl">
                <div className="flex items-start gap-3">
                  <Clock size={24} className="text-[#d6a735] shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-base text-[#d6a735]">
                      Application Under Commission Review
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Your application for <strong>{organizerProfile.organizationName}</strong> was submitted on{" "}
                      {new Date(organizerProfile.requestedAt).toLocaleDateString()}. System administrators review organizer applications within 24 hours. You will receive an automated notification once your license is approved.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#06261f]/80 border border-[#114232] rounded-2xl text-xs space-y-2 text-[#a3b8b0]">
                  <p><strong className="text-[#f5efdf]">Organization Name:</strong> {organizerProfile.organizationName}</p>
                  <p><strong className="text-[#f5efdf]">Contact Phone:</strong> {organizerProfile.contactPhone || "Provided"}</p>
                  <p><strong className="text-[#f5efdf]">Details:</strong> {organizerProfile.bio || "In review"}</p>
                </div>
              </div>
            )}

            {/* Status Feedback Card if Rejected */}
            {organizerProfile?.status === "rejected" && (
              <div className="p-6 bg-red-950/80 border border-red-500/80 rounded-3xl text-red-100 space-y-3 shadow-xl">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={24} className="text-red-400 shrink-0 mt-1" />
                  <div>
                    <h3 className="font-bold text-base text-red-200">
                      Application Declined
                    </h3>
                    <p className="text-xs text-red-300 mt-1">
                      Reason: {organizerProfile.rejectionReason || "Credentials require further verification."}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  You may re-submit your organizer application below with updated verification information.
                </p>
              </div>
            )}

            {/* License Application Form */}
            {(organizerProfile?.status === "none" ||
              organizerProfile?.status === "rejected" ||
              !organizerProfile) && (
              <form
                onSubmit={handleSubmitApplication}
                className="p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6"
              >
                <div>
                  <h3 className="text-lg font-black text-[#f5efdf] flex items-center gap-2">
                    <Briefcase size={20} className="text-[#d6a735]" /> Application for Certified Organizer License
                  </h3>
                  <p className="text-xs text-[#a3b8b0] mt-1">
                    Certified Organizers can create public or private tournaments, set guaranteed prize pools, enforce turn clocks, and manage brackets with official Damii rules.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                      Organization / Brand Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={appOrgName}
                      onChange={(e) => setAppOrgName(e.target.value)}
                      placeholder="e.g. Capital Draughts Club"
                      className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                      National ID / Business Reg ID
                    </label>
                    <input
                      type="text"
                      value={appGhanaCardPin}
                      onChange={(e) => setAppGhanaCardPin(e.target.value)}
                      placeholder="e.g. ID-123456789-0"
                      className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                      Contact Mobile Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={appContactPhone}
                      onChange={(e) => setAppContactPhone(e.target.value)}
                      placeholder="e.g. 0244123456"
                      className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                      Target Tournament Frequency
                    </label>
                    <select
                      value={appFrequency}
                      onChange={(e) => setAppFrequency(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                    >
                      <option value="Weekly">Weekly Leagues</option>
                      <option value="Bi-Weekly">Bi-Weekly Tournaments</option>
                      <option value="Monthly">Monthly Championship</option>
                      <option value="Special Events">Special Invitational Events</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Organizer Bio & Past Event Experience
                  </label>
                  <textarea
                    rows={3}
                    value={appBio}
                    onChange={(e) => setAppBio(e.target.value)}
                    placeholder="Briefly describe your event organizing background, venue location, or draughts community..."
                    className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                  />
                </div>

                <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-check"
                    checked={appAgreedTerms}
                    onChange={(e) => setAppAgreedTerms(e.target.checked)}
                    className="mt-1 accent-[#d6a735]"
                  />
                  <label htmlFor="terms-check" className="text-xs text-[#a3b8b0] leading-relaxed cursor-pointer">
                    I acknowledge that as a Certified DAMII Organizer, I am bound by the official 10×10 Ghanaian Draughts rules, compulsory capture sequences, turn clocks, and platform financial escrow regulations. All prize pool disbursements pass through automated server ledgers.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Send size={18} />
                  {busy ? "Submitting Application..." : "Submit Organizer Application"}
                </button>
              </form>
            )}
          </section>
        )}

        {/* --- CASE 3: APPROVED ORGANIZER COMMAND STUDIO --- */}
        {token && isApprovedOrganizer && (
          <section className="space-y-8">
            {/* Organizer Header Card */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0c3b2e] via-[#06261f] to-[#081c15] border border-[#184d3c] rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#081c15] border-2 border-[#d6a735] rounded-2xl flex items-center justify-center text-[#d6a735] shadow-xl shrink-0">
                  <BadgeCheck size={36} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-[#f5efdf]">
                      {organizerProfile?.organizationName || `${username}'s Studio`}
                    </h1>
                    <span className="px-2.5 py-0.5 bg-[#d6a735]/20 border border-[#d6a735]/60 text-[#d6a735] font-bold rounded-md text-[11px] uppercase tracking-wider">
                      Certified Organizer
                    </span>
                  </div>
                  <p className="text-xs text-[#a3b8b0] mt-1 flex items-center gap-2">
                    <span>Facilitator: <strong className="text-[#f5efdf]">{username}</strong></span>
                    <span>•</span>
                    <span>License ID: <strong className="text-[#d6a735]">ORG-{token.slice(-6).toUpperCase()}</strong></span>
                  </p>
                </div>
              </div>

              {/* Studio Metrics */}
              <div className="grid grid-cols-3 gap-3 bg-[#06261f] p-3.5 rounded-2xl border border-[#114232] text-center w-full md:w-auto">
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#a3b8b0]">Tournaments</div>
                  <div className="text-lg font-black text-[#f5efdf]">{leagues.length}</div>
                </div>
                <div className="border-x border-[#114232] px-3">
                  <div className="text-[10px] uppercase font-bold text-[#a3b8b0]">Active</div>
                  <div className="text-lg font-black text-[#d6a735]">
                    {leagues.filter((l) => l.status === "active" || l.status === "registration").length}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#a3b8b0]">Completed</div>
                  <div className="text-lg font-black text-emerald-400">
                    {leagues.filter((l) => l.status === "completed").length}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#114232] pb-4">
              <div className="flex items-center gap-2 bg-[#06261f] p-1.5 rounded-2xl border border-[#114232]">
                <button
                  onClick={() => setActiveTab("tournaments")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === "tournaments"
                      ? "bg-[#d6a735] text-[#06261f] shadow-md"
                      : "text-[#a3b8b0] hover:text-white"
                  }`}
                >
                  <Trophy size={16} /> My Tournaments
                </button>

                <button
                  onClick={() => setActiveTab("create")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === "create"
                      ? "bg-[#d6a735] text-[#06261f] shadow-md"
                      : "text-[#a3b8b0] hover:text-white"
                  }`}
                >
                  <Plus size={16} /> Create Tournament
                </button>

                {selectedLeague && (
                  <button
                    onClick={() => setActiveTab("manage")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      activeTab === "manage"
                        ? "bg-[#d6a735] text-[#06261f] shadow-md"
                        : "text-[#a3b8b0] hover:text-white"
                    }`}
                  >
                    <Settings size={16} /> Command Center ({selectedLeague.title.slice(0, 14)}...)
                  </button>
                )}
              </div>

              {activeTab === "tournaments" && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-64">
                    <Search size={14} className="absolute left-3 top-3 text-[#a3b8b0]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tournaments..."
                      className="w-full pl-9 pr-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf] placeholder-[#a3b8b0]/50 focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="registration">Registration Open</option>
                    <option value="active">Active Matches</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            {/* TAB 1: TOURNAMENTS DIRECTORY */}
            {activeTab === "tournaments" && (
              <div className="space-y-4">
                {filteredLeagues.length === 0 ? (
                  <div className="p-12 text-center bg-[#06261f] border border-[#114232] rounded-3xl space-y-3">
                    <Trophy size={40} className="mx-auto text-[#a3b8b0]/40" />
                    <p className="text-sm font-semibold text-[#a3b8b0]">
                      No tournaments found matching the selected filter.
                    </p>
                    <button
                      onClick={() => setActiveTab("create")}
                      className="px-4 py-2 bg-[#d6a735] text-[#06261f] font-bold text-xs rounded-xl hover:bg-[#b88c24] transition-colors"
                    >
                      Create First Tournament
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLeagues.map((lg) => (
                      <div
                        key={lg.id}
                        className={`p-5 bg-[#06261f] border rounded-2xl transition-all space-y-4 shadow-xl flex flex-col justify-between ${
                          selectedLeagueId === lg.id
                            ? "border-[#d6a735] ring-1 ring-[#d6a735]/40"
                            : "border-[#114232] hover:border-[#184d3c]"
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-base text-[#f5efdf] line-clamp-1">
                              {lg.title}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-extrabold shrink-0 ${
                                lg.status === "registration"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                  : lg.status === "active"
                                  ? "bg-amber-950 text-amber-400 border border-amber-500/40"
                                  : lg.status === "completed"
                                  ? "bg-blue-950 text-blue-400 border border-blue-500/40"
                                  : "bg-red-950 text-red-400 border border-red-500/40"
                              }`}
                            >
                              {lg.status}
                            </span>
                          </div>

                          <p className="text-xs text-[#a3b8b0] line-clamp-2">
                            {lg.description}
                          </p>

                          <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#081c15] rounded-xl text-xs border border-[#114232]">
                            <div>
                              <span className="text-[10px] text-[#a3b8b0] block uppercase font-bold">Format</span>
                              <span className="text-[#f5efdf] font-semibold capitalize">{lg.format.replace("_", " ")}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#a3b8b0] block uppercase font-bold">Prize Pool</span>
                              <span className="text-[#d6a735] font-bold">{lg.prizePoolPoints} Points</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#a3b8b0] block uppercase font-bold">Enrolled</span>
                              <span className="text-[#f5efdf] font-semibold">{lg.participantCount} / {lg.maxParticipants}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#a3b8b0] block uppercase font-bold">Schedule</span>
                              <span className="text-[#f5efdf] font-semibold truncate block">{lg.scheduleDate || "TBD"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-[#114232]">
                          <button
                            onClick={() => {
                              setSelectedLeagueId(lg.id);
                              setActiveTab("manage");
                              setManageSubTab("overview");
                            }}
                            className="flex-1 py-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#f5efdf] font-bold text-xs rounded-xl transition-all border border-[#184d3c] flex items-center justify-center gap-1.5"
                          >
                            <Settings size={14} className="text-[#d6a735]" /> Open Command Center
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CREATE TOURNAMENT WIZARD */}
            {activeTab === "create" && (
              <form
                onSubmit={handleCreateLeague}
                className="p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6 max-w-3xl mx-auto"
              >
                <div>
                  <h3 className="text-xl font-black text-[#f5efdf] flex items-center gap-2">
                    <Plus size={22} className="text-[#d6a735]" /> Create Production Tournament
                  </h3>
                  <p className="text-xs text-[#a3b8b0] mt-1">
                    Set up a new tournament with custom format, guaranteed prize pool, and official turn clocks.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                      Tournament Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Greater Accra 10x10 Masters Cup 2026"
                      className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                      Tournament Description
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tournament overview, rules, venue information..."
                      className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                        Tournament Format
                      </label>
                      <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as TournamentFormat)}
                        className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      >
                        <option value="single_elimination">Single Elimination Bracket</option>
                        <option value="double_elimination">Double Elimination Bracket</option>
                        <option value="round_robin">Round Robin League</option>
                        <option value="swiss">Swiss System</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                        Max Participant Capacity
                      </label>
                      <select
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      >
                        <option value={4}>4 Players (Semi-Final Start)</option>
                        <option value={8}>8 Players (Quarter-Final Start)</option>
                        <option value={16}>16 Players (Round of 16)</option>
                        <option value={32}>32 Players (Grand Stage)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                        Entry Fee (Points)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={entryFee}
                        onChange={(e) => setEntryFee(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                        Guaranteed Prize Pool (Points)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={prizePool}
                        onChange={(e) => setPrizePool(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                        Schedule Days
                      </label>
                      <input
                        type="text"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        placeholder="e.g. Saturdays & Sundays"
                        className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                        Match Start Time
                      </label>
                      <input
                        type="text"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        placeholder="e.g. 18:00 GMT"
                        className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                        Turn Clock Timer
                      </label>
                      <select
                        value={turnTimerSeconds}
                        onChange={(e) => setTurnTimerSeconds(Number(e.target.value))}
                        className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
                      >
                        <option value={30}>30 Seconds (Blitz)</option>
                        <option value={60}>60 Seconds (Standard)</option>
                        <option value={90}>90 Seconds (Relaxed)</option>
                        <option value={120}>120 Seconds (Classical)</option>
                      </select>
                    </div>
                  </div>

                  {/* Private Code & Approval Required */}
                  <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isPrivate"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="accent-[#d6a735]"
                      />
                      <label htmlFor="isPrivate" className="text-xs text-[#f5efdf] font-bold cursor-pointer">
                        Private Tournament (Requires Invite Code)
                      </label>
                    </div>

                    {isPrivate && (
                      <div>
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          placeholder="Passcode e.g. DAMII2026"
                          className="w-full px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#d6a735] font-mono focus:outline-none"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-3 sm:col-span-2">
                      <input
                        type="checkbox"
                        id="requiresApproval"
                        checked={requiresApproval}
                        onChange={(e) => setRequiresApproval(e.target.checked)}
                        className="accent-[#d6a735]"
                      />
                      <label htmlFor="requiresApproval" className="text-xs text-[#f5efdf] font-bold cursor-pointer">
                        Require Organizer Approval for Player Registrations
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  {busy ? "Launching Tournament..." : "Create & Launch Tournament"}
                </button>
              </form>
            )}

            {/* TAB 3: TOURNAMENT COMMAND CENTER */}
            {activeTab === "manage" && selectedLeague && (
              <div className="space-y-6">
                {/* Selected Tournament Header */}
                <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-[#f5efdf]">
                        {selectedLeague.title}
                      </h2>
                      <span className="px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/80 text-[#d6a735] text-[10px] uppercase font-black rounded">
                        {selectedLeague.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#a3b8b0] mt-1">
                      Format: <strong className="text-[#f5efdf] capitalize">{selectedLeague.format.replace("_", " ")}</strong> • Prize Pool: <strong className="text-[#d6a735]">{selectedLeague.prizePoolPoints} Points</strong> • Turn Clock: <strong className="text-[#f5efdf]">{selectedLeague.turnTimerSeconds || 60}s</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectedLeagueId && loadLeagueDetails(selectedLeagueId)}
                      className="px-3.5 py-2 bg-[#081c15] hover:bg-[#0c3b2e] border border-[#114232] text-[#d6a735] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw size={14} /> Sync State
                    </button>

                    {selectedLeague.status !== "completed" && selectedLeague.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={handleCancelTournament}
                        className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-all"
                      >
                        <Trash2 size={14} /> Cancel Tournament
                      </button>
                    )}
                  </div>
                </div>

                {/* Command Sub-Tabs */}
                <div className="flex items-center gap-2 border-b border-[#114232] pb-3 overflow-x-auto">
                  <button
                    onClick={() => setManageSubTab("overview")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                      manageSubTab === "overview"
                        ? "bg-[#d6a735] text-[#06261f]"
                        : "text-[#a3b8b0] hover:text-white"
                    }`}
                  >
                    <Grid size={15} /> Overview & Launch
                  </button>

                  <button
                    onClick={() => setManageSubTab("participants")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                      manageSubTab === "participants"
                        ? "bg-[#d6a735] text-[#06261f]"
                        : "text-[#a3b8b0] hover:text-white"
                    }`}
                  >
                    <Users size={15} /> Roster ({activeLeagueDetails?.participants.length || 0})
                  </button>

                  <button
                    onClick={() => setManageSubTab("bracket")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                      manageSubTab === "bracket"
                        ? "bg-[#d6a735] text-[#06261f]"
                        : "text-[#a3b8b0] hover:text-white"
                    }`}
                  >
                    <Gavel size={15} /> Bracket & Matches ({activeLeagueDetails?.matches.length || 0})
                  </button>

                  <button
                    onClick={() => setManageSubTab("prizes")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                      manageSubTab === "prizes"
                        ? "bg-[#d6a735] text-[#06261f]"
                        : "text-[#a3b8b0] hover:text-white"
                    }`}
                  >
                    <Award size={15} /> Prize Disbursement
                  </button>
                </div>

                {/* SUB-TAB 1: OVERVIEW & LAUNCH */}
                {manageSubTab === "overview" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Status & Actions */}
                    <div className="md:col-span-2 p-6 bg-[#06261f] border border-[#114232] rounded-3xl space-y-6">
                      <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                        <Zap size={18} className="text-[#d6a735]" /> Tournament Status & Bracket Controller
                      </h3>

                      {selectedLeague.status === "registration" && (
                        <div className="p-5 bg-[#081c15] border border-[#114232] rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-sm text-[#f5efdf]">
                                Registration Open
                              </h4>
                              <p className="text-xs text-[#a3b8b0] mt-0.5">
                                Currently {activeLeagueDetails?.participants.filter((p) => p.status === "approved" || !p.status).length || 0} approved players enrolled out of {selectedLeague.maxParticipants}.
                              </p>
                            </div>
                            <button
                              onClick={handleGenerateBracket}
                              disabled={
                                busy ||
                                (activeLeagueDetails?.participants.filter((p) => p.status === "approved" || !p.status).length || 0) < 2
                              }
                              className="px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                            >
                              <Play size={16} /> Generate & Launch Bracket
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedLeague.status === "active" && (
                        <div className="p-5 bg-amber-950/40 border border-amber-500/50 rounded-2xl space-y-3">
                          <h4 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                            <Play size={16} /> Matches In Progress
                          </h4>
                          <p className="text-xs text-[#a3b8b0]">
                            Matches are active. Open the <strong>Bracket & Matches</strong> tab to generate match room codes or record match winner results.
                          </p>
                        </div>
                      )}

                      {selectedLeague.status === "completed" && (
                        <div className="p-5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl space-y-3">
                          <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
                            <Trophy size={18} /> Tournament Completed
                          </h4>
                          <p className="text-xs text-[#a3b8b0]">
                            Winner: <strong className="text-[#f5efdf]">{selectedLeague.winnerName || "Champion"}</strong>. Review the Prize Disbursement tab for transaction receipts.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-[#d6a735] uppercase">
                          Tournament Rules & Special Instructions
                        </h4>
                        <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl text-xs text-[#f5efdf] leading-relaxed whitespace-pre-line">
                          {selectedLeague.rulesNotes || "Standard Ghanaian 10x10 Damii rules apply."}
                        </div>
                      </div>
                    </div>

                    {/* Quick Specs Sidebar */}
                    <div className="p-6 bg-[#06261f] border border-[#114232] rounded-3xl space-y-4">
                      <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                        <Shield size={18} className="text-[#d6a735]" /> Specifications
                      </h3>

                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-[#114232]">
                          <span className="text-[#a3b8b0]">Facilitator</span>
                          <span className="text-[#f5efdf] font-bold">{selectedLeague.facilitatorName}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#114232]">
                          <span className="text-[#a3b8b0]">Format</span>
                          <span className="text-[#f5efdf] font-bold capitalize">{selectedLeague.format.replace("_", " ")}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#114232]">
                          <span className="text-[#a3b8b0]">Entry Fee</span>
                          <span className="text-[#f5efdf] font-bold">{selectedLeague.entryFeePoints} Points</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#114232]">
                          <span className="text-[#a3b8b0]">Guaranteed Escrow</span>
                          <span className="text-[#d6a735] font-bold">{selectedLeague.prizePoolPoints} Points</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#114232]">
                          <span className="text-[#a3b8b0]">Turn Clock</span>
                          <span className="text-[#f5efdf] font-bold">{selectedLeague.turnTimerSeconds || 60}s / move</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-[#114232]">
                          <span className="text-[#a3b8b0]">Private Code</span>
                          <span className="text-[#d6a735] font-mono font-bold">{selectedLeague.isPrivate ? selectedLeague.inviteCode || "Yes" : "Public"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: PARTICIPANTS ROSTER & APPLICATIONS */}
                {manageSubTab === "participants" && (
                  <div className="space-y-6">
                    {/* Manual Player Addition Bar */}
                    <form
                      onSubmit={handleAddManualPlayer}
                      className="p-4 bg-[#06261f] border border-[#114232] rounded-2xl flex flex-col sm:flex-row items-center gap-3"
                    >
                      <UserPlus size={20} className="text-[#d6a735] shrink-0" />
                      <input
                        type="text"
                        value={manualPlayerName}
                        onChange={(e) => setManualPlayerName(e.target.value)}
                        placeholder="Enroll player by username..."
                        className="flex-1 px-3.5 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-xs text-[#f5efdf] placeholder-[#a3b8b0]/50 focus:outline-none focus:border-[#d6a735]"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full sm:w-auto px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all shadow-md shrink-0"
                      >
                        Enroll Player
                      </button>
                    </form>

                    {/* Pending Applications section */}
                    {activeLeagueDetails?.participants.some((p) => p.status === "pending") && (
                      <div className="p-6 bg-amber-950/40 border border-amber-500/50 rounded-3xl space-y-4">
                        <h3 className="font-bold text-sm text-[#d6a735] flex items-center gap-2">
                          <UserCheck size={18} /> Pending Player Registration Applications
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeLeagueDetails.participants
                            .filter((p) => p.status === "pending")
                            .map((p) => (
                              <div
                                key={p.id}
                                className="p-3.5 bg-[#081c15] border border-[#114232] rounded-xl flex items-center justify-between gap-3 text-xs"
                              >
                                <div>
                                  <span className="font-bold text-[#f5efdf] block">{p.username}</span>
                                  <span className="text-[10px] text-[#a3b8b0]">Applied {new Date(p.joinedAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleApproveParticipant(p.id)}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleRejectParticipant(p.id)}
                                    className="px-2.5 py-1 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Approved Participant Roster */}
                    <div className="p-6 bg-[#06261f] border border-[#114232] rounded-3xl space-y-4">
                      <h3 className="font-bold text-base text-[#f5efdf] flex items-center gap-2">
                        <Users size={18} className="text-[#d6a735]" /> Confirmed Roster ({activeLeagueDetails?.participants.filter((p) => p.status === "approved" || !p.status).length || 0})
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {activeLeagueDetails?.participants
                          .filter((p) => p.status === "approved" || !p.status)
                          .map((p, idx) => (
                            <div
                              key={p.id}
                              className="p-3.5 bg-[#081c15] border border-[#114232] rounded-xl flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] font-black rounded-lg flex items-center justify-center shrink-0">
                                  #{p.seed || idx + 1}
                                </span>
                                <div>
                                  <span className="font-bold text-[#f5efdf] block">{p.username}</span>
                                  <span className="text-[10px] text-emerald-400">Enrolled ✓</span>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: BRACKET ENGINE & MATCHES */}
                {manageSubTab === "bracket" && (
                  <div className="space-y-6">
                    {/* Interactive Bracket Tree */}
                    {activeLeagueDetails && (
                      <BracketTreeView
                        matches={activeLeagueDetails.matches}
                        participants={activeLeagueDetails.participants}
                        format={selectedLeague.format}
                        isFacilitator={true}
                        onStartMatch={(matchId) => handleStartMatchRoom(matchId)}
                        onSetScore={(match) => {
                          setSelectedMatchForScore(match);
                          setScoringWinnerToken(match.player1Token || "");
                          setScoringDisputeNotes("");
                        }}
                      />
                    )}
                  </div>
                )}

                {/* SUB-TAB 4: PRIZE DISBURSEMENT */}
                {manageSubTab === "prizes" && (
                  <div className="p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl space-y-6 max-w-2xl mx-auto">
                    <div>
                      <h3 className="text-xl font-black text-[#f5efdf] flex items-center gap-2">
                        <Award size={22} className="text-[#d6a735]" /> Prize Pool Financial Disbursement
                      </h3>
                      <p className="text-xs text-[#a3b8b0] mt-1">
                        Review the prize distribution matrix and execute official ledger payouts directly to winner accounts.
                      </p>
                    </div>

                    <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-[#114232]">
                        <span className="text-[#a3b8b0]">Gross Guaranteed Prize Pool</span>
                        <span className="font-bold text-[#f5efdf]">{selectedLeague.prizePoolPoints} Points</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#114232]">
                        <span className="text-[#a3b8b0]">DAMII Platform Fee (10%)</span>
                        <span className="font-bold text-amber-400">-{Math.round((selectedLeague.prizePoolPoints * 10) / 100)} Points</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm font-bold border-b border-[#114232]">
                        <span className="text-[#d6a735]">Net Winner Distribution Pool</span>
                        <span className="text-[#d6a735]">
                          {selectedLeague.prizePoolPoints - Math.round((selectedLeague.prizePoolPoints * 10) / 100)} Points
                        </span>
                      </div>

                      <div className="pt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-[#a3b8b0]">1st Place Champion ({selectedLeague.prizeDistribution?.first || 60}%)</span>
                          <span className="font-bold text-[#f5efdf]">
                            {Math.round(
                              ((selectedLeague.prizePoolPoints - Math.round((selectedLeague.prizePoolPoints * 10) / 100)) *
                                (selectedLeague.prizeDistribution?.first || 60)) /
                                100
                            )}{" "}
                            Points
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a3b8b0]">2nd Place Runner-Up ({selectedLeague.prizeDistribution?.second || 30}%)</span>
                          <span className="font-bold text-[#f5efdf]">
                            {Math.round(
                              ((selectedLeague.prizePoolPoints - Math.round((selectedLeague.prizePoolPoints * 10) / 100)) *
                                (selectedLeague.prizeDistribution?.second || 30)) /
                                100
                            )}{" "}
                            Points
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a3b8b0]">3rd Place ({selectedLeague.prizeDistribution?.third || 10}%)</span>
                          <span className="font-bold text-[#f5efdf]">
                            {Math.round(
                              ((selectedLeague.prizePoolPoints - Math.round((selectedLeague.prizePoolPoints * 10) / 100)) *
                                (selectedLeague.prizeDistribution?.third || 10)) /
                                100
                            )}{" "}
                            Points
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-2 text-xs">
                      <h4 className="font-bold text-[#d6a735]">Tournament Podium Standings</h4>
                      <p><strong className="text-[#f5efdf]">Champion:</strong> {selectedLeague.winnerName || "Decided via Bracket Matches"}</p>
                      <p><strong className="text-[#f5efdf]">Runner-Up:</strong> {selectedLeague.runnerUpName || "TBD"}</p>
                    </div>

                    <button
                      onClick={handleExecutePrizeDisbursement}
                      disabled={busy}
                      className="w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
                    >
                      <Coins size={18} />
                      {busy ? "Disbursing Funds..." : "Execute Automated Prize Disbursement"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Score Override Modal */}
        {selectedMatchForScore && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#06261f] border border-[#184d3c] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#114232] pb-3">
                <h3 className="font-bold text-base text-[#f5efdf] flex items-center gap-2">
                  <Gavel size={18} className="text-[#d6a735]" /> Record Match Result
                </h3>
                <button
                  onClick={() => setSelectedMatchForScore(null)}
                  className="text-[#a3b8b0] hover:text-white"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Select Match Winner
                  </label>
                  <select
                    value={scoringWinnerToken}
                    onChange={(e) => setScoringWinnerToken(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none"
                  >
                    {selectedMatchForScore.player1Token && (
                      <option value={selectedMatchForScore.player1Token}>
                        {selectedMatchForScore.player1Name} (Win)
                      </option>
                    )}
                    {selectedMatchForScore.player2Token && (
                      <option value={selectedMatchForScore.player2Token}>
                        {selectedMatchForScore.player2Name} (Win)
                      </option>
                    )}
                    <option value="draw">Match Draw</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Dispute / Verification Notes
                  </label>
                  <textarea
                    rows={2}
                    value={scoringDisputeNotes}
                    onChange={(e) => setScoringDisputeNotes(e.target.value)}
                    placeholder="Enter reason for result submission..."
                    className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMatchForScore(null)}
                  className="flex-1 py-2.5 bg-[#081c15] border border-[#114232] text-[#a3b8b0] font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveScoreOverride}
                  disabled={busy}
                  className="flex-1 py-2.5 bg-[#d6a735] text-[#06261f] font-black rounded-xl text-xs shadow-md"
                >
                  Confirm & Advance
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
