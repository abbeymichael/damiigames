import { c as useRouter } from "../index.js";
import { C as createLucideIcon, S as Trophy, b as Swords, d as Zap, t as SharedHeader, w as Link, x as Wallet } from "./SharedHeader-D3NEmMWE.js";
import { t as ShieldCheck } from "./shield-check-U2HHf4RL.js";
import { t as ArrowRight } from "./arrow-right-BBE6bKn_.js";
import { t as Footer } from "./Footer-Dl82Y-rV.js";
import { t as ShieldAlert } from "./shield-alert-BsdUthEn.js";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var BookOpen = createLucideIcon("book-open", [["path", {
	d: "M12 5v16",
	key: "1f6ucr"
}], ["path", {
	d: "M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z",
	key: "1fyvmf"
}]]);
//#endregion
//#region app/page.tsx
function LandingPage() {
	const router = useRouter();
	const [isAdmin, setIsAdmin] = useState(false);
	const [adminUsername, setAdminUsername] = useState("");
	useEffect(() => {
		const checkAdminAuth = () => {
			const savedToken = localStorage.getItem("damii-player-token");
			if (savedToken) fetch(`/api/wallet?token=${encodeURIComponent(savedToken)}`).then((r) => r.json()).then((d) => {
				if (d.balance && (d.balance.role === "admin" || d.balance.role === "super_admin")) {
					setIsAdmin(true);
					setAdminUsername(d.balance.username || "Administrator");
				} else setIsAdmin(false);
			}).catch(() => setIsAdmin(false));
			else setIsAdmin(false);
		};
		checkAdminAuth();
		window.addEventListener("damii-auth-changed", checkAdminAuth);
		return () => window.removeEventListener("damii-auth-changed", checkAdminAuth);
	}, []);
	const handleArenaClick = (e) => {
		if (isAdmin) {
			e.preventDefault();
			alert("Administrator accounts serve as system facilitators and regulators. Admin accounts cannot participate in player matches. Redirecting to Admin Control Center.");
			router.push("/admin");
		}
	};
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ jsx(SharedHeader, {}),
			/* @__PURE__ */ jsxs("section", {
				className: "marketing-hero",
				children: [
					isAdmin && /* @__PURE__ */ jsxs("div", {
						className: "max-w-3xl mx-auto mb-6 p-4 bg-amber-950/90 border border-amber-600/80 rounded-2xl text-[#f5efdf] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left animate-in fade-in zoom-in-95 duration-200",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ jsx(ShieldAlert, {
								size: 26,
								className: "text-[#d6a735] shrink-0 mt-0.5"
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h4", {
								className: "font-bold text-sm text-[#d6a735] flex items-center gap-1.5",
								children: [
									"Logged in as Admin (",
									adminUsername,
									")"
								]
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xs text-slate-300 mt-0.5",
								children: "Administrator accounts function exclusively as facilitators, regulators, and match supervisors. Playing in matches or placing wagers is restricted for Admin accounts."
							})] })]
						}), /* @__PURE__ */ jsxs(Link, {
							href: "/admin",
							className: "shrink-0 px-4 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md",
							children: [
								/* @__PURE__ */ jsx(ShieldCheck, { size: 16 }),
								" Admin Control Center ",
								/* @__PURE__ */ jsx(ArrowRight, { size: 14 })
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "hero-badge",
						children: [/* @__PURE__ */ jsx(ShieldCheck, { size: 14 }), " Official 10×10 Strategy Arena"]
					}),
					/* @__PURE__ */ jsxs("h1", { children: [
						"Think ahead.",
						/* @__PURE__ */ jsx("br", {}),
						/* @__PURE__ */ jsx("em", { children: "Master the Damii Board." })
					] }),
					/* @__PURE__ */ jsx("p", {
						className: "hero-subtext",
						children: "Experience traditional 10×10 draughts with real-time multiplayer, compulsory capture rules, automated escrow protection, and official tournament leagues."
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "hero-ctas",
						children: [
							isAdmin ? /* @__PURE__ */ jsxs(Link, {
								href: "/admin",
								className: "btn-primary",
								children: [
									/* @__PURE__ */ jsx(ShieldCheck, { size: 18 }),
									" Admin Control Center ",
									/* @__PURE__ */ jsx(ArrowRight, { size: 16 })
								]
							}) : /* @__PURE__ */ jsxs(Link, {
								href: "/arena",
								onClick: handleArenaClick,
								className: "btn-primary",
								children: [
									/* @__PURE__ */ jsx(Swords, { size: 18 }),
									" Enter Game Arena ",
									/* @__PURE__ */ jsx(ArrowRight, { size: 16 })
								]
							}),
							/* @__PURE__ */ jsxs(Link, {
								href: "/leagues",
								className: "btn-secondary",
								children: [/* @__PURE__ */ jsx(Trophy, { size: 18 }), " Tournament Hub"]
							}),
							/* @__PURE__ */ jsxs(Link, {
								href: "/wallet",
								className: "btn-outline",
								children: [/* @__PURE__ */ jsx(Wallet, { size: 18 }), " Wallet & Rewards"]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "hero-stats",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: "10 × 10" }), /* @__PURE__ */ jsx("span", { children: "Authentic Board" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: "60s" }), /* @__PURE__ */ jsx("span", { children: "Turn Clock" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: "100% Safe" }), /* @__PURE__ */ jsx("span", { children: "Automated Escrow" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("strong", { children: "Instant" }), /* @__PURE__ */ jsx("span", { children: "Payout Settlement" })] })
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "features-grid",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "feature-card",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "feature-icon",
								children: /* @__PURE__ */ jsx(Swords, { size: 24 })
							}),
							/* @__PURE__ */ jsx("h3", { children: "Authentic 10×10 Arena" }),
							/* @__PURE__ */ jsx("p", { children: "Play traditional 10×10 Damii with compulsory captures, flying kings, 60-second turn timers, and customizable board themes locally or in private online rooms." })
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "feature-card",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "feature-icon",
								children: /* @__PURE__ */ jsx(Wallet, { size: 24 })
							}),
							/* @__PURE__ */ jsx("h3", { children: "Guaranteed Escrow Protection" }),
							/* @__PURE__ */ jsx("p", { children: "Enjoy safe, transparent wager management with our automated escrow vault that holds match stakes securely and guarantees instant settlement to the victor upon match completion." })
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "feature-card",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "feature-icon",
								children: /* @__PURE__ */ jsx(Trophy, { size: 24 })
							}),
							/* @__PURE__ */ jsx("h3", { children: "Competitive Tournament Hub" }),
							/* @__PURE__ */ jsx("p", { children: "Host or join single-elimination leagues featuring private invitation codes, facilitator approval controls, scheduled match days, and grand prize pool payouts." })
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "feature-card",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "feature-icon",
								children: /* @__PURE__ */ jsx(Zap, { size: 24 })
							}),
							/* @__PURE__ */ jsx("h3", { children: "Live Spectating & Analytics" }),
							/* @__PURE__ */ jsx("p", { children: "Watch live matches in real-time using custom room spectator links, track game move logs, study grandmaster tactics, and follow global player leaderboard rankings." })
						]
					})
				]
			}),
			/* @__PURE__ */ jsx("section", {
				className: "rules-section",
				children: /* @__PURE__ */ jsxs("div", {
					className: "rules-container",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "rules-header",
						children: [
							/* @__PURE__ */ jsx(BookOpen, { size: 28 }),
							/* @__PURE__ */ jsx("h2", { children: "Core Damii Rules" }),
							/* @__PURE__ */ jsx("p", { children: "Master the compulsory capture and flying king tactics." })
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "rules-cards",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "rule-box",
								children: [
									/* @__PURE__ */ jsx("span", { children: "01" }),
									/* @__PURE__ */ jsx("h4", { children: "10×10 Grid Layout" }),
									/* @__PURE__ */ jsx("p", { children: "20 Player 1 pieces vs 20 Player 2 pieces positioned on dark playable squares." })
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rule-box",
								children: [
									/* @__PURE__ */ jsx("span", { children: "02" }),
									/* @__PURE__ */ jsx("h4", { children: "Compulsory Capture" }),
									/* @__PURE__ */ jsx("p", { children: "Jumping over an opponent piece is mandatory. Multiple jumps must be continued." })
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rule-box",
								children: [
									/* @__PURE__ */ jsx("span", { children: "03" }),
									/* @__PURE__ */ jsx("h4", { children: "Flying Kings" }),
									/* @__PURE__ */ jsx("p", { children: "Reaching the opponent back row promotes a piece to a King with full diagonal flight." })
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "rule-box",
								children: [
									/* @__PURE__ */ jsx("span", { children: "04" }),
									/* @__PURE__ */ jsx("h4", { children: "60s Turn Timer" }),
									/* @__PURE__ */ jsx("p", { children: "Each player has 60 seconds per turn. Disconnections allow a 45s grace window to reconnect." })
								]
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
export { LandingPage as default };
