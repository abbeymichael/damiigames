import { C as createLucideIcon, S as Trophy, a as Eye, d as Zap, f as Shield, u as Sparkles } from "./SharedHeader-D3NEmMWE.js";
import { t as Play } from "./play-xhWKohq5.js";
import { n as CircleCheckBig } from "./coins-BlPzvERC.js";
import { t as Maximize2 } from "./maximize-2-8ghPURjo.js";
import { useMemo, useRef, useState } from "react";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Grid3x3 = createLucideIcon("grid-3x3", [
	["rect", {
		width: "18",
		height: "18",
		x: "3",
		y: "3",
		rx: "2",
		key: "afitv7"
	}],
	["path", {
		d: "M3 9h18",
		key: "1pudct"
	}],
	["path", {
		d: "M3 15h18",
		key: "5xshup"
	}],
	["path", {
		d: "M9 3v18",
		key: "fh3hqa"
	}],
	["path", {
		d: "M15 3v18",
		key: "14nvp0"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Clock = createLucideIcon("clock", [["circle", {
	cx: "12",
	cy: "12",
	r: "10",
	key: "1mglay"
}], ["path", {
	d: "M12 6v6l4 2",
	key: "mmk7yg"
}]]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Minimize2 = createLucideIcon("minimize-2", [
	["path", {
		d: "m14 10 7-7",
		key: "oa77jy"
	}],
	["path", {
		d: "M20 10h-6V4",
		key: "mjg0md"
	}],
	["path", {
		d: "m3 21 7-7",
		key: "tjx5ai"
	}],
	["path", {
		d: "M4 14h6v6",
		key: "rmj7iw"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var GitBranch = createLucideIcon("git-branch", [
	["path", {
		d: "M15 6a9 9 0 0 0-9 9V3",
		key: "1cii5b"
	}],
	["circle", {
		cx: "18",
		cy: "6",
		r: "3",
		key: "1h7g24"
	}],
	["circle", {
		cx: "6",
		cy: "18",
		r: "3",
		key: "fqmcym"
	}]
]);
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Crown = createLucideIcon("crown", [["path", {
	d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
	key: "1vdc57"
}], ["path", {
	d: "M5 21h14",
	key: "11awu3"
}]]);
//#endregion
//#region components/BracketTreeView.tsx
function BracketTreeView({ matches, participants = [], format = "single_elimination", userToken = "", isFacilitator = false, onStartMatch, onSetScore, title }) {
	const [viewMode, setViewMode] = useState("tree");
	const [highlightedPlayerToken, setHighlightedPlayerToken] = useState(null);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const containerRef = useRef(null);
	const winnersMatches = useMemo(() => {
		return matches.filter((m) => !m.bracketType || m.bracketType === "winners" || m.bracketType === "final");
	}, [matches]);
	const losersMatches = useMemo(() => {
		return matches.filter((m) => m.bracketType === "losers");
	}, [matches]);
	const winnersRounds = useMemo(() => {
		return Array.from(new Set(winnersMatches.map((m) => m.round))).sort((a, b) => a - b);
	}, [winnersMatches]);
	const losersRounds = useMemo(() => {
		return Array.from(new Set(losersMatches.map((m) => m.round))).sort((a, b) => a - b);
	}, [losersMatches]);
	const getRoundLabel = (round, totalRounds) => {
		if (round === totalRounds) return "🏆 Finals";
		if (round === totalRounds - 1 && totalRounds >= 2) return "Semifinals";
		if (round === totalRounds - 2 && totalRounds >= 3) return "Quarterfinals";
		return `Round ${round}`;
	};
	return /* @__PURE__ */ jsxs("div", {
		ref: containerRef,
		className: `bracket-tree-container bg-[#06261f] border border-[#114232] rounded-3xl p-4 sm:p-6 shadow-2xl transition-all relative text-[#f5efdf] ${isFullscreen ? "fixed inset-0 z-50 rounded-none overflow-auto bg-[#081c15] p-8" : ""}`,
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#114232] mb-6",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "px-2.5 py-0.5 bg-[#d6a735]/15 text-[#d6a735] border border-[#d6a735]/35 text-[10px] font-black uppercase rounded-full flex items-center gap-1",
					children: [/* @__PURE__ */ jsx(Trophy, { size: 12 }), " Interactive Bracket Studio"]
				}), /* @__PURE__ */ jsx("span", {
					className: "text-xs font-mono text-[#d6a735] font-bold bg-[#0c3b2e] px-2 py-0.5 rounded border border-[#d6a735]/30",
					children: format.replace("_", " ").toUpperCase()
				})]
			}), /* @__PURE__ */ jsx("h3", {
				className: "text-lg font-black text-[#f5efdf] mt-1",
				children: title || "Tournament Bracket & Progression Visualizer"
			})] }), /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2 flex-wrap",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "bg-[#081c15] p-1 rounded-xl border border-[#114232] flex items-center gap-1",
					children: [/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => setViewMode("tree"),
						className: `px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === "tree" ? "bg-[#d6a735] text-[#06261f] font-black shadow" : "text-[#a3b8b0] hover:text-[#f5efdf]"}`,
						children: [/* @__PURE__ */ jsx(GitBranch, { size: 14 }), " Tree Diagram"]
					}), /* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => setViewMode("grid"),
						className: `px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${viewMode === "grid" ? "bg-[#d6a735] text-[#06261f] font-black shadow" : "text-[#a3b8b0] hover:text-[#f5efdf]"}`,
						children: [/* @__PURE__ */ jsx(Grid3x3, { size: 14 }), " Grid Cards"]
					})]
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => setIsFullscreen(!isFullscreen),
					className: "p-2 bg-[#0c3b2e] hover:bg-[#114232] text-[#f5efdf] rounded-xl border border-[#d6a735]/30 transition-colors",
					title: isFullscreen ? "Exit Fullscreen" : "Fullscreen View",
					children: isFullscreen ? /* @__PURE__ */ jsx(Minimize2, { size: 16 }) : /* @__PURE__ */ jsx(Maximize2, { size: 16 })
				})]
			})]
		}), matches.length === 0 ? /* @__PURE__ */ jsxs("div", {
			className: "p-12 text-center text-[#a3b8b0] italic bg-[#081c15] rounded-2xl border border-[#114232] my-4 space-y-2",
			children: [
				/* @__PURE__ */ jsx(Clock, {
					size: 32,
					className: "mx-auto text-[#d6a735] animate-pulse"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm font-semibold text-[#f5efdf]",
					children: "Tournament matches have not been generated yet."
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-xs text-[#a3b8b0]",
					children: "Bracket automatically seeds once participant registrations are finalized by the organizer."
				})
			]
		}) : /* @__PURE__ */ jsxs(Fragment$1, { children: [
			highlightedPlayerToken && /* @__PURE__ */ jsxs("div", {
				className: "mb-4 p-2.5 bg-[#d6a735]/15 border border-[#d6a735]/40 rounded-xl flex items-center justify-between text-xs text-[#d6a735]",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "flex items-center gap-1.5 font-bold",
					children: [/* @__PURE__ */ jsx(Sparkles, { size: 14 }), " Highlighting Match Path for Player"]
				}), /* @__PURE__ */ jsx("button", {
					onClick: () => setHighlightedPlayerToken(null),
					className: "text-[11px] bg-[#d6a735]/20 hover:bg-[#d6a735]/30 font-bold px-2 py-0.5 rounded transition-colors text-[#f5efdf]",
					children: "Clear Highlight"
				})]
			}),
			viewMode === "tree" && /* @__PURE__ */ jsxs("div", {
				className: "space-y-8 overflow-x-auto pb-6 pt-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "space-y-3",
					children: [losersMatches.length > 0 && /* @__PURE__ */ jsxs("h4", {
						className: "text-xs font-black uppercase tracking-wider text-[#d6a735] flex items-center gap-1.5 bg-[#0c3b2e] px-3 py-1.5 rounded-xl border border-[#d6a735]/40 w-fit",
						children: [/* @__PURE__ */ jsx(Crown, { size: 14 }), " Winners Bracket"]
					}), /* @__PURE__ */ jsx("div", {
						className: "relative flex gap-12 min-w-max items-stretch pt-2",
						children: winnersRounds.map((roundNum, rIdx) => {
							const roundMatches = winnersMatches.filter((m) => m.round === roundNum);
							const totalRounds = winnersRounds.length;
							return /* @__PURE__ */ jsxs("div", {
								className: "flex flex-col justify-around min-w-[240px] space-y-6 relative z-10",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "text-xs font-black uppercase text-[#d6a735] tracking-wider bg-[#081c15] px-3 py-2 rounded-xl border border-[#114232] text-center shadow-lg flex items-center justify-center gap-1.5",
									children: [/* @__PURE__ */ jsx("span", { children: getRoundLabel(roundNum, totalRounds) }), /* @__PURE__ */ jsxs("span", {
										className: "text-[10px] text-[#a3b8b0] font-mono",
										children: [
											"(",
											roundMatches.length,
											" matches)"
										]
									})]
								}), /* @__PURE__ */ jsx("div", {
									className: "flex flex-col justify-around flex-1 space-y-6",
									children: roundMatches.map((match) => {
										const isP1Highlighted = highlightedPlayerToken && match.player1Token === highlightedPlayerToken;
										const isP2Highlighted = highlightedPlayerToken && match.player2Token === highlightedPlayerToken;
										const isP1User = userToken && match.player1Token === userToken;
										const isP2User = userToken && match.player2Token === userToken;
										return /* @__PURE__ */ jsxs("div", {
											className: `match-node p-3 bg-[#081c15] border rounded-2xl shadow-xl transition-all relative space-y-2 group hover:border-[#d6a735]/60 ${match.status === "completed" ? "border-[#114232] opacity-95" : match.status === "in_progress" ? "border-[#d6a735] bg-[#0c3b2e] ring-1 ring-[#d6a735]/50" : "border-[#114232]"} ${isP1Highlighted || isP2Highlighted ? "ring-2 ring-[#d6a735] border-[#d6a735] bg-[#0c3b2e]" : ""}`,
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between text-[10px] font-bold text-[#a3b8b0] pb-1 border-b border-[#114232]",
													children: [/* @__PURE__ */ jsxs("span", {
														className: "font-mono",
														children: ["Match #", match.matchNumber]
													}), match.status === "in_progress" ? /* @__PURE__ */ jsxs("span", {
														className: "text-[#d6a735] font-extrabold flex items-center gap-1 animate-pulse",
														children: [/* @__PURE__ */ jsx(Zap, { size: 10 }), " IN PROGRESS"]
													}) : match.status === "completed" ? /* @__PURE__ */ jsxs("span", {
														className: "text-emerald-400 font-bold flex items-center gap-1",
														children: [/* @__PURE__ */ jsx(CircleCheckBig, { size: 10 }), " COMPLETED"]
													}) : /* @__PURE__ */ jsx("span", {
														className: "text-[#a3b8b0] font-medium",
														children: "UPCOMING"
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													onClick: () => match.player1Token && setHighlightedPlayerToken(match.player1Token),
													className: `flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${match.winnerToken === match.player1Token && match.winnerToken ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50" : isP1User ? "bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40" : "bg-[#06261f] hover:bg-[#0c3b2e] text-[#f5efdf]"}`,
													children: [/* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-1.5 min-w-0",
														children: [
															/* @__PURE__ */ jsx(Shield, {
																size: 12,
																className: match.player1Token ? "text-[#d6a735]" : "text-[#a3b8b0]"
															}),
															/* @__PURE__ */ jsx("span", {
																className: "truncate",
																children: match.player1Name || "TBD"
															}),
															isP1User && /* @__PURE__ */ jsx("span", {
																className: "text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1 rounded",
																children: "YOU"
															})
														]
													}), match.winnerToken === match.player1Token && match.winnerToken && /* @__PURE__ */ jsx(Crown, {
														size: 14,
														className: "text-[#d6a735] shrink-0"
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-between px-1 text-[10px] font-mono",
													children: [/* @__PURE__ */ jsx("span", {
														className: "text-[#a3b8b0] font-bold",
														children: "VS"
													}), /* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-1.5",
														children: [
															match.status === "pending" && (isP1User || isP2User) && onStartMatch && /* @__PURE__ */ jsxs("button", {
																type: "button",
																onClick: () => onStartMatch(match.id),
																className: "px-2.5 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-lg transition-all shadow flex items-center gap-1 text-[10px]",
																children: [/* @__PURE__ */ jsx(Play, { size: 10 }), " Launch"]
															}),
															match.roomCode && /* @__PURE__ */ jsxs("a", {
																href: `/arena?code=${match.roomCode}&mode=league&spectate=1`,
																className: "px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold rounded border border-[#d6a735]/30 flex items-center gap-1",
																children: [/* @__PURE__ */ jsx(Eye, { size: 10 }), " Watch"]
															}),
															isFacilitator && match.status !== "completed" && onSetScore && /* @__PURE__ */ jsx("button", {
																type: "button",
																onClick: () => onSetScore(match),
																className: "px-2 py-0.5 bg-[#0c3b2e] hover:bg-[#d6a735] hover:text-[#06261f] text-[#f5efdf] font-bold rounded border border-[#114232] transition-colors",
																children: "Score"
															})
														]
													})]
												}),
												/* @__PURE__ */ jsxs("div", {
													onClick: () => match.player2Token && setHighlightedPlayerToken(match.player2Token),
													className: `flex items-center justify-between p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${match.winnerToken === match.player2Token && match.winnerToken ? "bg-[#d6a735]/25 text-[#d6a735] border border-[#d6a735]/50" : isP2User ? "bg-[#0c3b2e] text-[#d6a735] border border-[#d6a735]/40" : "bg-[#06261f] hover:bg-[#0c3b2e] text-[#f5efdf]"}`,
													children: [/* @__PURE__ */ jsxs("div", {
														className: "flex items-center gap-1.5 min-w-0",
														children: [
															/* @__PURE__ */ jsx(Shield, {
																size: 12,
																className: match.player2Token ? "text-[#d6a735]" : "text-[#a3b8b0]"
															}),
															/* @__PURE__ */ jsx("span", {
																className: "truncate",
																children: match.player2Name || "TBD"
															}),
															isP2User && /* @__PURE__ */ jsx("span", {
																className: "text-[9px] bg-[#d6a735] text-[#06261f] font-black px-1 rounded",
																children: "YOU"
															})
														]
													}), match.winnerToken === match.player2Token && match.winnerToken && /* @__PURE__ */ jsx(Crown, {
														size: 14,
														className: "text-[#d6a735] shrink-0"
													})]
												})
											]
										}, match.id);
									})
								})]
							}, `w-round-${roundNum}`);
						})
					})]
				}), losersMatches.length > 0 && /* @__PURE__ */ jsxs("div", {
					className: "space-y-3 pt-6 border-t border-[#114232]",
					children: [/* @__PURE__ */ jsxs("h4", {
						className: "text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5 bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-800/50 w-fit",
						children: [/* @__PURE__ */ jsx(GitBranch, { size: 14 }), " Losers Bracket (Elimination Matches)"]
					}), /* @__PURE__ */ jsx("div", {
						className: "relative flex gap-12 min-w-max items-stretch pt-2",
						children: losersRounds.map((roundNum) => {
							const roundMatches = losersMatches.filter((m) => m.round === roundNum);
							return /* @__PURE__ */ jsxs("div", {
								className: "flex flex-col justify-around min-w-[240px] space-y-6 relative z-10",
								children: [/* @__PURE__ */ jsxs("div", {
									className: "text-xs font-black uppercase text-rose-400 tracking-wider bg-[#081c15] px-3 py-2 rounded-xl border border-[#114232] text-center shadow-lg",
									children: ["Losers Round ", roundNum]
								}), /* @__PURE__ */ jsx("div", {
									className: "flex flex-col justify-around flex-1 space-y-6",
									children: roundMatches.map((match) => {
										userToken && match.player1Token;
										userToken && match.player2Token;
										return /* @__PURE__ */ jsxs("div", {
											className: "match-node p-3 bg-[#081c15] border border-[#114232] rounded-2xl shadow-xl space-y-2",
											children: [
												/* @__PURE__ */ jsxs("div", {
													className: `flex items-center justify-between p-2 rounded-xl text-xs font-bold ${match.winnerToken === match.player1Token && match.winnerToken ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-[#06261f] text-[#f5efdf]"}`,
													children: [/* @__PURE__ */ jsx("span", {
														className: "truncate",
														children: match.player1Name || "TBD"
													}), match.winnerToken === match.player1Token && /* @__PURE__ */ jsx(CircleCheckBig, {
														size: 14,
														className: "text-rose-400 shrink-0"
													})]
												}),
												/* @__PURE__ */ jsx("div", {
													className: "text-[10px] text-center font-mono text-[#a3b8b0]",
													children: "VS"
												}),
												/* @__PURE__ */ jsxs("div", {
													className: `flex items-center justify-between p-2 rounded-xl text-xs font-bold ${match.winnerToken === match.player2Token && match.winnerToken ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-[#06261f] text-[#f5efdf]"}`,
													children: [/* @__PURE__ */ jsx("span", {
														className: "truncate",
														children: match.player2Name || "TBD"
													}), match.winnerToken === match.player2Token && /* @__PURE__ */ jsx(CircleCheckBig, {
														size: 14,
														className: "text-rose-400 shrink-0"
													})]
												})
											]
										}, match.id);
									})
								})]
							}, `l-round-${roundNum}`);
						})
					})]
				})]
			}),
			viewMode === "grid" && /* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2",
				children: matches.map((match) => {
					userToken && match.player1Token;
					userToken && match.player2Token;
					return /* @__PURE__ */ jsxs("div", {
						className: "p-4 bg-[#081c15] border border-[#114232] rounded-2xl space-y-3 shadow-lg hover:border-[#d6a735]/40 transition-all",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between text-xs border-b border-[#114232] pb-2",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "font-extrabold uppercase text-[#d6a735]",
									children: [
										"Round ",
										match.round,
										" • Match #",
										match.matchNumber
									]
								}), /* @__PURE__ */ jsx("span", {
									className: `px-2 py-0.5 rounded text-[10px] font-black uppercase ${match.status === "completed" ? "bg-emerald-500/20 text-emerald-300" : match.status === "in_progress" ? "bg-[#d6a735]/20 text-[#d6a735] animate-pulse" : "bg-[#0c3b2e] text-[#a3b8b0]"}`,
									children: match.status
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2 text-xs",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: `p-2.5 rounded-xl font-bold flex items-center justify-between ${match.winnerToken === match.player1Token && match.winnerToken ? "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40" : "bg-[#06261f] text-[#f5efdf]"}`,
										children: [/* @__PURE__ */ jsx("span", { children: match.player1Name || "TBD" }), match.winnerToken === match.player1Token && /* @__PURE__ */ jsx(Crown, {
											size: 14,
											className: "text-[#d6a735]"
										})]
									}),
									/* @__PURE__ */ jsx("div", {
										className: "text-center font-mono text-[10px] text-[#a3b8b0]",
										children: "VS"
									}),
									/* @__PURE__ */ jsxs("div", {
										className: `p-2.5 rounded-xl font-bold flex items-center justify-between ${match.winnerToken === match.player2Token && match.winnerToken ? "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40" : "bg-[#06261f] text-[#f5efdf]"}`,
										children: [/* @__PURE__ */ jsx("span", { children: match.player2Name || "TBD" }), match.winnerToken === match.player2Token && /* @__PURE__ */ jsx(Crown, {
											size: 14,
											className: "text-[#d6a735]"
										})]
									})
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between pt-2 border-t border-[#114232] text-xs",
								children: [match.roomCode ? /* @__PURE__ */ jsxs("a", {
									href: `/arena?code=${match.roomCode}&mode=league&spectate=1`,
									className: "px-3 py-1 bg-[#0c3b2e] hover:bg-[#114232] text-[#d6a735] font-bold rounded-lg border border-[#d6a735]/30 flex items-center gap-1 text-xs",
									children: [/* @__PURE__ */ jsx(Eye, { size: 12 }), " Watch Match Arena"]
								}) : /* @__PURE__ */ jsx("span", {
									className: "text-[10px] text-[#a3b8b0]",
									children: "No active arena room yet"
								}), isFacilitator && match.status !== "completed" && onSetScore && /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => onSetScore(match),
									className: "px-3 py-1 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold rounded-lg text-xs transition-colors",
									children: "Set Score"
								})]
							})
						]
					}, match.id);
				})
			})
		] })]
	});
}
//#endregion
export { Clock as n, Grid3x3 as r, BracketTreeView as t };
