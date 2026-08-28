"use client";

import React, { useState } from "react";
import { Settings, Palette, Volume2, VolumeX, RefreshCw, HelpCircle, Check } from "lucide-react";

type BoardThemeKey = "emerald" | "mahogany" | "ebony" | "terracotta" | "sapphire";

interface MatchSettingsCardProps {
  boardTheme: BoardThemeKey;
  soundEnabled: boolean;
  rotated: boolean;
  onThemeChange: (theme: BoardThemeKey) => void;
  onToggleSound: () => void;
  onToggleFlip: () => void;
  onOpenRules: () => void;
}

export function MatchSettingsCard({
  boardTheme,
  soundEnabled,
  rotated,
  onThemeChange,
  onToggleSound,
  onToggleFlip,
  onOpenRules,
}: MatchSettingsCardProps) {
  const themes: BoardThemeKey[] = ["emerald", "mahogany", "ebony", "sapphire", "terracotta"];
  const [savedToast, setSavedToast] = useState(false);

  const handleSavePreferences = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1800);
  };

  return (
    <div className="w-full bg-[#06261f] border border-[#184d3c] rounded-xl p-2.5 sm:p-3 shadow-lg space-y-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-[#184d3c]">
        <div className="flex items-center gap-1.5 text-[#d6a735] text-[11px] font-black uppercase tracking-wider">
          <Settings size={13} />
          <span>Settings</span>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        {/* Theme Selector */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <Palette size={11} className="text-[#d6a735]" /> Theme:
            </span>
            <span className="text-[9px] text-[#d6a735] font-bold capitalize">{boardTheme}</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {themes.slice(0, 3).map((tKey) => (
              <button
                key={tKey}
                type="button"
                onClick={() => onThemeChange(tKey)}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all capitalize ${
                  boardTheme === tKey
                    ? "bg-[#d6a735] text-[#06261f] font-extrabold shadow-sm"
                    : "bg-[#0c3b2e] hover:bg-[#144435] text-slate-300 border border-[#184d3c]"
                }`}
              >
                {tKey}
              </button>
            ))}
          </div>
        </div>

        {/* Board Sound Toggle */}
        <div className="flex items-center justify-between p-1.5 bg-[#041913] border border-[#184d3c] rounded-lg">
          <span className="font-semibold text-slate-300 flex items-center gap-1 text-[10px]">
            {soundEnabled ? <Volume2 size={12} className="text-emerald-400" /> : <VolumeX size={12} className="text-slate-500" />}
            Board Sound:
          </span>
          <button
            type="button"
            onClick={onToggleSound}
            className={`px-2 py-0.2 text-[9px] font-extrabold rounded transition-all ${
              soundEnabled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {soundEnabled ? "ON" : "MUTED"}
          </button>
        </div>

        {/* View / Flip Board */}
        <div className="flex items-center justify-between p-1.5 bg-[#041913] border border-[#184d3c] rounded-lg">
          <span className="font-semibold text-slate-300 flex items-center gap-1 text-[10px]">
            <RefreshCw size={12} className="text-[#d6a735]" />
            View:
          </span>
          <button
            type="button"
            onClick={onToggleFlip}
            className={`px-2 py-0.2 text-[9px] font-extrabold rounded transition-all ${
              rotated
                ? "bg-[#d6a735] text-[#06261f]"
                : "bg-[#0c3b2e] text-slate-300 border border-[#184d3c] hover:bg-[#144435]"
            }`}
          >
            {rotated ? "Flipped" : "2D (Normal)"}
          </button>
        </div>

        {/* Save Preferences & Rules Actions */}
        <div className="space-y-1 pt-0.5">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="w-full py-1.5 bg-[#0c3b2e] hover:bg-[#144435] text-slate-200 border border-[#184d3c] hover:border-[#d6a735]/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
          >
            {savedToast ? <Check size={11} className="text-emerald-400" /> : null}
            <span>{savedToast ? "Preferences Saved!" : "Save Preferences"}</span>
          </button>

          <button
            type="button"
            onClick={onOpenRules}
            className="w-full py-1 text-slate-400 hover:text-[#d6a735] text-[9px] font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <HelpCircle size={10} className="text-[#d6a735]" />
            <span>Rules &amp; Guide</span>
          </button>
        </div>
      </div>
    </div>
  );
}

