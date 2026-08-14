import "../index.js";
import { C as createLucideIcon, c as Phone, g as CircleCheck, h as CircleAlert, t as SharedHeader, v as LogIn, x as Wallet } from "./SharedHeader-D3NEmMWE.js";
import { t as ShieldCheck } from "./shield-check-U2HHf4RL.js";
import { t as Award } from "./award-DPFkoqI5.js";
import { t as Footer } from "./Footer-Dl82Y-rV.js";
import { useCallback, useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
/**
* @license lucide-react v1.31.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var CreditCard = createLucideIcon("credit-card", [["rect", {
	width: "20",
	height: "14",
	x: "2",
	y: "5",
	rx: "2",
	key: "ynyp8z"
}], ["line", {
	x1: "2",
	x2: "22",
	y1: "10",
	y2: "10",
	key: "1b3vmo"
}]]);
//#endregion
//#region app/wallet/page.tsx
function WalletPage() {
	const [token, setToken] = useState(null);
	const [balance, setBalance] = useState({
		points: 0,
		rating: 1e3,
		username: ""
	});
	const [transactions, setTransactions] = useState([]);
	const [topupAmountGhs, setTopupAmountGhs] = useState(20);
	const [email, setEmail] = useState("");
	const [withdrawAmount, setWithdrawAmount] = useState(20);
	const [momoNumber, setMomoNumber] = useState("");
	const [momoProvider, setMomoProvider] = useState("MTN");
	const [limits, setLimits] = useState({
		minDepositGhs: 5,
		maxDepositGhs: 5e3,
		minWithdrawalGhs: 10,
		maxWithdrawalGhs: 2e3,
		maxDailyWithdrawalGhs: 5e3
	});
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const loadWalletData = useCallback(async (userToken) => {
		try {
			const data = await (await fetch(`/api/wallet?token=${encodeURIComponent(userToken)}`)).json();
			if (data.balance) setBalance(data.balance);
			if (data.transactions) setTransactions(data.transactions);
			if (data.settings) setLimits({
				minDepositGhs: data.settings.minDepositGhs ?? 5,
				maxDepositGhs: data.settings.maxDepositGhs ?? 5e3,
				minWithdrawalGhs: data.settings.minWithdrawalGhs ?? 10,
				maxWithdrawalGhs: data.settings.maxWithdrawalGhs ?? 2e3,
				maxDailyWithdrawalGhs: data.settings.maxDailyWithdrawalGhs ?? 5e3
			});
		} catch {}
	}, []);
	const verifyPaystackRef = useCallback(async (userToken, ref) => {
		setBusy(true);
		setMessage("");
		setError("");
		try {
			const res = await fetch("/api/wallet", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "verify",
					token: userToken,
					reference: ref
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Verification failed");
			setMessage(data.message || "Paystack transaction verified!");
			loadWalletData(userToken);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Verification error");
		} finally {
			setBusy(false);
		}
	}, [loadWalletData]);
	const syncUser = useCallback(() => {
		const saved = localStorage.getItem("damii-player-token");
		setToken(saved);
		if (saved) {
			loadWalletData(saved);
			const ref = new URLSearchParams(window.location.search).get("ref");
			if (ref) verifyPaystackRef(saved, ref);
		}
	}, [loadWalletData, verifyPaystackRef]);
	useEffect(() => {
		syncUser();
		window.addEventListener("damii-auth-changed", syncUser);
		return () => window.removeEventListener("damii-auth-changed", syncUser);
	}, [syncUser]);
	async function handleTopup(e) {
		e.preventDefault();
		if (!token) return;
		setBusy(true);
		setMessage("");
		setError("");
		try {
			const res = await fetch("/api/wallet", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "deposit",
					token,
					amountGhs: topupAmountGhs,
					email
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to initialize Paystack deposit");
			setMessage(`Paystack invoice created for GH₵ ${topupAmountGhs}. Redirecting...`);
			if (data.authorizationUrl) window.open(data.authorizationUrl, "_blank");
			setTimeout(() => verifyPaystackRef(token, data.reference), 2e3);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Top-up error");
		} finally {
			setBusy(false);
		}
	}
	async function handleWithdraw(e) {
		e.preventDefault();
		if (!token) return;
		setBusy(true);
		setMessage("");
		setError("");
		try {
			const res = await fetch("/api/wallet", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "withdraw",
					token,
					amountGhs: withdrawAmount,
					momoNumber,
					momoProvider
				})
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Withdrawal failed");
			setMessage(`Withdrawal request of GH₵ ${data.ghsValue} submitted to ${momoProvider} ${momoNumber}. Ref: ${data.reference}`);
			loadWalletData(token);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Withdrawal error");
		} finally {
			setBusy(false);
		}
	}
	if (!token) return /* @__PURE__ */ jsxs("main", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ jsx(SharedHeader, {}),
			/* @__PURE__ */ jsxs("section", {
				className: "wallet-header",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "eyebrow",
						children: [/* @__PURE__ */ jsx(Wallet, { size: 16 }), " USER AUTHENTICATION REQUIRED"]
					}),
					/* @__PURE__ */ jsx("h1", { children: "Wallet Balance & Financial Ledger" }),
					/* @__PURE__ */ jsx("p", { children: "Please sign in or create an account to view your balance, top up via Paystack, or cash out to Mobile Money." })
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "max-w-md mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 shadow-xl",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto",
						children: /* @__PURE__ */ jsx(LogIn, { size: 28 })
					}),
					/* @__PURE__ */ jsx("h2", {
						className: "text-xl font-bold text-slate-100",
						children: "Sign In to Access Your Wallet"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm text-slate-400 leading-relaxed",
						children: "All wagers, tournament fees, escrow vaults, and Mobile Money payouts require an active DAMII user login."
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => window.dispatchEvent(new CustomEvent("damii-open-auth")),
						className: "w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2",
						children: [/* @__PURE__ */ jsx(LogIn, { size: 16 }), " Click Login / Register in Top Navigation"]
					})
				]
			}),
			/* @__PURE__ */ jsx(Footer, {})
		]
	});
	return /* @__PURE__ */ jsxs("main", {
		className: "app-shell",
		children: [
			/* @__PURE__ */ jsx(SharedHeader, {}),
			/* @__PURE__ */ jsxs("section", {
				className: "wallet-header",
				children: [
					/* @__PURE__ */ jsxs("span", {
						className: "eyebrow",
						children: [/* @__PURE__ */ jsx(Wallet, { size: 16 }), " WALLET LEDGER & PAYSTACK GATEWAY"]
					}),
					/* @__PURE__ */ jsx("h1", { children: "Wallet Balance & MoMo Cash Out" }),
					/* @__PURE__ */ jsx("p", { children: "Top-up funds via Paystack Mobile Money, wager in matches, enter tournaments, and cash out to Mobile Money (1 Cedi = GH₵ 1.00)." })
				]
			}),
			message && /* @__PURE__ */ jsxs("p", {
				className: "alert-banner success",
				children: [
					/* @__PURE__ */ jsx(CircleCheck, { size: 16 }),
					" ",
					message
				]
			}),
			error && /* @__PURE__ */ jsxs("p", {
				className: "alert-banner error",
				children: [
					/* @__PURE__ */ jsx(CircleAlert, { size: 16 }),
					" ",
					error
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "balance-grid",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "balance-card points-card",
					children: [
						/* @__PURE__ */ jsx("small", { children: "AVAILABLE BALANCE" }),
						/* @__PURE__ */ jsxs("h2", { children: ["GH₵ ", typeof balance.points === "number" ? balance.points.toFixed(2) : balance.points] }),
						/* @__PURE__ */ jsx("p", { children: "Used for Wager Matches, Tournament Entries, and direct MoMo Cash Out (1 Cedi = GH₵ 1.00)." })
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "balance-card marbles-card",
					children: [
						/* @__PURE__ */ jsx("small", { children: "RATING & RANK" }),
						/* @__PURE__ */ jsxs("h2", { children: [
							/* @__PURE__ */ jsx(Award, {
								className: "inline text-amber-400 mr-1",
								size: 28
							}),
							" ",
							balance.rating,
							" ELO"
						] }),
						/* @__PURE__ */ jsx("p", { children: "Skill ranking based on match victories, draws, and tournament brackets." })
					]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "wallet-actions-grid",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "action-box",
					children: [
						/* @__PURE__ */ jsxs("h3", { children: [/* @__PURE__ */ jsx(CreditCard, { size: 18 }), " Top-Up Wallet (Paystack)"] }),
						/* @__PURE__ */ jsx("p", { children: "Instant deposit via Mobile Money (MTN / Telecel / AT) or Bank Card." }),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: handleTopup,
							children: [
								/* @__PURE__ */ jsxs("label", { children: ["Amount in GHS (GH₵)", /* @__PURE__ */ jsx("input", {
									type: "number",
									min: limits.minDepositGhs,
									max: limits.maxDepositGhs,
									step: 5,
									value: topupAmountGhs,
									onChange: (e) => setTopupAmountGhs(Number(e.target.value))
								})] }),
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between text-[11px] text-slate-400 mt-1 mb-2",
									children: [/* @__PURE__ */ jsxs("span", { children: [
										"Limit: ",
										/* @__PURE__ */ jsxs("strong", { children: ["GH₵ ", limits.minDepositGhs] }),
										" min – ",
										/* @__PURE__ */ jsxs("strong", { children: ["GH₵ ", limits.maxDepositGhs.toLocaleString()] }),
										" max"
									] }), /* @__PURE__ */ jsxs("span", {
										className: "rate-hint",
										children: ["Will credit: ", /* @__PURE__ */ jsxs("strong", {
											className: "text-emerald-400",
											children: ["GH₵ ", topupAmountGhs.toFixed(2)]
										})]
									})]
								}),
								/* @__PURE__ */ jsxs("label", { children: ["Email (Receipt)", /* @__PURE__ */ jsx("input", {
									type: "email",
									placeholder: "player@damii.gh",
									value: email,
									onChange: (e) => setEmail(e.target.value)
								})] }),
								/* @__PURE__ */ jsx("button", {
									type: "submit",
									disabled: busy,
									className: "btn-primary",
									children: "Pay with Paystack"
								})
							]
						})
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "action-box",
					children: [
						/* @__PURE__ */ jsxs("h3", { children: [/* @__PURE__ */ jsx(Phone, { size: 18 }), " Mobile Money Cash Out"] }),
						/* @__PURE__ */ jsx("p", { children: "Withdraw funds directly to Mobile Money (1 Cedi = GH₵ 1.00)." }),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: handleWithdraw,
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "form-row",
									children: [/* @__PURE__ */ jsxs("label", { children: ["Amount to Withdraw (GH₵)", /* @__PURE__ */ jsx("input", {
										type: "number",
										min: limits.minWithdrawalGhs,
										max: limits.maxWithdrawalGhs,
										step: 5,
										value: withdrawAmount,
										onChange: (e) => setWithdrawAmount(Number(e.target.value))
									})] }), /* @__PURE__ */ jsxs("label", { children: ["Provider", /* @__PURE__ */ jsxs("select", {
										value: momoProvider,
										onChange: (e) => setMomoProvider(e.target.value),
										children: [
											/* @__PURE__ */ jsx("option", {
												value: "MTN",
												children: "MTN MoMo"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "Telecel",
												children: "Telecel Cash"
											}),
											/* @__PURE__ */ jsx("option", {
												value: "AT",
												children: "AT Money"
											})
										]
									})] })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center justify-between text-[11px] text-slate-400 mt-1 mb-2",
									children: [/* @__PURE__ */ jsxs("span", { children: [
										"Per-Tx: ",
										/* @__PURE__ */ jsxs("strong", { children: [
											"GH₵ ",
											limits.minWithdrawalGhs,
											"–",
											limits.maxWithdrawalGhs.toLocaleString()
										] }),
										" (24h Cap: ",
										/* @__PURE__ */ jsxs("strong", { children: ["GH₵ ", limits.maxDailyWithdrawalGhs.toLocaleString()] }),
										")"
									] }), /* @__PURE__ */ jsxs("span", {
										className: "rate-hint",
										children: ["Payout value: ", /* @__PURE__ */ jsxs("strong", {
											className: "text-amber-400",
											children: ["GH₵ ", withdrawAmount.toFixed(2)]
										})]
									})]
								}),
								/* @__PURE__ */ jsxs("label", { children: ["MoMo Phone Number", /* @__PURE__ */ jsx("input", {
									type: "tel",
									placeholder: "024XXXXXXX",
									value: momoNumber,
									onChange: (e) => setMomoNumber(e.target.value),
									required: true
								})] }),
								/* @__PURE__ */ jsx("button", {
									type: "submit",
									disabled: busy || balance.points < withdrawAmount,
									className: "btn-outline",
									children: "Request Cash Out"
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "transaction-history",
				children: [/* @__PURE__ */ jsx("h3", { children: "Transaction History & Audit Ledger" }), /* @__PURE__ */ jsx("div", {
					className: "table-responsive",
					children: /* @__PURE__ */ jsxs("table", { children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("th", { children: "Date" }),
						/* @__PURE__ */ jsx("th", { children: "Type" }),
						/* @__PURE__ */ jsx("th", { children: "Currency" }),
						/* @__PURE__ */ jsx("th", { children: "Amount" }),
						/* @__PURE__ */ jsx("th", { children: "Reference" }),
						/* @__PURE__ */ jsx("th", { children: "Status" })
					] }) }), /* @__PURE__ */ jsx("tbody", { children: transactions.length === 0 ? /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
						colSpan: 6,
						className: "empty-cell",
						children: "No transaction history found."
					}) }) : transactions.map((tx) => /* @__PURE__ */ jsxs("tr", { children: [
						/* @__PURE__ */ jsx("td", { children: new Date(tx.createdAt).toLocaleDateString() }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
							className: `tx-type ${tx.type}`,
							children: tx.type
						}) }),
						/* @__PURE__ */ jsx("td", { children: tx.currency }),
						/* @__PURE__ */ jsx("td", {
							className: tx.amount >= 0 ? "positive" : "negative",
							children: tx.amount >= 0 ? `+${tx.amount}` : tx.amount
						}),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("code", { children: tx.reference }) }),
						/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("span", {
							className: `tx-status ${tx.status}`,
							children: tx.status
						}) })
					] }, tx.id)) })] })
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "compliance-note",
				children: [/* @__PURE__ */ jsx(ShieldCheck, { size: 16 }), /* @__PURE__ */ jsxs("p", { children: [/* @__PURE__ */ jsx("strong", { children: "Compliance & Safe Play Notice:" }), " DAMII operates on skill-based tournament rules and verified Paystack escrow safeguards. All game actions are logged in immutable ledger records."] })]
			}),
			/* @__PURE__ */ jsx(Footer, {})
		]
	});
}
//#endregion
export { WalletPage as default };
