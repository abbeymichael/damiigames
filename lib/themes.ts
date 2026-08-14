import React from "react";

export type BoardThemeId =
  | "mahogany"
  | "ebony_gold"
  | "rosewood"
  | "ashanti_emerald"
  | "marble_slate"
  | "rustic_cedar";

export type PieceThemeId =
  | "carved_classic"
  | "marble_obsidian"
  | "metallic_brass"
  | "wooden_tokens"
  | "neon_glow"
  | "royal_jewels";

export type BoardThemeDef = {
  id: BoardThemeId;
  name: string;
  subtitle: string;
  description: string;
  frameClass: string;
  boardBgStyle: React.CSSProperties;
  playableStyle: React.CSSProperties;
  restStyle: React.CSSProperties;
  selectedStyle: React.CSSProperties;
  destinationStyle: React.CSSProperties;
  swatchFrame: string;
  swatchLight: string;
  swatchDark: string;
};

export type PieceThemeDef = {
  id: PieceThemeId;
  name: string;
  subtitle: string;
  description: string;
  whiteClass: string;
  blackClass: string;
  whiteCrown: string;
  blackCrown: string;
  swatchWhiteBg: string;
  swatchBlackBg: string;
  swatchWhiteText: string;
  swatchBlackText: string;
};

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeDef> = {
  mahogany: {
    id: "mahogany",
    name: "Classic Mahogany",
    subtitle: "Classic Teak & Gold",
    description: "Traditional rich mahogany wood frame with deep forest green playable squares and golden ivory rest squares.",
    frameClass: "bg-gradient-to-br from-amber-950 via-yellow-950 to-amber-900 border-4 border-amber-600/70 shadow-2xl shadow-amber-950/80 ring-1 ring-amber-500/30",
    boardBgStyle: { backgroundColor: "#e9dbb4", borderColor: "#d9b65d" },
    playableStyle: { backgroundColor: "#184d3c" },
    restStyle: { backgroundColor: "#eadfbf" },
    selectedStyle: { backgroundColor: "#1c523f", boxShadow: "inset 0 0 0 4px #f59e0b, 0 0 14px rgba(245, 158, 11, 0.8)" },
    destinationStyle: { backgroundColor: "#15803d", boxShadow: "inset 0 0 0 3px #4ade80, 0 0 12px rgba(74, 222, 128, 0.7)" },
    swatchFrame: "bg-amber-950 border-amber-600",
    swatchLight: "#eadfbf",
    swatchDark: "#184d3c",
  },
  ebony_gold: {
    id: "ebony_gold",
    name: "Royal Ebony & Gold",
    subtitle: "Obsidian & Champagne",
    description: "Luxury polished ebony timber with champagne gold perimeter and midnight dark squares.",
    frameClass: "bg-gradient-to-br from-slate-950 via-zinc-900 to-amber-950 border-4 border-amber-500 shadow-2xl shadow-black ring-1 ring-amber-400/50",
    boardBgStyle: { backgroundColor: "#0f172a", borderColor: "#f59e0b" },
    playableStyle: { backgroundColor: "#020617" },
    restStyle: { backgroundColor: "#334155" },
    selectedStyle: { backgroundColor: "#1e1b4b", boxShadow: "inset 0 0 0 4px #fbbf24, 0 0 16px rgba(251, 191, 36, 0.9)" },
    destinationStyle: { backgroundColor: "#065f46", boxShadow: "inset 0 0 0 3px #34d399, 0 0 14px rgba(52, 211, 153, 0.8)" },
    swatchFrame: "bg-slate-950 border-amber-500",
    swatchLight: "#334155",
    swatchDark: "#020617",
  },
  rosewood: {
    id: "rosewood",
    name: "African Rosewood",
    subtitle: "Rosewood & Warm Ivory",
    description: "Deep reddish rosewood grain with soft cream light squares and rich burgundy playable squares.",
    frameClass: "bg-gradient-to-br from-red-950 via-rose-950 to-stone-900 border-4 border-rose-600/70 shadow-2xl shadow-rose-950/80 ring-1 ring-rose-400/30",
    boardBgStyle: { backgroundColor: "#fdf6e2", borderColor: "#be123c" },
    playableStyle: { backgroundColor: "#4c0519" },
    restStyle: { backgroundColor: "#fef3c7" },
    selectedStyle: { backgroundColor: "#881337", boxShadow: "inset 0 0 0 4px #f59e0b, 0 0 14px rgba(245, 158, 11, 0.8)" },
    destinationStyle: { backgroundColor: "#15803d", boxShadow: "inset 0 0 0 3px #4ade80, 0 0 12px rgba(74, 222, 128, 0.7)" },
    swatchFrame: "bg-red-950 border-rose-600",
    swatchLight: "#fef3c7",
    swatchDark: "#4c0519",
  },
  ashanti_emerald: {
    id: "ashanti_emerald",
    name: "Ashanti Emerald",
    subtitle: "Royal Green & Jade",
    description: "Vibrant royal emerald green polished wood with mint green accents and golden borders.",
    frameClass: "bg-gradient-to-br from-emerald-950 via-green-950 to-teal-950 border-4 border-emerald-500/80 shadow-2xl shadow-emerald-950/80 ring-1 ring-emerald-400/40",
    boardBgStyle: { backgroundColor: "#d1fae5", borderColor: "#10b981" },
    playableStyle: { backgroundColor: "#064e3b" },
    restStyle: { backgroundColor: "#ecfdf5" },
    selectedStyle: { backgroundColor: "#047857", boxShadow: "inset 0 0 0 4px #fbbf24, 0 0 14px rgba(251, 191, 36, 0.9)" },
    destinationStyle: { backgroundColor: "#15803d", boxShadow: "inset 0 0 0 3px #4ade80, 0 0 12px rgba(74, 222, 128, 0.7)" },
    swatchFrame: "bg-emerald-950 border-emerald-500",
    swatchLight: "#ecfdf5",
    swatchDark: "#064e3b",
  },
  marble_slate: {
    id: "marble_slate",
    name: "Marble & Slate",
    subtitle: "Alabaster & Charcoal",
    description: "Polished white marble frame with charcoal slate playable squares and alabaster light squares.",
    frameClass: "bg-gradient-to-br from-slate-900 via-slate-800 to-zinc-900 border-4 border-slate-500 shadow-2xl shadow-slate-950/80 ring-1 ring-slate-400/30",
    boardBgStyle: { backgroundColor: "#e2e8f0", borderColor: "#94a3b8" },
    playableStyle: { backgroundColor: "#334155" },
    restStyle: { backgroundColor: "#f1f5f9" },
    selectedStyle: { backgroundColor: "#475569", boxShadow: "inset 0 0 0 4px #38bdf8, 0 0 14px rgba(56, 189, 248, 0.8)" },
    destinationStyle: { backgroundColor: "#0284c7", boxShadow: "inset 0 0 0 3px #38bdf8, 0 0 12px rgba(56, 189, 248, 0.7)" },
    swatchFrame: "bg-slate-800 border-slate-500",
    swatchLight: "#f1f5f9",
    swatchDark: "#334155",
  },
  rustic_cedar: {
    id: "rustic_cedar",
    name: "Rustic Cedar",
    subtitle: "Warm Cedar & Natural Pine",
    description: "Aged cedar wood grain frame with golden amber pine squares for a rustic heritage feel.",
    frameClass: "bg-gradient-to-br from-amber-900 via-yellow-950 to-orange-950 border-4 border-amber-600 shadow-2xl shadow-amber-950/80 ring-1 ring-amber-500/30",
    boardBgStyle: { backgroundColor: "#fef3c7", borderColor: "#b45309" },
    playableStyle: { backgroundColor: "#78350f" },
    restStyle: { backgroundColor: "#fde68a" },
    selectedStyle: { backgroundColor: "#92400e", boxShadow: "inset 0 0 0 4px #f59e0b, 0 0 14px rgba(245, 158, 11, 0.8)" },
    destinationStyle: { backgroundColor: "#15803d", boxShadow: "inset 0 0 0 3px #4ade80, 0 0 12px rgba(74, 222, 128, 0.7)" },
    swatchFrame: "bg-amber-900 border-amber-600",
    swatchLight: "#fde68a",
    swatchDark: "#78350f",
  },
};

