"use client";

import React from "react";
import { Settings, Palette, Volume2, VolumeX, RefreshCw, Lightbulb, HelpCircle } from "lucide-react";

type BoardThemeKey = "emerald" | "mahogany" | "ebony" | "terracotta" | "sapphire";

interface MatchSettingsCardProps {
  boardTheme: BoardThemeKey;
  soundEnabled: boolean;
  rotated: boolean;
  showTrainingIntel: boolean;
  onThemeChange: (theme: BoardThemeKey) => void;
  onToggleSound: () => void;
  onToggleFlip: () => void;
  onToggleTrainingIntel: () => void;
  onOpenRules: () => void;
}

export function MatchSettingsCard({
  boardTheme,
  soundEnabled,
  rotated,
  showTrainingIntel,
  onThemeChange,
  onToggleSound,
  onToggleFlip,
  onToggleTrainingIntel,
  onOpenRules,
}: MatchSettingsCardProps) {
  const themes: BoardThemeKey[] = ["emerald", "mahogany", "ebony", "sapphire", "terracotta"];

  return (
    <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-2xl p-3.5 shadow-xl space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#184d3c]">
        <div className="flex items-center gap-1.5 text-[#d6a735] text-xs font-black uppercase tracking-wider">
          <Settings size={14} />
          <span>Settings</span>
        </div>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Theme Selector */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
            <span className="font-semibold flex items-center gap-1">
              <Palette size={12} className="text-[#d6a735]" /> Theme:
            </span>
            <span className="text-[10px] text-[#d6a735] font-bold capitalize">{boardTheme}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {themes.slice(0, 3).map((tKey) => (
              <button
                key={tKey}
                type="button"
                onClick={() => onThemeChange(tKey)}
                className={`px-1.5 py-1 text-[10px] font-bold rounded-lg transition-all capitalize ${
                  boardTheme === tKey
                    ? "bg-[#d6a735] text-[#06261f] shadow-sm font-extrabold"
                    : "bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 border border-[#184d3c]"
                }`}
              >
                {tKey}
              </button>
            ))}
          </div>
        </div>

        {/* Board Sound Toggle */}
        <div className="flex items-center justify-between p-2 bg-[#041913] border border-[#184d3c] rounded-xl">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
            {soundEnabled ? <Volume2 size={13} className="text-emerald-400" /> : <VolumeX size={13} className="text-slate-500" />}
            Board Sound:
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
              soundEnabled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {soundEnabled ? "ON" : "MUTED"}
          </button>
        </div>

        {/* View / Flip Board */}
        <div className="flex items-center justify-between p-2 bg-[#041913] border border-[#184d3c] rounded-xl">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
            <RefreshCw size={13} className="text-[#d6a735]" />
            View / Flip:
          </span>
          <button
            type="button"
            onClick={onToggleFlip}
            className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
              rotated
                ? "bg-[#d6a735] text-[#06261f]"
                : "bg-[#0c3b2e] text-slate-300 border border-[#184d3c] hover:bg-[#144435]"
            }`}
          >
            {rotated ? "Flipped" : "Normal 2D"}
          </button>
        </div>

        {/* Training Intel / Hints */}
        <div className="flex items-center justify-between p-2 bg-[#041913] border border-[#184d3c] rounded-xl">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
            <Lightbulb size={13} className="text-amber-400" />
            Tactical Intel:
          </span>
          <button
            type="button"
            onClick={onToggleTrainingIntel}
            className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md transition-all ${
              showTrainingIntel
                ? "bg-[#d6a735]/20 text-[#d6a735] border border-[#d6a735]/40"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {showTrainingIntel ? "SHOW" : "HIDE"}
          </button>
        </div>

        {/* Official Rules Modal Trigger */}
        <button
          type="button"
          onClick={onOpenRules}
          className="w-full py-2 bg-[#0c3b2e] hover:bg-[#144435] text-slate-200 border border-[#184d3c] rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
        >
          <HelpCircle size={13} className="text-[#d6a735]" />
          <span>Game Rules & Guide</span>
        </button>
      </div>
    </div>
  );
}
