"use client";

import { NavLink } from "@/components/NavLink";
import { CheckCircle } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full bg-[#041913] border-t border-[#114232] text-[#a3b8b0] text-xs pt-8 pb-6 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Brand & Status Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-[#114232]/80">
          <div className="space-y-2.5 max-w-xl">
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

            <p className="text-[11px] text-[#cbd5e1]/80 leading-relaxed">
              The premier digital arena for 10×10 Draughts. Experience real-time multiplayer, multi-hop compulsory jump enforcement, flying king mechanics, and automated escrow tournament settlement.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#06261f] border border-emerald-500/30 rounded-md text-[10px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Arena Server Online
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#06261f] border border-[#114232] rounded-md text-[10px] font-semibold text-[#f5efdf]">
              <CheckCircle size={11} className="text-[#d6a735]" /> Standard 10×10 Rules
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] text-[#a3b8b0]/70 pt-1">
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
