"use client";

import React, { useState } from "react";
import {
  Shield,
  Zap,
  Crown,
  Clock,
  Swords,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sliders,
  Users,
  Eye,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import type {
  TournamentRuleVariations,
  TournamentCustomConstraints,
  CaptureRuleVariation,
  FlyingKingVariation,
  PromotionVariation,
  SeriesFormatVariation,
} from "@/lib/types";

export interface TournamentRulesVariationFormProps {
  ruleVariations: TournamentRuleVariations;
  setRuleVariations: React.Dispatch<React.SetStateAction<TournamentRuleVariations>>;
  customConstraints: TournamentCustomConstraints;
  setCustomConstraints: React.Dispatch<React.SetStateAction<TournamentCustomConstraints>>;
  rulesNotes: string;
  setRulesNotes: React.Dispatch<React.SetStateAction<string>>;
}

export function TournamentRulesVariationForm({
  ruleVariations,
  setRuleVariations,
  customConstraints,
  setCustomConstraints,
  rulesNotes,
  setRulesNotes,
}: TournamentRulesVariationFormProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"presets" | "gameplay" | "constraints" | "directives">("presets");

  // Apply preset templates
  const applyPreset = (presetName: "ghanaian_standard" | "rapid_blitz" | "masters_championship" | "novice_open") => {
    if (presetName === "ghanaian_standard") {
      setRuleVariations({
        captureRule: "standard_compulsory",
        flyingKings: "unlimited_diagonal",
        kingCapturePromotion: "immediate",
        backwardMenCapture: true,
        allowDrawOffer: true,
        repetitionDrawLimit: 3,
        matchSeries: "bo1",
      });
      setCustomConstraints({
        minRatingRequired: 0,
        maxRatingCap: 0,
        checkInWindowMinutes: 15,
        disconnectionGraceSeconds: 45,
        matchTimeCapMinutes: 0,
        allowSpectators: true,
        organizerDirectives: "Official Ghanaian 10x10 Damii standard rules. Unhindered flying king diagonals with compulsory multi-hop jumping.",
      });
      setRulesNotes("Standard Ghanaian Damii 10x10 with unlimited flying king diagonals and mandatory captures.");
    } else if (presetName === "rapid_blitz") {
      setRuleVariations({
        captureRule: "standard_compulsory",
        flyingKings: "unlimited_diagonal",
        kingCapturePromotion: "immediate",
        backwardMenCapture: true,
        allowDrawOffer: true,
        repetitionDrawLimit: 3,
        matchSeries: "bo1",
      });
      setCustomConstraints({
        minRatingRequired: 0,
        maxRatingCap: 0,
        checkInWindowMinutes: 10,
        disconnectionGraceSeconds: 30,
        matchTimeCapMinutes: 15,
        allowSpectators: true,
        organizerDirectives: "Rapid blitz format. 30s move clocks and strict 30s disconnection grace window. Quick decisions required.",
      });
      setRulesNotes("High-speed blitz tournament. Fast moves and strict disconnection limits.");
    } else if (presetName === "masters_championship") {
      setRuleVariations({
        captureRule: "maximum_quantity",
        flyingKings: "unlimited_diagonal",
        kingCapturePromotion: "immediate",
        backwardMenCapture: true,
        allowDrawOffer: true,
        repetitionDrawLimit: 3,
        matchSeries: "bo3",
      });
      setCustomConstraints({
        minRatingRequired: 1400,
        maxRatingCap: 0,
        checkInWindowMinutes: 20,
        disconnectionGraceSeconds: 60,
        matchTimeCapMinutes: 45,
        allowSpectators: true,
        organizerDirectives: "Masters Invitational. Rated 1400+ DPI only. Majority/maximum capture rule enforced. Best of 3 game matches.",
      });
      setRulesNotes("Grandmaster series: 1400+ DPI rating requirement, Best of 3 matches, Maximum quantity capture rule.");
    } else if (presetName === "novice_open") {
      setRuleVariations({
        captureRule: "standard_compulsory",
        flyingKings: "unlimited_diagonal",
        kingCapturePromotion: "immediate",
        backwardMenCapture: true,
        allowDrawOffer: true,
        repetitionDrawLimit: 3,
        matchSeries: "bo1",
      });
      setCustomConstraints({
        minRatingRequired: 0,
        maxRatingCap: 1400,
        checkInWindowMinutes: 15,
        disconnectionGraceSeconds: 60,
        matchTimeCapMinutes: 30,
        allowSpectators: true,
        organizerDirectives: "Novice & Intermediate tournament capped at 1400 DPI to encourage grassroots and beginner tournament competition.",
      });
      setRulesNotes("Grassroots tournament capped at 1400 DPI maximum rating.");
    }
  };

  const currentCaptureRule = ruleVariations.captureRule || "standard_compulsory";
  const currentFlyingKings = ruleVariations.flyingKings || "unlimited_diagonal";
  const currentPromotion = ruleVariations.kingCapturePromotion || "immediate";
  const currentBackwardMen = ruleVariations.backwardMenCapture !== false;
  const currentAllowDraw = ruleVariations.allowDrawOffer !== false;
  const currentRepetitionLimit = ruleVariations.repetitionDrawLimit ?? 3;
  const currentSeries = ruleVariations.matchSeries || "bo1";

  const minRating = customConstraints.minRatingRequired || 0;
  const maxRating = customConstraints.maxRatingCap || 0;
  const checkInWindow = customConstraints.checkInWindowMinutes || 15;
  const disconnectGrace = customConstraints.disconnectionGraceSeconds || 45;
  const timeCap = customConstraints.matchTimeCapMinutes || 0;
  const allowSpectators = customConstraints.allowSpectators !== false;
  const directives = customConstraints.organizerDirectives || "";

  return (
    <div className="bg-[#081c15] border border-[#1a5e48] rounded-2xl overflow-hidden shadow-xl transition-all">
      {/* Header Accordion Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 bg-gradient-to-r from-[#06261f] to-[#081c15] border-b border-[#1a5e48] flex items-center justify-between cursor-pointer hover:bg-[#0a2e26] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#d6a735]/15 border border-[#d6a735]/40 rounded-xl text-[#d6a735]">
            <Sliders size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#f5efdf]">
                Tournament Rule Variations &amp; Custom Constraints
              </h3>
              <span className="px-2 py-0.5 bg-[#d6a735]/20 text-[#d6a735] text-[10px] font-mono font-bold rounded-md border border-[#d6a735]/30">
                Organizer Customizer
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Customize compulsory capture types, flying king diagonal dynamics, match series, rating caps, and custom directives.
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? "Collapse rule variations section" : "Expand rule variations section"}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg bg-[#041c17] border border-[#1a5e48]"
        >
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Sub Navigation */}
          <div className="flex flex-wrap gap-2 border-b border-[#1a5e48] pb-3 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("presets")}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                activeTab === "presets"
                  ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                  : "bg-[#041c17] text-slate-200 border-[#1a5e48] hover:text-white"
              }`}
            >
              <Sparkles size={13} /> Rule Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("gameplay")}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                activeTab === "gameplay"
                  ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                  : "bg-[#041c17] text-slate-200 border-[#1a5e48] hover:text-white"
              }`}
            >
              <Crown size={13} /> Gameplay &amp; Piece Dynamics
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("constraints")}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                activeTab === "constraints"
                  ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                  : "bg-[#041c17] text-slate-200 border-[#1a5e48] hover:text-white"
              }`}
            >
              <Shield size={13} /> Rating &amp; Match Constraints
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("directives")}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all border ${
                activeTab === "directives"
                  ? "bg-[#d6a735] text-[#06261f] border-[#d6a735]"
                  : "bg-[#041c17] text-slate-200 border-[#1a5e48] hover:text-white"
              }`}
            >
              <FileText size={13} /> Custom Arbiter Directives
            </button>
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === "presets" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Choose a ready-to-use tournament template or configure individual parameters below:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Ghanaian Standard */}
                <div
                  onClick={() => applyPreset("ghanaian_standard")}
                  className="p-4 bg-[#041c17] hover:bg-[#072c23] border border-[#1a5e48] hover:border-[#d6a735]/60 rounded-2xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#f5efdf] flex items-center gap-1.5">
                      <Crown size={15} className="text-[#d6a735]" /> Ghanaian Damii Standard (10x10)
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Standard 10x10 board with unlimited flying king open diagonals, compulsory jumping, and 45s disconnection grace.
                  </p>
                  <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-2 pt-1 border-t border-[#1a5e48]/50">
                    <span>Compulsory: Standard</span> • <span>Kings: Unlimited</span> • <span>Series: 1 Game</span>
                  </div>
                </div>

                {/* Rapid Blitz */}
                <div
                  onClick={() => applyPreset("rapid_blitz")}
                  className="p-4 bg-[#041c17] hover:bg-[#072c23] border border-[#1a5e48] hover:border-[#d6a735]/60 rounded-2xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#f5efdf] flex items-center gap-1.5">
                      <Zap size={15} className="text-amber-400" /> Rapid Blitz Championship
                    </span>
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 text-[10px] font-bold rounded border border-amber-500/30">
                      Fast Clocks
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    High speed blitz rules with tight 30s disconnection recovery and optional 15-minute soft match cap.
                  </p>
                  <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-2 pt-1 border-t border-[#1a5e48]/50">
                    <span>Clock: 30s</span> • <span>Grace: 30s</span> • <span>Match Cap: 15m</span>
                  </div>
                </div>

                {/* Masters Championship */}
                <div
                  onClick={() => applyPreset("masters_championship")}
                  className="p-4 bg-[#041c17] hover:bg-[#072c23] border border-[#1a5e48] hover:border-[#d6a735]/60 rounded-2xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#f5efdf] flex items-center gap-1.5">
                      <Swords size={15} className="text-[#d6a735]" /> Grandmaster Invitational (Bo3)
                    </span>
                    <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 text-[10px] font-bold rounded border border-cyan-500/30">
                      1400+ Rating
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Best of 3 series format with maximum-quantity compulsory capture requirement. Limited to rated masters (1400+ DPI).
                  </p>
                  <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-2 pt-1 border-t border-[#1a5e48]/50">
                    <span>Rule: Max Capture</span> • <span>Series: Best of 3</span> • <span>Rating: 1400+</span>
                  </div>
                </div>

                {/* Novice Grassroots */}
                <div
                  onClick={() => applyPreset("novice_open")}
                  className="p-4 bg-[#041c17] hover:bg-[#072c23] border border-[#1a5e48] hover:border-[#d6a735]/60 rounded-2xl cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#f5efdf] flex items-center gap-1.5">
                      <Users size={15} className="text-emerald-400" /> Grassroots Novice League
                    </span>
                    <span className="px-2 py-0.5 bg-blue-950 text-blue-300 text-[10px] font-bold rounded border border-blue-500/30">
                      Under 1400 DPI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Rating-capped entry for players under 1400 DPI. Relaxed disconnection window for newer competitors.
                  </p>
                  <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-2 pt-1 border-t border-[#1a5e48]/50">
                    <span>Cap: Max 1400 DPI</span> • <span>Grace: 60s</span> • <span>Series: 1 Game</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GAMEPLAY & PIECE DYNAMICS */}
          {activeTab === "gameplay" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Capture Rule Variation */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Compulsory Capture Rule
                  </label>
                  <select
                    value={currentCaptureRule}
                    onChange={(e) =>
                      setRuleVariations((prev) => ({
                        ...prev,
                        captureRule: e.target.value as CaptureRuleVariation,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="standard_compulsory">Standard Compulsory (Any Valid Capture Must Be Taken)</option>
                    <option value="maximum_quantity">Majority / Maximum Quantity (Must Capture Highest Piece Count)</option>
                    <option value="free_choice">Free Strategic Choice (Capturing Is Voluntary)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Defines whether a player can choose any capture path or is legally required to select the jump yielding the maximum taken pieces.
                  </p>
                </div>

                {/* Flying King Movement Dynamics */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Flying King Movement Dynamics
                  </label>
                  <select
                    value={currentFlyingKings}
                    onChange={(e) =>
                      setRuleVariations((prev) => ({
                        ...prev,
                        flyingKings: e.target.value as FlyingKingVariation,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="unlimited_diagonal">Unlimited Open Diagonals (Ghanaian / International Damii)</option>
                    <option value="restricted_steps">Restricted Range (Maximum 3 Unobstructed Steps)</option>
                    <option value="classic_single">Single-Step King (Classic English Checkers Style)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ghanaian Damii rules grant crowned Kings complete diagonal range across open squares.
                  </p>
                </div>

                {/* King Capture Promotion Trigger */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Promotion During Multi-Jump Hop
                  </label>
                  <select
                    value={currentPromotion}
                    onChange={(e) =>
                      setRuleVariations((prev) => ({
                        ...prev,
                        kingCapturePromotion: e.target.value as PromotionVariation,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="immediate">Immediate King Powers (Promoted Man Becomes Flying King In-Flight)</option>
                    <option value="next_turn">Next Turn Activation (King Privileges Activate After Move Completes)</option>
                  </select>
                </div>

                {/* Match Series Format */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Match Series Format (Per Bracket Round)
                  </label>
                  <select
                    value={currentSeries}
                    onChange={(e) =>
                      setRuleVariations((prev) => ({
                        ...prev,
                        matchSeries: e.target.value as SeriesFormatVariation,
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value="bo1">Single Game (Sudden Death 1-0)</option>
                    <option value="bo3">Best of 3 Games (First to 2 Wins)</option>
                    <option value="bo5">Best of 5 Games (Championship Final Series)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <label className="flex items-center gap-2.5 p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentBackwardMen}
                    onChange={(e) =>
                      setRuleVariations((prev) => ({
                        ...prev,
                        backwardMenCapture: e.target.checked,
                      }))
                    }
                    className="accent-[#d6a735]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#f5efdf] block">Men Backward Captures</span>
                    <span className="text-[10px] text-slate-400">Standard Damii men can jump backwards</span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentAllowDraw}
                    onChange={(e) =>
                      setRuleVariations((prev) => ({
                        ...prev,
                        allowDrawOffer: e.target.checked,
                      }))
                    }
                    className="accent-[#d6a735]"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#f5efdf] block">Mutual Draw Offers</span>
                    <span className="text-[10px] text-slate-400">Permit in-game draw propositions</span>
                  </div>
                </label>

                <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl">
                  <label className="text-xs font-bold text-[#f5efdf] block mb-1">
                    Repetition Draw Limit
                  </label>
                  <select
                    value={currentRepetitionLimit}
                    onChange={(e) =>
                      setRuleVariations((prev) => ({
                        ...prev,
                        repetitionDrawLimit: Number(e.target.value),
                      }))
                    }
                    className="w-full px-2 py-1 bg-[#081c15] border border-[#1a5e48] rounded-lg text-xs text-[#f5efdf]"
                  >
                    <option value={3}>3-Fold Repetition (Standard)</option>
                    <option value={5}>5-Fold Repetition</option>
                    <option value={0}>Disabled</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONSTRAINTS & RATING */}
          {activeTab === "constraints" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Minimum Rating Requirement */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Minimum Rating Requirement (DPI)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={3000}
                      step={50}
                      value={minRating}
                      onChange={(e) =>
                        setCustomConstraints((prev) => ({
                          ...prev,
                          minRatingRequired: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="0 (Open to all)"
                      className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                    />
                    <span className="text-xs text-slate-400 font-mono">DPI</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Set to 0 for open tournament. Players below this rating cannot register.
                  </p>
                </div>

                {/* Maximum Rating Cap */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Maximum Rating Cap (Novice Limit)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={3000}
                      step={50}
                      value={maxRating}
                      onChange={(e) =>
                        setCustomConstraints((prev) => ({
                          ...prev,
                          maxRatingCap: Number(e.target.value) || 0,
                        }))
                      }
                      placeholder="0 (No upper cap)"
                      className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                    />
                    <span className="text-xs text-slate-400 font-mono">DPI</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Set to 0 for no limit. Useful for novice/intermediate-only tournaments.
                  </p>
                </div>

                {/* Disconnection Grace Window */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Disconnection Grace Window
                  </label>
                  <select
                    value={disconnectGrace}
                    onChange={(e) =>
                      setCustomConstraints((prev) => ({
                        ...prev,
                        disconnectionGraceSeconds: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value={30}>30 Seconds (Fast / Blitz)</option>
                    <option value={45}>45 Seconds (Standard DAMII Default)</option>
                    <option value={60}>60 Seconds (Tournament Standard)</option>
                    <option value={90}>90 Seconds (Generous Grace Period)</option>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Time granted to a disconnected player to return before being awarded a technical loss.
                  </p>
                </div>

                {/* Match Soft Time Cap */}
                <div>
                  <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                    Match Total Time Cap
                  </label>
                  <select
                    value={timeCap}
                    onChange={(e) =>
                      setCustomConstraints((prev) => ({
                        ...prev,
                        matchTimeCapMinutes: Number(e.target.value),
                      }))
                    }
                    className="w-full px-3.5 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] text-xs focus:outline-none focus:border-[#d6a735]"
                  >
                    <option value={0}>No Maximum Limit (Played to Decision)</option>
                    <option value={15}>15 Minutes (Fast Blitz Round)</option>
                    <option value={30}>30 Minutes (Standard Round Cap)</option>
                    <option value={45}>45 Minutes (Championship Series Cap)</option>
                    <option value={60}>60 Minutes (Grand Final Cap)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-[#041c17] border border-[#1a5e48] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#f5efdf] block flex items-center gap-1.5">
                    <Eye size={14} className="text-cyan-300" /> Public Match Spectator Arena
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Allow spectators and community members to watch tournament matches live.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={allowSpectators}
                  onChange={(e) =>
                    setCustomConstraints((prev) => ({
                      ...prev,
                      allowSpectators: e.target.checked,
                    }))
                  }
                  className="accent-[#d6a735] w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: ARBITER DIRECTIVES & NOTES */}
          {activeTab === "directives" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5 flex items-center gap-1.5">
                  <FileText size={14} /> Specific Tournament Directives &amp; Fair Play Rules
                </label>
                <textarea
                  rows={3}
                  value={directives}
                  onChange={(e) => {
                    const text = e.target.value;
                    setCustomConstraints((prev) => ({
                      ...prev,
                      organizerDirectives: text,
                    }));
                    if (!rulesNotes.trim() || rulesNotes === "Standard 10x10 Damii rules apply.") {
                      setRulesNotes(text);
                    }
                  }}
                  placeholder="Enter specific tournament rules (e.g. Tiebreaker procedure, referee WhatsApp contact, match dispute protocol, camera requirements for finals)..."
                  className="w-full px-4 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] placeholder-slate-500 text-xs focus:outline-none focus:border-[#d6a735]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  These custom instructions will be displayed prominently on the tournament rules card for all registered players.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#d6a735] uppercase mb-1.5">
                  Public Summary Notes (Displayed to Players)
                </label>
                <input
                  type="text"
                  value={rulesNotes}
                  onChange={(e) => setRulesNotes(e.target.value)}
                  placeholder="e.g. Ghanaian Damii rules, 10x10, flying kings, 45s turn timer."
                  className="w-full px-4 py-2.5 bg-[#041c17] border border-[#1a5e48] rounded-xl text-[#f5efdf] placeholder-slate-500 text-xs focus:outline-none focus:border-[#d6a735]"
                />
              </div>
            </div>
          )}

          {/* Current Rules Summary Capsule */}
          <div className="p-3 bg-[#041c17] border border-[#1a5e48] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-[#d6a735]">Active Rules Configuration:</span>
              <span className="px-2 py-0.5 bg-[#081c15] text-[#f5efdf] rounded font-mono text-[11px] border border-[#1a5e48]">
                {currentCaptureRule === "maximum_quantity" ? "Majority Capture" : currentCaptureRule === "free_choice" ? "Free Choice" : "Standard Compulsory"}
              </span>
              <span className="px-2 py-0.5 bg-[#081c15] text-[#f5efdf] rounded font-mono text-[11px] border border-[#1a5e48]">
                {currentFlyingKings === "unlimited_diagonal" ? "Unlimited Flying Kings" : currentFlyingKings === "restricted_steps" ? "3-Step Kings" : "Single-Step"}
              </span>
              <span className="px-2 py-0.5 bg-[#081c15] text-[#f5efdf] rounded font-mono text-[11px] border border-[#1a5e48]">
                {currentSeries.toUpperCase()}
              </span>
              {minRating > 0 && (
                <span className="px-2 py-0.5 bg-[#081c15] text-cyan-300 rounded font-mono text-[11px] border border-[#1a5e48]">
                  Min {minRating} DPI
                </span>
              )}
              {maxRating > 0 && (
                <span className="px-2 py-0.5 bg-[#081c15] text-amber-300 rounded font-mono text-[11px] border border-[#1a5e48]">
                  Max {maxRating} DPI
                </span>
              )}
            </div>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
              <CheckCircle2 size={13} /> Rules Configured
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
