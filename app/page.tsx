"use client";

import "@/lib/react-shim";
import { useEffect, useState } from "react";
import { NavLink, safeNavigate } from "@/components/NavLink";
import { useRouter } from "next/navigation";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import { Swords, Trophy, Wallet, ShieldCheck, Zap, ArrowRight, BookOpen, ShieldAlert, LayoutGrid, Timer } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");

  useEffect(() => {
    const checkAdminAuth = () => {
      const savedToken = localStorage.getItem("damii-player-token");
      if (savedToken) {
        fetch(`/api/wallet?token=${encodeURIComponent(savedToken)}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.balance && (d.balance.role === "admin" || d.balance.role === "super_admin")) {
              setIsAdmin(true);
              setAdminUsername(d.balance.username || "Administrator");
            } else {
              setIsAdmin(false);
            }
          })
          .catch(() => setIsAdmin(false));
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminAuth();
    window.addEventListener("damii-auth-changed", checkAdminAuth);
    return () => window.removeEventListener("damii-auth-changed", checkAdminAuth);
  }, []);

  const handleArenaClick = (e: React.MouseEvent) => {
    if (isAdmin) {
      e.preventDefault();
      alert("Administrator accounts serve as system facilitators and regulators. Admin accounts cannot participate in player matches. Redirecting to Admin Control Center.");
      safeNavigate(router, "/admin");
    }
  };

  return (
    <main className="app-shell">
      <SharedHeader />

      <section className="marketing-hero">
        {isAdmin && (
          <div className="max-w-3xl mx-auto mb-6 p-4 bg-amber-950/90 border border-amber-600/80 rounded-2xl text-[#f5efdf] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-left animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <ShieldAlert size={26} className="text-[#d6a735] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-[#d6a735] flex items-center gap-1.5">
                  Logged in as Admin ({adminUsername})
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Administrator accounts function exclusively as facilitators, regulators, and match supervisors. Playing in matches or placing wagers is restricted for Admin accounts.
                </p>
              </div>
            </div>
            <NavLink
              href="/admin"
              className="shrink-0 px-4 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <ShieldCheck size={16} /> Admin Control Center <ArrowRight size={14} />
            </NavLink>
          </div>
        )}

        <div className="hero-badge">
          <ShieldCheck size={14} /> Official 10×10 Strategy Arena
        </div>
        <h1>
          Think ahead.<br />
          <em>Master the Damii Board.</em>
        </h1>
        <p className="hero-subtext">
          Experience traditional 10×10 draughts with real-time multiplayer,
          compulsory capture rules, automated escrow protection, and official tournament leagues.
        </p>

        <div className="max-w-3xl mx-auto mb-8 px-2">
          {isAdmin ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <NavLink
                href="/admin"
                className="group relative flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#0c3b2e] to-[#08291f] text-white shadow-lg shadow-emerald-950/20 border border-[#d6a735]/40 hover:border-[#d6a735] hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-11 h-11 rounded-xl bg-[#d6a735]/20 border border-[#d6a735]/40 text-[#f6d884] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm sm:text-base text-[#fffdf7] tracking-tight flex items-center gap-2">
                      Admin Control Center
                    </div>
                    <div className="text-[11px] text-emerald-200/80 font-medium">
                      Platform regulation, users & payouts
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#f6d884] group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={16} />
                </div>
              </NavLink>

              <NavLink
                href="/leagues"
                className="group relative flex items-center justify-between p-4 rounded-2xl bg-white/90 text-[#0c3b2e] shadow-md shadow-emerald-950/5 border border-[#0c3b2e]/15 hover:border-[#d6a735]/70 hover:bg-[#fffef8] hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#b45309] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Trophy size={22} />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm sm:text-base text-[#0c3b2e] tracking-tight">
                      Tournament Hub
                    </div>
                    <div className="text-[11px] text-[#63716b] font-medium">
                      Supervise league brackets & match days
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-950/5 flex items-center justify-center text-[#0c3b2e] group-hover:translate-x-1 transition-transform">
                  <ArrowRight size={16} />
                </div>
              </NavLink>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3">
              {/* Primary: Enter Game Arena */}
              <NavLink
                href="/arena"
                onClick={handleArenaClick}
                className="group relative flex-1 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0c3b2e] via-[#0e4435] to-[#072a20] text-white shadow-xl shadow-emerald-950/25 border border-[#d6a735]/50 hover:border-[#d6a735] hover:shadow-emerald-950/35 hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#d6a735]/20 border border-[#d6a735]/40 text-[#f6d884] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#d6a735] group-hover:text-[#06261f] transition-all">
                    <Swords size={20} />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm sm:text-base text-[#fffdf7] tracking-tight flex items-center gap-1.5">
                      <span>Enter Game Arena</span>
                    </div>
                    <div className="text-[11px] text-emerald-200/80 font-medium">
                      PvP Rooms, AI Bots & Local
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#f6d884] group-hover:translate-x-1 group-hover:bg-[#d6a735] group-hover:text-[#06261f] transition-all ml-2">
                  <ArrowRight size={15} />
                </div>
              </NavLink>

              {/* Companion 1: Tournament Hub */}
              <NavLink
                href="/leagues"
                className="group flex-1 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/95 text-[#0c3b2e] shadow-md shadow-emerald-950/5 border border-[#0c3b2e]/15 hover:border-[#d6a735]/80 hover:bg-[#fffef8] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#b45309] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#b45309] group-hover:text-white transition-all">
                    <Trophy size={20} />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm sm:text-base text-[#0c3b2e] tracking-tight">
                      Tournament Hub
                    </div>
                    <div className="text-[11px] text-[#63716b] font-medium">
                      Leagues, Brackets & Prizes
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-950/5 flex items-center justify-center text-[#0c3b2e] group-hover:translate-x-1 group-hover:bg-[#0c3b2e] group-hover:text-[#d6a735] transition-all ml-2">
                  <ArrowRight size={15} />
                </div>
              </NavLink>

              {/* Companion 2: Wallet & Rewards */}
              <NavLink
                href="/wallet"
                className="group flex-1 flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/95 text-[#0c3b2e] shadow-md shadow-emerald-950/5 border border-[#0c3b2e]/15 hover:border-[#d6a735]/80 hover:bg-[#fffef8] hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-teal-950/5 border border-teal-900/15 text-[#0f766e] flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-[#0f766e] group-hover:text-white transition-all">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm sm:text-base text-[#0c3b2e] tracking-tight">
                      Wallet & Rewards
                    </div>
                    <div className="text-[11px] text-[#63716b] font-medium">
                      Escrow, Balance & Payouts
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-emerald-950/5 flex items-center justify-center text-[#0c3b2e] group-hover:translate-x-1 group-hover:bg-[#0c3b2e] group-hover:text-[#d6a735] transition-all ml-2">
                  <ArrowRight size={15} />
                </div>
              </NavLink>
            </div>
          )}
        </div>

        <div className="max-w-5xl mx-auto my-6 px-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 rounded-2xl bg-gradient-to-b from-[#ffffff] to-[#fffdf9] border border-[#0c3b2e]/15 shadow-[0_10px_30px_-10px_rgba(6,38,31,0.08)]">
            
            {/* Stat 1: 10 x 10 Board */}
            <div className="group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl bg-white/80 border border-[#0c3b2e]/8 hover:border-[#d6a735]/60 hover:bg-[#fffef8] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/5 border border-emerald-900/10 text-[#0c3b2e] flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-[#0c3b2e] group-hover:text-[#d6a735] transition-all">
                <LayoutGrid size={20} />
              </div>
              <div className="font-serif font-black text-xl sm:text-2xl text-[#0c3b2e] tracking-tight leading-none mb-1">
                10 × 10
              </div>
              <div className="text-xs font-bold text-[#0c3b2e] tracking-wide">
                Authentic Board
              </div>
              <div className="text-[10px] text-[#63716b] mt-0.5 hidden sm:block">
                100-Square Battleground
              </div>
            </div>

            {/* Stat 2: 60s Turn Clock */}
            <div className="group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl bg-white/80 border border-[#0c3b2e]/8 hover:border-[#d6a735]/60 hover:bg-[#fffef8] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-950/5 border border-amber-900/10 text-[#b45309] flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-[#b45309] group-hover:text-white transition-all">
                <Timer size={20} />
              </div>
              <div className="font-serif font-black text-xl sm:text-2xl text-[#0c3b2e] tracking-tight leading-none mb-1">
                60s
              </div>
              <div className="text-xs font-bold text-[#0c3b2e] tracking-wide">
                Turn Clock
              </div>
              <div className="text-[10px] text-[#63716b] mt-0.5 hidden sm:block">
                Tactical Blitz & Grace Window
              </div>
            </div>

            {/* Stat 3: 100% Safe Escrow */}
            <div className="group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl bg-white/80 border border-[#0c3b2e]/8 hover:border-[#d6a735]/60 hover:bg-[#fffef8] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-950/5 border border-teal-900/10 text-[#0f766e] flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-[#0f766e] group-hover:text-white transition-all">
                <ShieldCheck size={20} />
              </div>
              <div className="font-serif font-black text-xl sm:text-2xl text-[#0c3b2e] tracking-tight leading-none mb-1">
                100% Safe
              </div>
              <div className="text-xs font-bold text-[#0c3b2e] tracking-wide">
                Automated Escrow
              </div>
              <div className="text-[10px] text-[#63716b] mt-0.5 hidden sm:block">
                Protected Wager Vault
              </div>
            </div>

            {/* Stat 4: Instant Settlement */}
            <div className="group flex flex-col items-center text-center p-3.5 sm:p-4 rounded-xl bg-white/80 border border-[#0c3b2e]/8 hover:border-[#d6a735]/60 hover:bg-[#fffef8] transition-all duration-200 hover:-translate-y-0.5 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#d6a735] flex items-center justify-center mb-2.5 group-hover:scale-105 group-hover:bg-[#d6a735] group-hover:text-[#06261f] transition-all">
                <Zap size={20} />
              </div>
              <div className="font-serif font-black text-xl sm:text-2xl text-[#0c3b2e] tracking-tight leading-none mb-1">
                Instant
              </div>
              <div className="text-xs font-bold text-[#0c3b2e] tracking-wide">
                Payout Settlement
              </div>
              <div className="text-[10px] text-[#63716b] mt-0.5 hidden sm:block">
                Direct Balance Crediting
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon"><Swords size={24} /></div>
          <h3>Authentic 10×10 Arena</h3>
          <p>
            Play traditional 10×10 Damii with compulsory captures, flying kings, 60-second turn timers,
            and customizable board themes locally or in private online rooms.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon"><Wallet size={24} /></div>
          <h3>Guaranteed Escrow Protection</h3>
          <p>
            Enjoy safe, transparent wager management with our automated escrow vault that holds match stakes securely
            and guarantees instant settlement to the victor upon match completion.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon"><Trophy size={24} /></div>
          <h3>Competitive Tournament Hub</h3>
          <p>
            Host or join single-elimination leagues featuring private invitation codes, facilitator approval controls,
            scheduled match days, and grand prize pool payouts.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon"><Zap size={24} /></div>
          <h3>Live Spectating & Analytics</h3>
          <p>
            Watch live matches in real-time using custom room spectator links, track game move logs, study grandmaster tactics,
            and follow global player leaderboard rankings.
          </p>
        </div>
      </section>

      <section className="rules-section">
        <div className="rules-container">
          <div className="rules-header flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#d6a735]/15 border border-[#d6a735]/30 text-[#e9c158] text-xs font-semibold tracking-wide uppercase mb-3">
              <BookOpen size={15} className="text-[#d6a735]" />
              <span>Official Ruleset</span>
            </div>
            <h2>Core Damii Rules</h2>
            <p>Master the compulsory capture and flying king tactics.</p>
          </div>

          <div className="rules-cards">
            <div className="rule-box">
              <span>01</span>
              <h4>10×10 Grid Layout</h4>
              <p>20 Player 1 pieces vs 20 Player 2 pieces positioned on dark playable squares.</p>
            </div>
            <div className="rule-box">
              <span>02</span>
              <h4>Compulsory Capture</h4>
              <p>Jumping over an opponent piece is mandatory. Multiple jumps must be continued.</p>
            </div>
            <div className="rule-box">
              <span>03</span>
              <h4>Flying Kings</h4>
              <p>Reaching the opponent back row promotes a piece to a King with full diagonal flight.</p>
            </div>
            <div className="rule-box">
              <span>04</span>
              <h4>60s Turn Timer</h4>
              <p>Each player has 60 seconds per turn. Disconnections allow a 45s grace window to reconnect.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
