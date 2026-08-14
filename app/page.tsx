"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import { Swords, Trophy, Wallet, ShieldCheck, Zap, ArrowRight, Play, BookOpen, Layers, ShieldAlert, Lock } from "lucide-react";

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
      router.push("/admin");
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
            <Link
              href="/admin"
              className="shrink-0 px-4 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
            >
              <ShieldCheck size={16} /> Admin Control Center <ArrowRight size={14} />
            </Link>
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

        <div className="hero-ctas">
          {isAdmin ? (
            <Link href="/admin" className="btn-primary">
              <ShieldCheck size={18} /> Admin Control Center <ArrowRight size={16} />
            </Link>
          ) : (
            <Link href="/arena" onClick={handleArenaClick} className="btn-primary">
              <Swords size={18} /> Enter Game Arena <ArrowRight size={16} />
            </Link>
          )}
          <Link href="/leagues" className="btn-secondary">
            <Trophy size={18} /> Tournament Hub
          </Link>
          <Link href="/wallet" className="btn-outline">
            <Wallet size={18} /> Wallet & Rewards
          </Link>
        </div>

        <div className="hero-stats">
          <div>
            <strong>10 × 10</strong>
            <span>Authentic Board</span>
          </div>
          <div>
            <strong>60s</strong>
            <span>Turn Clock</span>
          </div>
          <div>
            <strong>100% Safe</strong>
            <span>Automated Escrow</span>
          </div>
          <div>
            <strong>Instant</strong>
            <span>Payout Settlement</span>
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
          <div className="rules-header">
            <BookOpen size={28} />
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