export const PIECE_THEMES: Record<PieceThemeId, PieceThemeDef> = {
  carved_classic: {
    id: "carved_classic",
    name: "Carved Ivory & Ebony",
    subtitle: "Traditional 3D Resins",
    description: "Hand-carved ivory resin with warm amber highlights and deep ebony dark pieces.",
    whiteClass: "bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 border-2 border-amber-200 text-slate-950 shadow-[inset_0_-4px_6px_rgba(180,140,50,0.35),0_4px_8px_rgba(0,0,0,0.35)]",
    blackClass: "bg-gradient-to-br from-slate-700 via-slate-900 to-slate-950 border-2 border-slate-800 text-amber-300 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.7),0_4px_8px_rgba(0,0,0,0.45)]",
    whiteCrown: "♛",
    blackCrown: "♛",
    swatchWhiteBg: "bg-amber-100",
    swatchBlackBg: "bg-slate-900",
    swatchWhiteText: "text-amber-900",
    swatchBlackText: "text-amber-400",
  },
  marble_obsidian: {
    id: "marble_obsidian",
    name: "Marble & Obsidian",
    subtitle: "Carrara & Volcanic Glass",
    description: "Smooth white carrara marble pieces paired with deep black volcanic obsidian glass.",
    whiteClass: "bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 border-2 border-white text-slate-800 shadow-[inset_0_-4px_6px_rgba(100,116,139,0.3),0_4px_8px_rgba(0,0,0,0.3)]",
    blackClass: "bg-gradient-to-br from-zinc-800 via-zinc-900 to-black border-2 border-zinc-700 text-slate-100 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.8),0_4px_8px_rgba(0,0,0,0.5)]",
    whiteCrown: "♛",
    blackCrown: "♛",
    swatchWhiteBg: "bg-slate-200",
    swatchBlackBg: "bg-black",
    swatchWhiteText: "text-slate-800",
    swatchBlackText: "text-slate-100",
  },
  metallic_brass: {
    id: "metallic_brass",
    name: "Brushed Brass & Copper",
    subtitle: "High-Shine Alloy",
    description: "Golden brushed brass pieces with metallic sheen and dark copper antique bronze pieces.",
    whiteClass: "bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-600 border-2 border-yellow-200 text-amber-950 shadow-[0_2px_10px_rgba(234,179,8,0.5),inset_0_-3px_6px_rgba(180,83,9,0.5)]",
    blackClass: "bg-gradient-to-br from-amber-800 via-amber-900 to-stone-900 border-2 border-amber-600 text-amber-300 shadow-[0_2px_10px_rgba(120,53,15,0.6),inset_0_-3px_6px_rgba(0,0,0,0.7)]",
    whiteCrown: "👑",
    blackCrown: "👑",
    swatchWhiteBg: "bg-amber-400",
    swatchBlackBg: "bg-amber-900",
    swatchWhiteText: "text-amber-950",
    swatchBlackText: "text-amber-300",
  },
  wooden_tokens: {
    id: "wooden_tokens",
    name: "Carved Wood Discs",
    subtitle: "Handcrafted Oak & Walnut",
    description: "Crafted natural oak disc tokens and dark burnt walnut pieces with concentric ring textures.",
    whiteClass: "bg-gradient-to-br from-amber-100 via-yellow-200 to-amber-300 border-2 border-amber-500 text-amber-950 shadow-[inset_0_0_0_3px_rgba(217,119,6,0.3)]",
    blackClass: "bg-gradient-to-br from-yellow-950 via-stone-900 to-amber-950 border-2 border-amber-700 text-amber-400 shadow-[inset_0_0_0_3px_rgba(180,83,9,0.3)]",
    whiteCrown: "★",
    blackCrown: "★",
    swatchWhiteBg: "bg-amber-200",
    swatchBlackBg: "bg-yellow-950",
    swatchWhiteText: "text-amber-950",
    swatchBlackText: "text-amber-400",
  },
  neon_glow: {
    id: "neon_glow",
    name: "Neon Cyber Glow",
    subtitle: "Electric Cyan & Magenta",
    description: "Futuristic acrylic tokens with vivid neon cyan and glowing magenta arcade halos.",
    whiteClass: "bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 border-2 border-cyan-200 text-cyan-950 shadow-[0_0_14px_rgba(6,182,212,0.9)] ring-1 ring-cyan-300",
    blackClass: "bg-gradient-to-br from-fuchsia-600 via-purple-700 to-indigo-900 border-2 border-fuchsia-300 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.9)] ring-1 ring-fuchsia-400",
    whiteCrown: "⚡",
    blackCrown: "⚡",
    swatchWhiteBg: "bg-cyan-400",
    swatchBlackBg: "bg-fuchsia-600",
    swatchWhiteText: "text-cyan-950",
    swatchBlackText: "text-fuchsia-100",
  },
  royal_jewels: {
    id: "royal_jewels",
    name: "Ruby & Sapphire Jewels",
    subtitle: "Crystal Gemstones",
    description: "Gleaming ruby red and royal sapphire blue faceted gemstone tokens.",
    whiteClass: "bg-gradient-to-br from-rose-400 via-red-600 to-rose-950 border-2 border-rose-300 text-rose-100 shadow-[0_0_12px_rgba(225,29,72,0.7)]",
    blackClass: "bg-gradient-to-br from-sky-400 via-blue-600 to-slate-900 border-2 border-sky-300 text-sky-100 shadow-[0_0_12px_rgba(37,99,235,0.7)]",
    whiteCrown: "👑",
    blackCrown: "👑",
    swatchWhiteBg: "bg-red-600",
    swatchBlackBg: "bg-blue-600",
    swatchWhiteText: "text-rose-100",
    swatchBlackText: "text-sky-100",
  },
};
