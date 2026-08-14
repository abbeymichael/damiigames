"use client";

import Link from "next/link";
import { UserCog, Shield, Trophy, Swords, Wallet, Bot, Coins, Sparkles, CheckCircle, HelpCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#041913] border-t border-[#114232] text-[#a3b8b0] text-xs pt-12 pb-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Main Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-[#114232]/80">
          {/* Brand Column (Spans 2 on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c3b2e] to-[#06261f] text-[#d6a735] border border-[#d6a735]/40 flex items-center justify-center font-black font-serif text-lg shadow-lg">
                D
              </span>
              <div>
                <span className="text-base font-black text-[#f5efdf] tracking-wide block">
                  DAMII PLATFORM
                </span>
                <span className="text-[10px] text-[#d6a735] font-bold uppercase tracking-wider block">
                  10×10 Draughts Arena & Tournament Engine
                </span>
              </div>
            </div>

            <p className="text-xs text-[#cbd5e1]/80 leading-relaxed max-w-sm">
              The premier digital arena for 10×10 Draughts. Experience real-time multiplayer, multi-hop compulsory jump enforcement, flying king mechanics, and automated escrow tournament settlement.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#06261f] border border-emerald-500/30 rounded-lg text-[11px] font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Arena Server Online
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#06261f] border border-[#114232] rounded-lg text-[11px] font-semibold text-[#f5efdf]">
                <CheckCircle size={12} className="text-[#d6a735]" /> Standard 10×10 Rules
              </span>
            </div>
          </div>

          {/* Column 1: Game Arena */}
          <div className="space-y-3">
            <h4 className="text-[#d6a735] font-extrabold uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Swords size={14} /> Game Modes
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/arena" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Swords size={12} className="text-[#a3b8b0]/70" /> Online Matchmaking
                </Link>
              </li>
              <li>
                <Link href="/arena?mode=local" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Bot size={12} className="text-[#a3b8b0]/70" /> Local Pass &amp; Play
                </Link>
              </li>
              <li>
                <Link href="/arena?mode=bot" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Bot size={12} className="text-[#a3b8b0]/70" /> Practice vs AI Engine
                </Link>
              </li>
              <li>
                <Link href="/arena?mode=wager" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Coins size={12} className="text-[#d6a735]" /> Competitive Wager Room
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Tournaments & Licensing */}
          <div className="space-y-3">
            <h4 className="text-[#d6a735] font-extrabold uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Trophy size={14} /> Competition &amp; Hub
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/leagues" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Trophy size={12} className="text-[#a3b8b0]/70" /> Active Leagues &amp; Brackets
                </Link>
              </li>
              <li>
                <Link
                  href="/organizer"
                  className="text-[#d6a735] font-bold hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <UserCog size={13} className="text-[#d6a735]" /> Organizer Licensing Portal
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Wallet size={12} className="text-[#a3b8b0]/70" /> Wallet &amp; Escrow Ledger
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Administration & Governance */}
          <div className="space-y-3">
            <h4 className="text-[#d6a735] font-extrabold uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Shield size={14} /> Governance
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/admin" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Shield size={12} className="text-[#a3b8b0]/70" /> Admin Oversight Studio
                </Link>
              </li>
              <li>
                <span className="text-[#a3b8b0]/70 flex items-center gap-1.5 cursor-default">
                  <Sparkles size={12} className="text-[#d6a735]" /> Auto-Dispute Engine
                </span>
              </li>
              <li>
                <span className="text-[#a3b8b0]/70 flex items-center gap-1.5 cursor-default">
                  <CheckCircle size={12} className="text-emerald-400" /> Paystack Mobile Escrow
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#a3b8b0]/70 pt-2">
          <div>
            © 2026 <strong className="text-[#f5efdf]">DAMII Platform</strong>. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-[#f5efdf] transition-colors cursor-pointer">
              Compulsory Jump Rules
            </span>
            <span>•</span>
            <span className="hover:text-[#f5efdf] transition-colors cursor-pointer">
              Fair Play Guarantee
            </span>
            <span>•</span>
            <span className="hover:text-[#f5efdf] transition-colors cursor-pointer">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
