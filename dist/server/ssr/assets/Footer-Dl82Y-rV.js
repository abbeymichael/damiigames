import { S as Trophy, b as Swords, f as Shield, o as UserCog, u as Sparkles, w as Link, x as Wallet } from "./SharedHeader-D3NEmMWE.js";
import { n as CircleCheckBig, t as Coins } from "./coins-BlPzvERC.js";
import { t as Bot } from "./bot-CkLYI2kP.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region components/Footer.tsx
function Footer() {
	return /* @__PURE__ */ jsx("footer", {
		className: "w-full bg-[#041913] border-t border-[#114232] text-[#a3b8b0] text-xs pt-12 pb-8 px-4 sm:px-8",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-7xl mx-auto space-y-10",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-[#114232]/80",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "lg:col-span-2 space-y-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ jsx("span", {
									className: "w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c3b2e] to-[#06261f] text-[#d6a735] border border-[#d6a735]/40 flex items-center justify-center font-black font-serif text-lg shadow-lg",
									children: "D"
								}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
									className: "text-base font-black text-[#f5efdf] tracking-wide block",
									children: "DAMII PLATFORM"
								}), /* @__PURE__ */ jsx("span", {
									className: "text-[10px] text-[#d6a735] font-bold uppercase tracking-wider block",
									children: "10×10 Draughts Arena & Tournament Engine"
								})] })]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-xs text-[#cbd5e1]/80 leading-relaxed max-w-sm",
								children: "The premier digital arena for 10×10 Draughts. Experience real-time multiplayer, multi-hop compulsory jump enforcement, flying king mechanics, and automated escrow tournament settlement."
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2 pt-1",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#06261f] border border-emerald-500/30 rounded-lg text-[11px] font-semibold text-emerald-400",
									children: [/* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }), "Live Arena Server Online"]
								}), /* @__PURE__ */ jsxs("span", {
									className: "inline-flex items-center gap-1 px-2.5 py-1 bg-[#06261f] border border-[#114232] rounded-lg text-[11px] font-semibold text-[#f5efdf]",
									children: [/* @__PURE__ */ jsx(CircleCheckBig, {
										size: 12,
										className: "text-[#d6a735]"
									}), " Standard 10×10 Rules"]
								})]
							})
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-3",
						children: [/* @__PURE__ */ jsxs("h4", {
							className: "text-[#d6a735] font-extrabold uppercase text-[11px] tracking-wider flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx(Swords, { size: 14 }), " Game Modes"]
						}), /* @__PURE__ */ jsxs("ul", {
							className: "space-y-2 text-xs",
							children: [
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/arena",
									className: "hover:text-[#f5efdf] transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Swords, {
										size: 12,
										className: "text-[#a3b8b0]/70"
									}), " Online Matchmaking"]
								}) }),
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/arena?mode=local",
									className: "hover:text-[#f5efdf] transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Bot, {
										size: 12,
										className: "text-[#a3b8b0]/70"
									}), " Local Pass & Play"]
								}) }),
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/arena?mode=bot",
									className: "hover:text-[#f5efdf] transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Bot, {
										size: 12,
										className: "text-[#a3b8b0]/70"
									}), " Practice vs AI Engine"]
								}) }),
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/arena?mode=wager",
									className: "hover:text-[#f5efdf] transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Coins, {
										size: 12,
										className: "text-[#d6a735]"
									}), " Competitive Wager Room"]
								}) })
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-3",
						children: [/* @__PURE__ */ jsxs("h4", {
							className: "text-[#d6a735] font-extrabold uppercase text-[11px] tracking-wider flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx(Trophy, { size: 14 }), " Competition & Hub"]
						}), /* @__PURE__ */ jsxs("ul", {
							className: "space-y-2 text-xs",
							children: [
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/leagues",
									className: "hover:text-[#f5efdf] transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Trophy, {
										size: 12,
										className: "text-[#a3b8b0]/70"
									}), " Active Leagues & Brackets"]
								}) }),
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/organizer",
									className: "text-[#d6a735] font-bold hover:text-white transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(UserCog, {
										size: 13,
										className: "text-[#d6a735]"
									}), " Organizer Licensing Portal"]
								}) }),
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/wallet",
									className: "hover:text-[#f5efdf] transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Wallet, {
										size: 12,
										className: "text-[#a3b8b0]/70"
									}), " Wallet & Escrow Ledger"]
								}) })
							]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-3",
						children: [/* @__PURE__ */ jsxs("h4", {
							className: "text-[#d6a735] font-extrabold uppercase text-[11px] tracking-wider flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx(Shield, { size: 14 }), " Governance"]
						}), /* @__PURE__ */ jsxs("ul", {
							className: "space-y-2 text-xs",
							children: [
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									href: "/admin",
									className: "hover:text-[#f5efdf] transition-colors flex items-center gap-1.5",
									children: [/* @__PURE__ */ jsx(Shield, {
										size: 12,
										className: "text-[#a3b8b0]/70"
									}), " Admin Oversight Studio"]
								}) }),
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("span", {
									className: "text-[#a3b8b0]/70 flex items-center gap-1.5 cursor-default",
									children: [/* @__PURE__ */ jsx(Sparkles, {
										size: 12,
										className: "text-[#d6a735]"
									}), " Auto-Dispute Engine"]
								}) }),
								/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("span", {
									className: "text-[#a3b8b0]/70 flex items-center gap-1.5 cursor-default",
									children: [/* @__PURE__ */ jsx(CircleCheckBig, {
										size: 12,
										className: "text-emerald-400"
									}), " Paystack Mobile Escrow"]
								}) })
							]
						})]
					})
				]
			}), /* @__PURE__ */ jsxs("div", {
				className: "flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#a3b8b0]/70 pt-2",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					"© 2026 ",
					/* @__PURE__ */ jsx("strong", {
						className: "text-[#f5efdf]",
						children: "DAMII Platform"
					}),
					". All rights reserved."
				] }), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-6",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "hover:text-[#f5efdf] transition-colors cursor-pointer",
							children: "Compulsory Jump Rules"
						}),
						/* @__PURE__ */ jsx("span", { children: "•" }),
						/* @__PURE__ */ jsx("span", {
							className: "hover:text-[#f5efdf] transition-colors cursor-pointer",
							children: "Fair Play Guarantee"
						}),
						/* @__PURE__ */ jsx("span", { children: "•" }),
						/* @__PURE__ */ jsx("span", {
							className: "hover:text-[#f5efdf] transition-colors cursor-pointer",
							children: "Terms of Service"
						})
					]
				})]
			})]
		})
	});
}
//#endregion
export { Footer as t };
