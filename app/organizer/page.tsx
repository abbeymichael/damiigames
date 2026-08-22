"use client";

import { useEffect, useState } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import { OrganizerApplicationForm } from "@/components/organizer/OrganizerApplicationForm";
import { OrganizerPerformanceAnalytics } from "@/components/organizer/OrganizerPerformanceAnalytics";
import { BatchFixtureScheduler } from "@/components/organizer/BatchFixtureScheduler";
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
  Radio,
  Megaphone,
  Hourglass,
  Swords,
  Timer,
  FastForward,
  Bell,
} from "lucide-react";
import type {
  League,
  LeagueMatch,
  LeagueParticipant,
  TournamentFormat,
  PrizeDistribution,
  OrganizerProfile,
} from "@/lib/types";
import { BracketTreeView } from "@/components/BracketTreeView";
import { CountdownTimer } from "@/components/CountdownTimer";
import { getAuthHeaders, saveSessionToken } from "@/lib/client-auth";

export default function OrganizerPage() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);

  // Auth form state for unauthenticated users
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPasscode, setLoginPasscode] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPasscode, setRegPasscode] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regOtpRequestId, setRegOtpRequestId] = useState("");
  const [regOtpCode, setRegOtpCode] = useState("");
  const [regOtpCooldown, setRegOtpCooldown] = useState(0);
  const [regOtpDebugCode, setRegOtpDebugCode] = useState<string | null>(null);
  const [regIsSendingOtp, setRegIsSendingOtp] = useState(false);
  const [regIsVerifyingOtp, setRegIsVerifyingOtp] = useState(false);

  // Countdown timer for registration OTP cooldown
  useEffect(() => {
    if (regOtpCooldown > 0) {
      const timer = setTimeout(() => setRegOtpCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [regOtpCooldown]);

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
  const [activeTab, setActiveTab] = useState<"tournaments" | "analytics" | "create" | "manage">("tournaments");
  const [manageSubTab, setManageSubTab] = useState<"overview" | "participants" | "fixtures" | "bracket" | "prizes">("overview");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Async States
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Fixtures & Scheduling States
  const [scheduleRoundNumber, setScheduleRoundNumber] = useState(1);
  const [scheduleRoundStartTime, setScheduleRoundStartTime] = useState("");
  const [scheduleRoundInterval, setScheduleRoundInterval] = useState(0);
  const [delayRoundNumber, setDelayRoundNumber] = useState(1);
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [delayReason, setDelayReason] = useState("");
  const [fixtureRoundFilter, setFixtureRoundFilter] = useState<number | "all">("all");

  // Single Match Schedule Modal
  const [selectedMatchForSchedule, setSelectedMatchForSchedule] = useState<LeagueMatch | null>(null);
  const [scheduledMatchDateTime, setScheduledMatchDateTime] = useState("");

  // Forfeit Match Modal
  const [selectedMatchForForfeit, setSelectedMatchForForfeit] = useState<LeagueMatch | null>(null);
  const [forfeitPlayerToken, setForfeitPlayerToken] = useState("");
  const [forfeitReason, setForfeitReason] = useState("");

  // Broadcast Announcement
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementType, setAnnouncementType] = useState<"general" | "urgent" | "schedule">("general");

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
        headers: getAuthHeaders(),
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

      saveSessionToken(data.token, data.csrfToken);
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

  const handleRequestRegOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRegIsSendingOtp(true);
    setError("");
    setSuccess("");

    const clean = regPhone.trim().replace(/[\s\-()]/g, "");
    if (!clean) {
      setError("Please enter a valid Ghana mobile phone number (e.g. 0244123456).");
      setRegIsSendingOtp(false);
      return;
    }

    if (clean.length < 9 || clean.length > 16) {
      setError("Invalid phone number format. Please enter a valid 10-digit Ghana number.");
      setRegIsSendingOtp(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: clean,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to send verification code.");
        if (data.retryAfter) {
          setRegOtpCooldown(Math.min(60, data.retryAfter));
        }
        return;
      }

      setRegOtpRequestId(data.requestId);
      if (data.debugCode) {
        setRegOtpDebugCode(data.debugCode);
      }
      setRegOtpCooldown(60);
      setSuccess(`6-digit verification code sent to ${clean}. Enter code below to complete account registration.`);
    } catch {
      setError("Server connection failed during OTP request.");
    } finally {
      setRegIsSendingOtp(false);
    }
  };

  const handleVerifyRegOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegIsVerifyingOtp(true);
    setError("");
    setSuccess("");

    if (!regOtpRequestId) {
      setError("Please request a phone verification code first.");
      setRegIsVerifyingOtp(false);
      return;
    }

    if (!regOtpCode.trim() || regOtpCode.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      setRegIsVerifyingOtp(false);
      return;
    }

    if (!regUsername.trim()) {
      setError("Desired username / organizer handle is required.");
      setRegIsVerifyingOtp(false);
      return;
    }

    if (!regPasscode.trim() || regPasscode.length < 3) {
      setError("Password must be at least 3 characters.");
      setRegIsVerifyingOtp(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: regOtpRequestId,
          code: regOtpCode.trim(),
          username: regUsername.trim(),
          password: regPasscode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Phone verification failed. Please check the code and try again.");
        setRegIsVerifyingOtp(false);
        return;
      }

      saveSessionToken(data.token, data.csrfToken);
      localStorage.setItem("damii-player-token", data.token);
      localStorage.setItem("damii-player-name", data.user?.username || data.profile?.username || regUsername.trim());
      localStorage.setItem(
        "damii-auth-user",
        JSON.stringify({
          token: data.token,
          username: data.user?.username || data.profile?.username || regUsername.trim(),
          points: data.profile?.points || 500,
          role: data.user?.role || data.profile?.role || "user",
        })
      );

      setToken(data.token);
      setUsername(data.user?.username || data.profile?.username || regUsername.trim());
      setRole(data.user?.role || data.profile?.role || "user");
      setSuccess(`Phone verified and account created successfully! Welcome, ${data.user?.username || regUsername.trim()}. You can now complete your Organizer application.`);
      window.dispatchEvent(new Event("damii-auth-changed"));
      fetchOrganizerRequestStatus(data.token);
      loadLeagues();
    } catch {
      setError("Server connection failed during registration verification.");
    } finally {
      setRegIsVerifyingOtp(false);
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          organizationName: appOrgName.trim(),
          contactPhone: appContactPhone.trim(),
          bio: appBio.trim()
            ? `[National ID / Reg ID: ${appGhanaCardPin || "Provided"}] ${appBio.trim()} (Expected Frequency: ${appFrequency})`
            : `[National ID / Reg ID: ${appGhanaCardPin || "Provided"}] Expected Frequency: ${appFrequency}`,
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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

  const handleScheduleMatch = async (matchId: string, scheduledTimeIso: string) => {
    if (!selectedLeagueId || !matchId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "schedule_match",
          token,
          leagueId: selectedLeagueId,
          matchId,
          scheduledTime: scheduledTimeIso,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to schedule match");

      setSuccess("Match scheduled successfully!");
      setSelectedMatchForSchedule(null);
      loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scheduling failed");
    } finally {
      setBusy(false);
    }
  };

  const handleScheduleRound = async () => {
    if (!selectedLeagueId || !scheduleRoundStartTime) {
      setError("Please pick a starting date and time for the round.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const startTimeIso = new Date(scheduleRoundStartTime).toISOString();
      const res = await fetch("/api/league", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "schedule_round",
          token,
          leagueId: selectedLeagueId,
          round: Number(scheduleRoundNumber),
          startTime: startTimeIso,
          intervalMinutes: Number(scheduleRoundInterval) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to schedule round fixtures");

      setSuccess(`Round ${scheduleRoundNumber} fixtures scheduled successfully!`);
      loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Round scheduling failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDelayRound = async () => {
    if (!selectedLeagueId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "delay_round",
          token,
          leagueId: selectedLeagueId,
          round: Number(delayRoundNumber),
          delayMinutes: Number(delayMinutes) || 10,
          reason: delayReason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to delay round");

      setSuccess(`Round ${delayRoundNumber} delayed by ${delayMinutes} minutes! Participants notified.`);
      setDelayReason("");
      loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Round delay failed");
    } finally {
      setBusy(false);
    }
  };

  const handleForfeitMatch = async () => {
    if (!selectedLeagueId || !selectedMatchForForfeit || !forfeitPlayerToken) {
      setError("Please select the player forfeiting the match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "forfeit_match",
          token,
          leagueId: selectedLeagueId,
          matchId: selectedMatchForForfeit.id,
          forfeitPlayerToken,
          reason: forfeitReason.trim() || "Walkover forfeiture by organizer",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to forfeit match");

      setSuccess("Match walkover recorded and non-forfeiting player advanced to next round!");
      setSelectedMatchForForfeit(null);
      setForfeitReason("");
      setForfeitPlayerToken("");
      loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Forfeiture failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeagueId || !announcementMessage.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/league", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "broadcast_announcement",
          token,
          leagueId: selectedLeagueId,
          message: announcementMessage.trim(),
          type: announcementType,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to broadcast announcement");

      setSuccess("Announcement broadcast to all tournament participants!");
      setAnnouncementMessage("");
      loadLeagueDetails(selectedLeagueId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Broadcast failed");
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
                  {authMode === "login" ? "DAMII Organizer Hub Login" : "Register as New Organizer"}
                </h2>
                <p className="text-sm text-[#a3b8b0] mt-1.5 leading-relaxed">
                  {authMode === "login"
                    ? "Sign in with your official account credentials to access the Tournament Organizer Command Studio or check your license status."
                    : "Create a new DAMII account to start your official Certified Tournament Organizer license application."}
                </p>
              </div>

              {/* Mode Toggle Pills */}
              <div className="grid grid-cols-2 p-1 bg-[#081c15] border border-[#114232] rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setError("");
                    setSuccess("");
                  }}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    authMode === "login"
                      ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                      : "text-[#a3b8b0] hover:text-[#f5efdf]"
                  }`}
                >
                  <LogIn size={15} /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setError("");
                    setSuccess("");
                  }}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    authMode === "register"
                      ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                      : "text-[#a3b8b0] hover:text-[#f5efdf]"
                  }`}
                >
                  <UserPlus size={15} /> Register / Apply
                </button>
              </div>

              {authMode === "login" ? (
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

                  <div className="pt-2 text-center">
                    <p className="text-xs text-[#a3b8b0]">
                      Don&apos;t have an account yet?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("register");
                          setError("");
                          setSuccess("");
                        }}
                        className="text-[#d6a735] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        Register to apply for Organizer License →
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-left">
                  {/* Step 1: Ghana Mobile Phone Number (Required & Verified) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#d6a735] uppercase">
                      Ghana Mobile Phone (Required & Verified) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="e.g. 0244123456"
                        disabled={regIsSendingOtp || regIsVerifyingOtp}
                        className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm font-mono focus:outline-none focus:border-[#d6a735]"
                      />
                      <button
                        type="button"
                        onClick={() => handleRequestRegOtp()}
                        disabled={regIsSendingOtp || !regPhone.trim() || regOtpCooldown > 0}
                        className="px-4 py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs whitespace-nowrap transition-all shadow-md disabled:opacity-50"
                      >
                        {regIsSendingOtp
                          ? "Sending..."
                          : regOtpCooldown > 0
                          ? `${regOtpCooldown}s`
                          : regOtpRequestId
                          ? "Resend Code"
                          : "Send OTP"}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#a3b8b0]">
                      We will send a 6-digit SMS verification code to verify your phone number.
                    </p>
                  </div>

                  {/* Step 2: OTP Code & Password */}
                  {regOtpRequestId ? (
                    <form onSubmit={handleVerifyRegOtpAndRegister} className="space-y-4 pt-2 border-t border-[#114232] animate-in fade-in">
                      {regOtpDebugCode && (
                        <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-mono flex items-center justify-between">
                          <span>Demo Environment Code:</span>
                          <span className="font-bold text-[#d6a735] text-sm">{regOtpDebugCode}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                          6-Digit Verification Code *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={regOtpCode}
                          onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="123456"
                          className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-center tracking-widest font-mono text-lg font-black focus:outline-none focus:border-[#d6a735]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                          Desired Username / Organizer Handle *
                        </label>
                        <input
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="e.g. Accra_Draughts_Club"
                          className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                          Password / Passcode *
                        </label>
                        <input
                          type="password"
                          required
                          value={regPasscode}
                          onChange={(e) => setRegPasscode(e.target.value)}
                          placeholder="Create password (min 3 chars)"
                          className="w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={regIsVerifyingOtp || regOtpCode.length !== 6 || !regUsername.trim() || !regPasscode.trim()}
                        className="w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        <UserPlus size={18} />
                        {regIsVerifyingOtp ? "Verifying Phone & Creating Account..." : "Verify & Apply for Organizer License"}
                      </button>
                    </form>
                  ) : null}

                  <div className="pt-2 text-center">
                    <p className="text-xs text-[#a3b8b0]">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setError("");
                          setSuccess("");
                        }}
                        className="text-[#d6a735] font-bold hover:underline inline-flex items-center gap-1"
                      >
                        Sign in to your account →
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* --- CASE 2: LOGGED IN BUT UNAPPROVED ORGANIZER APPLICANT --- */}
        {token && !isApprovedOrganizer && (
          <section className="max-w-4xl mx-auto space-y-6">
            <OrganizerApplicationForm
              token={token}
              userRole={role}
              onApplicationUpdated={(app) => {
                if (app.status === "approved") {
                  setRole("organizer");
                }
              }}
              onSuccessNavigate={() => {
                fetchOrganizerRequestStatus(token);
              }}
            />
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
                  onClick={() => setActiveTab("analytics")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === "analytics"
                      ? "bg-[#d6a735] text-[#06261f] shadow-md"
                      : "text-[#a3b8b0] hover:text-white"
                  }`}
                >
                  <TrendingUp size={16} /> Performance Analytics
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

            {/* TAB: PERFORMANCE ANALYTICS */}
            {activeTab === "analytics" && (
              <OrganizerPerformanceAnalytics
                leagues={leagues}
                currentUserId={token}
                currentUsername={username}
                onSelectLeague={(id) => {
                  setSelectedLeagueId(id);
                  setActiveTab("manage");
                  setManageSubTab("overview");
                }}
                onCreateTournament={() => setActiveTab("create")}
              />
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
                    onClick={() => setManageSubTab("fixtures")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                      manageSubTab === "fixtures"
                        ? "bg-[#d6a735] text-[#06261f]"
                        : "text-[#a3b8b0] hover:text-white"
                    }`}
                  >
                    <Calendar size={15} /> Fixtures & Scheduling ({activeLeagueDetails?.matches.length || 0})
                  </button>

                  <button
                    onClick={() => setManageSubTab("bracket")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                      manageSubTab === "bracket"
                        ? "bg-[#d6a735] text-[#06261f]"
                        : "text-[#a3b8b0] hover:text-white"
                    }`}
                  >
                    <Gavel size={15} /> Bracket Tree
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
                          {selectedLeague.rulesNotes || "Standard 10x10 Damii rules apply."}
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

                {/* SUB-TAB: FIXTURES & SCHEDULING CONTROL CENTER */}
                {manageSubTab === "fixtures" && (
                  <div className="space-y-8">
                    {/* 1. Automated Batch Fixture Scheduler Utility */}
                    {activeLeagueDetails && (
                      <BatchFixtureScheduler
                        league={activeLeagueDetails.league}
                        matches={activeLeagueDetails.matches}
                        token={token}
                        onScheduleApplied={() => {
                          if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
                        }}
                        busy={busy}
                        setBusy={setBusy}
                        setError={setError}
                        setSuccess={setSuccess}
                      />
                    )}

                    {/* Quick Adjustment Tools: Delay Round & Broadcast Announcements */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* 2. Delay / Push Round */}
                      <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl space-y-4 shadow-xl">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Hourglass size={18} />
                          <h3 className="font-bold text-sm text-[#f5efdf]">Delay / Extend Break</h3>
                        </div>
                        <p className="text-xs text-[#a3b8b0]">
                          Need more time between rounds? Push round start time back by minutes and update countdowns.
                        </p>

                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block text-[#a3b8b0] mb-1 font-bold">Select Round to Delay</label>
                            <select
                              value={delayRoundNumber}
                              onChange={(e) => setDelayRoundNumber(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none"
                            >
                              {Array.from(new Set(activeLeagueDetails?.matches.map((m) => m.round) || [1])).map((r) => (
                                <option key={r} value={r}>
                                  Round / Cycle {r}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[#a3b8b0] mb-1 font-bold">Delay Duration</label>
                            <select
                              value={delayMinutes}
                              onChange={(e) => setDelayMinutes(Number(e.target.value))}
                              className="w-full px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none"
                            >
                              <option value={5}>+5 Minutes Break</option>
                              <option value={10}>+10 Minutes Break</option>
                              <option value={15}>+15 Minutes Break</option>
                              <option value={20}>+20 Minutes Break</option>
                              <option value={30}>+30 Minutes Break</option>
                              <option value={60}>+60 Minutes Break</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[#a3b8b0] mb-1 font-bold">Reason Note (Sent to players)</label>
                            <input
                              type="text"
                              value={delayReason}
                              onChange={(e) => setDelayReason(e.target.value)}
                              placeholder="e.g. 10 minute rest break before semifinals..."
                              className="w-full px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            disabled={busy}
                            onClick={handleDelayRound}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                          >
                            <FastForward size={14} /> Push Round {delayRoundNumber} (+{delayMinutes}m)
                          </button>
                        </div>
                      </div>

                      {/* 3. Broadcast Announcement */}
                      <form
                        onSubmit={handleBroadcastAnnouncement}
                        className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl space-y-4 shadow-xl flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sky-400">
                            <Megaphone size={18} />
                            <h3 className="font-bold text-sm text-[#f5efdf]">Broadcast Notification</h3>
                          </div>
                          <p className="text-xs text-[#a3b8b0]">
                            Send live alerts directly to all registered players (fixtures update, check-in calls, etc).
                          </p>

                          <div>
                            <label className="block text-[#a3b8b0] mb-1 font-bold text-xs">Alert Priority</label>
                            <select
                              value={announcementType}
                              onChange={(e) => setAnnouncementType(e.target.value as any)}
                              className="w-full px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none"
                            >
                              <option value="general">General Announcement</option>
                              <option value="schedule">Schedule &amp; Fixtures Alert</option>
                              <option value="urgent">Urgent Check-in / Notice</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[#a3b8b0] mb-1 font-bold text-xs">Message</label>
                            <textarea
                              rows={2}
                              value={announcementMessage}
                              onChange={(e) => setAnnouncementMessage(e.target.value)}
                              placeholder="e.g. Round 2 starting at 19:30 GMT. Please head to your boards!"
                              className="w-full px-3 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={busy || !announcementMessage.trim()}
                          className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 mt-3"
                        >
                          <Send size={14} /> Send Broadcast to All Players
                        </button>
                      </form>
                    </div>

                    {/* Fixtures List with Per-Match Controls */}
                    <div className="p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl space-y-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#184d3c] pb-4">
                        <div>
                          <h3 className="text-base font-bold text-[#f5efdf] flex items-center gap-2">
                            <Swords size={18} className="text-[#d6a735]" /> Match Fixtures Controller
                          </h3>
                          <p className="text-xs text-[#a3b8b0] mt-0.5">
                            Manage match times, room links, player walkovers, and live score results per fixture.
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#a3b8b0]">Filter Round:</span>
                          <select
                            value={fixtureRoundFilter}
                            onChange={(e) => setFixtureRoundFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                            className="px-3 py-1.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] font-bold focus:outline-none"
                          >
                            <option value="all">All Cycles / Rounds</option>
                            {Array.from(new Set(activeLeagueDetails?.matches.map((m) => m.round) || [])).map((r) => (
                              <option key={r} value={r}>
                                Round {r}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {activeLeagueDetails?.matches.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-6">
                          No matches generated yet. Launch the bracket from the Overview tab.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeLeagueDetails?.matches
                            .filter((m) => fixtureRoundFilter === "all" || m.round === fixtureRoundFilter)
                            .map((match) => {
                              const isFinished = match.status === "completed";
                              const isLive = match.status === "in_progress";

                              return (
                                <div
                                  key={match.id}
                                  className={`p-4 bg-[#081c15] border rounded-2xl space-y-3.5 transition-all ${
                                    isLive
                                      ? "border-amber-500/80 shadow-md ring-1 ring-amber-500/30"
                                      : isFinished
                                      ? "border-[#114232] opacity-80"
                                      : "border-[#184d3c] hover:border-[#d6a735]/40"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs pb-2 border-b border-[#114232]">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-[#d6a735]">
                                        R{match.round} • Match #{match.matchNumber}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                          isFinished
                                            ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                            : isLive
                                            ? "bg-amber-950 text-amber-300 border border-amber-600 animate-pulse"
                                            : "bg-[#06261f] text-slate-400 border border-[#184d3c]"
                                        }`}
                                      >
                                        {match.status.replace("_", " ")}
                                      </span>
                                    </div>

                                    {match.scheduledTime && !isFinished && (
                                      <CountdownTimer targetIso={match.scheduledTime} compact />
                                    )}
                                  </div>

                                  {/* Contestants */}
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between p-2 bg-[#06261f] rounded-xl font-bold">
                                      <span className={match.winnerToken === match.player1Token ? "text-[#d6a735]" : "text-[#f5efdf]"}>
                                        {match.player1Name || "TBD (Pending)"}
                                      </span>
                                      {match.winnerToken === match.player1Token && (
                                        <span className="text-[10px] text-[#d6a735] font-black flex items-center gap-1">
                                          <Trophy size={11} /> WINNER
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-center font-mono text-[9px] text-slate-500">VS</div>
                                    <div className="flex items-center justify-between p-2 bg-[#06261f] rounded-xl font-bold">
                                      <span className={match.winnerToken === match.player2Token ? "text-[#d6a735]" : "text-[#f5efdf]"}>
                                        {match.player2Name || "TBD (Pending)"}
                                      </span>
                                      {match.winnerToken === match.player2Token && (
                                        <span className="text-[10px] text-[#d6a735] font-black flex items-center gap-1">
                                          <Trophy size={11} /> WINNER
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Schedule Time & Action Buttons */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-[#114232] text-xs">
                                    <div className="text-[11px] text-slate-400 font-mono">
                                      {match.scheduledTime ? (
                                        <span className="flex items-center gap-1">
                                          <Clock size={11} className="text-[#d6a735]" />
                                          {new Date(match.scheduledTime).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(match.scheduledTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      ) : (
                                        <span className="text-slate-500">No time set</span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* Set Time Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedMatchForSchedule(match);
                                          setScheduledMatchDateTime(
                                            match.scheduledTime
                                              ? new Date(match.scheduledTime).toISOString().slice(0, 16)
                                              : ""
                                          );
                                        }}
                                        className="px-2.5 py-1 bg-[#06261f] hover:bg-[#0c3b2e] text-[#d6a735] font-bold rounded-lg border border-[#114232] text-[11px] flex items-center gap-1 transition-colors"
                                      >
                                        <Calendar size={11} /> Set Time
                                      </button>

                                      {/* Start Match / Room Code */}
                                      {!match.roomCode && match.status !== "completed" && (
                                        <button
                                          type="button"
                                          disabled={busy}
                                          onClick={() => handleStartMatchRoom(match.id)}
                                          className="px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg text-[11px] flex items-center gap-1 transition-all"
                                        >
                                          <Play size={11} className="fill-current" /> Launch Room
                                        </button>
                                      )}

                                      {match.roomCode && (
                                        <a
                                          href={`/arena?code=${match.roomCode}&mode=league&spectate=1`}
                                          className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 font-bold rounded-lg border border-emerald-700 text-[11px] flex items-center gap-1"
                                        >
                                          <Eye size={11} /> Arena ({match.roomCode})
                                        </a>
                                      )}

                                      {/* Forfeit Walkover Button */}
                                      {!isFinished && match.player1Token && match.player2Token && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedMatchForForfeit(match);
                                            setForfeitPlayerToken(match.player1Token || "");
                                            setForfeitReason("");
                                          }}
                                          className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 font-bold rounded-lg border border-red-800 text-[11px] flex items-center gap-1"
                                        >
                                          <UserX size={11} /> Walkover
                                        </button>
                                      )}

                                      {/* Score / Advance */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedMatchForScore(match);
                                          setScoringWinnerToken(match.player1Token || "");
                                          setScoringDisputeNotes("");
                                        }}
                                        className="px-2.5 py-1 bg-[#06261f] hover:bg-[#0c3b2e] text-[#f5efdf] font-bold rounded-lg border border-[#114232] text-[11px] flex items-center gap-1"
                                      >
                                        <Gavel size={11} /> Result
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
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

        {/* Schedule Single Match Modal */}
        {selectedMatchForSchedule && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#06261f] border border-[#184d3c] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#114232] pb-3">
                <h3 className="font-bold text-base text-[#f5efdf] flex items-center gap-2">
                  <Calendar size={18} className="text-[#d6a735]" /> Set Fixture Date &amp; Time
                </h3>
                <button
                  onClick={() => setSelectedMatchForSchedule(null)}
                  className="text-[#a3b8b0] hover:text-white"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-3 bg-[#081c15] border border-[#114232] rounded-2xl text-xs space-y-1">
                <div className="font-bold text-[#d6a735]">
                  Round {selectedMatchForSchedule.round} • Match #{selectedMatchForSchedule.matchNumber}
                </div>
                <div className="text-[#f5efdf]">
                  {selectedMatchForSchedule.player1Name || "TBD"} vs {selectedMatchForSchedule.player2Name || "TBD"}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#d6a735] uppercase">
                  Select Match Kickoff Date &amp; Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledMatchDateTime}
                  onChange={(e) => setScheduledMatchDateTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMatchForSchedule(null)}
                  className="flex-1 py-2.5 bg-[#081c15] border border-[#114232] text-[#a3b8b0] font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !scheduledMatchDateTime}
                  onClick={() => {
                    if (selectedMatchForSchedule && scheduledMatchDateTime) {
                      const isoString = new Date(scheduledMatchDateTime).toISOString();
                      handleScheduleMatch(selectedMatchForSchedule.id, isoString);
                    }
                  }}
                  className="flex-1 py-2.5 bg-[#d6a735] text-[#06261f] font-black rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forfeit / Walkover Modal */}
        {selectedMatchForForfeit && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#06261f] border border-[#184d3c] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#114232] pb-3">
                <h3 className="font-bold text-base text-red-300 flex items-center gap-2">
                  <UserX size={18} className="text-red-400" /> Forfeit Match / Walkover
                </h3>
                <button
                  onClick={() => setSelectedMatchForForfeit(null)}
                  className="text-[#a3b8b0] hover:text-white"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-red-300 uppercase mb-1.5">
                    Select Player Forfeiting (Opponent Will Advance)
                  </label>
                  <select
                    value={forfeitPlayerToken}
                    onChange={(e) => setForfeitPlayerToken(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#081c15] border border-red-900/60 rounded-xl text-[#f5efdf] text-sm focus:outline-none"
                  >
                    <option value="">-- Choose Forfeiting Player --</option>
                    {selectedMatchForForfeit.player1Token && (
                      <option value={selectedMatchForForfeit.player1Token}>
                        {selectedMatchForForfeit.player1Name} (Forfeits)
                      </option>
                    )}
                    {selectedMatchForForfeit.player2Token && (
                      <option value={selectedMatchForForfeit.player2Token}>
                        {selectedMatchForForfeit.player2Name} (Forfeits)
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Forfeiture Reason (No show, rule violation, disconnect, etc)
                  </label>
                  <input
                    type="text"
                    value={forfeitReason}
                    onChange={(e) => setForfeitReason(e.target.value)}
                    placeholder="e.g. Player did not report to board after grace period..."
                    className="w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMatchForForfeit(null)}
                  className="flex-1 py-2.5 bg-[#081c15] border border-[#114232] text-[#a3b8b0] font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !forfeitPlayerToken}
                  onClick={handleForfeitMatch}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  Award Walkover &amp; Advance
                </button>
              </div>
            </div>
          </div>
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
