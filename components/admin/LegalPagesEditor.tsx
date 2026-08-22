"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Save,
  RotateCcw,
  ExternalLink,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Shield,
  Swords,
  Scale,
  Clock,
  Zap,
  Trophy,
  Lock,
  Coins,
  Users,
  RefreshCw,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import type { LegalPageContent, PolicySection } from "@/lib/content-data";
import { CANONICAL_PAGES_DATA } from "@/lib/content-data";

interface LegalPagesEditorProps {
  token: string;
}

const AVAILABLE_ICONS = [
  "Swords",
  "Shield",
  "ShieldCheck",
  "Scale",
  "Clock",
  "Zap",
  "Trophy",
  "Lock",
  "Coins",
  "Users",
  "AlertTriangle",
  "CheckCircle2",
  "BookOpen",
  "FileText",
];

export function LegalPagesEditor({ token }: LegalPagesEditorProps) {
  const [selectedSlug, setSelectedSlug] = useState<"compulsory-jump-rules" | "fair-play-guarantee" | "terms-of-service">("compulsory-jump-rules");
  const [activePage, setActivePage] = useState<LegalPageContent>(CANONICAL_PAGES_DATA["compulsory-jump-rules"]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Fetch page content whenever selected slug changes
  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch(`/api/content?slug=${selectedSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.page) {
            setActivePage(data.page);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page content");
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [selectedSlug]);

  // Handle Save
  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_page",
          token,
          slug: selectedSlug,
          content: activePage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save page changes");
      setSuccess(`Published updates to '${data.page?.title || activePage.title}' successfully!`);
      if (data.page) setActivePage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // Handle Reset to Default
  async function handleResetToDefaults() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_page",
          token,
          slug: selectedSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset page");
      setSuccess(`Reset '${data.page?.title}' to canonical default rules.`);
      if (data.page) setActivePage(data.page);
      setConfirmResetOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setSaving(false);
    }
  }

  // Section manipulation
  function handleAddSection() {
    const newSec: PolicySection = {
      id: `section-${Date.now()}`,
      heading: `${(activePage.sections?.length || 0) + 1}. New Policy Clause`,
      badge: "Standard Policy",
      icon: "Shield",
      content: "Enter detailed explanation of this clause or draughts rule here...",
      bullets: ["First key compliance point", "Second key point"],
    };
    setActivePage({
      ...activePage,
      sections: [...(activePage.sections || []), newSec],
    });
  }

  function handleUpdateSection(idx: number, updated: Partial<PolicySection>) {
    const nextSections = [...(activePage.sections || [])];
    nextSections[idx] = { ...nextSections[idx], ...updated };
    setActivePage({ ...activePage, sections: nextSections });
  }

  function handleRemoveSection(idx: number) {
    const nextSections = activePage.sections.filter((_, i) => i !== idx);
    setActivePage({ ...activePage, sections: nextSections });
  }

  function handleMoveSection(idx: number, direction: "up" | "down") {
    const nextSections = [...activePage.sections];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= nextSections.length) return;
    const temp = nextSections[idx];
    nextSections[idx] = nextSections[targetIdx];
    nextSections[targetIdx] = temp;
    setActivePage({ ...activePage, sections: nextSections });
  }

  // Bullet manipulation
  function handleAddBullet(secIdx: number) {
    const sec = activePage.sections[secIdx];
    const newBullets = [...(sec.bullets || []), "New requirement or guideline point"];
    handleUpdateSection(secIdx, { bullets: newBullets });
  }

  function handleUpdateBullet(secIdx: number, bIdx: number, text: string) {
    const sec = activePage.sections[secIdx];
    const newBullets = [...(sec.bullets || [])];
    newBullets[bIdx] = text;
    handleUpdateSection(secIdx, { bullets: newBullets });
  }

  function handleRemoveBullet(secIdx: number, bIdx: number) {
    const sec = activePage.sections[secIdx];
    const newBullets = sec.bullets?.filter((_, i) => i !== bIdx) || [];
    handleUpdateSection(secIdx, { bullets: newBullets });
  }

  const publicUrlMap: Record<string, string> = {
    "compulsory-jump-rules": "/rules",
    "fair-play-guarantee": "/fair-play",
    "terms-of-service": "/terms",
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Selector Banner */}
      <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#d6a735] font-extrabold text-sm uppercase tracking-wider">
            <FileText size={18} /> Legal &amp; Policy Pages Manager
          </div>
          <h2 className="text-xl font-black text-[#f5efdf]">
            Dynamic Content &amp; Rules Editor
          </h2>
          <p className="text-xs text-[#a3b8b0]">
            Customize public rules, anti-cheat guarantees, and platform terms of service. All changes are versioned and immediately live.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={publicUrlMap[selectedSlug]}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-[#06261f] hover:bg-[#0c3b2e] border border-[#114232] hover:border-[#d6a735]/40 text-[#f5efdf] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ExternalLink size={14} className="text-[#d6a735]" /> View Public Page
          </a>

          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            disabled={saving}
            className="px-3.5 py-2 bg-[#06261f] hover:bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Reset this page to default rules"
          >
            <RotateCcw size={14} /> Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Publishing..." : "Save & Publish"}
          </button>
        </div>
      </div>

      {/* Status Alerts */}
      {error && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" /> {success}
        </div>
      )}

      {/* Page Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#114232] pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSlug("compulsory-jump-rules")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedSlug === "compulsory-jump-rules"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "bg-[#081c15] text-[#a3b8b0] hover:text-[#f5efdf] border border-[#114232]"
            }`}
          >
            <Swords size={15} /> Compulsory Jump Rules
          </button>

          <button
            type="button"
            onClick={() => setSelectedSlug("fair-play-guarantee")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedSlug === "fair-play-guarantee"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "bg-[#081c15] text-[#a3b8b0] hover:text-[#f5efdf] border border-[#114232]"
            }`}
          >
            <Shield size={15} /> Fair Play Guarantee
          </button>

          <button
            type="button"
            onClick={() => setSelectedSlug("terms-of-service")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedSlug === "terms-of-service"
                ? "bg-[#d6a735] text-[#06261f] shadow-md font-black"
                : "bg-[#081c15] text-[#a3b8b0] hover:text-[#f5efdf] border border-[#114232]"
            }`}
          >
            <Scale size={15} /> Terms of Service
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-[#081c15] p-1 border border-[#114232] rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "edit"
                ? "bg-[#d6a735] text-[#06261f]"
                : "text-[#a3b8b0] hover:text-[#f5efdf]"
            }`}
          >
            <Edit size={13} /> Edit Mode
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "preview"
                ? "bg-[#d6a735] text-[#06261f]"
                : "text-[#a3b8b0] hover:text-[#f5efdf]"
            }`}
          >
            <Eye size={13} /> Live Preview
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-[#081c15] border border-[#114232] rounded-2xl space-y-3">
          <RefreshCw size={24} className="mx-auto text-[#d6a735] animate-spin" />
          <p className="text-xs text-[#a3b8b0]">Loading page structure...</p>
        </div>
      ) : viewMode === "preview" ? (
        /* LIVE PREVIEW COMPONENT */
        <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xl">
          <div className="space-y-3 pb-6 border-b border-[#114232]">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#06261f] border border-[#d6a735]/40 text-[#d6a735] rounded-full text-xs font-bold uppercase">
                {activePage.badge}
              </span>
              <span className="px-2.5 py-1 bg-[#06261f] border border-[#114232] text-[#a3b8b0] rounded-full text-xs">
                v{activePage.version} • {activePage.lastUpdated}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f5efdf] font-serif">
              {activePage.title}
            </h1>
            <p className="text-sm text-[#cbd5e1]">{activePage.subtitle}</p>
          </div>

          {/* Summary Box */}
          <div className="p-4 bg-[#06261f] border border-[#114232] rounded-xl text-xs text-[#cbd5e1] space-y-1">
            <strong className="text-[#d6a735] block uppercase tracking-wider text-[11px]">
              Executive Summary
            </strong>
            <p>{activePage.summary}</p>
          </div>

          {/* Sections List */}
          <div className="space-y-6">
            {activePage.sections?.map((sec, idx) => (
              <div
                key={sec.id || idx}
                className="p-6 bg-[#06261f] border border-[#114232] rounded-xl space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-[#f5efdf]">
                    {sec.heading}
                  </h3>
                  {sec.badge && (
                    <span className="px-2 py-0.5 bg-[#081c15] text-[#d6a735] border border-[#114232] text-[10px] font-bold rounded">
                      {sec.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[#cbd5e1]">{sec.content}</p>
                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="space-y-2 pt-1 text-xs sm:text-sm text-[#cbd5e1]/90">
                    {sec.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#d6a735] mt-1.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {sec.callout && (
                  <div className="p-3 bg-[#081c15] border border-[#114232] rounded-lg text-xs text-[#f5efdf]">
                    {sec.callout.title && (
                      <strong className="text-[#d6a735] block font-bold mb-0.5">
                        {sec.callout.title}
                      </strong>
                    )}
                    <p>{sec.callout.text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* EDIT MODE FORM */
        <div className="space-y-8">
          {/* Metadata Section */}
          <div className="bg-[#081c15] border border-[#114232] rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-extrabold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} /> Page Metadata &amp; Banner
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#f5efdf] mb-1">
                  Page Title
                </label>
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => setActivePage({ ...activePage, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f5efdf] mb-1">
                  Category Tag
                </label>
                <input
                  type="text"
                  value={activePage.category}
                  onChange={(e) => setActivePage({ ...activePage, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#f5efdf] mb-1">
                  Badge Label
                </label>
                <input
                  type="text"
                  value={activePage.badge}
                  onChange={(e) => setActivePage({ ...activePage, badge: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={activePage.version}
                    onChange={(e) => setActivePage({ ...activePage, version: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#f5efdf] mb-1">
                    Last Updated Date
                  </label>
                  <input
                    type="text"
                    value={activePage.lastUpdated}
                    onChange={(e) => setActivePage({ ...activePage, lastUpdated: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f5efdf] mb-1">
                Subheading / Description
              </label>
              <textarea
                rows={2}
                value={activePage.subtitle}
                onChange={(e) => setActivePage({ ...activePage, subtitle: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#f5efdf] mb-1">
                Executive Summary
              </label>
              <textarea
                rows={3}
                value={activePage.summary}
                onChange={(e) => setActivePage({ ...activePage, summary: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
              />
            </div>
          </div>

          {/* Sections Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-[#d6a735] uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={14} /> Document Sections ({activePage.sections?.length || 0})
              </h3>
              <button
                type="button"
                onClick={handleAddSection}
                className="px-3 py-1.5 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus size={14} /> Add New Section
              </button>
            </div>

            <div className="space-y-5">
              {activePage.sections?.map((section, idx) => (
                <div
                  key={section.id || idx}
                  className="bg-[#081c15] border border-[#114232] rounded-2xl p-5 sm:p-6 space-y-4 shadow-md relative"
                >
                  {/* Section Controls Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#114232]">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#d6a735] text-[#06261f] font-black text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-[#f5efdf]">Section {idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveSection(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 text-[#a3b8b0] hover:text-[#f5efdf] disabled:opacity-30 rounded-lg hover:bg-[#06261f]"
                        title="Move Up"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSection(idx, "down")}
                        disabled={idx === (activePage.sections?.length || 1) - 1}
                        className="p-1.5 text-[#a3b8b0] hover:text-[#f5efdf] disabled:opacity-30 rounded-lg hover:bg-[#06261f]"
                        title="Move Down"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(idx)}
                        className="p-1.5 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/50 ml-1"
                        title="Delete Section"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Heading & Badge */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-[#f5efdf] mb-1">
                        Section Heading
                      </label>
                      <input
                        type="text"
                        value={section.heading}
                        onChange={(e) => handleUpdateSection(idx, { heading: e.target.value })}
                        className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#f5efdf] mb-1">
                        Badge Pill
                      </label>
                      <input
                        type="text"
                        value={section.badge || ""}
                        onChange={(e) => handleUpdateSection(idx, { badge: e.target.value })}
                        placeholder="e.g. Compulsory"
                        className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                      />
                    </div>
                  </div>

                  {/* Section Content */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#f5efdf] mb-1">
                      Main Content Text
                    </label>
                    <textarea
                      rows={3}
                      value={section.content}
                      onChange={(e) => handleUpdateSection(idx, { content: e.target.value })}
                      className="w-full px-3 py-2 bg-[#06261f] border border-[#114232] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                    />
                  </div>

                  {/* Bullets Management */}
                  <div className="space-y-2 pt-2 border-t border-[#114232]/80">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-[#d6a735]">
                        Key Points &amp; Clauses ({section.bullets?.length || 0})
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAddBullet(idx)}
                        className="text-[11px] text-[#d6a735] hover:underline font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Point
                      </button>
                    </div>

                    <div className="space-y-2">
                      {section.bullets?.map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d6a735] shrink-0" />
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => handleUpdateBullet(idx, bIdx, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-lg text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(idx, bIdx)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Callout Box Settings */}
                  <div className="space-y-2 pt-2 border-t border-[#114232]/80">
                    <label className="text-[11px] font-bold text-[#a3b8b0] block">
                      Highlight Callout Box (Optional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Callout Title (e.g. Important Notice)"
                        value={section.callout?.title || ""}
                        onChange={(e) =>
                          handleUpdateSection(idx, {
                            callout: {
                              type: section.callout?.type || "info",
                              title: e.target.value,
                              text: section.callout?.text || "",
                            },
                          })
                        }
                        className="px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-lg text-[#f5efdf] text-xs"
                      />
                      <select
                        value={section.callout?.type || "info"}
                        onChange={(e) =>
                          handleUpdateSection(idx, {
                            callout: {
                              type: e.target.value as any,
                              title: section.callout?.title || "",
                              text: section.callout?.text || "",
                            },
                          })
                        }
                        className="px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-lg text-[#f5efdf] text-xs"
                      >
                        <option value="info">Info Callout</option>
                        <option value="warning">Warning Callout</option>
                        <option value="success">Success Callout</option>
                        <option value="neutral">Neutral Callout</option>
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Callout text details..."
                      value={section.callout?.text || ""}
                      onChange={(e) =>
                        handleUpdateSection(idx, {
                          callout: {
                            type: section.callout?.type || "info",
                            title: section.callout?.title || "",
                            text: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 bg-[#06261f] border border-[#114232] rounded-lg text-[#f5efdf] text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#114232]">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 bg-[#d6a735] hover:bg-[#b88c24] text-[#06261f] text-xs font-black rounded-xl flex items-center gap-2 transition-all shadow-lg"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Publishing Changes..." : "Save & Publish Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Defaults */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#081c15] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle size={24} />
              <h3 className="text-base font-bold text-[#f5efdf]">
                Reset to Canonical Rules?
              </h3>
            </div>
            <p className="text-xs text-[#a3b8b0] leading-relaxed">
              This will overwrite all custom modifications for <strong>'{activePage.title}'</strong> and restore the official default regulation text.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 bg-[#06261f] hover:bg-[#0c3b2e] border border-[#114232] text-[#f5efdf] text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={saving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-[#06261f] text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <RotateCcw size={14} /> Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LegalPagesEditor;
