import "../index.js";
import { C as createLucideIcon, S as Trophy, f as Shield, h as CircleAlert, l as Check, t as SharedHeader, u as Sparkles } from "./SharedHeader-D3NEmMWE.js";
import { a as UserCheck, i as Settings, n as Plus, r as RefreshCw } from "./play-xhWKohq5.js";
import { t as Users } from "./users-6aZuMbhg.js";
import { n as CircleCheckBig } from "./coins-BlPzvERC.js";
import { t as TrendingUp } from "./trending-up-BqBWyMYt.js";
import { t as Copy } from "./copy-BpJXZsCR.js";
import { t as Award } from "./award-DPFkoqI5.js";
import { t as Footer } from "./Footer-Dl82Y-rV.js";
import { r as Grid3x3, t as BracketTreeView } from "./BracketTreeView-AzxkgeK9.js";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Lock = createLucideIcon("lock", [["rect", {
	width: "18",
	height: "11",
	x: "3",
	y: "11",
	rx: "2",
	ry: "2",
	key: "1w4ew1"
}], ["path", {
	d: "M7 11V7a5 5 0 0 1 10 0v4",
	key: "fwvmzm"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var UserX = createLucideIcon("user-x", [
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
		x1: "17",
		x2: "22",
		y1: "8",
		y2: "13",
		key: "3nzzx3"
	}],
	["line", {
		x1: "22",
		x2: "17",
		y1: "8",
		y2: "13",
		key: "1swrse"
	}]
]);
//#endregion
//#region app/leagues/page.tsx
function LeaguesPage() {
	const [leagues, setLeagues] = useState([]);
	const [selectedLeagueId, setSelectedLeagueId] = useState(null);
	const [activeLeagueDetails, setActiveLeagueDetails] = useState(null);
	const [token, setToken] = useState("");
	const [username, setUsername] = useState("");
	const [userRole, setUserRole] = useState("user");
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [showSettingsModal, setShowSettingsModal] = useState(false);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [joiningLeagueId, setJoiningLeagueId] = useState(null);
	const [inviteCodeInput, setInviteCodeInput] = useState("");
	const [copiedCode, setCopiedCode] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [entryFee, setEntryFee] = useState(50);
	const [prizePool, setPrizePool] = useState(5e3);
	const [maxParticipants, setMaxParticipants] = useState(8);
	const [format, setFormat] = useState("single_elimination");
	const [isPrivate, setIsPrivate] = useState(false);
	const [inviteCode, setInviteCode] = useState("");
	const [requiresApproval, setRequiresApproval] = useState(false);
	const [scheduleDate, setScheduleDate] = useState("Saturdays & Sundays");
	const [scheduleTime, setScheduleTime] = useState("18:00 GMT");
	const [turnTimerSeconds, setTurnTimerSeconds] = useState(60);
	const [rulesNotes, setRulesNotes] = useState("");
	const [selectedMatchForScore, setSelectedMatchForScore] = useState(null);
	const [scoringWinnerToken, setSelectedScoringWinnerToken] = useState("");
	const [scoringDisputeNotes, setScoringDisputeNotes] = useState("");
	useEffect(() => {
		const syncLeagueAuth = () => {
			setToken(localStorage.getItem("damii-player-token") || "");
			setUsername(localStorage.getItem("damii-player-name") || "");
			const authUser = localStorage.getItem("damii-auth-user");
			if (authUser) try {
				const parsed = JSON.parse(authUser);
				if (parsed.role) setUserRole(parsed.role);
			} catch {}
		};
		syncLeagueAuth();
		loadLeagues();
		window.addEventListener("damii-auth-changed", syncLeagueAuth);
		return () => window.removeEventListener("damii-auth-changed", syncLeagueAuth);
	}, []);
	useEffect(() => {
		if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
	}, [selectedLeagueId]);
	async function loadLeagues() {
		try {
			const data = await (await fetch("/api/league")).json();
			if (data.leagues) {
				setLeagues(data.leagues);
				if (data.leagues.length > 0 && !selectedLeagueId) setSelectedLeagueId(data.leagues[0].id);
			}
		} catch {}
	}
	async function loadLeagueDetails(id) {
		try {
			const data = await (await fetch(`/api/league?id=${encodeURIComponent(id)}`)).json();
			if (data.league) setActiveLeagueDetails(data);
		} catch {}
	}
	async function handleCreateLeague(e) {
		e.preventDefault();
		if (!title.trim()) return;
		if (!token) {
			window.dispatchEvent(new CustomEvent("damii-open-auth"));
			setError("Authentication Required: Please sign in or register to host a tournament.");
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
					facilitatorName: username,
					title,
					description,
					entryFeePoints: entryFee,
					prizePoolPoints: prizePool,
					maxParticipants,
					format,
					isPrivate,
					inviteCode: isPrivate ? inviteCode : void 0,
					requiresApproval,
					scheduleDate,
					scheduleTime,
					gameDays: `Match Days: ${scheduleDate} @ ${scheduleTime}`,
					turnTimerSeconds,
					rulesNotes
				})
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
	async function initiateJoinLeague(league) {
		if (!token) {
			window.dispatchEvent(new CustomEvent("damii-open-auth"));
			setError("Authentication Required: Please sign in or register to join a tournament.");
			return;
		}
		if (league.isPrivate) {
			setJoiningLeagueId(league.id);
			setInviteCodeInput("");
			setShowInviteModal(true);
		} else await handleJoinLeague(league.id);
	}
	async function handleJoinLeague(leagueId, codeToSubmit) {
		if (!token) {
			window.dispatchEvent(new CustomEvent("damii-open-auth"));
			setError("Authentication Required: Please sign in or register for a tournament.");
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
					inviteCode: codeToSubmit || inviteCodeInput
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to join tournament");
			if (data.status === "pending") setSuccess("Application submitted! Awaiting facilitator approval.");
			else setSuccess("Successfully registered for the tournament!");
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
		setBusy(true);
		setError("");
		setSuccess("");
		try {
			const res = await fetch("/api/league", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "checkin",
					token,
					leagueId: selectedLeagueId
				})
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
	async function handleApproveParticipant(participantId) {
		setBusy(true);
		setError("");
		setSuccess("");
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
			if (!res.ok) throw new Error(data.error || "Approval failed");
			setSuccess("Participant approved successfully!");
			if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to approve");
		} finally {
			setBusy(false);
		}
	}
	async function handleRejectParticipant(participantId) {
		setBusy(true);
		setError("");
		setSuccess("");
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
			if (!res.ok) throw new Error(data.error || "Rejection failed");
			setSuccess("Participant application rejected & fee refunded.");
			if (selectedLeagueId) loadLeagueDetails(selectedLeagueId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to reject");
		} finally {
			setBusy(false);
		}
	}
	async function handleStartMatchRoom(matchId) {
		setBusy(true);
		setError("");
		setSuccess("");
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
			if (!res.ok) throw new Error(data.error || "Failed to start match arena");
			window.location.href = `/arena?code=${data.roomCode}&mode=league`;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Match room launch failed");
			setBusy(false);
		}
	}
	async function handleSubmitMatchScore(e) {
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
					disputeNotes: scoringDisputeNotes
				})
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
		setBusy(true);
		setError("");
		setSuccess("");
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
	const isFacilitator = activeLeagueDetails?.league.facilitatorToken === token || userRole === "admin" || userRole === "super_admin" || userRole === "organizer" || userRole === "facilitator";
	const userParticipant = activeLeagueDetails?.participants.find((p) => p.userToken === token);
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ jsx(SharedHeader, {}),
			/* @__PURE__ */ jsxs("section", {
				className: "league-page-header",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsxs("span", {
						className: "eyebrow",
						children: [/* @__PURE__ */ jsx(Trophy, { size: 16 }), " DAMII TOURNAMENT & LEAGUE ENGINE"]
					}),
					/* @__PURE__ */ jsx("h1", { children: "Professional Tournament Hub" }),
					/* @__PURE__ */ jsx("p", { children: "Compete in Single Elimination, Double Elimination, Round Robin, or Swiss brackets. Earn prize pools, national rating points, and trophy accolades." })
				] }), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsxs("button", {
						className: "btn-secondary text-xs flex items-center gap-1.5",
						onClick: () => loadLeagues(),
						children: [/* @__PURE__ */ jsx(RefreshCw, { size: 14 }), " Refresh"]
					}), /* @__PURE__ */ jsxs("button", {
						className: "btn-primary",
						onClick: () => {
							if (!token) {
								window.dispatchEvent(new CustomEvent("damii-open-auth"));
								setError("Authentication Required: Please sign in or register to host a tournament.");
								return;
							}
							setShowCreateModal(true);
						},
						children: [/* @__PURE__ */ jsx(Plus, { size: 18 }), " Host Tournament"]
					})]
				})]
			}),
			error && /* @__PURE__ */ jsxs("p", {
				className: "alert-banner error",
				children: [
					/* @__PURE__ */ jsx(CircleAlert, { size: 16 }),
					" ",
					error
				]
			}),
			success && /* @__PURE__ */ jsxs("p", {
				className: "alert-banner success",
				children: [
					/* @__PURE__ */ jsx(CircleCheckBig, { size: 16 }),
					" ",
					success
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "league-layout",
				children: [/* @__PURE__ */ jsxs("aside", {
					className: "league-sidebar bg-[#081c15] border border-[#114232] p-4 rounded-2xl shadow-xl",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between pb-2 border-b border-[#114232]",
						children: [/* @__PURE__ */ jsx("h3", {
							className: "text-xs font-bold text-[#f5efdf] uppercase tracking-wider",
							children: "Tournament Leagues"
						}), /* @__PURE__ */ jsxs("span", {
							className: "text-[11px] font-mono text-[#d6a735] bg-[#0c3b2e] px-2 py-0.5 rounded border border-[#d6a735]/30",
							children: [leagues.length, " Total"]
						})]
					}), /* @__PURE__ */ jsx("div", {
						className: "league-list mt-3 space-y-2.5",
						children: leagues.map((league) => /* @__PURE__ */ jsxs("div", {
							className: `league-card-item bg-[#06261f] border border-[#114232] p-3 rounded-xl cursor-pointer hover:border-[#d6a735]/50 transition-all ${selectedLeagueId === league.id ? "active ring-1 ring-[#d6a735] border-[#d6a735] bg-[#0c3b2e]" : ""}`,
							onClick: () => setSelectedLeagueId(league.id),
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "league-card-header flex items-center justify-between mb-1",
									children: [/* @__PURE__ */ jsxs("strong", {
										className: "flex items-center gap-1.5 text-[#f5efdf] text-xs",
										children: [league.isPrivate && /* @__PURE__ */ jsx(Lock, {
											size: 13,
											className: "text-[#d6a735] shrink-0"
										}), /* @__PURE__ */ jsx("span", {
											className: "truncate",
											children: league.title
										})]
									}), /* @__PURE__ */ jsx("span", {
										className: `status-tag uppercase text-[9px] font-bold px-1.5 py-0.5 rounded ${league.status === "active" ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "bg-[#0c3b2e] text-[#a3b8b0]"}`,
										children: league.status
									})]
								}),
								/* @__PURE__ */ jsx("p", {
									className: "line-clamp-2 text-xs text-[#a3b8b0]",
									children: league.description
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "league-card-meta flex items-center justify-between pt-1.5 text-[11px] text-[#a3b8b0]",
									children: [
										/* @__PURE__ */ jsxs("span", {
											className: "flex items-center gap-1",
											children: [
												/* @__PURE__ */ jsx(Users, { size: 12 }),
												" ",
												league.participantCount,
												" / ",
												league.maxParticipants
											]
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "font-mono text-[#d6a735]",
											children: [
												"GH₵ ",
												league.entryFeePoints,
												" Fee"
											]
										}),
										/* @__PURE__ */ jsxs("span", {
											className: "font-mono text-emerald-400 font-bold",
											children: [
												"GH₵ ",
												league.prizePoolPoints,
												" Prize"
											]
										})
									]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-1.5 flex items-center gap-1 text-[10px] text-[#a3b8b0] font-mono capitalize",
									children: [
										/* @__PURE__ */ jsx(Grid3x3, { size: 11 }),
										" ",
										league.format?.replace("_", " ") || "single elimination"
									]
								})
							]
						}, league.id))
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "league-details-view",
					children: activeLeagueDetails ? /* @__PURE__ */ jsxs("div", {
						className: "bracket-container space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "league-meta-banner bg-[#081c15] border border-[#114232] p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2 flex-wrap",
									children: [
										/* @__PURE__ */ jsx("h2", {
											className: "text-lg font-bold text-[#f5efdf]",
											children: activeLeagueDetails.league.title
										}),
										activeLeagueDetails.league.isPrivate && /* @__PURE__ */ jsxs("span", {
											className: "px-2 py-0.5 bg-[#0c3b2e] border border-[#d6a735]/40 text-[#d6a735] rounded text-xs font-bold flex items-center gap-1",
											children: [/* @__PURE__ */ jsx(Lock, { size: 12 }), " Private Code"]
										}),
										/* @__PURE__ */ jsx("span", {
											className: "px-2 py-0.5 bg-[#06261f] border border-[#114232] text-[#d6a735] rounded text-xs font-mono font-bold capitalize",
											children: activeLeagueDetails.league.format?.replace("_", " ") || "Single Elimination"
										})
									]
								}), /* @__PURE__ */ jsxs("p", {
									className: "text-xs text-[#a3b8b0] mt-1",
									children: [
										"Hosted by ",
										/* @__PURE__ */ jsx("strong", {
											className: "text-[#d6a735]",
											children: activeLeagueDetails.league.facilitatorName
										}),
										" • Match Days: ",
										activeLeagueDetails.league.scheduleDate || "Saturdays",
										" @ ",
										activeLeagueDetails.league.scheduleTime || "18:00 GMT"
									]
								})] }), /* @__PURE__ */ jsxs("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [
										userParticipant && /* @__PURE__ */ jsxs("button", {
											disabled: busy,
											onClick: handleToggleCheckIn,
											className: `px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${userParticipant.checkedIn ? "bg-emerald-950 text-emerald-300 border border-emerald-700" : "bg-[#d6a735] text-[#06261f] hover:bg-[#b88c24]"}`,
											children: [/* @__PURE__ */ jsx(CircleCheckBig, { size: 14 }), userParticipant.checkedIn ? "✓ Checked In" : "Click to Check-In"]
										}),
										activeLeagueDetails.league.status === "registration" && !userParticipant && /* @__PURE__ */ jsxs("button", {
											disabled: busy,
											className: "btn-primary",
											onClick: () => initiateJoinLeague(activeLeagueDetails.league),
											children: [
												activeLeagueDetails.league.requiresApproval ? "Apply for Entry" : "Register Now",
												" (GH₵ ",
												activeLeagueDetails.league.entryFeePoints,
												")"
											]
										}),
										activeLeagueDetails.league.status === "completed" && /* @__PURE__ */ jsxs("div", {
											className: "winner-badge flex items-center gap-2 bg-[#d6a735] text-[#06261f] font-black px-3 py-1.5 rounded-xl shadow-lg",
											children: [
												/* @__PURE__ */ jsx(Award, { size: 18 }),
												" Champion: ",
												activeLeagueDetails.league.winnerName
											]
										})
									]
								})]
							}),
							isFacilitator && activeLeagueDetails.league.isPrivate && activeLeagueDetails.league.inviteCode && /* @__PURE__ */ jsxs("div", {
								className: "p-3 bg-[#0c3b2e] border border-[#d6a735]/40 rounded-xl flex items-center justify-between text-xs text-[#f5efdf]",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ jsx(Lock, {
											size: 14,
											className: "text-[#d6a735]"
										}),
										" Private Invitation Code:",
										" ",
										/* @__PURE__ */ jsx("strong", {
											className: "font-mono text-[#d6a735] bg-[#081c15] px-2 py-1 rounded border border-[#114232] text-sm",
											children: activeLeagueDetails.league.inviteCode
										})
									]
								}), /* @__PURE__ */ jsxs("button", {
									className: "px-2.5 py-1 bg-[#d6a735] text-[#06261f] rounded-lg font-bold hover:bg-[#b88c24] transition-colors flex items-center gap-1 text-xs",
									onClick: () => {
										navigator.clipboard.writeText(activeLeagueDetails.league.inviteCode || "");
										setCopiedCode(true);
										setTimeout(() => setCopiedCode(false), 2e3);
									},
									children: [copiedCode ? /* @__PURE__ */ jsx(Check, { size: 12 }) : /* @__PURE__ */ jsx(Copy, { size: 12 }), " Copy Code"]
								})]
							}),
							isFacilitator && /* @__PURE__ */ jsxs("div", {
								className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between pb-2 border-b border-[#114232]",
									children: [/* @__PURE__ */ jsxs("h4", {
										className: "text-xs font-bold uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5",
										children: [/* @__PURE__ */ jsx(Settings, { size: 14 }), " Facilitator & Host Control Dashboard"]
									}), activeLeagueDetails.league.status === "registration" && /* @__PURE__ */ jsxs("button", {
										disabled: busy || activeLeagueDetails.participants.filter((p) => p.status === "approved").length < 2,
										onClick: handleForceGenerateBracket,
										className: "px-3 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-bold rounded-lg transition-colors flex items-center gap-1",
										children: [/* @__PURE__ */ jsx(Sparkles, { size: 12 }), " Generate Bracket Now"]
									})]
								}), activeLeagueDetails.league.requiresApproval && /* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsxs("h5", {
										className: "text-[11px] font-bold text-[#f5efdf] uppercase",
										children: [
											"Pending Player Applications (",
											activeLeagueDetails.participants.filter((p) => p.status === "pending").length,
											")"
										]
									}), activeLeagueDetails.participants.filter((p) => p.status === "pending").length === 0 ? /* @__PURE__ */ jsx("p", {
										className: "text-xs text-[#a3b8b0] italic",
										children: "No pending applications awaiting review."
									}) : /* @__PURE__ */ jsx("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
										children: activeLeagueDetails.participants.filter((p) => p.status === "pending").map((p) => /* @__PURE__ */ jsxs("div", {
											className: "flex items-center justify-between p-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-xs",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-bold text-[#f5efdf]",
												children: p.username
											}), /* @__PURE__ */ jsxs("div", {
												className: "flex gap-1.5",
												children: [/* @__PURE__ */ jsxs("button", {
													disabled: busy,
													onClick: () => handleApproveParticipant(p.id),
													className: "px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1",
													children: [/* @__PURE__ */ jsx(UserCheck, { size: 12 }), " Approve"]
												}), /* @__PURE__ */ jsxs("button", {
													disabled: busy,
													onClick: () => handleRejectParticipant(p.id),
													className: "px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-200 border border-red-800 rounded-lg font-bold text-[11px] flex items-center gap-1",
													children: [/* @__PURE__ */ jsx(UserX, { size: 12 }), " Reject"]
												})]
											})]
										}, p.id))
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "participants-bar bg-[#081c15] border border-[#114232] p-4 rounded-2xl",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between mb-2",
									children: [/* @__PURE__ */ jsxs("h4", {
										className: "text-xs font-bold text-[#f5efdf] uppercase tracking-wider flex items-center gap-1.5",
										children: [
											/* @__PURE__ */ jsx(Users, {
												size: 14,
												className: "text-[#d6a735]"
											}),
											"Tournament Roster & Standings (",
											activeLeagueDetails.participants.filter((p) => p.status !== "rejected").length,
											")"
										]
									}), activeLeagueDetails.league.format === "round_robin" && /* @__PURE__ */ jsx("span", {
										className: "text-[11px] font-mono text-[#d6a735]",
										children: "Wins: 3 Points • Draw: 1 Point"
									})]
								}), /* @__PURE__ */ jsx("div", {
									className: "chips flex flex-wrap gap-2",
									children: activeLeagueDetails.participants.map((p) => /* @__PURE__ */ jsxs("span", {
										className: `user-chip flex items-center gap-1.5 px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-xl text-xs ${p.status === "pending" ? "opacity-60 italic border-dashed" : ""}`,
										children: [
											/* @__PURE__ */ jsx(Shield, {
												size: 12,
												className: p.checkedIn ? "text-emerald-400" : "text-[#a3b8b0]"
											}),
											/* @__PURE__ */ jsx("strong", {
												className: "text-[#f5efdf]",
												children: p.username
											}),
											p.seed ? /* @__PURE__ */ jsxs("span", {
												className: "text-[10px] font-mono text-[#a3b8b0]",
												children: ["#", p.seed]
											}) : null,
											p.checkedIn && /* @__PURE__ */ jsx("span", {
												className: "text-[10px] text-emerald-400 font-bold",
												children: "✓"
											}),
											activeLeagueDetails.league.format === "round_robin" && /* @__PURE__ */ jsxs("span", {
												className: "text-[10px] font-mono text-[#d6a735] font-bold bg-[#0c3b2e] px-1.5 py-0.2 rounded border border-[#d6a735]/30",
												children: [p.pointsScore || 0, " pts"]
											})
										]
									}, p.id))
								})]
							}),
							(activeLeagueDetails.league.format === "round_robin" || activeLeagueDetails.league.format === "swiss") && /* @__PURE__ */ jsxs("div", {
								className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl my-4",
								children: [/* @__PURE__ */ jsxs("h3", {
									className: "text-xs font-bold text-[#d6a735] uppercase tracking-wider mb-3 flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(TrendingUp, { size: 16 }), " Live Leaderboard Standings"]
								}), /* @__PURE__ */ jsx("div", {
									className: "overflow-x-auto",
									children: /* @__PURE__ */ jsxs("table", {
										className: "w-full text-left text-xs border-collapse",
										children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", {
											className: "border-b border-[#114232] text-[#a3b8b0] font-semibold uppercase",
											children: [
												/* @__PURE__ */ jsx("th", {
													className: "py-2 px-3",
													children: "Rank"
												}),
												/* @__PURE__ */ jsx("th", {
													className: "py-2 px-3",
													children: "Player"
												}),
												/* @__PURE__ */ jsx("th", {
													className: "py-2 px-3 text-center",
													children: "Played"
												}),
												/* @__PURE__ */ jsx("th", {
													className: "py-2 px-3 text-center",
													children: "Wins"
												}),
												/* @__PURE__ */ jsx("th", {
													className: "py-2 px-3 text-center",
													children: "Draws"
												}),
												/* @__PURE__ */ jsx("th", {
													className: "py-2 px-3 text-center",
													children: "Losses"
												}),
												/* @__PURE__ */ jsx("th", {
													className: "py-2 px-3 text-right font-mono text-[#d6a735]",
													children: "Total Points"
												})
											]
										}) }), /* @__PURE__ */ jsx("tbody", {
											className: "divide-y divide-[#114232] font-mono",
											children: [...activeLeagueDetails.participants].sort((a, b) => (b.pointsScore || 0) - (a.pointsScore || 0)).map((p, idx) => /* @__PURE__ */ jsxs("tr", {
												className: "hover:bg-[#0c3b2e]/50 transition-colors",
												children: [
													/* @__PURE__ */ jsxs("td", {
														className: "py-2 px-3 font-bold text-[#d6a735]",
														children: ["#", idx + 1]
													}),
													/* @__PURE__ */ jsx("td", {
														className: "py-2 px-3 font-sans font-bold text-[#f5efdf]",
														children: p.username
													}),
													/* @__PURE__ */ jsx("td", {
														className: "py-2 px-3 text-center text-[#f5efdf]",
														children: (p.winsCount || 0) + (p.drawsCount || 0) + (p.lossesCount || 0)
													}),
													/* @__PURE__ */ jsx("td", {
														className: "py-2 px-3 text-center text-emerald-400 font-bold",
														children: p.winsCount || 0
													}),
													/* @__PURE__ */ jsx("td", {
														className: "py-2 px-3 text-center text-sky-400",
														children: p.drawsCount || 0
													}),
													/* @__PURE__ */ jsx("td", {
														className: "py-2 px-3 text-center text-red-400",
														children: p.lossesCount || 0
													}),
													/* @__PURE__ */ jsx("td", {
														className: "py-2 px-3 text-right font-extrabold text-[#d6a735] text-sm",
														children: p.pointsScore || 0
													})
												]
											}, p.id))
										})]
									})
								})]
							}),
							/* @__PURE__ */ jsx(BracketTreeView, {
								matches: activeLeagueDetails.matches,
								participants: activeLeagueDetails.participants,
								format: activeLeagueDetails.league.format,
								userToken: token,
								isFacilitator,
								onStartMatch: handleStartMatchRoom,
								onSetScore: (match) => {
									setSelectedMatchForScore(match);
									setSelectedScoringWinnerToken(match.player1Token || "");
								},
								title: activeLeagueDetails.league.title
							})
						]
					}) : /* @__PURE__ */ jsx("div", {
						className: "p-12 text-center text-[#a3b8b0] italic bg-[#081c15] border border-[#114232] rounded-2xl",
						children: "Select a tournament league from the sidebar to view details, bracket, and standings."
					})
				})]
			}),
			selectedMatchForScore && /* @__PURE__ */ jsx("div", {
				className: "modal-overlay",
				onClick: () => setSelectedMatchForScore(null),
				children: /* @__PURE__ */ jsxs("div", {
					className: "modal-card max-w-md bg-[#081c15] border border-[#114232] text-[#f5efdf]",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ jsxs("h3", {
							className: "text-sm font-bold text-[#d6a735] uppercase tracking-wider flex items-center gap-2 mb-2",
							children: [/* @__PURE__ */ jsx(Award, { size: 18 }), " Facilitator Match Result Verification"]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-xs text-[#a3b8b0] mb-4",
							children: "Select the match winner to update bracket progress and advance players to the next round."
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: handleSubmitMatchScore,
							className: "space-y-4",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "space-y-2",
									children: [/* @__PURE__ */ jsx("label", {
										className: "block text-xs font-semibold text-[#f5efdf]",
										children: "Select Match Result"
									}), /* @__PURE__ */ jsxs("div", {
										className: "space-y-1.5",
										children: [
											selectedMatchForScore.player1Token && /* @__PURE__ */ jsxs("label", {
												className: "flex items-center gap-2 p-2.5 bg-[#06261f] border border-[#114232] rounded-xl cursor-pointer hover:border-[#d6a735]/50",
												children: [/* @__PURE__ */ jsx("input", {
													type: "radio",
													name: "scoringWinner",
													value: selectedMatchForScore.player1Token,
													checked: scoringWinnerToken === selectedMatchForScore.player1Token,
													onChange: (e) => setSelectedScoringWinnerToken(e.target.value)
												}), /* @__PURE__ */ jsxs("span", {
													className: "text-xs font-bold text-[#f5efdf]",
													children: [selectedMatchForScore.player1Name, " (Victory)"]
												})]
											}),
											selectedMatchForScore.player2Token && /* @__PURE__ */ jsxs("label", {
												className: "flex items-center gap-2 p-2.5 bg-[#06261f] border border-[#114232] rounded-xl cursor-pointer hover:border-[#d6a735]/50",
												children: [/* @__PURE__ */ jsx("input", {
													type: "radio",
													name: "scoringWinner",
													value: selectedMatchForScore.player2Token,
													checked: scoringWinnerToken === selectedMatchForScore.player2Token,
													onChange: (e) => setSelectedScoringWinnerToken(e.target.value)
												}), /* @__PURE__ */ jsxs("span", {
													className: "text-xs font-bold text-[#f5efdf]",
													children: [selectedMatchForScore.player2Name, " (Victory)"]
												})]
											}),
											/* @__PURE__ */ jsxs("label", {
												className: "flex items-center gap-2 p-2.5 bg-[#06261f] border border-[#114232] rounded-xl cursor-pointer hover:border-[#d6a735]/50",
												children: [/* @__PURE__ */ jsx("input", {
													type: "radio",
													name: "scoringWinner",
													value: "draw",
													checked: scoringWinnerToken === "draw",
													onChange: (e) => setSelectedScoringWinnerToken(e.target.value)
												}), /* @__PURE__ */ jsx("span", {
													className: "text-xs font-bold text-sky-400",
													children: "Match Draw (Round Robin Only)"
												})]
											})
										]
									})]
								}),
								/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-semibold text-[#f5efdf] mb-1",
									children: "Audit Notes / Dispute Resolution"
								}), /* @__PURE__ */ jsx("input", {
									type: "text",
									value: scoringDisputeNotes,
									onChange: (e) => setScoringDisputeNotes(e.target.value),
									placeholder: "e.g. Verified by referee / Disconnection forfeit",
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "modal-actions flex justify-end gap-2 pt-2",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "btn-secondary",
										onClick: () => setSelectedMatchForScore(null),
										children: "Cancel"
									}), /* @__PURE__ */ jsx("button", {
										type: "submit",
										disabled: busy,
										className: "btn-primary",
										children: "Verify & Advance Bracket"
									})]
								})
							]
						})
					]
				})
			}),
			showInviteModal && joiningLeagueId && /* @__PURE__ */ jsx("div", {
				className: "modal-overlay",
				onClick: () => setShowInviteModal(false),
				children: /* @__PURE__ */ jsxs("div", {
					className: "modal-card bg-[#081c15] border border-[#114232] text-[#f5efdf]",
					onClick: (e) => e.stopPropagation(),
					children: [
						/* @__PURE__ */ jsxs("h3", {
							className: "flex items-center gap-2 text-[#d6a735]",
							children: [/* @__PURE__ */ jsx(Lock, { size: 18 }), " Private Tournament Invitation Code"]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-xs text-[#a3b8b0] my-2",
							children: "This tournament is invitation-only. Please enter the invitation code provided by the facilitator."
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: (e) => {
								e.preventDefault();
								if (joiningLeagueId) handleJoinLeague(joiningLeagueId);
							},
							children: [/* @__PURE__ */ jsxs("label", {
								className: "block text-xs font-semibold text-[#f5efdf] mb-1",
								children: ["Invitation Code", /* @__PURE__ */ jsx("input", {
									required: true,
									autoFocus: true,
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl font-mono uppercase tracking-widest text-center text-lg text-[#d6a735]",
									value: inviteCodeInput,
									onChange: (e) => setInviteCodeInput(e.target.value.toUpperCase()),
									placeholder: "e.g. DAMII88"
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "modal-actions mt-4 flex justify-end gap-2",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "btn-secondary",
									onClick: () => setShowInviteModal(false),
									children: "Cancel"
								}), /* @__PURE__ */ jsx("button", {
									type: "submit",
									disabled: busy,
									className: "btn-primary",
									children: "Submit Code & Join"
								})]
							})]
						})
					]
				})
			}),
			showCreateModal && /* @__PURE__ */ jsx("div", {
				className: "modal-overlay",
				onClick: () => setShowCreateModal(false),
				children: /* @__PURE__ */ jsxs("div", {
					className: "modal-card max-w-lg bg-[#081c15] border border-[#114232] text-[#f5efdf]",
					onClick: (e) => e.stopPropagation(),
					children: [/* @__PURE__ */ jsx("h3", {
						className: "text-base font-bold text-[#d6a735] uppercase tracking-wider mb-2",
						children: "Host a Tournament League"
					}), /* @__PURE__ */ jsxs("form", {
						onSubmit: handleCreateLeague,
						className: "space-y-3",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-[#f5efdf] mb-1",
								children: "Tournament Title"
							}), /* @__PURE__ */ jsx("input", {
								required: true,
								value: title,
								onChange: (e) => setTitle(e.target.value),
								placeholder: "e.g. Greater Accra Damii Cup 2026",
								className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
							})] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-[#f5efdf] mb-1",
								children: "Description & Overview"
							}), /* @__PURE__ */ jsx("textarea", {
								rows: 2,
								value: description,
								onChange: (e) => setDescription(e.target.value),
								placeholder: "Tournament details & guidelines",
								className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-semibold text-[#f5efdf] mb-1",
									children: "Entry Fee (GH₵)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									min: 0,
									value: entryFee,
									onChange: (e) => setEntryFee(Number(e.target.value)),
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
								})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-semibold text-[#f5efdf] mb-1",
									children: "Prize Pool (GH₵)"
								}), /* @__PURE__ */ jsx("input", {
									type: "number",
									min: 0,
									value: prizePool,
									onChange: (e) => setPrizePool(Number(e.target.value)),
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
								})] })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-semibold text-[#f5efdf] mb-1",
									children: "Tournament Format"
								}), /* @__PURE__ */ jsxs("select", {
									value: format,
									onChange: (e) => setFormat(e.target.value),
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]",
									children: [
										/* @__PURE__ */ jsx("option", {
											value: "single_elimination",
											children: "Single Elimination"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "double_elimination",
											children: "Double Elimination"
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
									className: "block text-xs font-semibold text-[#f5efdf] mb-1",
									children: "Max Capacity"
								}), /* @__PURE__ */ jsxs("select", {
									value: maxParticipants,
									onChange: (e) => setMaxParticipants(Number(e.target.value)),
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]",
									children: [
										/* @__PURE__ */ jsx("option", {
											value: 4,
											children: "4 Players"
										}),
										/* @__PURE__ */ jsx("option", {
											value: 8,
											children: "8 Players"
										}),
										/* @__PURE__ */ jsx("option", {
											value: 16,
											children: "16 Players"
										}),
										/* @__PURE__ */ jsx("option", {
											value: 32,
											children: "32 Players"
										})
									]
								})] })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "p-3 bg-[#06261f] border border-[#114232] rounded-xl space-y-2 text-xs",
								children: [
									/* @__PURE__ */ jsxs("label", {
										className: "flex items-center gap-2 cursor-pointer",
										children: [/* @__PURE__ */ jsx("input", {
											type: "checkbox",
											checked: isPrivate,
											onChange: (e) => setIsPrivate(e.target.checked)
										}), /* @__PURE__ */ jsx("span", {
											className: "font-bold text-[#d6a735]",
											children: "Private Tournament (Invitation Code Only)"
										})]
									}),
									isPrivate && /* @__PURE__ */ jsxs("div", {
										className: "pt-1",
										children: [/* @__PURE__ */ jsx("label", {
											className: "block text-[#a3b8b0] mb-0.5",
											children: "Custom Invite Code (Optional)"
										}), /* @__PURE__ */ jsx("input", {
											value: inviteCode,
											onChange: (e) => setInviteCode(e.target.value.toUpperCase()),
											placeholder: "e.g. GHANA2026 (Auto-generated if blank)",
											className: "w-full px-2.5 py-1.5 bg-[#081c15] border border-[#114232] rounded-lg font-mono uppercase text-xs text-[#f5efdf]"
										})]
									}),
									/* @__PURE__ */ jsxs("label", {
										className: "flex items-center gap-2 cursor-pointer pt-1",
										children: [/* @__PURE__ */ jsx("input", {
											type: "checkbox",
											checked: requiresApproval,
											onChange: (e) => setRequiresApproval(e.target.checked)
										}), /* @__PURE__ */ jsx("span", {
											className: "font-bold text-[#f5efdf]",
											children: "Require Facilitator Approval for Applicants"
										})]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-semibold text-[#f5efdf] mb-1",
									children: "Match Days"
								}), /* @__PURE__ */ jsx("input", {
									value: scheduleDate,
									onChange: (e) => setScheduleDate(e.target.value),
									placeholder: "e.g. Saturdays & Sundays",
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
								})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
									className: "block text-xs font-semibold text-[#f5efdf] mb-1",
									children: "Match Time"
								}), /* @__PURE__ */ jsx("input", {
									value: scheduleTime,
									onChange: (e) => setScheduleTime(e.target.value),
									placeholder: "e.g. 18:00 GMT",
									className: "w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#f5efdf]"
								})] })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "modal-actions flex justify-end gap-2 pt-2",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "btn-secondary",
									onClick: () => setShowCreateModal(false),
									children: "Cancel"
								}), /* @__PURE__ */ jsx("button", {
									type: "submit",
									disabled: busy,
									className: "btn-primary",
									children: "Create Tournament"
								})]
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ jsx(Footer, {})
		]
	});
}
//#endregion
export { LeaguesPage as default };
