import "../index.js";
import { C as createLucideIcon, S as Trophy, d as Zap, f as Shield, h as CircleAlert, t as SharedHeader, v as LogIn } from "./SharedHeader-D3NEmMWE.js";
import { a as UserCheck, i as Settings, n as Plus, r as RefreshCw, t as Play } from "./play-xhWKohq5.js";
import { n as Gavel, t as Search } from "./search-CTMFM0rA.js";
import { t as Users } from "./users-6aZuMbhg.js";
import { t as ShieldCheck } from "./shield-check-U2HHf4RL.js";
import { n as CircleCheckBig, t as Coins } from "./coins-BlPzvERC.js";
import { t as Award } from "./award-DPFkoqI5.js";
import { t as FileText } from "./file-text-G1EI3cI4.js";
import { t as Footer } from "./Footer-Dl82Y-rV.js";
import { n as Clock, r as Grid3x3, t as BracketTreeView } from "./BracketTreeView-AzxkgeK9.js";
import { t as ShieldAlert } from "./shield-alert-BsdUthEn.js";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var UserPlus = createLucideIcon("user-plus", [
	["path", {
		d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
		key: "1yyitq"
	}],
	["circle", {
		cx: "9",
		cy: "7",
		r: "4",
		key: "nufk8"
	}],
	["line", {
		x1: "19",
		x2: "19",
		y1: "8",
		y2: "14",
		key: "1bvyxn"
	}],
	["line", {
		x1: "22",
		x2: "16",
		y1: "11",
		y2: "11",
		key: "1shjgl"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Trash2 = createLucideIcon("trash-2", [
	["path", {
		d: "M10 11v6",
		key: "nco0om"
	}],
	["path", {
		d: "M14 11v6",
		key: "outv1u"
	}],
	["path", {
		d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
		key: "miytrc"
	}],
	["path", {
		d: "M3 6h18",
		key: "d0wm0j"
	}],
	["path", {
		d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
		key: "e791ji"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CircleX = createLucideIcon("circle-x", [
	["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}],
	["path", {
		d: "m15 9-6 6",
		key: "1uzhvr"
	}],
	["path", {
		d: "m9 9 6 6",
		key: "z0biqf"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Building2 = createLucideIcon("building-2", [
	["path", {
		d: "M10 12h4",
		key: "a56b0p"
	}],
	["path", {
		d: "M10 8h4",
		key: "1sr2af"
	}],
	["path", {
		d: "M14 21v-3a2 2 0 0 0-4 0v3",
		key: "1rgiei"
	}],
	["path", {
		d: "M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2",
		key: "secmi2"
	}],
	["path", {
		d: "M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16",
		key: "16ra0t"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var BadgeCheck = createLucideIcon("badge-check", [["path", {
	d: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
	key: "3c2336"
}], ["path", {
	d: "m9 12 2 2 4-4",
	key: "dzmm74"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Briefcase = createLucideIcon("briefcase", [["path", {
	d: "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
	key: "jecpp"
}], ["rect", {
	width: "20",
	height: "14",
	x: "2",
	y: "6",
	rx: "2",
	key: "i6l2r4"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Send = createLucideIcon("send", [["path", {
	d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
	key: "1ffxy3"
}], ["path", {
	d: "m21.854 2.147-10.94 10.939",
	key: "12cjpa"
}]]);
//#endregion
//#region app/organizer/page.tsx
function OrganizerPage() {
	const [token, setToken] = useState("");
	const [username, setUsername] = useState("");
	const [role, setRole] = useState("user");
	const [organizerProfile, setOrganizerProfile] = useState(null);
	const [loginUsername, setLoginUsername] = useState("");
	const [loginPasscode, setLoginPasscode] = useState("");
	const [appOrgName, setAppOrgName] = useState("");
	const [appGhanaCardPin, setAppGhanaCardPin] = useState("");
	const [appContactPhone, setAppContactPhone] = useState("");
	const [appBio, setAppBio] = useState("");
	const [appFrequency, setAppFrequency] = useState("Monthly");
	const [appAgreedTerms, setAppAgreedTerms] = useState(false);
	const [leagues, setLeagues] = useState([]);
	const [selectedLeagueId, setSelectedLeagueId] = useState(null);
	const [activeLeagueDetails, setActiveLeagueDetails] = useState(null);
	const [activeTab, setActiveTab] = useState("tournaments");
	const [manageSubTab, setManageSubTab] = useState("overview");
	const [statusFilter, setStatusFilter] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [copiedCode, setCopiedCode] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [entryFee, setEntryFee] = useState(0);
	const [prizePool, setPrizePool] = useState(1e3);
	const [maxParticipants, setMaxParticipants] = useState(8);
	const [format, setFormat] = useState("single_elimination");
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
	const [manualPlayerName, setManualPlayerName] = useState("");
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editScheduleDate, setEditScheduleDate] = useState("");
	const [editScheduleTime, setEditScheduleTime] = useState("");
	const [editTurnTimer, setEditTurnTimer] = useState(60);
	const [editRules, setEditRules] = useState("");
	const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
	const [selectedMatchForScore, setSelectedMatchForScore] = useState(null);
	const [scoringWinnerToken, setScoringWinnerToken] = useState("");
	const [scoringDisputeNotes, setScoringDisputeNotes] = useState("");
	const [showDisburseModal, setShowDisburseModal] = useState(false);
	const syncOrganizerAuth = () => {
		const savedToken = localStorage.getItem("damii-player-token") || "";
		const savedName = localStorage.getItem("damii-player-name") || "";
		setToken(savedToken);
		setUsername(savedName);
		const authUser = localStorage.getItem("damii-auth-user");
		if (authUser) try {
			const parsed = JSON.parse(authUser);
			if (parsed.role) setRole(parsed.role);
		} catch {}
		if (savedToken) fetchOrganizerRequestStatus(savedToken);
		else setOrganizerProfile(null);
	};
	const fetchOrganizerRequestStatus = async (userToken) => {
		try {
			const res = await fetch("/api/organizer/request", { headers: { Authorization: `Bearer ${userToken}` } });
			const data = await res.json();
			if (res.ok && data.organizerProfile) {
				setOrganizerProfile(data.organizerProfile);
				if (data.profile?.role) setRole(data.profile.role);
			}
		} catch {}
	};
	useEffect(() => {
		syncOrganizerAuth();
		loadLeagues();
		window.addEventListener("damii-auth-changed", syncOrganizerAuth);
		return () => window.removeEventListener("damii-auth-changed", syncOrganizerAuth);
	}, []);
	useEffect(() => {
		if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
	}, [selectedLeagueId]);
	const loadLeagues = async () => {
		try {
			const data = await (await fetch("/api/league")).json();
			if (data.leagues) {
				setLeagues(data.leagues);
				if (!selectedLeagueId && data.leagues.length > 0) setSelectedLeagueId(data.leagues[0].id);
			}
		} catch {
			setError("Failed to fetch tournament leagues.");
		}
	};
	const loadLeagueDetails = async (leagueId) => {
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
		} catch {}
	};
	const handleLogin = async (e) => {
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
					passcode: loginPasscode.trim()
				})
			});
			const data = await res.json();
			if (!res.ok || data.error) {
				setError(data.error || "Authentication failed. Check credentials.");
				setBusy(false);
				return;
			}
			localStorage.setItem("damii-player-token", data.token);
			localStorage.setItem("damii-player-name", data.profile.username);
			localStorage.setItem("damii-auth-user", JSON.stringify({
				token: data.token,
				username: data.profile.username,
				points: data.profile.points,
				role: data.profile.role
			}));
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
	const handleSubmitApplication = async (e) => {
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
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					organizationName: appOrgName.trim(),
					contactPhone: appContactPhone.trim(),
					bio: appBio.trim() ? `[Ghana Card / Reg ID: ${appGhanaCardPin || "Provided"}] ${appBio.trim()} (Expected Frequency: ${appFrequency})` : `[Ghana Card / Reg ID: ${appGhanaCardPin || "Provided"}] Expected Frequency: ${appFrequency}`
				})
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
	const isApprovedOrganizer = [
		"organizer",
		"facilitator",
		"admin",
		"super_admin"
	].includes(role) || organizerProfile?.status === "approved";
	const handleCreateLeague = async (e) => {
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
					inviteCode: isPrivate ? inviteCode.trim() : void 0,
					requiresApproval,
					scheduleDate: scheduleDate.trim(),
					scheduleTime: scheduleTime.trim(),
					turnTimerSeconds: Number(turnTimerSeconds) || 60,
					prizeDistribution: {
						first: Number(prize1st) || 60,
						second: Number(prize2nd) || 30,
						third: Number(prize3rd) || 10
					},
					rulesNotes: rulesNotes.trim() || "Standard 10x10 Damii rules apply."
				})
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
	const handleApproveParticipant = async (participantId) => {
		setBusy(true);
		setError("");
		try {
			const res = await fetch("/api/league", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "approve",
					token,
					participantId
				})
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
	const handleRejectParticipant = async (participantId) => {
		setBusy(true);
		setError("");
		try {
			const res = await fetch("/api/league", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "reject",
					token,
					participantId
				})
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
	const handleAddManualPlayer = async (e) => {
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
					usernameToAdd: manualPlayerName.trim()
				})
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
					leagueId: selectedLeagueId
				})
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
	const handleStartMatchRoom = async (matchId) => {
		setBusy(true);
		setError("");
		try {
			const res = await fetch("/api/league", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "start_match_room",
					token,
					matchId
				})
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
					disputeNotes: scoringDisputeNotes.trim() || void 0
				})
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
					leagueId: selectedLeagueId
				})
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
		if (!confirm("Are you sure you want to CANCEL this tournament? All participant entry fees will be automatically refunded.")) return;
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
					reason: "Cancelled by Organizer"
				})
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
		const matchesFilter = statusFilter === "all" || lg.status === statusFilter;
		const matchesSearch = !searchQuery.trim() || lg.title.toLowerCase().includes(searchQuery.toLowerCase()) || lg.facilitatorName.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesFilter && matchesSearch;
	});
	const selectedLeague = activeLeagueDetails?.league;
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ jsx(SharedHeader, {}),
			/* @__PURE__ */ jsxs("div", {
				className: "max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8",
				children: [
					error && /* @__PURE__ */ jsxs("div", {
						className: "p-4 bg-red-950/90 border border-red-600/80 rounded-2xl text-red-200 flex items-center justify-between gap-3 shadow-xl animate-in fade-in",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ jsx(CircleAlert, {
								size: 20,
								className: "text-red-400 shrink-0"
							}), /* @__PURE__ */ jsx("span", {
								className: "text-sm font-semibold",
								children: error
							})]
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => setError(""),
							className: "text-red-400 hover:text-white p-1 rounded-lg",
							children: /* @__PURE__ */ jsx(CircleX, { size: 18 })
						})]
					}),
					success && /* @__PURE__ */ jsxs("div", {
						className: "p-4 bg-emerald-950/90 border border-emerald-500/80 rounded-2xl text-emerald-200 flex items-center justify-between gap-3 shadow-xl animate-in fade-in",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ jsx(CircleCheckBig, {
								size: 20,
								className: "text-emerald-400 shrink-0"
							}), /* @__PURE__ */ jsx("span", {
								className: "text-sm font-semibold",
								children: success
							})]
						}), /* @__PURE__ */ jsx("button", {
							onClick: () => setSuccess(""),
							className: "text-emerald-400 hover:text-white p-1 rounded-lg",
							children: /* @__PURE__ */ jsx(CircleX, { size: 18 })
						})]
					}),
					!token && /* @__PURE__ */ jsx("section", {
						className: "max-w-xl mx-auto space-y-6",
						children: /* @__PURE__ */ jsxs("div", {
							className: "p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6 text-center",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "w-16 h-16 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-2xl flex items-center justify-center mx-auto text-[#d6a735] shadow-lg",
									children: /* @__PURE__ */ jsx(ShieldCheck, { size: 32 })
								}),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
									className: "text-2xl font-black text-[#f5efdf]",
									children: "DAMII Organizer Hub Login"
								}), /* @__PURE__ */ jsx("p", {
									className: "text-sm text-[#a3b8b0] mt-1.5 leading-relaxed",
									children: "Sign in with your official account credentials to access the Tournament Organizer Command Studio or apply for an official License."
								})] }),
								/* @__PURE__ */ jsxs("form", {
									onSubmit: handleLogin,
									className: "space-y-4 text-left",
									children: [
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
											children: "Username / Account Name"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											required: true,
											value: loginUsername,
											onChange: (e) => setLoginUsername(e.target.value),
											placeholder: "Enter your username",
											className: "w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
										})] }),
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
											children: "Password / Passcode"
										}), /* @__PURE__ */ jsx("input", {
											type: "password",
											required: true,
											value: loginPasscode,
											onChange: (e) => setLoginPasscode(e.target.value),
											placeholder: "Enter password",
											className: "w-full px-4 py-3 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
										})] }),
										/* @__PURE__ */ jsxs("button", {
											type: "submit",
											disabled: busy,
											className: "w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2",
											children: [/* @__PURE__ */ jsx(LogIn, { size: 18 }), busy ? "Authenticating..." : "Sign In to Organizer Studio"]
										})
									]
								})
							]
						})
					}),
					token && !isApprovedOrganizer && /* @__PURE__ */ jsxs("section", {
						className: "max-w-3xl mx-auto space-y-6",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "p-6 bg-gradient-to-br from-[#0c3b2e] to-[#06261f] border border-[#184d3c] rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-4",
									children: [/* @__PURE__ */ jsx("div", {
										className: "w-14 h-14 bg-[#081c15] border border-[#d6a735]/40 rounded-2xl flex items-center justify-center text-[#d6a735] shrink-0",
										children: /* @__PURE__ */ jsx(Building2, { size: 28 })
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
										className: "text-xl font-black text-[#f5efdf]",
										children: "Official Organizer License Portal"
									}), /* @__PURE__ */ jsxs("p", {
										className: "text-xs text-[#a3b8b0] mt-0.5",
										children: [
											"Account: ",
											/* @__PURE__ */ jsx("strong", {
												className: "text-[#f5efdf]",
												children: username
											}),
											" • Status:",
											" ",
											/* @__PURE__ */ jsx("span", {
												className: "capitalize font-bold text-[#d6a735]",
												children: organizerProfile?.status || "unsubmitted"
											})
										]
									})] })]
								}), /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => fetchOrganizerRequestStatus(token),
									className: "px-4 py-2 bg-[#081c15] hover:bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shrink-0",
									children: [/* @__PURE__ */ jsx(RefreshCw, { size: 14 }), " Refresh Application Status"]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-3 gap-2 p-3 bg-[#06261f] border border-[#114232] rounded-2xl text-xs font-semibold text-center",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 flex items-center justify-center gap-1.5",
										children: [/* @__PURE__ */ jsx(CircleCheckBig, { size: 14 }), " 1. Account Auth"]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: `p-2.5 rounded-xl border flex items-center justify-center gap-1.5 ${organizerProfile?.status === "pending" ? "bg-amber-950/80 border-amber-500/80 text-amber-300" : organizerProfile?.status === "rejected" ? "bg-red-950/80 border-red-500/80 text-red-300" : "bg-[#081c15] border-[#114232] text-[#a3b8b0]"}`,
										children: [/* @__PURE__ */ jsx(FileText, { size: 14 }), " 2. Commission Review"]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "p-2.5 bg-[#081c15] border border-[#114232] text-[#a3b8b0] rounded-xl flex items-center justify-center gap-1.5 opacity-60",
										children: [/* @__PURE__ */ jsx(BadgeCheck, { size: 14 }), " 3. Certified Studio"]
									})
								]
							}),
							organizerProfile?.status === "pending" && /* @__PURE__ */ jsxs("div", {
								className: "p-6 bg-amber-950/70 border border-amber-500/80 rounded-3xl text-[#f5efdf] space-y-4 shadow-xl",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-start gap-3",
									children: [/* @__PURE__ */ jsx(Clock, {
										size: 24,
										className: "text-[#d6a735] shrink-0 mt-1"
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
										className: "font-bold text-base text-[#d6a735]",
										children: "Application Under Commission Review"
									}), /* @__PURE__ */ jsxs("p", {
										className: "text-xs text-slate-300 mt-1 leading-relaxed",
										children: [
											"Your application for ",
											/* @__PURE__ */ jsx("strong", { children: organizerProfile.organizationName }),
											" was submitted on",
											" ",
											new Date(organizerProfile.requestedAt).toLocaleDateString(),
											". System administrators review organizer applications within 24 hours. You will receive an automated notification once your license is approved."
										]
									})] })]
								}), /* @__PURE__ */ jsxs("div", {
									className: "p-4 bg-[#06261f]/80 border border-[#114232] rounded-2xl text-xs space-y-2 text-[#a3b8b0]",
									children: [
										/* @__PURE__ */ jsxs("p", { children: [
											/* @__PURE__ */ jsx("strong", {
												className: "text-[#f5efdf]",
												children: "Organization Name:"
											}),
											" ",
											organizerProfile.organizationName
										] }),
										/* @__PURE__ */ jsxs("p", { children: [
											/* @__PURE__ */ jsx("strong", {
												className: "text-[#f5efdf]",
												children: "Contact Phone:"
											}),
											" ",
											organizerProfile.contactPhone || "Provided"
										] }),
										/* @__PURE__ */ jsxs("p", { children: [
											/* @__PURE__ */ jsx("strong", {
												className: "text-[#f5efdf]",
												children: "Details:"
											}),
											" ",
											organizerProfile.bio || "In review"
										] })
									]
								})]
							}),
							organizerProfile?.status === "rejected" && /* @__PURE__ */ jsxs("div", {
								className: "p-6 bg-red-950/80 border border-red-500/80 rounded-3xl text-red-100 space-y-3 shadow-xl",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-start gap-3",
									children: [/* @__PURE__ */ jsx(ShieldAlert, {
										size: 24,
										className: "text-red-400 shrink-0 mt-1"
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
										className: "font-bold text-base text-red-200",
										children: "Application Declined"
									}), /* @__PURE__ */ jsxs("p", {
										className: "text-xs text-red-300 mt-1",
										children: ["Reason: ", organizerProfile.rejectionReason || "Credentials require further verification."]
									})] })]
								}), /* @__PURE__ */ jsx("p", {
									className: "text-xs text-slate-300",
									children: "You may re-submit your organizer application below with updated verification information."
								})]
							}),
							(organizerProfile?.status === "none" || organizerProfile?.status === "rejected" || !organizerProfile) && /* @__PURE__ */ jsxs("form", {
								onSubmit: handleSubmitApplication,
								className: "p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6",
								children: [
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h3", {
										className: "text-lg font-black text-[#f5efdf] flex items-center gap-2",
										children: [/* @__PURE__ */ jsx(Briefcase, {
											size: 20,
											className: "text-[#d6a735]"
										}), " Application for Certified Organizer License"]
									}), /* @__PURE__ */ jsx("p", {
										className: "text-xs text-[#a3b8b0] mt-1",
										children: "Certified Organizers can create public or private tournaments, set guaranteed prize pools, enforce turn clocks, and manage brackets with official Damii rules."
									})] }),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
										children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
											children: "Organization / Brand Name *"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											required: true,
											value: appOrgName,
											onChange: (e) => setAppOrgName(e.target.value),
											placeholder: "e.g. Capital Draughts Club",
											className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
										})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
											children: "National ID / Business Reg ID"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											value: appGhanaCardPin,
											onChange: (e) => setAppGhanaCardPin(e.target.value),
											placeholder: "e.g. ID-123456789-0",
											className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
										})] })]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
										children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
											children: "Contact Mobile Number *"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											required: true,
											value: appContactPhone,
											onChange: (e) => setAppContactPhone(e.target.value),
											placeholder: "e.g. 0244123456",
											className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
										})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
											className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
											children: "Target Tournament Frequency"
										}), /* @__PURE__ */ jsxs("select", {
											value: appFrequency,
											onChange: (e) => setAppFrequency(e.target.value),
											className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]",
											children: [
												/* @__PURE__ */ jsx("option", {
													value: "Weekly",
													children: "Weekly Leagues"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "Bi-Weekly",
													children: "Bi-Weekly Tournaments"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "Monthly",
													children: "Monthly Championship"
												}),
												/* @__PURE__ */ jsx("option", {
													value: "Special Events",
													children: "Special Invitational Events"
												})
											]
										})] })]
									}),
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
										children: "Organizer Bio & Past Event Experience"
									}), /* @__PURE__ */ jsx("textarea", {
										rows: 3,
										value: appBio,
										onChange: (e) => setAppBio(e.target.value),
										placeholder: "Briefly describe your event organizing background, venue location, or draughts community...",
										className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
									})] }),
									/* @__PURE__ */ jsxs("div", {
										className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl flex items-start gap-3",
										children: [/* @__PURE__ */ jsx("input", {
											type: "checkbox",
											id: "terms-check",
											checked: appAgreedTerms,
											onChange: (e) => setAppAgreedTerms(e.target.checked),
											className: "mt-1 accent-[#d6a735]"
										}), /* @__PURE__ */ jsx("label", {
											htmlFor: "terms-check",
											className: "text-xs text-[#a3b8b0] leading-relaxed cursor-pointer",
											children: "I acknowledge that as a Certified DAMII Organizer, I am bound by the official 10×10 Ghanaian Draughts rules, compulsory capture sequences, turn clocks, and platform financial escrow regulations. All prize pool disbursements pass through automated server ledgers."
										})]
									}),
									/* @__PURE__ */ jsxs("button", {
										type: "submit",
										disabled: busy,
										className: "w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2",
										children: [/* @__PURE__ */ jsx(Send, { size: 18 }), busy ? "Submitting Application..." : "Submit Organizer Application"]
									})
								]
							})
						]
					}),
					token && isApprovedOrganizer && /* @__PURE__ */ jsxs("section", {
						className: "space-y-8",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "p-6 sm:p-8 bg-gradient-to-r from-[#0c3b2e] via-[#06261f] to-[#081c15] border border-[#184d3c] rounded-3xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-4",
									children: [/* @__PURE__ */ jsx("div", {
										className: "w-16 h-16 bg-[#081c15] border-2 border-[#d6a735] rounded-2xl flex items-center justify-center text-[#d6a735] shadow-xl shrink-0",
										children: /* @__PURE__ */ jsx(BadgeCheck, { size: 36 })
									}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ jsx("h1", {
											className: "text-2xl font-black text-[#f5efdf]",
											children: organizerProfile?.organizationName || `${username}'s Studio`
										}), /* @__PURE__ */ jsx("span", {
											className: "px-2.5 py-0.5 bg-[#d6a735]/20 border border-[#d6a735]/60 text-[#d6a735] font-bold rounded-md text-[11px] uppercase tracking-wider",
											children: "Certified Organizer"
										})]
									}), /* @__PURE__ */ jsxs("p", {
										className: "text-xs text-[#a3b8b0] mt-1 flex items-center gap-2",
										children: [
											/* @__PURE__ */ jsxs("span", { children: ["Facilitator: ", /* @__PURE__ */ jsx("strong", {
												className: "text-[#f5efdf]",
												children: username
											})] }),
											/* @__PURE__ */ jsx("span", { children: "•" }),
											/* @__PURE__ */ jsxs("span", { children: ["License ID: ", /* @__PURE__ */ jsxs("strong", {
												className: "text-[#d6a735]",
												children: ["ORG-", token.slice(-6).toUpperCase()]
											})] })
										]
									})] })]
								}), /* @__PURE__ */ jsxs("div", {
									className: "grid grid-cols-3 gap-3 bg-[#06261f] p-3.5 rounded-2xl border border-[#114232] text-center w-full md:w-auto",
									children: [
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "text-[10px] uppercase font-bold text-[#a3b8b0]",
											children: "Tournaments"
										}), /* @__PURE__ */ jsx("div", {
											className: "text-lg font-black text-[#f5efdf]",
											children: leagues.length
										})] }),
										/* @__PURE__ */ jsxs("div", {
											className: "border-x border-[#114232] px-3",
											children: [/* @__PURE__ */ jsx("div", {
												className: "text-[10px] uppercase font-bold text-[#a3b8b0]",
												children: "Active"
											}), /* @__PURE__ */ jsx("div", {
												className: "text-lg font-black text-[#d6a735]",
												children: leagues.filter((l) => l.status === "active" || l.status === "registration").length
											})]
										}),
										/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("div", {
											className: "text-[10px] uppercase font-bold text-[#a3b8b0]",
											children: "Completed"
										}), /* @__PURE__ */ jsx("div", {
											className: "text-lg font-black text-emerald-400",
											children: leagues.filter((l) => l.status === "completed").length
										})] })
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex flex-wrap items-center justify-between gap-4 border-b border-[#114232] pb-4",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2 bg-[#06261f] p-1.5 rounded-2xl border border-[#114232]",
									children: [
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveTab("tournaments"),
											className: `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "tournaments" ? "bg-[#d6a735] text-[#06261f] shadow-md" : "text-[#a3b8b0] hover:text-white"}`,
											children: [/* @__PURE__ */ jsx(Trophy, { size: 16 }), " My Tournaments"]
										}),
										/* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveTab("create"),
											className: `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "create" ? "bg-[#d6a735] text-[#06261f] shadow-md" : "text-[#a3b8b0] hover:text-white"}`,
											children: [/* @__PURE__ */ jsx(Plus, { size: 16 }), " Create Tournament"]
										}),
										selectedLeague && /* @__PURE__ */ jsxs("button", {
											onClick: () => setActiveTab("manage"),
											className: `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${activeTab === "manage" ? "bg-[#d6a735] text-[#06261f] shadow-md" : "text-[#a3b8b0] hover:text-white"}`,
											children: [
												/* @__PURE__ */ jsx(Settings, { size: 16 }),
												" Command Center (",
												selectedLeague.title.slice(0, 14),
												"...)"
											]
										})
									]
								}), activeTab === "tournaments" && /* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2 w-full sm:w-auto",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "relative flex-1 sm:w-64",
										children: [/* @__PURE__ */ jsx(Search, {
											size: 14,
											className: "absolute left-3 top-3 text-[#a3b8b0]"
										}), /* @__PURE__ */ jsx("input", {
											type: "text",
											value: searchQuery,
											onChange: (e) => setSearchQuery(e.target.value),
											placeholder: "Search tournaments...",
											className: "w-full pl-9 pr-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf] placeholder-[#a3b8b0]/50 focus:outline-none focus:border-[#d6a735]"
										})]
									}), /* @__PURE__ */ jsxs("select", {
										value: statusFilter,
										onChange: (e) => setStatusFilter(e.target.value),
										className: "px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf] focus:outline-none focus:border-[#d6a735]",
										children: [
											/* @__PURE__ */ jsx("option", {
												value: "all",
												children: "All Statuses"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "registration",
												children: "Registration Open"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "active",
												children: "Active Matches"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "completed",
												children: "Completed"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "cancelled",
												children: "Cancelled"
											})
										]
									})]
								})]
							}),
							activeTab === "tournaments" && /* @__PURE__ */ jsx("div", {
								className: "space-y-4",
								children: filteredLeagues.length === 0 ? /* @__PURE__ */ jsxs("div", {
									className: "p-12 text-center bg-[#06261f] border border-[#114232] rounded-3xl space-y-3",
									children: [
										/* @__PURE__ */ jsx(Trophy, {
											size: 40,
											className: "mx-auto text-[#a3b8b0]/40"
										}),
										/* @__PURE__ */ jsx("p", {
											className: "text-sm font-semibold text-[#a3b8b0]",
											children: "No tournaments found matching the selected filter."
										}),
										/* @__PURE__ */ jsx("button", {
											onClick: () => setActiveTab("create"),
											className: "px-4 py-2 bg-[#d6a735] text-[#06261f] font-bold text-xs rounded-xl hover:bg-[#b88c24] transition-colors",
											children: "Create First Tournament"
										})
									]
								}) : /* @__PURE__ */ jsx("div", {
									className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
									children: filteredLeagues.map((lg) => /* @__PURE__ */ jsxs("div", {
										className: `p-5 bg-[#06261f] border rounded-2xl transition-all space-y-4 shadow-xl flex flex-col justify-between ${selectedLeagueId === lg.id ? "border-[#d6a735] ring-1 ring-[#d6a735]/40" : "border-[#114232] hover:border-[#184d3c]"}`,
										children: [/* @__PURE__ */ jsxs("div", {
											className: "space-y-3",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-start justify-between gap-2",
													children: [/* @__PURE__ */ jsx("h3", {
														className: "font-bold text-base text-[#f5efdf] line-clamp-1",
														children: lg.title
													}), /* @__PURE__ */ jsx("span", {
														className: `px-2 py-0.5 rounded text-[10px] uppercase font-extrabold shrink-0 ${lg.status === "registration" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40" : lg.status === "active" ? "bg-amber-950 text-amber-400 border border-amber-500/40" : lg.status === "completed" ? "bg-blue-950 text-blue-400 border border-blue-500/40" : "bg-red-950 text-red-400 border border-red-500/40"}`,
														children: lg.status
													})]
												}),
												/* @__PURE__ */ jsx("p", {
													className: "text-xs text-[#a3b8b0] line-clamp-2",
													children: lg.description
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "grid grid-cols-2 gap-2 p-2.5 bg-[#081c15] rounded-xl text-xs border border-[#114232]",
													children: [
														/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "text-[10px] text-[#a3b8b0] block uppercase font-bold",
															children: "Format"
														}), /* @__PURE__ */ jsx("span", {
															className: "text-[#f5efdf] font-semibold capitalize",
															children: lg.format.replace("_", " ")
														})] }),
														/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "text-[10px] text-[#a3b8b0] block uppercase font-bold",
															children: "Prize Pool"
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[#d6a735] font-bold",
															children: [lg.prizePoolPoints, " Points"]
														})] }),
														/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "text-[10px] text-[#a3b8b0] block uppercase font-bold",
															children: "Enrolled"
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[#f5efdf] font-semibold",
															children: [
																lg.participantCount,
																" / ",
																lg.maxParticipants
															]
														})] }),
														/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "text-[10px] text-[#a3b8b0] block uppercase font-bold",
															children: "Schedule"
														}), /* @__PURE__ */ jsx("span", {
															className: "text-[#f5efdf] font-semibold truncate block",
															children: lg.scheduleDate || "TBD"
														})] })
													]
												})
											]
										}), /* @__PURE__ */ jsx("div", {
											className: "flex items-center gap-2 pt-2 border-t border-[#114232]",
											children: /* @__PURE__ */ jsxs("button", {
												onClick: () => {
													setSelectedLeagueId(lg.id);
													setActiveTab("manage");
													setManageSubTab("overview");
												},
												className: "flex-1 py-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#f5efdf] font-bold text-xs rounded-xl transition-all border border-[#184d3c] flex items-center justify-center gap-1.5",
												children: [/* @__PURE__ */ jsx(Settings, {
													size: 14,
													className: "text-[#d6a735]"
												}), " Open Command Center"]
											})
										})]
									}, lg.id))
								})
							}),
							activeTab === "create" && /* @__PURE__ */ jsxs("form", {
								onSubmit: handleCreateLeague,
								className: "p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl shadow-2xl space-y-6 max-w-3xl mx-auto",
								children: [
									/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h3", {
										className: "text-xl font-black text-[#f5efdf] flex items-center gap-2",
										children: [/* @__PURE__ */ jsx(Plus, {
											size: 22,
											className: "text-[#d6a735]"
										}), " Create Production Tournament"]
									}), /* @__PURE__ */ jsx("p", {
										className: "text-xs text-[#a3b8b0] mt-1",
										children: "Set up a new tournament with custom format, guaranteed prize pool, and official turn clocks."
									})] }),
									/* @__PURE__ */ jsxs("div", {
										className: "space-y-4",
										children: [
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
												children: "Tournament Title *"
											}), /* @__PURE__ */ jsx("input", {
												type: "text",
												required: true,
												value: title,
												onChange: (e) => setTitle(e.target.value),
												placeholder: "e.g. Greater Accra 10x10 Masters Cup 2026",
												className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
											})] }),
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
												className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
												children: "Tournament Description"
											}), /* @__PURE__ */ jsx("textarea", {
												rows: 2,
												value: description,
												onChange: (e) => setDescription(e.target.value),
												placeholder: "Tournament overview, rules, venue information...",
												className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] placeholder-[#a3b8b0]/50 text-sm focus:outline-none focus:border-[#d6a735]"
											})] }),
											/* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
													className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
													children: "Tournament Format"
												}), /* @__PURE__ */ jsxs("select", {
													value: format,
													onChange: (e) => setFormat(e.target.value),
													className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]",
													children: [
														/* @__PURE__ */ jsx("option", {
															value: "single_elimination",
															children: "Single Elimination Bracket"
														}),
														/* @__PURE__ */ jsx("option", {
															value: "double_elimination",
															children: "Double Elimination Bracket"
														}),
														/* @__PURE__ */ jsx("option", {
															value: "round_robin",
															children: "Round Robin League"
														}),
														/* @__PURE__ */ jsx("option", {
															value: "swiss",
															children: "Swiss System"
														})
													]
												})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
													className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
													children: "Max Participant Capacity"
												}), /* @__PURE__ */ jsxs("select", {
													value: maxParticipants,
													onChange: (e) => setMaxParticipants(Number(e.target.value)),
													className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]",
													children: [
														/* @__PURE__ */ jsx("option", {
															value: 4,
															children: "4 Players (Semi-Final Start)"
														}),
														/* @__PURE__ */ jsx("option", {
															value: 8,
															children: "8 Players (Quarter-Final Start)"
														}),
														/* @__PURE__ */ jsx("option", {
															value: 16,
															children: "16 Players (Round of 16)"
														}),
														/* @__PURE__ */ jsx("option", {
															value: 32,
															children: "32 Players (Grand Stage)"
														})
													]
												})] })]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
												children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
													className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
													children: "Entry Fee (Points)"
												}), /* @__PURE__ */ jsx("input", {
													type: "number",
													min: 0,
													value: entryFee,
													onChange: (e) => setEntryFee(Number(e.target.value)),
													className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
												})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
													className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
													children: "Guaranteed Prize Pool (Points)"
												}), /* @__PURE__ */ jsx("input", {
													type: "number",
													min: 0,
													value: prizePool,
													onChange: (e) => setPrizePool(Number(e.target.value)),
													className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
												})] })]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "grid grid-cols-1 sm:grid-cols-3 gap-4",
												children: [
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
														children: "Schedule Days"
													}), /* @__PURE__ */ jsx("input", {
														type: "text",
														value: scheduleDate,
														onChange: (e) => setScheduleDate(e.target.value),
														placeholder: "e.g. Saturdays & Sundays",
														className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
													})] }),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
														children: "Match Start Time"
													}), /* @__PURE__ */ jsx("input", {
														type: "text",
														value: scheduleTime,
														onChange: (e) => setScheduleTime(e.target.value),
														placeholder: "e.g. 18:00 GMT",
														className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]"
													})] }),
													/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
														className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
														children: "Turn Clock Timer"
													}), /* @__PURE__ */ jsxs("select", {
														value: turnTimerSeconds,
														onChange: (e) => setTurnTimerSeconds(Number(e.target.value)),
														className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none focus:border-[#d6a735]",
														children: [
															/* @__PURE__ */ jsx("option", {
																value: 30,
																children: "30 Seconds (Blitz)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: 60,
																children: "60 Seconds (Standard)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: 90,
																children: "90 Seconds (Relaxed)"
															}),
															/* @__PURE__ */ jsx("option", {
																value: 120,
																children: "120 Seconds (Classical)"
															})
														]
													})] })
												]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-3",
														children: [/* @__PURE__ */ jsx("input", {
															type: "checkbox",
															id: "isPrivate",
															checked: isPrivate,
															onChange: (e) => setIsPrivate(e.target.checked),
															className: "accent-[#d6a735]"
														}), /* @__PURE__ */ jsx("label", {
															htmlFor: "isPrivate",
															className: "text-xs text-[#f5efdf] font-bold cursor-pointer",
															children: "Private Tournament (Requires Invite Code)"
														})]
													}),
													isPrivate && /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("input", {
														type: "text",
														value: inviteCode,
														onChange: (e) => setInviteCode(e.target.value.toUpperCase()),
														placeholder: "Passcode e.g. DAMII2026",
														className: "w-full px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#d6a735] font-mono focus:outline-none"
													}) }),
													/* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-3 sm:col-span-2",
														children: [/* @__PURE__ */ jsx("input", {
															type: "checkbox",
															id: "requiresApproval",
															checked: requiresApproval,
															onChange: (e) => setRequiresApproval(e.target.checked),
															className: "accent-[#d6a735]"
														}), /* @__PURE__ */ jsx("label", {
															htmlFor: "requiresApproval",
															className: "text-xs text-[#f5efdf] font-bold cursor-pointer",
															children: "Require Organizer Approval for Player Registrations"
														})]
													})
												]
											})
										]
									}),
									/* @__PURE__ */ jsxs("button", {
										type: "submit",
										disabled: busy,
										className: "w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2",
										children: [/* @__PURE__ */ jsx(Plus, { size: 18 }), busy ? "Launching Tournament..." : "Create & Launch Tournament"]
									})
								]
							}),
							activeTab === "manage" && selectedLeague && /* @__PURE__ */ jsxs("div", {
								className: "space-y-6",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "p-6 bg-[#06261f] border border-[#184d3c] rounded-3xl shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
										children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsx("h2", {
												className: "text-xl font-black text-[#f5efdf]",
												children: selectedLeague.title
											}), /* @__PURE__ */ jsx("span", {
												className: "px-2.5 py-0.5 bg-amber-950/80 border border-amber-500/80 text-[#d6a735] text-[10px] uppercase font-black rounded",
												children: selectedLeague.status
											})]
										}), /* @__PURE__ */ jsxs("p", {
											className: "text-xs text-[#a3b8b0] mt-1",
											children: [
												"Format: ",
												/* @__PURE__ */ jsx("strong", {
													className: "text-[#f5efdf] capitalize",
													children: selectedLeague.format.replace("_", " ")
												}),
												" • Prize Pool: ",
												/* @__PURE__ */ jsxs("strong", {
													className: "text-[#d6a735]",
													children: [selectedLeague.prizePoolPoints, " Points"]
												}),
												" • Turn Clock: ",
												/* @__PURE__ */ jsxs("strong", {
													className: "text-[#f5efdf]",
													children: [selectedLeague.turnTimerSeconds || 60, "s"]
												})
											]
										})] }), /* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: () => selectedLeagueId && loadLeagueDetails(selectedLeagueId),
												className: "px-3.5 py-2 bg-[#081c15] hover:bg-[#0c3b2e] border border-[#114232] text-[#d6a735] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all",
												children: [/* @__PURE__ */ jsx(RefreshCw, { size: 14 }), " Sync State"]
											}), selectedLeague.status !== "completed" && selectedLeague.status !== "cancelled" && /* @__PURE__ */ jsxs("button", {
												type: "button",
												onClick: handleCancelTournament,
												className: "px-3 py-2 bg-red-950/60 hover:bg-red-900/80 border border-red-800 text-red-200 font-bold rounded-xl text-xs flex items-center gap-1 transition-all",
												children: [/* @__PURE__ */ jsx(Trash2, { size: 14 }), " Cancel Tournament"]
											})]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-2 border-b border-[#114232] pb-3 overflow-x-auto",
										children: [
											/* @__PURE__ */ jsxs("button", {
												onClick: () => setManageSubTab("overview"),
												className: `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${manageSubTab === "overview" ? "bg-[#d6a735] text-[#06261f]" : "text-[#a3b8b0] hover:text-white"}`,
												children: [/* @__PURE__ */ jsx(Grid3x3, { size: 15 }), " Overview & Launch"]
											}),
											/* @__PURE__ */ jsxs("button", {
												onClick: () => setManageSubTab("participants"),
												className: `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${manageSubTab === "participants" ? "bg-[#d6a735] text-[#06261f]" : "text-[#a3b8b0] hover:text-white"}`,
												children: [
													/* @__PURE__ */ jsx(Users, { size: 15 }),
													" Roster (",
													activeLeagueDetails?.participants.length || 0,
													")"
												]
											}),
											/* @__PURE__ */ jsxs("button", {
												onClick: () => setManageSubTab("bracket"),
												className: `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${manageSubTab === "bracket" ? "bg-[#d6a735] text-[#06261f]" : "text-[#a3b8b0] hover:text-white"}`,
												children: [
													/* @__PURE__ */ jsx(Gavel, { size: 15 }),
													" Bracket & Matches (",
													activeLeagueDetails?.matches.length || 0,
													")"
												]
											}),
											/* @__PURE__ */ jsxs("button", {
												onClick: () => setManageSubTab("prizes"),
												className: `px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${manageSubTab === "prizes" ? "bg-[#d6a735] text-[#06261f]" : "text-[#a3b8b0] hover:text-white"}`,
												children: [/* @__PURE__ */ jsx(Award, { size: 15 }), " Prize Disbursement"]
											})
										]
									}),
									manageSubTab === "overview" && /* @__PURE__ */ jsxs("div", {
										className: "grid grid-cols-1 md:grid-cols-3 gap-6",
										children: [/* @__PURE__ */ jsxs("div", {
											className: "md:col-span-2 p-6 bg-[#06261f] border border-[#114232] rounded-3xl space-y-6",
											children: [
												/* @__PURE__ */ jsxs("h3", {
													className: "text-base font-bold text-[#f5efdf] flex items-center gap-2",
													children: [/* @__PURE__ */ jsx(Zap, {
														size: 18,
														className: "text-[#d6a735]"
													}), " Tournament Status & Bracket Controller"]
												}),
												selectedLeague.status === "registration" && /* @__PURE__ */ jsx("div", {
													className: "p-5 bg-[#081c15] border border-[#114232] rounded-2xl space-y-4",
													children: /* @__PURE__ */ jsxs("div", {
														className: "flex items-center justify-between",
														children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h4", {
															className: "font-bold text-sm text-[#f5efdf]",
															children: "Registration Open"
														}), /* @__PURE__ */ jsxs("p", {
															className: "text-xs text-[#a3b8b0] mt-0.5",
															children: [
																"Currently ",
																activeLeagueDetails?.participants.filter((p) => p.status === "approved" || !p.status).length || 0,
																" approved players enrolled out of ",
																selectedLeague.maxParticipants,
																"."
															]
														})] }), /* @__PURE__ */ jsxs("button", {
															onClick: handleGenerateBracket,
															disabled: busy || (activeLeagueDetails?.participants.filter((p) => p.status === "approved" || !p.status).length || 0) < 2,
															className: "px-5 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50",
															children: [/* @__PURE__ */ jsx(Play, { size: 16 }), " Generate & Launch Bracket"]
														})]
													})
												}),
												selectedLeague.status === "active" && /* @__PURE__ */ jsxs("div", {
													className: "p-5 bg-amber-950/40 border border-amber-500/50 rounded-2xl space-y-3",
													children: [/* @__PURE__ */ jsxs("h4", {
														className: "font-bold text-sm text-[#d6a735] flex items-center gap-2",
														children: [/* @__PURE__ */ jsx(Play, { size: 16 }), " Matches In Progress"]
													}), /* @__PURE__ */ jsxs("p", {
														className: "text-xs text-[#a3b8b0]",
														children: [
															"Matches are active. Open the ",
															/* @__PURE__ */ jsx("strong", { children: "Bracket & Matches" }),
															" tab to generate match room codes or record match winner results."
														]
													})]
												}),
												selectedLeague.status === "completed" && /* @__PURE__ */ jsxs("div", {
													className: "p-5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl space-y-3",
													children: [/* @__PURE__ */ jsxs("h4", {
														className: "font-bold text-sm text-emerald-400 flex items-center gap-2",
														children: [/* @__PURE__ */ jsx(Trophy, { size: 18 }), " Tournament Completed"]
													}), /* @__PURE__ */ jsxs("p", {
														className: "text-xs text-[#a3b8b0]",
														children: [
															"Winner: ",
															/* @__PURE__ */ jsx("strong", {
																className: "text-[#f5efdf]",
																children: selectedLeague.winnerName || "Champion"
															}),
															". Review the Prize Disbursement tab for transaction receipts."
														]
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "space-y-2",
													children: [/* @__PURE__ */ jsx("h4", {
														className: "text-xs font-bold text-[#d6a735] uppercase",
														children: "Tournament Rules & Special Instructions"
													}), /* @__PURE__ */ jsx("div", {
														className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl text-xs text-[#f5efdf] leading-relaxed whitespace-pre-line",
														children: selectedLeague.rulesNotes || "Standard Ghanaian 10x10 Damii rules apply."
													})]
												})
											]
										}), /* @__PURE__ */ jsxs("div", {
											className: "p-6 bg-[#06261f] border border-[#114232] rounded-3xl space-y-4",
											children: [/* @__PURE__ */ jsxs("h3", {
												className: "text-base font-bold text-[#f5efdf] flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(Shield, {
													size: 18,
													className: "text-[#d6a735]"
												}), " Specifications"]
											}), /* @__PURE__ */ jsxs("div", {
												className: "space-y-3 text-xs",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1.5 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "Facilitator"
														}), /* @__PURE__ */ jsx("span", {
															className: "text-[#f5efdf] font-bold",
															children: selectedLeague.facilitatorName
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1.5 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "Format"
														}), /* @__PURE__ */ jsx("span", {
															className: "text-[#f5efdf] font-bold capitalize",
															children: selectedLeague.format.replace("_", " ")
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1.5 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "Entry Fee"
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[#f5efdf] font-bold",
															children: [selectedLeague.entryFeePoints, " Points"]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1.5 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "Guaranteed Escrow"
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[#d6a735] font-bold",
															children: [selectedLeague.prizePoolPoints, " Points"]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1.5 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "Turn Clock"
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[#f5efdf] font-bold",
															children: [selectedLeague.turnTimerSeconds || 60, "s / move"]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1.5 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "Private Code"
														}), /* @__PURE__ */ jsx("span", {
															className: "text-[#d6a735] font-mono font-bold",
															children: selectedLeague.isPrivate ? selectedLeague.inviteCode || "Yes" : "Public"
														})]
													})
												]
											})]
										})]
									}),
									manageSubTab === "participants" && /* @__PURE__ */ jsxs("div", {
										className: "space-y-6",
										children: [
											/* @__PURE__ */ jsxs("form", {
												onSubmit: handleAddManualPlayer,
												className: "p-4 bg-[#06261f] border border-[#114232] rounded-2xl flex flex-col sm:flex-row items-center gap-3",
												children: [
													/* @__PURE__ */ jsx(UserPlus, {
														size: 20,
														className: "text-[#d6a735] shrink-0"
													}),
													/* @__PURE__ */ jsx("input", {
														type: "text",
														value: manualPlayerName,
														onChange: (e) => setManualPlayerName(e.target.value),
														placeholder: "Enroll player by username...",
														className: "flex-1 px-3.5 py-2 bg-[#081c15] border border-[#114232] rounded-xl text-xs text-[#f5efdf] placeholder-[#a3b8b0]/50 focus:outline-none focus:border-[#d6a735]"
													}),
													/* @__PURE__ */ jsx("button", {
														type: "submit",
														disabled: busy,
														className: "w-full sm:w-auto px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-xl text-xs transition-all shadow-md shrink-0",
														children: "Enroll Player"
													})
												]
											}),
											activeLeagueDetails?.participants.some((p) => p.status === "pending") && /* @__PURE__ */ jsxs("div", {
												className: "p-6 bg-amber-950/40 border border-amber-500/50 rounded-3xl space-y-4",
												children: [/* @__PURE__ */ jsxs("h3", {
													className: "font-bold text-sm text-[#d6a735] flex items-center gap-2",
													children: [/* @__PURE__ */ jsx(UserCheck, { size: 18 }), " Pending Player Registration Applications"]
												}), /* @__PURE__ */ jsx("div", {
													className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
													children: activeLeagueDetails.participants.filter((p) => p.status === "pending").map((p) => /* @__PURE__ */ jsxs("div", {
														className: "p-3.5 bg-[#081c15] border border-[#114232] rounded-xl flex items-center justify-between gap-3 text-xs",
														children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
															className: "font-bold text-[#f5efdf] block",
															children: p.username
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[10px] text-[#a3b8b0]",
															children: ["Applied ", new Date(p.joinedAt).toLocaleTimeString()]
														})] }), /* @__PURE__ */ jsxs("div", {
															className: "flex items-center gap-1.5",
															children: [/* @__PURE__ */ jsx("button", {
																onClick: () => handleApproveParticipant(p.id),
																className: "px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg",
																children: "Approve"
															}), /* @__PURE__ */ jsx("button", {
																onClick: () => handleRejectParticipant(p.id),
																className: "px-2.5 py-1 bg-red-900 hover:bg-red-800 text-white font-bold rounded-lg",
																children: "Reject"
															})]
														})]
													}, p.id))
												})]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "p-6 bg-[#06261f] border border-[#114232] rounded-3xl space-y-4",
												children: [/* @__PURE__ */ jsxs("h3", {
													className: "font-bold text-base text-[#f5efdf] flex items-center gap-2",
													children: [
														/* @__PURE__ */ jsx(Users, {
															size: 18,
															className: "text-[#d6a735]"
														}),
														" Confirmed Roster (",
														activeLeagueDetails?.participants.filter((p) => p.status === "approved" || !p.status).length || 0,
														")"
													]
												}), /* @__PURE__ */ jsx("div", {
													className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3",
													children: activeLeagueDetails?.participants.filter((p) => p.status === "approved" || !p.status).map((p, idx) => /* @__PURE__ */ jsx("div", {
														className: "p-3.5 bg-[#081c15] border border-[#114232] rounded-xl flex items-center justify-between gap-3 text-xs",
														children: /* @__PURE__ */ jsxs("div", {
															className: "flex items-center gap-3",
															children: [/* @__PURE__ */ jsxs("span", {
																className: "w-6 h-6 bg-[#0c3b2e] border border-[#184d3c] text-[#d6a735] font-black rounded-lg flex items-center justify-center shrink-0",
																children: ["#", p.seed || idx + 1]
															}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
																className: "font-bold text-[#f5efdf] block",
																children: p.username
															}), /* @__PURE__ */ jsx("span", {
																className: "text-[10px] text-emerald-400",
																children: "Enrolled ✓"
															})] })]
														})
													}, p.id))
												})]
											})
										]
									}),
									manageSubTab === "bracket" && /* @__PURE__ */ jsx("div", {
										className: "space-y-6",
										children: activeLeagueDetails && /* @__PURE__ */ jsx(BracketTreeView, {
											matches: activeLeagueDetails.matches,
											participants: activeLeagueDetails.participants,
											format: selectedLeague.format,
											isFacilitator: true,
											onStartMatch: (matchId) => handleStartMatchRoom(matchId),
											onSetScore: (match) => {
												setSelectedMatchForScore(match);
												setScoringWinnerToken(match.player1Token || "");
												setScoringDisputeNotes("");
											}
										})
									}),
									manageSubTab === "prizes" && /* @__PURE__ */ jsxs("div", {
										className: "p-6 sm:p-8 bg-[#06261f] border border-[#114232] rounded-3xl space-y-6 max-w-2xl mx-auto",
										children: [
											/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h3", {
												className: "text-xl font-black text-[#f5efdf] flex items-center gap-2",
												children: [/* @__PURE__ */ jsx(Award, {
													size: 22,
													className: "text-[#d6a735]"
												}), " Prize Pool Financial Disbursement"]
											}), /* @__PURE__ */ jsx("p", {
												className: "text-xs text-[#a3b8b0] mt-1",
												children: "Review the prize distribution matrix and execute official ledger payouts directly to winner accounts."
											})] }),
											/* @__PURE__ */ jsxs("div", {
												className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3 text-xs",
												children: [
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "Gross Guaranteed Prize Pool"
														}), /* @__PURE__ */ jsxs("span", {
															className: "font-bold text-[#f5efdf]",
															children: [selectedLeague.prizePoolPoints, " Points"]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1 border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#a3b8b0]",
															children: "DAMII Platform Fee (10%)"
														}), /* @__PURE__ */ jsxs("span", {
															className: "font-bold text-amber-400",
															children: [
																"-",
																Math.round(selectedLeague.prizePoolPoints * 10 / 100),
																" Points"
															]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "flex justify-between py-1.5 text-sm font-bold border-b border-[#114232]",
														children: [/* @__PURE__ */ jsx("span", {
															className: "text-[#d6a735]",
															children: "Net Winner Distribution Pool"
														}), /* @__PURE__ */ jsxs("span", {
															className: "text-[#d6a735]",
															children: [selectedLeague.prizePoolPoints - Math.round(selectedLeague.prizePoolPoints * 10 / 100), " Points"]
														})]
													}),
													/* @__PURE__ */ jsxs("div", {
														className: "pt-2 space-y-2",
														children: [
															/* @__PURE__ */ jsxs("div", {
																className: "flex justify-between",
																children: [/* @__PURE__ */ jsxs("span", {
																	className: "text-[#a3b8b0]",
																	children: [
																		"1st Place Champion (",
																		selectedLeague.prizeDistribution?.first || 60,
																		"%)"
																	]
																}), /* @__PURE__ */ jsxs("span", {
																	className: "font-bold text-[#f5efdf]",
																	children: [
																		Math.round((selectedLeague.prizePoolPoints - Math.round(selectedLeague.prizePoolPoints * 10 / 100)) * (selectedLeague.prizeDistribution?.first || 60) / 100),
																		" ",
																		"Points"
																	]
																})]
															}),
															/* @__PURE__ */ jsxs("div", {
																className: "flex justify-between",
																children: [/* @__PURE__ */ jsxs("span", {
																	className: "text-[#a3b8b0]",
																	children: [
																		"2nd Place Runner-Up (",
																		selectedLeague.prizeDistribution?.second || 30,
																		"%)"
																	]
																}), /* @__PURE__ */ jsxs("span", {
																	className: "font-bold text-[#f5efdf]",
																	children: [
																		Math.round((selectedLeague.prizePoolPoints - Math.round(selectedLeague.prizePoolPoints * 10 / 100)) * (selectedLeague.prizeDistribution?.second || 30) / 100),
																		" ",
																		"Points"
																	]
																})]
															}),
															/* @__PURE__ */ jsxs("div", {
																className: "flex justify-between",
																children: [/* @__PURE__ */ jsxs("span", {
																	className: "text-[#a3b8b0]",
																	children: [
																		"3rd Place (",
																		selectedLeague.prizeDistribution?.third || 10,
																		"%)"
																	]
																}), /* @__PURE__ */ jsxs("span", {
																	className: "font-bold text-[#f5efdf]",
																	children: [
																		Math.round((selectedLeague.prizePoolPoints - Math.round(selectedLeague.prizePoolPoints * 10 / 100)) * (selectedLeague.prizeDistribution?.third || 10) / 100),
																		" ",
																		"Points"
																	]
																})]
															})
														]
													})
												]
											}),
											/* @__PURE__ */ jsxs("div", {
												className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-2 text-xs",
												children: [
													/* @__PURE__ */ jsx("h4", {
														className: "font-bold text-[#d6a735]",
														children: "Tournament Podium Standings"
													}),
													/* @__PURE__ */ jsxs("p", { children: [
														/* @__PURE__ */ jsx("strong", {
															className: "text-[#f5efdf]",
															children: "Champion:"
														}),
														" ",
														selectedLeague.winnerName || "Decided via Bracket Matches"
													] }),
													/* @__PURE__ */ jsxs("p", { children: [
														/* @__PURE__ */ jsx("strong", {
															className: "text-[#f5efdf]",
															children: "Runner-Up:"
														}),
														" ",
														selectedLeague.runnerUpName || "TBD"
													] })
												]
											}),
											/* @__PURE__ */ jsxs("button", {
												onClick: handleExecutePrizeDisbursement,
												disabled: busy,
												className: "w-full py-3.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2",
												children: [/* @__PURE__ */ jsx(Coins, { size: 18 }), busy ? "Disbursing Funds..." : "Execute Automated Prize Disbursement"]
											})
										]
									})
								]
							})
						]
					}),
					selectedMatchForScore && /* @__PURE__ */ jsx("div", {
						className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in",
						children: /* @__PURE__ */ jsxs("div", {
							className: "bg-[#06261f] border border-[#184d3c] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between border-b border-[#114232] pb-3",
									children: [/* @__PURE__ */ jsxs("h3", {
										className: "font-bold text-base text-[#f5efdf] flex items-center gap-2",
										children: [/* @__PURE__ */ jsx(Gavel, {
											size: 18,
											className: "text-[#d6a735]"
										}), " Record Match Result"]
									}), /* @__PURE__ */ jsx("button", {
										onClick: () => setSelectedMatchForScore(null),
										className: "text-[#a3b8b0] hover:text-white",
										children: /* @__PURE__ */ jsx(CircleX, { size: 20 })
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-4",
									children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
										children: "Select Match Winner"
									}), /* @__PURE__ */ jsxs("select", {
										value: scoringWinnerToken,
										onChange: (e) => setScoringWinnerToken(e.target.value),
										className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none",
										children: [
											selectedMatchForScore.player1Token && /* @__PURE__ */ jsxs("option", {
												value: selectedMatchForScore.player1Token,
												children: [selectedMatchForScore.player1Name, " (Win)"]
											}),
											selectedMatchForScore.player2Token && /* @__PURE__ */ jsxs("option", {
												value: selectedMatchForScore.player2Token,
												children: [selectedMatchForScore.player2Name, " (Win)"]
											}),
											/* @__PURE__ */ jsx("option", {
												value: "draw",
												children: "Match Draw"
											})
										]
									})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-bold text-[#d6a735] uppercase mb-1.5",
										children: "Dispute / Verification Notes"
									}), /* @__PURE__ */ jsx("textarea", {
										rows: 2,
										value: scoringDisputeNotes,
										onChange: (e) => setScoringDisputeNotes(e.target.value),
										placeholder: "Enter reason for result submission...",
										className: "w-full px-4 py-2.5 bg-[#081c15] border border-[#114232] rounded-xl text-[#f5efdf] text-sm focus:outline-none"
									})] })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-3 pt-2",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setSelectedMatchForScore(null),
										className: "flex-1 py-2.5 bg-[#081c15] border border-[#114232] text-[#a3b8b0] font-bold rounded-xl text-xs",
										children: "Cancel"
									}), /* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: handleSaveScoreOverride,
										disabled: busy,
										className: "flex-1 py-2.5 bg-[#d6a735] text-[#06261f] font-black rounded-xl text-xs shadow-md",
										children: "Confirm & Advance"
									})]
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ jsx(Footer, {})
		]
	});
}
//#endregion
export { OrganizerPage as default };
