"use client";

import { NavLink } from "@/components/NavLink";
import { UserCog, Shield, Trophy, Swords, Wallet, Bot, Coins, Sparkles, CheckCircle, HelpCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#041913] border-t border-[#114232] text-[#a3b8b0] text-xs pt-10 pb-6 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Main Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 pb-8 border-b border-[#114232]/80">
          {/* Brand Column (Spans 2 on desktop) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0c3b2e] to-[#06261f] text-[#d6a735] border border-[#d6a735]/40 flex items-center justify-center font-black font-serif text-sm shadow-md">
                D
              </span>
              <div>
                <span className="text-xs sm:text-sm font-bold text-[#f5efdf] tracking-wide block">
                  DAMII PLATFORM
                </span>
                <span className="text-[9px] text-[#d6a735] font-semibold uppercase tracking-wider block">
                  10×10 Draughts Arena & Tournament Engine
                </span>
              </div>
            </div>

            <p className="text-[11px] text-[#cbd5e1]/80 leading-relaxed max-w-sm">
              The premier digital arena for 10×10 Draughts. Experience real-time multiplayer, multi-hop compulsory jump enforcement, flying king mechanics, and automated escrow tournament settlement.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#06261f] border border-emerald-500/30 rounded-md text-[10px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Arena Server Online
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#06261f] border border-[#114232] rounded-md text-[10px] font-semibold text-[#f5efdf]">
                <CheckCircle size={11} className="text-[#d6a735]" /> Standard 10×10 Rules
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
                <NavLink href="/arena" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Swords size={12} className="text-[#a3b8b0]/70" /> Online Matchmaking
                </NavLink>
              </li>
              <li>
                <NavLink href="/arena?mode=local" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Bot size={12} className="text-[#a3b8b0]/70" /> Local Pass &amp; Play
                </NavLink>
              </li>
              <li>
                <NavLink href="/arena?mode=bot" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Bot size={12} className="text-[#a3b8b0]/70" /> Practice vs AI Engine
                </NavLink>
              </li>
              <li>
                <NavLink href="/arena?mode=wager" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Coins size={12} className="text-[#d6a735]" /> Competitive Wager Room
                </NavLink>
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
                <NavLink href="/leagues" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Trophy size={12} className="text-[#a3b8b0]/70" /> Active Leagues &amp; Brackets
                </NavLink>
              </li>
              <li>
                <NavLink
                  href="/organizer"
                  className="text-[#d6a735] font-bold hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <UserCog size={13} className="text-[#d6a735]" /> Organizer Licensing Portal
                </NavLink>
              </li>
              <li>
                <NavLink href="/wallet" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Wallet size={12} className="text-[#a3b8b0]/70" /> Wallet &amp; Escrow Ledger
                </NavLink>
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
                <NavLink href="/admin" className="hover:text-[#f5efdf] transition-colors flex items-center gap-1.5">
                  <Shield size={12} className="text-[#a3b8b0]/70" /> Admin Oversight Studio
                </NavLink>
              </li>
              <li>
                <span className="text-[#a3b8b0]/70 flex items-center gap-1.5 cursor-default">
                  <Sparkles size={12} className="text-[#d6a735]" /> Auto-Dispute Engine
                </span>
              </li>
              <li>
                <span className="text-[#a3b8b0]/70 flex items-center gap-1.5 cursor-default">
                  <CheckCircle size={12} className="text-emerald-400" /> DAMII Escrow Vault
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-[#a3b8b0]/70 pt-2">
          <div>
            © 2026 <span className="font-semibold text-[#f5efdf]/90">DAMII Platform</span>. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <NavLink href="/rules" className="hover:text-[#d6a735] transition-colors">
              Compulsory Jump Rules
            </NavLink>
            <span className="text-[#114232]">•</span>
            <NavLink href="/fair-play" className="hover:text-[#d6a735] transition-colors">
              Fair Play Guarantee
            </NavLink>
            <span className="text-[#114232]">•</span>
            <NavLink href="/terms" className="hover:text-[#d6a735] transition-colors">
              Terms of Service
            </NavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
