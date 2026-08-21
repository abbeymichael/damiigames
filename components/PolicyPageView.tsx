"use client";

import React, { useState, useEffect } from "react";
import { SharedHeader } from "@/components/SharedHeader";
import { Footer } from "@/components/Footer";
import { NavLink } from "@/components/NavLink";
import {
  Shield,
  Swords,
  Scale,
  Clock,
  Zap,
  Trophy,
  Lock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Coins,
  Users,
  ArrowRight,
  Sparkles,
  BookOpen,
  FileText,
  Check,
  Share2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Crown,
  RefreshCw,
  Edit3,
} from "lucide-react";
import type { LegalPageContent, PolicySection } from "@/lib/content-data";
import { CANONICAL_PAGES_DATA } from "@/lib/content-data";

interface PolicyPageViewProps {
  initialSlug: "compulsory-jump-rules" | "fair-play-guarantee" | "terms-of-service";
}

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  Swords,
  Scale,
  Clock,
  Zap,
  Trophy,
  Lock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Coins,
  Users,
  ShieldCheck,
  ShieldAlert,
  Crown,
  BookOpen,
  FileText,
};

export function PolicyPageView({ initialSlug }: PolicyPageViewProps) {
  const fallback = CANONICAL_PAGES_DATA[initialSlug] || CANONICAL_PAGES_DATA["compulsory-jump-rules"];
  const [page, setPage] = useState<LegalPageContent>(fallback);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    // Check if user is logged in as admin to show quick edit button
    try {
      const authRaw = localStorage.getItem("damii-auth-user");
      if (authRaw) {
        const parsed = JSON.parse(authRaw);
        if (["admin", "super_admin", "facilitator", "treasurer"].includes(parsed?.role)) {
          setIsAdminUser(true);
        }
      }
    } catch {}

    async function loadContent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/content?slug=${encodeURIComponent(initialSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.page) {
            setPage(data.page);
            if (data.page.sections?.length > 0) {
              setActiveSectionId(data.page.sections[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load policy content:", err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [initialSlug]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const relatedPages = [
    {
      slug: "/rules",
      key: "compulsory-jump-rules",
      title: "Compulsory Jump Rules",
      desc: "Authentic 10×10 draughts mechanics, flying king rules & multi-hop captures",
      icon: Swords,
    },
    {
      slug: "/fair-play",
      key: "fair-play-guarantee",
      title: "Fair Play Guarantee",
      desc: "Server-authoritative anti-cheat, native DAMII escrow pot safety & dispute arbitration",
      icon: ShieldCheck,
    },
    {
      slug: "/terms",
      key: "terms-of-service",
      title: "Terms of Service",
      desc: "Mobile Money payments, organizer guidelines, user agreement & platform policies",
      icon: Scale,
    },
  ].filter((p) => p.key !== page.slug);

  return (
    <div className="min-h-screen bg-[#041913] text-[#f5efdf] flex flex-col selection:bg-[#d6a735] selection:text-[#06261f]">
      <SharedHeader />

      {/* Hero Banner Section */}
      <section className="relative w-full border-b border-[#114232] bg-gradient-to-b from-[#08281f] via-[#06261f] to-[#041913] px-4 sm:px-8 pt-10 pb-12 overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#d6a735]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto space-y-6 relative z-10">
          {/* Breadcrumbs & Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#a3b8b0]">
              <NavLink href="/" className="hover:text-[#d6a735] transition-colors">
                DAMII Arena
              </NavLink>
              <ChevronRight size={13} className="text-[#114232]" />
              <span className="text-[#a3b8b0]/70">Governance &amp; Rules</span>
              <ChevronRight size={13} className="text-[#114232]" />
              <span className="text-[#d6a735] font-semibold">{page.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#06261f] border border-[#d6a735]/40 text-[#d6a735] rounded-full font-bold text-[11px] uppercase tracking-wider shadow-sm">
                <Sparkles size={12} /> {page.badge || "Official Regulation"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#06261f] border border-[#114232] text-[#a3b8b0] rounded-full text-[11px]">
                v{page.version || "2.4"}
              </span>
            </div>
          </div>

          {/* Title & Subheading */}
          <div className="space-y-3 max-w-4xl">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#f5efdf] tracking-tight leading-tight font-serif">
              {page.title}
            </h1>
            <p className="text-sm sm:text-base text-[#cbd5e1]/90 leading-relaxed font-normal">
              {page.subtitle}
            </p>
          </div>

          {/* Metadata & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#114232]/80 text-xs text-[#a3b8b0]">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-[#d6a735]" />
                Last Updated: <strong className="text-[#f5efdf] font-semibold">{page.lastUpdated}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Category: <strong className="text-[#f5efdf] font-semibold">{page.category}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#06261f] hover:bg-[#0c3b2e] border border-[#114232] hover:border-[#d6a735]/50 text-[#f5efdf] rounded-xl text-xs font-semibold transition-colors"
                title="Copy shareable link"
              >
                {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Share2 size={13} className="text-[#d6a735]" />}
                {copiedLink ? "Link Copied!" : "Share Policy"}
              </button>

              {isAdminUser && (
                <NavLink
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d6a735]/15 hover:bg-[#d6a735]/25 border border-[#d6a735]/40 text-[#d6a735] rounded-xl text-xs font-bold transition-colors"
                  title="Open Admin Policy Editor"
                >
                  <Edit3 size={13} /> Edit in Admin
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Navigation Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Table of Contents (Sticky on Desktop) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6 order-2 lg:order-1">
            {/* Quick Summary Card */}
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 space-y-3 shadow-md">
              <div className="flex items-center gap-2 text-[#d6a735] font-bold text-xs uppercase tracking-wider">
                <BookOpen size={14} /> Executive Summary
              </div>
              <p className="text-xs text-[#cbd5e1]/90 leading-relaxed">
                {page.summary}
              </p>
            </div>

            {/* Table of Contents Navigation Card */}
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 space-y-3 shadow-md">
              <h3 className="text-xs font-extrabold text-[#d6a735] uppercase tracking-wider flex items-center justify-between">
                <span>Contents &amp; Sections</span>
                <span className="text-[10px] text-[#a3b8b0] lowercase font-normal">{page.sections?.length || 0} topics</span>
              </h3>

              <nav className="space-y-1 text-xs">
                {page.sections?.map((section, idx) => {
                  const isActive = activeSectionId === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2.5 transition-all ${
                        isActive
                          ? "bg-[#d6a735] text-[#06261f] font-black shadow-sm"
                          : "text-[#a3b8b0] hover:bg-[#06261f] hover:text-[#f5efdf]"
                      }`}
                    >
                      <span className={`text-[11px] mt-0.5 shrink-0 ${isActive ? "text-[#06261f] font-bold" : "text-[#d6a735]"}`}>
                        {(idx + 1).toString().padStart(2, "0")}
                      </span>
                      <span className="line-clamp-2 leading-snug">
                        {section.heading.replace(/^\d+\.\s*/, "")}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Cross-Policy Navigation Links */}
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 space-y-3 shadow-md">
              <h4 className="text-[11px] font-extrabold text-[#d6a735] uppercase tracking-wider">
                Related Platform Policies
              </h4>
              <div className="space-y-2">
                {relatedPages.map((rp) => {
                  const Icon = rp.icon;
                  return (
                    <NavLink
                      key={rp.slug}
                      href={rp.slug}
                      className="group block p-3 bg-[#06261f] hover:bg-[#0c3b2e] border border-[#114232] hover:border-[#d6a735]/40 rounded-xl transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#f5efdf] group-hover:text-[#d6a735] transition-colors flex items-center gap-2">
                          <Icon size={14} className="text-[#d6a735]" />
                          {rp.title}
                        </span>
                        <ChevronRight size={13} className="text-[#a3b8b0] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-[#a3b8b0] mt-1 leading-snug line-clamp-2">
                        {rp.desc}
                      </p>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Play CTA Card */}
            <div className="bg-gradient-to-br from-[#0c3b2e] to-[#081c15] border border-[#d6a735]/40 rounded-2xl p-5 text-center space-y-3 shadow-lg">
              <span className="w-10 h-10 mx-auto rounded-xl bg-[#d6a735] text-[#06261f] font-black flex items-center justify-center shadow-md">
                <Swords size={20} />
              </span>
              <div>
                <h4 className="text-sm font-black text-[#f5efdf]">Test Your Strategy</h4>
                <p className="text-xs text-[#cbd5e1]/80 mt-1">
                  Ready to apply these official rules on the 10×10 board?
                </p>
              </div>
              <NavLink
                href="/arena"
                className="w-full py-2.5 px-4 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
              >
                Enter Matchmaking Arena <ArrowRight size={14} />
              </NavLink>
            </div>
          </aside>

          {/* Right Column: Policy Document Body Sections */}
          <div className="lg:col-span-8 space-y-8 order-1 lg:order-2">
            {loading && (
              <div className="p-8 bg-[#081c15] border border-[#114232] rounded-2xl text-center space-y-3">
                <RefreshCw size={24} className="mx-auto text-[#d6a735] animate-spin" />
                <p className="text-xs text-[#a3b8b0]">Loading authenticated policy document...</p>
              </div>
            )}

            {page.sections?.map((section, idx) => {
              const Icon = (section.icon && ICON_MAP[section.icon]) ? ICON_MAP[section.icon] : Shield;
              return (
                <article
                  key={section.id || idx}
                  id={section.id}
                  className="scroll-mt-28 bg-[#081c15] border border-[#114232] hover:border-[#1a5e48] rounded-2xl p-6 sm:p-8 space-y-5 transition-all shadow-lg"
                >
                  {/* Section Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#114232]/80">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-[#06261f] border border-[#114232] text-[#d6a735] flex items-center justify-center shrink-0 shadow-inner">
                        <Icon size={18} />
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-[#f5efdf] tracking-tight">
                        {section.heading}
                      </h2>
                    </div>

                    {section.badge && (
                      <span className="px-2.5 py-1 bg-[#06261f] border border-[#114232] text-[#d6a735] text-[10px] font-bold rounded-lg uppercase tracking-wider shrink-0">
                        {section.badge}
                      </span>
                    )}
                  </div>

                  {/* Section Paragraph Text */}
                  <p className="text-xs sm:text-sm text-[#cbd5e1] leading-relaxed">
                    {section.content}
                  </p>

                  {/* Bullet Points */}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="space-y-2.5 pt-1">
                      {section.bullets.map((bullet, bIdx) => (
                        <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#cbd5e1]/90">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d6a735] mt-2 shrink-0" />
                          <span className="leading-relaxed">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Highlight Callout Box */}
                  {section.callout && (
                    <div
                      className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 mt-4 ${
                        section.callout.type === "warning"
                          ? "bg-amber-950/30 border-amber-500/30 text-amber-200"
                          : section.callout.type === "success"
                          ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
                          : "bg-[#06261f] border-[#114232] text-[#f5efdf]"
                      }`}
                    >
                      <Sparkles size={16} className="text-[#d6a735] shrink-0 mt-0.5" />
                      <div>
                        {section.callout.title && (
                          <strong className="block font-bold text-[#d6a735] mb-1">
                            {section.callout.title}
                          </strong>
                        )}
                        <p>{section.callout.text}</p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}

            {/* Bottom Help / Contact Banner */}
            <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-sm font-bold text-[#f5efdf] flex items-center justify-center sm:justify-start gap-2">
                  <HelpCircle size={16} className="text-[#d6a735]" /> Questions about these rules or policies?
                </h3>
                <p className="text-xs text-[#a3b8b0]">
                  Our administrative referee team is available 24/7 for tournament arbitration and rule inquiries.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <NavLink
                  href="/admin"
                  className="px-4 py-2.5 bg-[#06261f] hover:bg-[#0c3b2e] border border-[#114232] text-[#f5efdf] text-xs font-semibold rounded-xl transition-colors"
                >
                  Admin Desk
                </NavLink>
                <NavLink
                  href="/arena"
                  className="px-4 py-2.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Start Playing
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
